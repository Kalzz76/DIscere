import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { prisma } from '../server/src/db';
import { aiRouter } from '../server/src/routes/ai';
import { config } from '../server/src/config';
import { wrapText, formatAiResponseForCanvas } from '../client/src/pages/papan/components/AiPopup';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  [PASS] ${msg}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${msg}`);
    failedTests++;
  }
}

async function runTanyaAiTests() {
  console.log('=== MEMULAI PENGUJIAN OTOMATIS TANYA AI PAPAN TULIS (PROMPT C) ===\n');

  // Setup server Express sementara
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  app.use('/api/ai', aiRouter);

  const server = http.createServer(app);
  const TEST_PORT = 3355;
  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));
  const serverUrl = `http://localhost:${TEST_PORT}`;

  // Siapkan user guru demo dan siswa demo di database
  const guruEmail = `guru-tanya-ai-${Date.now()}@discere.test`;
  const guru = await prisma.user.create({
    data: {
      nama: 'Bapak Guru Matematika',
      email: guruEmail,
      passwordHash: 'hash12345678',
      role: 'guru',
      sekolah: 'SD Negeri Cerdas 1',
      status: 'aktif',
    },
  });

  const siswaEmail = `siswa-tanya-ai-${Date.now()}@discere.test`;
  const siswa = await prisma.user.create({
    data: {
      nama: 'Siswa Percobaan',
      email: siswaEmail,
      passwordHash: 'hash12345678',
      role: 'siswa',
      sekolah: 'SD Negeri Cerdas 1',
      status: 'aktif',
    },
  });

  const guruToken = jwt.sign({ userId: guru.id, role: 'guru' }, config.jwtSecret, { expiresIn: '1h' });
  const siswaToken = jwt.sign({ userId: siswa.id, role: 'siswa' }, config.jwtSecret, { expiresIn: '1h' });

  // Gambar contoh base64 PNG (1x1 pixel transparan / putih)
  const dummyImagePng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  try {
    // ------------------------------------------------------------------------
    // 1. Uji Otentikasi & Otorisasi Endpoint /api/ai/jawab
    // ------------------------------------------------------------------------
    console.log('1. Uji Otentikasi & Otorisasi:');

    // Tanpa login -> 401
    const resNoAuth = await fetch(`${serverUrl}/api/ai/jawab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gambar: dummyImagePng }),
    });
    assert(resNoAuth.status === 401, 'Request tanpa login ditolak dengan status 401');

    // Login sebagai Siswa -> 403 (Hanya Guru/Admin)
    const resSiswa = await fetch(`${serverUrl}/api/ai/jawab`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${siswaToken}`,
      },
      body: JSON.stringify({ gambar: dummyImagePng }),
    });
    assert(resSiswa.status === 403, 'Request dari akun non-guru (siswa) ditolak dengan status 403');

    // ------------------------------------------------------------------------
    // 2. Uji Tanya AI oleh Guru: Format Terstruktur & Fallback Ramah
    // ------------------------------------------------------------------------
    console.log('\n2. Uji Tanya AI Guru (Jawaban, Rumus, Langkah):');

    const resTanya1 = await fetch(`${serverUrl}/api/ai/jawab`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guruToken}`,
      },
      body: JSON.stringify({
        gambar: dummyImagePng,
      }),
    });
    const dataTanya1 = await resTanya1.json();
    assert(resTanya1.status === 200, 'POST /api/ai/jawab guru berhasil dengan status 200');
    assert(typeof dataTanya1.jawaban === 'string' && dataTanya1.jawaban.length > 0, 'Respons memuat bagian "jawaban"');
    assert(typeof dataTanya1.rumus === 'string', 'Respons memuat bagian "rumus" (atau "-")');
    assert(typeof dataTanya1.langkah === 'string' && dataTanya1.langkah.length > 0, 'Respons memuat bagian "langkah"');
    assert(dataTanya1.dariCache === false, 'Panggilan pertama dieksekusi segar (dariCache: false)');

    // Tanya dengan pertanyaan tambahan
    const resTanya2 = await fetch(`${serverUrl}/api/ai/jawab`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guruToken}`,
      },
      body: JSON.stringify({
        gambar: dummyImagePng,
        pertanyaan: 'Jelaskan rumus keliling lingkaran',
      }),
    });
    const dataTanya2 = await resTanya2.json();
    assert(resTanya2.status === 200, 'Tanya AI dengan pertanyaan khusus berhasil diproses');
    assert(dataTanya2.dariCache === false, 'Pertanyaan berbeda dieksekusi tanpa cache sebelumnya');

    // ------------------------------------------------------------------------
    // 3. Uji Caching SHA-256 (Panggilan Kedua dengan Data Identik)
    // ------------------------------------------------------------------------
    console.log('\n3. Uji Caching Otomatis di tabel ai_cache:');

    const resCache = await fetch(`${serverUrl}/api/ai/jawab`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guruToken}`,
      },
      body: JSON.stringify({
        gambar: dummyImagePng,
        pertanyaan: 'Jelaskan rumus keliling lingkaran',
      }),
    });
    const dataCache = await resCache.json();
    assert(resCache.status === 200, 'Panggilan kedua berhasil');
    assert(dataCache.dariCache === true, 'Panggilan kedua terbukti dilayani dari cache (dariCache: true)');
    assert(dataCache.jawaban === dataTanya2.jawaban, 'Isi jawaban cache sama persis dengan panggilan pertama');

    // ------------------------------------------------------------------------
    // 4. Uji Batas Kuota Harian (Tabel ai_usage)
    // ------------------------------------------------------------------------
    console.log('\n4. Uji Batas Kuota Harian Guru:');

    // Naikkan penggunaan guru ke batas kuota maksimal di DB
    const today = new Date().toISOString().slice(0, 10);
    await prisma.aiUsage.upsert({
      where: { userId_tanggal: { userId: guru.id, tanggal: today } },
      update: { jumlah: config.aiBatasHarian },
      create: { userId: guru.id, tanggal: today, jumlah: config.aiBatasHarian },
    });

    const resExceeded = await fetch(`${serverUrl}/api/ai/jawab`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guruToken}`,
      },
      body: JSON.stringify({
        gambar: dummyImagePng,
        pertanyaan: 'Pertanyaan baru setelah limit',
      }),
    });
    const dataExceeded = await resExceeded.json();
    assert(resExceeded.status === 429, 'Server mengembalikan status 429 saat kuota harian habis');
    assert(
      dataExceeded.pesan.includes('Batas kuota harian') || dataExceeded.pesan.includes('tercapai'),
      'Pesan batas kuota ramah dan informatif dalam Bahasa Indonesia'
    );

    // ------------------------------------------------------------------------
    // 5. Uji Helper Pembungkusan Teks (wrapText) & Kartu Kanvas
    // ------------------------------------------------------------------------
    console.log('\n5. Uji Pembungkusan Teks & Format Kartu Kanvas:');

    const panjangTeks = 'Ini adalah contoh kalimat yang sangat panjang sekali untuk menguji pemecahan baris kartu AI di kanvas papan tulis';
    const wrapped = wrapText(panjangTeks, 38);
    const lines = wrapped.split('\n');
    assert(lines.length >= 2, 'Teks panjang otomatis dibungkus menjadi beberapa baris');
    assert(lines.every((l) => l.length <= 45), 'Tiap baris tidak melebihi lebar batas baca wajar');

    const formattedCanvas = formatAiResponseForCanvas({
      jawaban: '15 cm',
      rumus: 'K = 2 * pi * r',
      langkah: '1. Masukkan nilai r = 2.5\n2. Hitung perkalian',
    });
    assert(formattedCanvas.includes('Jawaban:\n'), 'Format kartu kanvas diawali label Jawaban');
    assert(formattedCanvas.includes('Rumus:\n'), 'Format kartu kanvas memuat label Rumus');
    assert(formattedCanvas.includes('Langkah:\n'), 'Format kartu kanvas memuat label Langkah');

    // ------------------------------------------------------------------------
    // 6. Uji Keamanan: Tidak Ada Kunci API atau Panggilan Langsung di Klien
    // ------------------------------------------------------------------------
    console.log('\n6. Uji Keamanan Klien (Privasi Kunci API):');

    const clientSrc = path.resolve(__dirname, '../client/src');
    const clientFiles = fs.readdirSync(clientSrc, { recursive: true }) as string[];

    let hasClientAnthropicCall = false;
    let hasClientApiKeyStorage = false;

    for (const f of clientFiles) {
      if (typeof f === 'string' && (f.endsWith('.ts') || f.endsWith('.tsx'))) {
        const fullPath = path.join(clientSrc, f);
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes('api.anthropic.com')) {
          hasClientAnthropicCall = true;
        }
        if (content.includes("localStorage.getItem('discere-key')") || content.includes("localStorage.setItem('discere-key'")) {
          hasClientApiKeyStorage = true;
        }
      }
    }

    assert(!hasClientAnthropicCall, 'Tidak ada panggilan langsung ke api.anthropic.com di kode klien (semua lewat server)');
    assert(!hasClientApiKeyStorage, 'Tidak ada penyimpanan discere-key di localStorage browser');
  } finally {
    // Bersihkan data uji di database
    await prisma.aiCache.deleteMany({});
    await prisma.aiUsage.deleteMany({ where: { userId: guru.id } });
    await prisma.user.delete({ where: { id: guru.id } });
    await prisma.user.delete({ where: { id: siswa.id } });

    server.close();
  }

  console.log(`\nHASIL PENGUJIAN TANYA AI PAPAN: ${passedTests} Lolos, ${failedTests} Gagal.\n`);
  if (failedTests > 0) {
    process.exit(1);
  }
}

runTanyaAiTests().catch((err) => {
  console.error('Terjadi error saat menjalankan pengujian:', err);
  process.exit(1);
});

