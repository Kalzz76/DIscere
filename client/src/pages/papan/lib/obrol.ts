import React from 'react';
import { apiRequest } from '../../../lib/api';

export interface LampiranObrolan {
  id: string;
  jenis: 'gambar' | 'pdf' | 'teks';
  nama: string;
  mt: string;
  data?: string; // base64 murni tanpa prefix
  teks?: string;
  thumb?: string; // dataUrl untuk pratinjau thumbnail
}

export interface PesanObrolan {
  id: string;
  role: 'user' | 'assistant';
  teks: string;
  lampiran?: LampiranObrolan[];
  fileNames?: string[];
  isError?: boolean;
}

const SUPPORTED_TEXT_EXT = /\.(txt|md|csv|json|js|ts|py|html|css|xml|ya?ml|java|c|cpp|sql|log)$/i;

/**
 * Bungkus teks per baris sekitar n karakter dengan markdown dibuang
 * (Port dari fungsi wrap discere-v5.html untuk kartu catatan kanvas)
 */
export function wrap(t: string, n = 38): string {
  const clean = t
    .replace(/```(?:\w+)?\n?([\s\S]*?)```/g, '$1')
    .replace(/\*\*|`|#/g, '')
    .trim();

  const out: string[] = [];
  const lines = clean.split('\n');

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      out.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let cur = '';
    for (const w of words) {
      if ((cur + ' ' + w).trim().length > n && cur) {
        out.push(cur.trim());
        cur = w;
      } else {
        cur = cur ? `${cur} ${w}` : w;
      }
    }
    if (cur) {
      out.push(cur.trim());
    }
  }

  return out.join('\n');
}

/**
 * Pengecilan gambar untuk lampiran obrolan AI lewat kanvas HTML5
 * (Sisi terpanjang maksimal 1568 px, JPEG kualitas 0.85)
 */
export async function resizeImageForAttachment(file: File): Promise<{
  data: string;
  thumb: string;
  mt: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar rusak atau tidak terbaca.'));
      img.onload = () => {
        const maxDim = 1568;
        let w = img.width;
        let h = img.height;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, w);
        canvas.height = Math.max(1, h);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Konteks kanvas peramban tidak tersedia.'));
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, w, h);

        const isPng = file.type === 'image/png';
        const mimeType = isPng ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, 0.85);
        const base64Clean = dataUrl.split(',')[1] || '';

        resolve({
          data: base64Clean,
          thumb: dataUrl,
          mt: mimeType,
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Baca file lampiran (gambar, PDF, atau file teks) dengan batas 5 MB
 */
export async function readFileForAttachment(file: File): Promise<LampiranObrolan> {
  if (!file) {
    throw new Error('File tidak valid.');
  }

  const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxSizeBytes) {
    throw new Error(`File "${file.name}" terlalu besar (maksimal 5 MB).`);
  }

  const isImage = /^image\/(png|jpeg|jpg|gif|webp)$/i.test(file.type);
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isText =
    file.type.startsWith('text/') ||
    file.type === 'application/json' ||
    SUPPORTED_TEXT_EXT.test(file.name);

  if (!isImage && !isPdf && !isText) {
    throw new Error(
      `Format file "${file.name}" tidak didukung. Gunakan gambar (PNG, JPG, WebP, GIF), PDF, atau file teks.`
    );
  }

  const id = crypto.randomUUID();

  // 1. Gambar
  if (isImage) {
    const resized = await resizeImageForAttachment(file);
    return {
      id,
      jenis: 'gambar',
      nama: file.name,
      mt: resized.mt,
      data: resized.data,
      thumb: resized.thumb,
    };
  }

  // 2. Dokumen PDF
  if (isPdf) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Gagal membaca berkas PDF.'));
      reader.onload = () => {
        const fullDataUrl = String(reader.result);
        const base64Clean = fullDataUrl.split(',')[1] || '';
        resolve({
          id,
          jenis: 'pdf',
          nama: file.name,
          mt: 'application/pdf',
          data: base64Clean,
        });
      };
      reader.readAsDataURL(file);
    });
  }

  // 3. File Teks
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca isi file teks.'));
    reader.onload = () => {
      const rawText = String(reader.result || '');
      // Batasi teks lampiran maksimal 30000 karakter
      const truncatedText = rawText.slice(0, 30000);
      resolve({
        id,
        jenis: 'teks',
        nama: file.name,
        mt: file.type || 'text/plain',
        teks: truncatedText,
      });
    };
    reader.readAsText(file);
  });
}

/**
 * Kirim percakapan ke endpoint POST /api/ai/obrol
 * Sesuai aturan: giliran sebelumnya tidak mengirim ulang base64 besar,
 * hanya pesan user TERAKHIR yang membawa lampiran murni.
 */
export async function kirimPesanObrolan(
  riwayat: PesanObrolan[],
  signal?: AbortSignal
): Promise<string> {
  const payloadPesan = riwayat.map((p, idx) => {
    const isLast = idx === riwayat.length - 1;
    let teksClean = p.teks;

    // Untuk giliran lama (bukan terakhir), jangan kirim file base64
    if (!isLast && p.lampiran && p.lampiran.length > 0) {
      const namaLampiran = p.lampiran.map((l) => l.nama).join(', ');
      teksClean = `${teksClean}\n[Lampiran: ${namaLampiran}]`.trim();
      return {
        role: p.role,
        teks: teksClean.slice(0, 8000),
      };
    }

    // Untuk pesan user terakhir yang membawa lampiran
    if (isLast && p.lampiran && p.lampiran.length > 0) {
      return {
        role: p.role,
        teks: teksClean.slice(0, 8000),
        lampiran: p.lampiran.map((l) => ({
          jenis: l.jenis,
          nama: l.nama,
          mt: l.mt,
          data: l.data,
          teks: l.teks,
        })),
      };
    }

    return {
      role: p.role,
      teks: teksClean.slice(0, 8000),
    };
  });

  const res = await apiRequest<{ jawaban: string }>('/ai/obrol', {
    method: 'POST',
    body: JSON.stringify({ pesan: payloadPesan }),
    signal,
  });

  return res.jawaban;
}

/**
 * Render teks markdown aman ke elemen React murni tanpa dangerouslySetInnerHTML:
 * - Blok kode (```...```)
 * - Kode sebaris (`...`)
 * - Tebal (**...**)
 * - Baris baru dipertahankan
 */
export function renderMarkdownSafe(text: string): React.ReactNode {
  if (!text) return null;

  // Pisahkan blok kode terlebih dahulu
  const codeBlockRegex = /```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const beforeText = text.slice(lastIndex, match.index);
    if (beforeText) {
      elements.push(
        React.createElement(
          React.Fragment,
          { key: `text-${keyIdx++}` },
          renderInlineMarkdown(beforeText)
        )
      );
    }

    const codeContent = match[1] ?? '';
    elements.push(
      React.createElement(
        'pre',
        { key: `pre-${keyIdx++}`, className: 'code-block' },
        React.createElement('code', null, codeContent)
      )
    );

    lastIndex = match.index + match[0].length;
  }

  const remaining = text.slice(lastIndex);
  if (remaining) {
    elements.push(
      React.createElement(
        React.Fragment,
        { key: `text-${keyIdx++}` },
        renderInlineMarkdown(remaining)
      )
    );
  }

  return elements;
}

/**
 * Render inline formatting: kode sebaris (`...`) dan bold (**...**)
 */
function renderInlineMarkdown(str: string): React.ReactNode {
  const parts = str.split(/(\*\*.*?\*\*|`.*?`|\n)/g);

  return parts.map((part, i) => {
    if (!part) return null;

    if (part === '\n') {
      return React.createElement('br', { key: `br-${i}` });
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return React.createElement(
        'code',
        { key: `code-${i}`, className: 'inline-code' },
        part.slice(1, -1)
      );
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return React.createElement('strong', { key: `b-${i}` }, part.slice(2, -2));
    }

    return React.createElement('span', { key: `s-${i}` }, part);
  });
}
