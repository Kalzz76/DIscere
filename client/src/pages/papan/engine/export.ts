import { CanvasObj, BoardDataFormat } from './types';
import { bounds } from './geometry';
import { drawObj } from './render';
import { cloneObj } from './history';

export function potongArea(
  objs: CanvasObj[],
  area: { x: number; y: number; w: number; h: number },
  padding = 24
): string {
  const m = padding;
  const k = Math.min(2, 1400 / Math.max(area.w, area.h, 1));
  const cn = document.createElement('canvas');
  cn.width = Math.max(1, (area.w + 2 * m) * k);
  cn.height = Math.max(1, (area.h + 2 * m) * k);
  const x = cn.getContext('2d');
  if (!x) return '';
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, cn.width, cn.height);
  x.scale(k, k);
  x.translate(m - area.x, m - area.y);
  for (const o of objs) {
    drawObj(x, o);
  }
  return cn.toDataURL('image/png');
}

export function pngDataUrl(objs: CanvasObj[]): string | null {
  if (objs.length === 0) return null;
  let a = 1e9,
    b = 1e9,
    c = -1e9,
    d = -1e9;
  for (const o of objs) {
    const r = bounds(o);
    a = Math.min(a, r.x);
    b = Math.min(b, r.y);
    c = Math.max(c, r.x + r.w);
    d = Math.max(d, r.y + r.h);
  }

  const m = 40;
  const k = 2;
  const cn = document.createElement('canvas');
  cn.width = Math.max(1, (c - a + m * 2) * k);
  cn.height = Math.max(1, (d - b + m * 2) * k);
  const x = cn.getContext('2d');
  if (!x) return null;
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, cn.width, cn.height);
  x.scale(k, k);
  x.translate(m - a, m - b);
  for (const o of objs) {
    drawObj(x, o);
  }
  return cn.toDataURL('image/png');
}

export function downloadPng(objs: CanvasObj[], title = 'papan'): boolean {
  const data = pngDataUrl(objs);
  if (!data) return false;
  const a = document.createElement('a');
  a.download = `${title || 'papan'}.png`;
  a.href = data;
  a.click();
  return true;
}

export function toJson(objs: CanvasObj[]): string {
  const cleanObjs = objs.map(cloneObj);
  const data: BoardDataFormat = {
    versi: 1,
    objs: cleanObjs,
  };
  return JSON.stringify(data);
}

export function downloadJson(objs: CanvasObj[], title = 'papan'): void {
  const jsonStr = toJson(objs);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = `${title || 'papan'}.json`;
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Batas keamanan: gambar yang diunggah diperkecil lewat canvas
 * (sisi terpanjang maksimal 1280 px, JPEG kualitas 0.8) sebelum disimpan sebagai dataURL.
 */
export async function resizeImageToDataUrl(file: File): Promise<{
  src: string;
  w: number;
  h: number;
}> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File bukan gambar'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Gagal memuat elemen gambar'));
      img.onload = () => {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        const maxSide = 1280;

        if (w > maxSide || h > maxSide) {
          if (w >= h) {
            h = Math.round((h * maxSide) / w);
            w = maxSide;
          } else {
            w = Math.round((w * maxSide) / h);
            h = maxSide;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context tidak tersedia'));
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve({ src: dataUrl, w, h });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

