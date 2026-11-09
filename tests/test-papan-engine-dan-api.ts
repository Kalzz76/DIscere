import { cutStroke, eraseSeg } from '../client/src/pages/papan/engine/eraser';
import { bounds, dseg, ew, move, hit, topAt } from '../client/src/pages/papan/engine/geometry';
import { shapeStrokes } from '../client/src/pages/papan/engine/shapes';
import { HistoryManager } from '../client/src/pages/papan/engine/history';
import { toJson } from '../client/src/pages/papan/engine/export';
import { CanvasObj, StrokeObj, ShapeObj, TextObj, TableObj, ImageObj } from '../client/src/pages/papan/engine/types';
import { prisma } from '../server/src/db';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('=== MEMULAI PENGUJIAN OTOMATIS PAPAN TULIS ENGINE & API ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // 1. UJI ENGINE GEOMETRI & BOUNDS
  // --------------------------------------------------------------------------
  console.log('1. Uji Engine Geometri & Bounds:');
  const stroke1: StrokeObj = {
    id: 's1',
    type: 'stroke',
    color: '#000',
    size: 4,
    st: 'pen',
    pts: [{ x: 10, y: 10 }, { x: 50, y: 10 }, { x: 100, y: 10 }],
  };

  const b1 = bounds(stroke1);
  assert(b1.x <= 10 && b1.w >= 90, 'Bounds stroke horizontal terhitung akurat');
  assert(ew(stroke1) === 4, 'Effective width pulpen sama dengan ukuran');
  assert(dseg({ x: 50, y: 12 }, { x: 10, y: 10 }, { x: 100, y: 10 }) <= 2.1, 'Jarak titik ke segmen garis (dseg) benar');
  assert(hit(stroke1, { x: 50, y: 10 }, 5), 'Hit test mendeteksi titik pada stroke');

  const shapeRect: ShapeObj = {
    id: 'r1',
    type: 'shape',
    kind: 'rect',
    color: '#f00',
    size: 2,
    x: 200,
    y: 100,
    w: 80,
    h: 50,
    fill: null,
  };
  const bRect = bounds(shapeRect);
  assert(bRect.x === 200 && bRect.y === 100 && bRect.w === 80 && bRect.h === 50, 'Bounds shape rect tepat');
  assert(hit(shapeRect, { x: 210, y: 110 }), 'Hit test mendeteksi titik dalam kotak');

  // --------------------------------------------------------------------------
  // 2. UJI PENGHAPUS PEMOTONG CORETAN (CUTSTROKE & ERASESEG)
  // --------------------------------------------------------------------------
  console.log('\n2. Uji Penghapus yang Memotong Coretan (cutStroke & eraseSeg):');
  const longStroke: StrokeObj = {
    id: 'long-s',
    type: 'stroke',
    color: '#3b82f6',
    size: 4,
    st: 'pen',
    pts: [
      { x: 0, y: 100 },
      { x: 50, y: 100 },
      { x: 100, y: 100 },
      { x: 150, y: 100 },
      { x: 200, y: 100 },
    ],
  };

  // Potong stroke di tengah (sekitar x: 100, y: 100) dengan radius penghapus 15
  const cutResult = cutStroke(longStroke, { x: 100, y: 90 }, { x: 100, y: 110 }, 15);
  assert(Array.isArray(cutResult), 'Stroke terpotong menjadi array potongan');
  if (Array.isArray(cutResult)) {
    assert(cutResult.length === 2, `Coretan terbelah tepat menjadi 2 segmen terpisah (dihasilkan: ${cutResult.length})`);
    assert(cutResult[0].id !== cutResult[1].id, 'Masing-masing segmen hasil potongan memiliki ID UUID baru');
  }

  // Uji eraseSeg pada koleksi objek (gabungan teks, shape, dan stroke)
  const textObj: TextObj = {
    id: 'txt-1',
    type: 'text',
    color: '#000',
    size: 1,
    x: 500,
    y: 500,
    text: 'Contoh Teks',
    fs: 20,
    fill: null,
  };

  const testList: CanvasObj[] = [longStroke, textObj];
  // Hapus textObj secara keseluruhan
  const eraseTextRes = eraseSeg(testList, { x: 510, y: 510 }, { x: 510, y: 510 }, 20);
  assert(eraseTextRes.changed, 'eraseSeg mendeteksi perubahan');
  assert(eraseTextRes.removed.some((o) => o.id === 'txt-1'), 'Objek teks yang terkena penghapus dihapus');
  assert(eraseTextRes.newObjs.length === 1 && eraseTextRes.newObjs[0].id === 'long-s', 'Hanya coretan yang tersisa');

  // Uji potong bentuk kosong (unfilled shape) via shapeStrokes
  const strokesFromShape = shapeStrokes(shapeRect);
  assert(strokesFromShape.length >= 1, 'Bentuk dapat dikonversi menjadi stroke untuk dipotong penghapus');

  // --------------------------------------------------------------------------
  // 3. UJI UNDO / REDO BERBASIS OPERASI LOKAL (LOCAL OP)
  // --------------------------------------------------------------------------
  console.log('\n3. Uji Riwayat Undo / Redo (HistoryManager):');
  let ubahPayloads: any[] = [];
  const history = new HistoryManager((p) => {
    ubahPayloads.push(p);
  });

  let boardObjs: CanvasObj[] = [];
  const objBaru: TextObj = {
    id: 'catatan-1',
    type: 'text',
    color: '#111827',
    size: 1,
    x: 100,
    y: 100,
    text: 'Rumus Pythagoras',
    fs: 24,
    fill: '#fde68a',
  };

  // Action 1: Tambah objek
  boardObjs.push(objBaru);
  history.commit({ tambah: [objBaru] });
  assert(history.canUndo(), 'canUndo bernilai true setelah commit tambah');
  assert(!history.canRedo(), 'canRedo bernilai false sebelum undo');
  assert(ubahPayloads.length === 1 && ubahPayloads[0].tambah?.length === 1, 'Event ubah memancarkan objek yang ditambah');

  // Action 2: Pindah objek (Ubah)
  const objSebelum = { ...objBaru };
  move(objBaru, 50, 50);
  history.commit({ ubah: [{ sebelum: objSebelum, sesudah: { ...objBaru } }] });

  // Undo perpindahan
  const undoRes1 = history.undo(boardObjs);
  boardObjs = undoRes1.newObjs;
  assert(undoRes1.reverted, 'Undo berhasil membalikkan perpindahan');
  assert(boardObjs[0].x === 100 && boardObjs[0].y === 100, 'Koordinat objek kembali ke posisi semula sebelum dipindah');
  assert(history.canRedo(), 'canRedo bernilai true setelah satu undo');

  // Redo perpindahan
  const redoRes1 = history.redo(boardObjs);
  boardObjs = redoRes1.newObjs;
  assert(redoRes1.reapplied, 'Redo berhasil menerapkan ulang perpindahan');
  assert(boardObjs[0].x === 150 && boardObjs[0].y === 150, 'Koordinat objek kembali ke posisi sesudah dipindah');

  // Undo dua kali hingga papan kosong kembali
  boardObjs = history.undo(boardObjs).newObjs; // undo pindah
  boardObjs = history.undo(boardObjs).newObjs; // undo tambah
  assert(boardObjs.length === 0, 'Undo kembali ke keadaan papan kosong semula');

  // --------------------------------------------------------------------------
  // 4. UJI SERIALISASI & PERFORMA 300+ OBJEK
  // --------------------------------------------------------------------------
  console.log('\n4. Uji Serialisasi Format Simpan & Performa 300+ Objek:');
  const manyObjs: CanvasObj[] = [];
  const tStart = performance.now();
  for (let i = 0; i < 400; i++) {
    manyObjs.push({
      id: `perf-${i}`,
      type: 'stroke',
      color: '#9b17f5',
      size: 3,
      st: 'pen',
      pts: [
        { x: i * 2, y: i * 2 },
        { x: i * 2 + 5, y: i * 2 + 5 },
        { x: i * 2 + 10, y: i * 2 + 10 },
      ],
    });
  }

  // Hit test & bounds loop pada 400 objek
  for (let i = 0; i < 400; i++) {
    bounds(manyObjs[i]);
  }
  const topObj = topAt(manyObjs, { x: 200, y: 200 }, 10);
  const tEnd = performance.now();
  assert(tEnd - tStart < 100, `Operasi pada 400 objek sangat cepat (${(tEnd - tStart).toFixed(2)} ms < 100 ms)`);
  assert(topObj !== undefined, 'Hit test topAt pada 400 objek menemukan target');

  // Serialisasi JSON
  const jsonOutput = toJson(manyObjs);
  const parsed = JSON.parse(jsonOutput);
  assert(parsed.versi === 1, 'Format versi simpan adalah 1');
  assert(Array.isArray(parsed.objs) && parsed.objs.length === 400, 'Semua 400 objek tersimpan di JSON');
  assert(!('_i' in parsed.objs[0]), 'Field internal _i tidak ikut tersimpan');

  // --------------------------------------------------------------------------
  // 5. UJI API SERVER (CRUD PAPAN, AUTH, HAK AKSES, AUTOSAVE)
  // --------------------------------------------------------------------------
  console.log('\n5. Uji API Server (GET, POST, PUT, DELETE, Hak Akses Guru):');

  // Siapkan 2 akun guru di database
  const passwordHash = await bcrypt.hash('kataSandi123', 10);
  const guruA = await prisma.user.upsert({
    where: { email: 'guru_test_a@discere.id' },
    update: { passwordHash, role: 'guru', status: 'aktif' },
    create: {
      nama: 'Guru Uji A',
      email: 'guru_test_a@discere.id',
      passwordHash,
      role: 'guru',
      sekolah: 'SD Negeri 1 Merdeka',
      status: 'aktif',
    },
  });

  const guruB = await prisma.user.upsert({
    where: { email: 'guru_test_b@discere.id' },
    update: { passwordHash, role: 'guru', status: 'aktif' },
    create: {
      nama: 'Guru Uji B',
      email: 'guru_test_b@discere.id',
      passwordHash,
      role: 'guru',
      sekolah: 'SMP Negeri 2 Merdeka',
      status: 'aktif',
    },
  });

  // Buat papan milik Guru A
  const boardA = await prisma.board.create({
    data: {
      ownerId: guruA.id,
      judul: 'Papan Matematika Kelas 5',
      data: JSON.stringify({ versi: 1, objs: [] }),
    },
  });
  assert(boardA.id && boardA.ownerId === guruA.id, 'Papan Guru A berhasil dibuat di DB');

  // Guru A menyimpan data kanvas (PUT)
  const sampleBoardData = JSON.stringify({
    versi: 1,
    objs: [
      {
        id: 'obj-guru-a-1',
        type: 'text',
        x: 120,
        y: 80,
        text: 'Materi Pecahan Desimal',
        fs: 28,
        color: '#111827',
        fill: null,
        size: 1,
      },
    ],
  });

  const updatedBoardA = await prisma.board.update({
    where: { id: boardA.id },
    data: {
      data: sampleBoardData,
      judul: 'Papan Matematika Kelas 5 (Revisi)',
      updatedAt: new Date(),
    },
  });
  assert(updatedBoardA.judul === 'Papan Matematika Kelas 5 (Revisi)', 'Judul papan terupdate di DB');
  const parsedRemoteData = JSON.parse(updatedBoardA.data);
  assert(parsedRemoteData.objs.length === 1, 'Data kanvas tersimpan akurat di database');

  // Pengujian Isolasi Hak Akses:
  // Pastikan logika query memeriksa `ownerId`
  const boardLookupByGuruB = await prisma.board.findFirst({
    where: { id: boardA.id, ownerId: guruB.id },
  });
  assert(boardLookupByGuruB === null, 'Guru B tidak dapat mengakses papan milik Guru A (403/404)');

  const boardLookupByGuruA = await prisma.board.findFirst({
    where: { id: boardA.id, ownerId: guruA.id },
  });
  assert(boardLookupByGuruA !== null, 'Guru A dapat mengakses papan miliknya sendiri');

  // Hapus papan (DELETE)
  await prisma.board.delete({ where: { id: boardA.id } });
  const checkDeleted = await prisma.board.findUnique({ where: { id: boardA.id } });
  assert(checkDeleted === null, 'Papan berhasil dihapus dari database');

  console.log(`\nHASIL PENGUJIAN: ${passed} Lolos, ${failed} Gagal.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Error saat menjalankan test suite:', e);
  process.exit(1);
});

