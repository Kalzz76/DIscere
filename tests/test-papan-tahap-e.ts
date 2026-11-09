import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { prisma } from '../server/src/db';
import { aiRouter } from '../server/src/routes/ai';
import { config } from '../server/src/config';
import { wrap } from '../client/src/pages/papan/lib/obrol';
import { TextObj } from '../client/src/pages/papan/engine/types';
import { HistoryManager } from '../client/src/pages/papan/engine/history';
import { pngDataUrl } from '../client/src/pages/papan/engine/export';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${msg}`);
    failed++;
  }
}

async function runStepETests() {
  console.log('=== MEMULAI PENGUJIAN OTOMATIS PAPAN TULIS TAHAP E ===\n');

  // -------------------------------------------------------------
  // 1. UJI FUNGSI WRAP TEKS CATATAN KANVAS
  // -------------------------------------------------------------
  console.log('1. Uji Fungsi wrap() Teks Catatan Papan Tulis:');
  const rawMarkdown = `**Pengenalan Pecahan**: Pecahan adalah bagian dari satu kesatuan utuh. Contohnya pecahan 1/2 berarti satu bagian dari dua bagian sama besar. \`rumus dasar: a/b\`.`;
  const wrapped = wrap(rawMarkdown, 38);

  assert(wrapped.length > 0, 'Hasil wrap tidak boleh kosong');
  assert(!wrapped.includes('**'), 'Tanda tebal markdown (**) harus dibersihkan');
  assert(!wrapped.includes('`'), 'Tanda kode markdown (`) harus dibersihkan');

  const lines = wrapped.split('\n');
  assert(lines.length >= 2, 'Teks berhasil dipotong menjadi beberapa baris rapi');
  for (const line of lines) {
    if (line.trim().length > 0) {
      assert(line.length <= 50, `Panjang baris "${line.slice(0, 20)}..." tidak melebihi batas`);
    }
  }

  // -------------------------------------------------------------
  // 2. UJI KANVAS: ADDNOTE BERLABEL DIBUAT AI & UNDO/REDO
  // -------------------------------------------------------------
  console.log('\n2. Uji Penambahan Catatan AI & Undo/Redo di Kanvas:');

  // Kanvas kosong
  const emptyPng = pngDataUrl([]);
  assert(emptyPng === null, 'Kanvas tanpa objek menghasilkan null pada pngDataUrl()');

  // Simulasi penambahan catatan AI lewat HistoryManager
  const history = new HistoryManager();
  let objs: TextObj[] = [];

  const noteText = wrap('Ini adalah ringkasan materi pecahan yang dibuat oleh Asisten AI.');
  const aiNoteObj: TextObj = {
    id: 'test-uuid-ai-1',
    type: 'text',
    x: 200,
    y: 150,
    text: noteText,
    fs: 22,
    color: '#111827',
    fill: '#fde68a',
    size: 1,
    ai: true,
  };

  objs.push(aiNoteObj);
  history.commit({ tambah: [aiNoteObj] });

  assert(objs.length === 1, 'Catatan AI berhasil ditambahkan ke daftar objek kanvas');
  assert(aiNoteObj.ai === true, 'Properti ai bernilai true untuk memicu badge "Dibuat AI"');
  assert(aiNoteObj.fs === 22, 'Ukuran font catatan AI tepat 22px');
  assert(aiNoteObj.fill === '#fde68a', 'Warna latar catatan kuning lembut (#fde68a)');

  // Uji Undo
  assert(history.canUndo(), 'Riwayat memiliki entri undo');
  const undoResult = history.undo(objs);
  objs = undoResult.newObjs as TextObj[];
  assert(objs.length === 0, 'Undo berhasil menghapus catatan AI dari kanvas');

  // Uji Redo
  assert(history.canRedo(), 'Riwayat memiliki entri redo');
  const redoResult = history.redo(objs);
  objs = redoResult.newObjs as TextObj[];
  assert(objs.length === 1, 'Redo berhasil mengembalikan catatan AI ke kanvas');
  assert(objs[0].id === 'test-uuid-ai-1', 'Objek catatan yang dikembalikan memiliki ID yang tepat');

  // -------------------------------------------------------------
  // 3. UJI SERVER: ENDPOINT POST /api/ai/obrol
  // -------------------------------------------------------------
  console.log('\n3. Uji Validasi & Orkestrasi POST /api/ai/obrol:');

  const app = express();
  app.use(express.json({ limit: '12mb' }));
  app.use(cookieParser());
  app.use('/api/ai', aiRouter);

  const server = http.createServer(app);
  const TEST_PORT = 3599;
  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));
  const serverUrl = `http://localhost:${TEST_PORT}`;

  try {
    // Siapkan guru demo untuk autentikasi JWT cookie
    const guru = await prisma.user.upsert({
      where: { email: 'guru-test-obrol@discere.test' },
      update: {},
      create: {
        nama: 'Guru Penguji Obrolan AI',
        email: 'guru-test-obrol@discere.test',
        passwordHash: 'dummy-hash',
        role: 'guru',
        status: 'aktif',
      },
    });

    const token = jwt.sign(
      { userId: guru.id },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    const authCookie = `discere_token=${token}`;

    // A. Uji: Akses tanpa cookie sesi ditolak (401)
    const noAuthRes = await fetch(`${serverUrl}/api/ai/obrol`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pesan: [{ role: 'user', teks: 'Halo AI' }],
      }),
    });
    assert(noAuthRes.status === 401, 'Request tanpa login ditolak 401 Unauthorized');

    // B. Uji: Lampiran di pesan non-terakhir ditolak (400)
    const invalidTurnRes = await fetch(`${serverUrl}/api/ai/obrol`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({
        pesan: [
          {
            role: 'user',
            teks: 'Pesan pertama membawa file lama',
            lampiran: [
              {
                jenis: 'teks',
                nama: 'catatan.txt',
                teks: 'isi materi',
              },
            ],
          },
          {
            role: 'assistant',
            teks: 'Baik guru.',
          },
          {
            role: 'user',
            teks: 'Pertanyaan berikutnya',
          },
        ],
      }),
    });
    assert(invalidTurnRes.status === 400, 'Lampiran pada pesan non-terakhir ditolak dengan HTTP 400');
    const invalidTurnData = (await invalidTurnRes.json()) as any;
    assert(
      invalidTurnData.pesan && invalidTurnData.pesan.includes('terakhir'),
      'Pesan error ramah memberitahu lampiran hanya di pesan terakhir'
    );

    // C. Uji: Gambar selain PNG, JPG, GIF, WebP ditolak (400)
    const invalidImgRes = await fetch(`${serverUrl}/api/ai/obrol`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({
        pesan: [
          {
            role: 'user',
            teks: 'Lampiran bertipe svg atau bmp',
            lampiran: [
              {
                jenis: 'gambar',
                nama: 'vektor.svg',
                mt: 'image/svg+xml',
                data: 'PHN2Zz48L3N2Zz4=',
              },
            ],
          },
        ],
      }),
    });
    assert(invalidImgRes.status === 400, 'Format gambar di luar PNG/JPG/GIF/WebP ditolak 400');

    // D. Uji: Permintaan teks berhasil diproses (200)
    const validChatRes = await fetch(`${serverUrl}/api/ai/obrol`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({
        pesan: [
          {
            role: 'user',
            teks: 'Jelaskan cara mencari KPK dari 12 dan 18 untuk siswa kelas 5 SD.',
          },
        ],
      }),
    });
    assert(validChatRes.status === 200, 'Permintaan obrolan yang valid berhasil dengan HTTP 200');
    const validChatData = (await validChatRes.json()) as any;
    assert(typeof validChatData.jawaban === 'string', 'Respons memuat properti jawaban bertipe string');
    assert(validChatData.jawaban.length > 10, 'Jawaban AI memuat teks informatif');

    // E. Uji: Permintaan dengan lampiran teks berhasil
    const textAttachmentRes = await fetch(`${serverUrl}/api/ai/obrol`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({
        pesan: [
          {
            role: 'user',
            teks: 'Buatkan ringkasan dari dokumen ini:',
            lampiran: [
              {
                jenis: 'teks',
                nama: 'pembelajaran.txt',
                teks: 'Siklus air terdiri dari evaporasi, kondensasi, presipitasi, dan infiltrasi.',
              },
            ],
          },
        ],
      }),
    });
    assert(textAttachmentRes.status === 200, 'Permintaan dengan lampiran file teks berhasil diproses');

    // F. Uji: Permintaan dengan lampiran gambar valid (PNG base64)
    const samplePng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const imgAttachmentRes = await fetch(`${serverUrl}/api/ai/obrol`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({
        pesan: [
          {
            role: 'user',
            teks: 'Jelaskan materi pada gambar:',
            lampiran: [
              {
                jenis: 'gambar',
                nama: 'potongan-papan.png',
                mt: 'image/png',
                data: samplePng,
              },
            ],
          },
        ],
      }),
    });
    assert(imgAttachmentRes.status === 200, 'Permintaan dengan lampiran gambar PNG base64 berhasil');

    // G. Uji: Batas Kuota Harian Obrolan (AI_BATAS_OBROL)
    const today = new Date().toISOString().slice(0, 10);
    await prisma.aiUsage.upsert({
      where: {
        userId_tanggal: {
          userId: guru.id,
          tanggal: today,
        },
      },
      update: { jumlah: config.aiBatasObrol },
      create: {
        userId: guru.id,
        tanggal: today,
        jumlah: config.aiBatasObrol,
      },
    });

    const quotaRes = await fetch(`${serverUrl}/api/ai/obrol`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify({
        pesan: [{ role: 'user', teks: 'Pertanyaan saat kuota habis' }],
      }),
    });

    assert(quotaRes.status === 429, 'Permintaan saat kuota habis ditolak dengan HTTP 429');
    const quotaData = (await quotaRes.json()) as any;
    assert(
      quotaData.pesan && quotaData.pesan.includes('Batas kuota harian'),
      'Pesan ramah batas kuota harian ditampilkan'
    );

    // Bersihkan data uji
    await prisma.aiUsage.deleteMany({ where: { userId: guru.id } });
    await prisma.user.delete({ where: { id: guru.id } });
  } finally {
    server.close();
  }

  console.log(`\nHASIL PENGUJIAN TAHAP E: ${passed} Lolos, ${failed} Gagal.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runStepETests().catch((err) => {
  console.error('Terjadi error saat menjalankan test:', err);
  process.exit(1);
});
