import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { app } from '../server/src/index';
import { prisma } from '../server/src/db';
import { config } from '../server/src/config';
import { wrap } from '../client/src/pages/papan/lib/obrol';
import { Board } from '../client/src/pages/papan/engine/board';
import { pngDataUrl } from '../client/src/pages/papan/engine/export';
import { TextObj } from '../client/src/pages/papan/engine/types';

// Helper membuat server test sementara
function startTestServer(): Promise<{ server: http.Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
  });
}

describe('Pengujian Otomatis Papan Tulis Tahap E: Obrolan Asisten AI', () => {
  it('1. Uji fungsi wrap teks catatan papan tulis', () => {
    const rawMarkdown = `**Pengenalan Pecahan**: Pecahan adalah bagian dari satu kesatuan utuh. Contohnya pecahan 1/2 berarti satu bagian dari dua bagian sama besar. \`rumus dasar: a/b\`.`;
    const wrapped = wrap(rawMarkdown, 38);

    assert.ok(wrapped.length > 0, 'Hasil wrap tidak boleh kosong');
    assert.strictEqual(wrapped.includes('**'), false, 'Tanda bold markdown harus dibuang');
    assert.strictEqual(wrapped.includes('`'), false, 'Tanda backtick harus dibuang');

    const lines = wrapped.split('\n');
    for (const line of lines) {
      if (line.trim().length > 0) {
        // Setiap baris tidak melebihi batas batas sekitar 38 karakter (toleransi 1 kata terpanjang)
        assert.ok(line.length <= 48, `Baris "${line}" melebihi batas wajar panjang`);
      }
    }
  });

  it('2. Uji fungsi kanvas: addNote berlabel Dibuat AI dan Undo/Redo', () => {
    const mockCanvas = {
      getContext: () => ({
        font: '',
        measureText: (txt: string) => ({ width: txt.length * 8 }),
      }),
      width: 1200,
      height: 800,
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1200, height: 800 }),
    } as any;

    const board = new Board(mockCanvas, []);
    assert.strictEqual(board.objs.length, 0, 'Kanvas awal harus kosong');

    // Kosongkan pngDataUrl
    const emptyPng = pngDataUrl(board.objs);
    assert.strictEqual(emptyPng, null, 'Kanvas kosong harus menghasilkan png null');

    // Tambahkan catatan AI
    const noteText = wrap('Ini adalah ringkasan materi pecahan yang dibuat oleh Asisten AI.');
    const noteObj = board.addNote(noteText, { ai: true, fill: '#fde68a', fs: 22 });

    assert.ok(noteObj, 'Objek catatan harus berhasil dibuat');
    assert.strictEqual(board.objs.length, 1, 'Kanvas harus memiliki 1 objek');
    assert.strictEqual(noteObj.type, 'text');
    assert.strictEqual(noteObj.ai, true, 'Objek harus memiliki properti ai = true');
    assert.strictEqual(noteObj.fs, 22, 'Ukuran font harus 22px');
    assert.strictEqual(noteObj.fill, '#fde68a', 'Fill catatan harus kuning lembut #fde68a');

    // Uji Undo: catatan AI terhapus
    assert.strictEqual(board.canUndo(), true, 'Harus bisa undo');
    board.undo();
    assert.strictEqual(board.objs.length, 0, 'Undo harus menghapus catatan dari kanvas');

    // Uji Redo: catatan AI kembali
    assert.strictEqual(board.canRedo(), true, 'Harus bisa redo');
    board.redo();
    assert.strictEqual(board.objs.length, 1, 'Redo harus mengembalikan catatan ke kanvas');
    const restoredObj = board.objs[0] as TextObj;
    assert.strictEqual(restoredObj.ai, true);
    assert.strictEqual(restoredObj.text, noteText);
  });

  it('3. Uji Endpoint Server POST /api/ai/obrol', async () => {
    const { server, baseUrl } = await startTestServer();

    try {
      // Login guru untuk mendapatkan cookie sesi
      const loginRes = await fetch(`${baseUrl}/api/auth/masuk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: config.seedGuruEmail,
          password: config.seedGuruPassword,
        }),
      });

      assert.strictEqual(loginRes.status, 200, 'Login guru demo harus berhasil');
      const cookie = loginRes.headers.get('set-cookie');
      assert.ok(cookie, 'Cookie sesi wajib ada');

      // A. Uji validasi: Lampiran pada pesan non-terakhir harus ditolak (400)
      const invalidTurnRes = await fetch(`${baseUrl}/api/ai/obrol`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
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
                  teks: 'isi teks materi',
                },
              ],
            },
            {
              role: 'assistant',
              teks: 'Baik guru, saya mengerti.',
            },
            {
              role: 'user',
              teks: 'Pertanyaan lanjutan tanpa lampiran',
            },
          ],
        }),
      });

      assert.strictEqual(invalidTurnRes.status, 400, 'Lampiran pada pesan non-terakhir harus ditolak dengan 400');
      const invalidTurnData = (await invalidTurnRes.json()) as any;
      assert.ok(
        invalidTurnData.pesan?.includes('terakhir') || invalidTurnData.pesan?.includes('Lampiran'),
        'Pesan error harus ramah dan spesifik'
      );

      // B. Uji validasi: Format gambar tidak valid harus ditolak (400)
      const invalidImgRes = await fetch(`${baseUrl}/api/ai/obrol`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify({
          pesan: [
            {
              role: 'user',
              teks: 'Gambar dengan format bmp tidak diizinkan',
              lampiran: [
                {
                  jenis: 'gambar',
                  nama: 'foto.bmp',
                  mt: 'image/bmp',
                  data: 'Qk1GAAAAAAAAADYAAAAoAAAABAAAAAQAAAABABgAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAA',
                },
              ],
            },
          ],
        }),
      });

      assert.strictEqual(invalidImgRes.status, 400, 'Gambar non PNG/JPG/WebP/GIF harus ditolak dengan 400');
      const invalidImgData = (await invalidImgRes.json()) as any;
      assert.ok(
        invalidImgData.pesan?.includes('gambar') || invalidImgData.pesan?.includes('didukung'),
        'Pesan error harus menjelaskan format yang diizinkan'
      );

      // C. Uji permintaan obrolan teks biasa (200)
      const validChatRes = await fetch(`${baseUrl}/api/ai/obrol`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify({
          pesan: [
            {
              role: 'user',
              teks: 'Jelaskan konsep pecahan senilai untuk kelas 4 SD secara singkat.',
            },
          ],
        }),
      });

      assert.strictEqual(validChatRes.status, 200, 'Permintaan obrolan yang valid harus berhasil 200');
      const validChatData = (await validChatRes.json()) as any;
      assert.ok(typeof validChatData.jawaban === 'string', 'Respons harus memuat properti jawaban string');
      assert.ok(validChatData.jawaban.length > 5, 'Jawaban AI tidak boleh kosong');

      // D. Uji permintaan dengan lampiran file teks valid
      const chatWithTextRes = await fetch(`${baseUrl}/api/ai/obrol`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify({
          pesan: [
            {
              role: 'user',
              teks: 'Tolong buatkan 2 pertanyaan dari rangkuman ini:',
              lampiran: [
                {
                  jenis: 'teks',
                  nama: 'rangkuman-ipa.txt',
                  teks: 'Fotosintesis adalah proses tumbuhan hijau membuat makanan dengan bantuan sinar matahari.',
                },
              ],
            },
          ],
        }),
      });

      assert.strictEqual(chatWithTextRes.status, 200, 'Permintaan dengan lampiran teks harus berhasil');
      const chatWithTextData = (await chatWithTextRes.json()) as any;
      assert.ok(typeof chatWithTextData.jawaban === 'string');

      // E. Uji permintaan dengan lampiran gambar PNG base64 valid
      // 1x1 pixel transparan PNG
      const samplePng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const chatWithImgRes = await fetch(`${baseUrl}/api/ai/obrol`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify({
          pesan: [
            {
              role: 'user',
              teks: 'Apa yang ada di dalam gambar ini?',
              lampiran: [
                {
                  jenis: 'gambar',
                  nama: 'soal-matematika.png',
                  mt: 'image/png',
                  data: samplePng,
                },
              ],
            },
          ],
        }),
      });

      assert.strictEqual(chatWithImgRes.status, 200, 'Permintaan dengan lampiran gambar harus berhasil');
      const chatWithImgData = (await chatWithImgRes.json()) as any;
      assert.ok(typeof chatWithImgData.jawaban === 'string');

      // F. Uji batas kuota harian: simulasikan kuota tercapai
      const userGuru = await prisma.user.findUnique({
        where: { email: config.seedGuruEmail },
      });
      assert.ok(userGuru, 'User guru harus ada di database');

      const today = new Date().toISOString().slice(0, 10);
      // Set jumlah penggunaan mencapai batas AI_BATAS_OBROL (40)
      await prisma.aiUsage.upsert({
        where: {
          userId_tanggal: {
            userId: userGuru.id,
            tanggal: today,
          },
        },
        update: { jumlah: config.aiBatasObrol },
        create: {
          userId: userGuru.id,
          tanggal: today,
          jumlah: config.aiBatasObrol,
        },
      });

      const quotaExceededRes = await fetch(`${baseUrl}/api/ai/obrol`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify({
          pesan: [{ role: 'user', teks: 'Apakah kuota saya masih ada?' }],
        }),
      });

      assert.strictEqual(quotaExceededRes.status, 429, 'Permintaan saat kuota habis harus mengembalikan HTTP 429');
      const quotaExceededData = (await quotaExceededRes.json()) as any;
      assert.ok(
        quotaExceededData.pesan?.includes('Batas kuota harian') || quotaExceededData.pesan?.includes('tercapai'),
        'Pesan error harus ramah dan memberitahu batas tercapai'
      );

      // Kembalikan jumlah kuota guru ke 0 agar tidak mengganggu sesi pengguna
      await prisma.aiUsage.update({
        where: {
          userId_tanggal: {
            userId: userGuru.id,
            tanggal: today,
          },
        },
        data: { jumlah: 0 },
      });
    } finally {
      server.close();
    }
  });
});
