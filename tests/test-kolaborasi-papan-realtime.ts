import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { prisma } from '../server/src/db';
import { setupBoardSocket } from '../server/src/realtime/papan';
import { papanRouter } from '../server/src/routes/papan';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { config } from '../server/src/config';

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

async function runRealtimeCollaborationTests() {
  console.log('=== MEMULAI PENGUJIAN OTOMATIS KOLABORASI PAPAN REAL-TIME (PROMPT B) ===\n');

  // Setup server Express & Socket.IO sementara untuk pengujian
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  app.use('/api/papan', papanRouter);

  const server = http.createServer(app);
  const ioServer = new Server(server, { cors: { origin: '*' } });
  setupBoardSocket(ioServer);

  const TEST_PORT = 3344;
  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));
  const serverUrl = `http://localhost:${TEST_PORT}`;

  // Siapkan data user guru demo dan papan uji di DB
  const guruEmail = `guru-kolab-${Date.now()}@discere.test`;
  const guru = await prisma.user.create({
    data: {
      nama: 'Ibu Guru Ani',
      email: guruEmail,
      passwordHash: 'hash12345678',
      role: 'guru',
      sekolah: 'SD Negeri 1 Merdeka',
      status: 'aktif',
    },
  });

  const guruToken = jwt.sign({ userId: guru.id, role: 'guru' }, config.jwtSecret, { expiresIn: '1h' });

  const board = await prisma.board.create({
    data: {
      ownerId: guru.id,
      judul: 'Papan Kolaborasi Kelas 5',
      data: JSON.stringify({ versi: 1, objs: [] }),
    },
  });

  try {
    // ------------------------------------------------------------------------
    // 1. Uji REST API Tautan Bagi (POST, GET, DELETE)
    // ------------------------------------------------------------------------
    console.log('1. Uji REST API Tautan Berbagi:');

    // POST /api/papan/:id/bagikan peran 'editor'
    const resCreateEditor = await fetch(`${serverUrl}/api/papan/${board.id}/bagikan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guruToken}`,
      },
      body: JSON.stringify({ peran: 'editor' }),
    });
    const dataEditor = await resCreateEditor.json();
    assert(resCreateEditor.status === 201, 'POST /api/papan/:id/bagikan mengembalikan status 201');
    assert(!!dataEditor.token && dataEditor.token.length >= 24, 'Token acak panjang berhasil digenerate');
    assert(dataEditor.share.peran === 'editor', 'Peran share terdaftar sebagai editor');

    const editorToken = dataEditor.token;

    // GET /api/papan/:id/bagikan
    const resGetShare = await fetch(`${serverUrl}/api/papan/${board.id}/bagikan`, {
      headers: { Authorization: `Bearer ${guruToken}` },
    });
    const dataGetShare = await resGetShare.json();
    assert(dataGetShare.aktif === true, 'GET /api/papan/:id/bagikan mendeteksi tautan aktif');
    assert(dataGetShare.token === editorToken, 'Token aktif sesuai dengan yang baru dibuat');

    // Rute Publik GET /api/papan/share/:token
    const resPublicCheck = await fetch(`${serverUrl}/api/papan/share/${editorToken}`);
    const dataPublicCheck = await resPublicCheck.json();
    assert(resPublicCheck.status === 200, 'Rute publik /api/papan/share/:token dapat diakses tanpa login');
    assert(dataPublicCheck.share.judul === 'Papan Kolaborasi Kelas 5', 'Informasi judul papan terbaca akurat');
    assert(dataPublicCheck.share.peran === 'editor', 'Peran tautan editor terbaca akurat');

    // ------------------------------------------------------------------------
    // 2. Uji Socket.IO Kolaborasi Real-Time Guru & Editor
    // ------------------------------------------------------------------------
    console.log('\n2. Uji Socket.IO Koneksi Guru & Editor:');

    // Socket Guru
    const socketGuru: ClientSocket = ioc(serverUrl, {
      extraHeaders: { cookie: `discere_token=${guruToken}` },
      transports: ['websocket'],
    });

    // Socket Kolaborator A (Editor)
    const socketEditor: ClientSocket = ioc(serverUrl, {
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      let connectedCount = 0;
      const check = () => {
        connectedCount++;
        if (connectedCount === 2) resolve();
      };
      socketGuru.on('connect', check);
      socketEditor.on('connect', check);
    });

    // Guru bergabung ke papan:gabung
    const guruJoinRes: any = await new Promise((resolve) => {
      socketGuru.emit(
        'papan:gabung',
        { boardId: board.id, nama: 'Ibu Guru Ani' },
        (res: any) => resolve(res)
      );
    });
    assert(guruJoinRes.success === true, 'Guru berhasil bergabung ke room socket papan');
    assert(guruJoinRes.isOwner === true, 'Guru diidentifikasi sebagai pemilik papan');
    assert(guruJoinRes.peran === 'editor', 'Guru memiliki peran editor penuh');

    // Editor bergabung via token
    const editorJoinRes: any = await new Promise((resolve) => {
      socketEditor.emit(
        'papan:gabung',
        { token: editorToken, nama: 'Siswa Budi' },
        (res: any) => resolve(res)
      );
    });
    assert(editorJoinRes.success === true, 'Siswa Editor berhasil bergabung via token');
    assert(editorJoinRes.peran === 'editor', 'Siswa Editor mendapatkan peran editor');
    assert(editorJoinRes.isOwner === false, 'Siswa bukan pemilik papan');

    // ------------------------------------------------------------------------
    // 3. Uji Siaran Real-Time Coretan & Aturan Konflik
    // ------------------------------------------------------------------------
    console.log('\n3. Uji Siaran Real-Time & Coretan Editor:');

    const testStroke = {
      id: 'stroke-budi-1',
      type: 'stroke',
      color: '#e11d48',
      size: 4,
      st: 'pen',
      pts: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
    };

    // Editor mengirim coretan
    const guruReceivedPromise = new Promise<any>((resolve) => {
      socketGuru.once('papan:ubah', (ops) => resolve(ops));
    });

    const editEmitRes: any = await new Promise((resolve) => {
      socketEditor.emit(
        'papan:ubah',
        {
          boardId: board.id,
          tambah: [testStroke],
        },
        (res: any) => resolve(res)
      );
    });
    assert(editEmitRes.success === true, 'Server menerima perubahan dari Editor');

    const opsDiterimaGuru = await guruReceivedPromise;
    assert(
      Array.isArray(opsDiterimaGuru.tambah) && opsDiterimaGuru.tambah[0].id === 'stroke-budi-1',
      'Guru menerima siaran coretan real-time dari Editor'
    );

    // ------------------------------------------------------------------------
    // 4. Uji Keamanan: Server MENOLAK Perubahan dari Viewer
    // ------------------------------------------------------------------------
    console.log('\n4. Uji Keamanan Ketat: Penolakan Perubahan dari Viewer:');

    // Buat tautan viewer baru
    const resCreateViewer = await fetch(`${serverUrl}/api/papan/${board.id}/bagikan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guruToken}`,
      },
      body: JSON.stringify({ peran: 'viewer' }),
    });
    const dataViewer = await resCreateViewer.json();
    const viewerToken = dataViewer.token;

    const socketViewer: ClientSocket = ioc(serverUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => socketViewer.on('connect', () => resolve()));

    const viewerJoinRes: any = await new Promise((resolve) => {
      socketViewer.emit(
        'papan:gabung',
        { token: viewerToken, nama: 'Siswa Penonton' },
        (res: any) => resolve(res)
      );
    });
    assert(viewerJoinRes.success === true, 'Viewer berhasil masuk ke papan');
    assert(viewerJoinRes.peran === 'viewer', 'Peran terdaftar sebagai viewer');

    // Viewer mencoba memaksa mengirim perubahan (seperti hacking lewat browser console)
    let guruMenerimaHacked = false;
    const hackerListener = () => {
      guruMenerimaHacked = true;
    };
    socketGuru.on('papan:ubah', hackerListener);

    const viewerHackRes: any = await new Promise((resolve) => {
      socketViewer.emit(
        'papan:ubah',
        {
          boardId: board.id,
          tambah: [{ id: 'hacked-stroke', type: 'stroke', pts: [{ x: 0, y: 0 }] }],
        },
        (res: any) => resolve(res)
      );
    });

    assert(viewerHackRes.success === false, 'Server menolak perubahan dari Viewer');
    assert(
      viewerHackRes.pesan.includes('Viewer hanya dapat melihat') || viewerHackRes.pesan.includes('Akses ditolak'),
      'Pesan penolakan server jelas dan informatif'
    );

    await new Promise((r) => setTimeout(r, 100));
    assert(!guruMenerimaHacked, 'Perubahan ilegal dari Viewer TIDAK disiarkan ke pengguna lain');
    socketGuru.off('papan:ubah', hackerListener);

    // ------------------------------------------------------------------------
    // 5. Uji Pencabutan Tautan Berbagi
    // ------------------------------------------------------------------------
    console.log('\n5. Uji Pencabutan Tautan Berbagi:');

    const cabutPromise = new Promise<any>((resolve) => {
      socketViewer.once('papan:akses_dicabut', (data) => resolve(data));
    });

    const resCabut = await fetch(`${serverUrl}/api/papan/bagi/${viewerToken}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${guruToken}` },
    });
    assert(resCabut.status === 200, 'DELETE /api/papan/bagi/:token mengembalikan status 200');

    const eventCabut = await cabutPromise;
    assert(eventCabut.token === viewerToken, 'Socket menyiarkan event papan:akses_dicabut ke peserta');

    // Coba gabung ulang dengan token yang dicabut
    const socketBaru: ClientSocket = ioc(serverUrl, { transports: ['websocket'] });
    await new Promise<void>((r) => socketBaru.on('connect', () => r()));

    const joinDicabutRes: any = await new Promise((resolve) => {
      socketBaru.emit(
        'papan:gabung',
        { token: viewerToken, nama: 'Orang Baru' },
        (res: any) => resolve(res)
      );
    });
    assert(joinDicabutRes.success === false, 'Tautan yang dicabut tidak dapat digunakan lagi untuk bergabung');

    // ------------------------------------------------------------------------
    // 6. Uji Penyimpanan Otomatis Memori & Debounce ke Database
    // ------------------------------------------------------------------------
    console.log('\n6. Uji Persistensi Database:');

    // Tunggu debounce simpan (2 detik)
    console.log('  Menunggu penyimpanan debounce 2.2 detik...');
    await new Promise((r) => setTimeout(r, 2300));

    const boardInDb = await prisma.board.findUnique({
      where: { id: board.id },
      select: { data: true },
    });
    const parsedData = JSON.parse(boardInDb?.data || '{}');
    const hasTestStroke = parsedData.objs.some((o: any) => o.id === 'stroke-budi-1');
    assert(hasTestStroke === true, 'Coretan dari Editor berhasil tersimpan secara permanen di database');

    // Bersihkan koneksi socket terlebih dahulu
    socketGuru.disconnect();
    socketEditor.disconnect();
    socketViewer.disconnect();
    socketBaru.disconnect();
    await new Promise((r) => setTimeout(r, 200));
  } finally {
    await prisma.boardShare.deleteMany({ where: { boardId: board.id } });
    await prisma.board.delete({ where: { id: board.id } });
    await prisma.user.delete({ where: { id: guru.id } });

    ioServer.close();
    server.close();
  }

  console.log(`\nHASIL PENGUJIAN KOLABORASI REAL-TIME: ${passedTests} Lolos, ${failedTests} Gagal.\n`);
  if (failedTests > 0) {
    process.exit(1);
  }
}

runRealtimeCollaborationTests().catch((err) => {
  console.error('Terjadi error saat menjalankan pengujian:', err);
  process.exit(1);
});
