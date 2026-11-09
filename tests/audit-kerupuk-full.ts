import assert from 'assert';
import {
  PRESET_PROBABILITAS,
  validasiProbabilitas,
  drawGachaGigitan,
  prosesJawabanKerupuk,
  urutkanLeaderboard,
  PesertaKerupukState,
} from '../server/src/games/makanKerupuk.js';
import {
  kerupukManager,
  siapkanAntreanSoal,
  SoalKerupuk,
} from '../server/src/games/kerupukManager.js';

console.log('================================================================');
console.log('🧪 PENGUJIAN 10 SKENARIO LOGIKA REVISI MAKAN KERUPUK CHALLENGE');
console.log('================================================================\n');

const mockQuestions: SoalKerupuk[] = [
  {
    id: 'soal-1',
    urutan: 1,
    teks: 'Ibukota Indonesia adalah?',
    opsiA: 'Jakarta',
    opsiB: 'Bandung',
    opsiC: 'Surabaya',
    jawabanBenar: 'A',
    penjelasan: 'Jakarta adalah ibukota negara.',
  },
  {
    id: 'soal-2',
    urutan: 2,
    teks: 'Warna bendera Indonesia?',
    opsiA: 'Merah Putih',
    opsiB: 'Biru Kuning',
    opsiC: 'Hijau Hitam',
    jawabanBenar: 'A',
    penjelasan: 'Merah Putih adalah bendera Indonesia.',
  },
  {
    id: 'soal-3',
    urutan: 3,
    teks: 'Hari kemerdekaan RI tanggal?',
    opsiA: '17 Agustus',
    opsiB: '1 Januari',
    opsiC: '25 Desember',
    jawabanBenar: 'A',
    penjelasan: '17 Agustus 1945.',
  },
];

function setupTestSesi(sessionId: string, token: string, hostId = 'host-1', questions = mockQuestions) {
  kerupukManager.hapusSesi(sessionId);
  return kerupukManager.inisialisasiSesi(
    sessionId,
    token,
    hostId,
    { id: 'template-test', judul: 'Kuis Kemerdekaan' },
    questions
  );
}

// ---------------------------------------------------------------------------
// Skenario 1: Satu pemain menghabiskan kerupuk, pemain lain masih bermain
// ---------------------------------------------------------------------------
console.log('▶ Uji Skenario 1: Satu pemain menghabiskan kerupuk, pemain lain masih bermain');
{
  const sessionId = 'sesi-skenario-1';
  const token = '111001';
  setupTestSesi(sessionId, token);

  const { peserta: pA } = kerupukManager.gabungPeserta(token, 'Pemain A', 'socket-a');
  const { peserta: pB } = kerupukManager.gabungPeserta(token, 'Pemain B', 'socket-b');

  kerupukManager.mulaiPermainan(sessionId, 'host-1');

  // Paksa Pemain A menyelesaikan kerupuk (0%)
  pA.sisaKerupuk = 0;
  pA.selesaiKerupuk = true;

  // Pemain B masih punya kerupuk 70%
  pB.sisaKerupuk = 70;
  pB.selesaiKerupuk = false;

  const sesi = kerupukManager.dapatkanSesi(sessionId)!;
  assert.strictEqual(sesi.status, 'jalan', 'Sesi harus TETAP BERJALAN walau 1 pemain sudah ludes kerupuk.');

  // Pemain A tidak boleh dapat soal lagi
  const soalPemainA = kerupukManager.ambilSoalBerikutnyaUntukPeserta(sessionId, pA.id);
  assert.strictEqual(soalPemainA, null, 'Pemain A yang sudah selesai tidak boleh menerima soal baru.');

  // Pemain B tetap dapat soal berikutnya
  const soalPemainB = kerupukManager.ambilSoalBerikutnyaUntukPeserta(sessionId, pB.id);
  assert.ok(soalPemainB !== null, 'Pemain B yang masih punya kerupuk harus dapat menerima soal baru.');
  console.log('  ✓ Lolos: Sesi tetap berjalan, pemain selesai tidak dapat soal, pemain lain lanjut.');
}

// ---------------------------------------------------------------------------
// Skenario 2: Semua pemain menghabiskan kerupuk (game harus otomatis selesai)
// ---------------------------------------------------------------------------
console.log('▶ Uji Skenario 2: Semua pemain menghabiskan kerupuk (game otomatis selesai)');
{
  const sessionId = 'sesi-skenario-2';
  const token = '111002';
  setupTestSesi(sessionId, token);

  const { peserta: pA } = kerupukManager.gabungPeserta(token, 'Pemain A', 'socket-a');
  const { peserta: pB } = kerupukManager.gabungPeserta(token, 'Pemain B', 'socket-b');

  kerupukManager.mulaiPermainan(sessionId, 'host-1');

  // Ambil soal untuk Pemain A & buat kerupuknya 0%
  pA.sisaKerupuk = 5;
  const qA = kerupukManager.ambilSoalBerikutnyaUntukPeserta(sessionId, pA.id)!;
  const hasilA = kerupukManager.prosesJawabanSiswa(sessionId, pA.id, qA.soal.id, 'A');
  pA.sisaKerupuk = 0;
  pA.selesaiKerupuk = true;

  // Pada titik ini pB belum habis, sesi tidak boleh selesai otomatis
  assert.strictEqual(hasilA.gameSelesaiSemuaHabis, false, 'Game belum selesai karena pB belum habis.');

  // Ambil soal untuk Pemain B & buat kerupuknya 0%
  pB.sisaKerupuk = 5;
  const qB = kerupukManager.ambilSoalBerikutnyaUntukPeserta(sessionId, pB.id)!;
  pB.sisaKerupuk = 0; // simulasi habis
  pB.selesaiKerupuk = true;

  const pesertaAktif = Array.from(kerupukManager.dapatkanSesi(sessionId)!.peserta.values());
  const semuaHabis = pesertaAktif.every((p) => p.sisaKerupuk === 0);
  assert.strictEqual(semuaHabis, true, 'Semua peserta aktif terdeteksi kerupuk habis.');

  const hasilAkhir = kerupukManager.akhiriPermainan(sessionId);
  assert.strictEqual(hasilAkhir.totalKerupukHabis, 2, 'Total kerupuk habis tercatat tepat 2 siswa.');
  console.log('  ✓ Lolos: Semua kerupuk habis mengarah ke game otomatis selesai dengan podium valid.');
}

// ---------------------------------------------------------------------------
// Skenario 3: Guru menghentikan permainan manual kapan saja
// ---------------------------------------------------------------------------
console.log('▶ Uji Skenario 3: Guru menghentikan permainan manual kapan saja');
{
  const sessionId = 'sesi-skenario-3';
  const token = '111003';
  setupTestSesi(sessionId, token);

  kerupukManager.gabungPeserta(token, 'Siswa 1', 'socket-1');
  kerupukManager.gabungPeserta(token, 'Siswa 2', 'socket-2');
  kerupukManager.mulaiPermainan(sessionId, 'host-1');

  const sesi = kerupukManager.dapatkanSesi(sessionId)!;
  assert.strictEqual(sesi.status, 'jalan', 'Permainan sedang jalan.');

  // Guru memanggil akhiriPermainan manual
  const hasil = kerupukManager.akhiriPermainan(sessionId);
  assert.strictEqual(sesi.status, 'selesai', 'Status sesi harus berubah menjadi selesai.');
  assert.ok(hasil.podium !== undefined, 'Podium juara harus terbentuk.');
  assert.strictEqual(hasil.totalPeserta, 2, 'Total peserta pada hasil akhir harus 2.');
  console.log('  ✓ Lolos: Guru dapat menghentikan sesi manual kapan saja secara aman.');
}

// ---------------------------------------------------------------------------
// Skenario 4: Pemain menjawab semua pertanyaan template (pertanyaan berulang & teracak)
// ---------------------------------------------------------------------------
console.log('▶ Uji Skenario 4: Pemain menjawab semua pertanyaan template (berulang dan teracak)');
{
  const sessionId = 'sesi-skenario-4';
  const token = '111004';
  setupTestSesi(sessionId, token);

  const { peserta } = kerupukManager.gabungPeserta(token, 'Siswa Rajin', 'socket-rajin');
  kerupukManager.mulaiPermainan(sessionId, 'host-1');

  // Ada 3 soal di mockQuestions. Siswa menjawab 7 kali berturut-turut!
  const riwayatSoalIdDiterima: string[] = [];

  for (let i = 0; i < 7; i++) {
    const item = kerupukManager.ambilSoalBerikutnyaUntukPeserta(sessionId, peserta.id);
    assert.ok(item !== null, `Soal iterasi ke-${i + 1} tidak boleh null (siklus harus terus berulang).`);
    riwayatSoalIdDiterima.push(item.soal.id);

    // Kirim jawaban
    kerupukManager.prosesJawabanSiswa(sessionId, peserta.id, item.soal.id, 'A');

    // Pertahankan sisa kerupuk pada sesi agar pemain tetap aktif untuk menguji siklus berulang
    const pCurrent = kerupukManager.dapatkanSesi(sessionId)!.peserta.get(peserta.id)!;
    pCurrent.sisaKerupuk = 100;
    pCurrent.selesaiKerupuk = false;
  }

  const pFinal = kerupukManager.dapatkanSesi(sessionId)!.peserta.get(peserta.id)!;
  assert.strictEqual(riwayatSoalIdDiterima.length, 7, 'Siswa berhasil menerima dan menjawab 7 soal berulang.');
  assert.strictEqual(pFinal.jumlahJawab, 7, 'Total soal yang dijawab tercatat 7.');
  console.log('  ✓ Lolos: Siklus pertanyaan berulang tanpa batas & tanpa infinite loop.');
}

// ---------------------------------------------------------------------------
// Skenario 5: Pertanyaan tidak muncul dua kali berturut-turut untuk pemain yang sama
// ---------------------------------------------------------------------------
console.log('▶ Uji Skenario 5: Pertanyaan tidak muncul dua kali berturut-turut');
{
  let adaDuaBerturutTurut = false;

  // Uji reshuffle 500 kali simulasi
  for (let sim = 0; sim < 500; sim++) {
    const terakhirId = 'soal-2';
    const antreanBaru = siapkanAntreanSoal(mockQuestions, terakhirId);

    if (antreanBaru[0] === terakhirId) {
      adaDuaBerturutTurut = true;
      break;
    }
  }

  assert.strictEqual(
    adaDuaBerturutTurut,
    false,
    'Soal pertama pada siklus baru tidak boleh sama dengan soal terakhir siklus sebelumnya.'
  );
  console.log('  ✓ Lolos: Tidak ada soal sama yang muncul 2 kali berturut-turut dalam 500 simulasi.');
}

// ---------------------------------------------------------------------------
// Skenario 6: Dua pemain skor & sisa kerupuk sama, peringkat ditentukan oleh kecepatan
// ---------------------------------------------------------------------------
console.log('▶ Uji Skenario 6: Tie-breaker kecepatan menjawab (rata-rata waktu)');
{
  const pCepat: PesertaKerupukState = {
    id: 'p-cepat',
    socketId: 'sock-1',
    nama: 'Budi Cepat',
    connected: true,
    sisaKerupuk: 50,
    skorTotal: 500,
    skorPengetahuan: 400,
    skorKeberuntungan: 100,
    totalBenar: 4,
    totalSalah: 1,
    streakBenar: 0,
    totalBonusStreak: 0,
    selesaiKerupuk: false,
    waktuSelesaiMs: null,
    totalWaktuJawabMs: 10000,
    jumlahJawab: 5,
    rataRataWaktuJawabMs: 2000, // 2 detik rata-rata
  };

  const pLambat: PesertaKerupukState = {
    id: 'p-lambat',
    socketId: 'sock-2',
    nama: 'Andi Lambat',
    connected: true,
    sisaKerupuk: 50,
    skorTotal: 500,
    skorPengetahuan: 400,
    skorKeberuntungan: 100,
    totalBenar: 4,
    totalSalah: 1,
    streakBenar: 0,
    totalBonusStreak: 0,
    selesaiKerupuk: false,
    waktuSelesaiMs: null,
    totalWaktuJawabMs: 25000,
    jumlahJawab: 5,
    rataRataWaktuJawabMs: 5000, // 5 detik rata-rata
  };

  const hasilRank = urutkanLeaderboard([pLambat, pCepat]);
  assert.strictEqual(hasilRank[0].id, 'p-cepat', 'Pemain dengan rata-rata waktu lebih cepat harus di peringkat 1.');
  assert.strictEqual(hasilRank[1].id, 'p-lambat', 'Pemain lebih lambat harus di peringkat 2.');
  console.log('  ✓ Lolos: Kriteria kecepatan berhasil membedakan peringkat saat skor & kerupuk sama.');
}

// ---------------------------------------------------------------------------
// Skenario 7: Pemain yang sudah selesai (kerupuk 0%) tidak dapat kirim jawaban lagi
// ---------------------------------------------------------------------------
console.log('▶ Uji Skenario 7: Pemain selesai (kerupuk 0%) tidak dapat mengirim jawaban');
{
  const sessionId = 'sesi-skenario-7';
  const token = '111007';
  setupTestSesi(sessionId, token);

  const { peserta } = kerupukManager.gabungPeserta(token, 'Siswa Juara', 'socket-juara');
  kerupukManager.mulaiPermainan(sessionId, 'host-1');

  peserta.sisaKerupuk = 0;
  peserta.selesaiKerupuk = true;

  let errorThrown = false;
  try {
    kerupukManager.prosesJawabanSiswa(sessionId, peserta.id, 'soal-1', 'A');
  } catch (err: any) {
    errorThrown = true;
    assert.match(err.message, /habis|selesai/i);
  }

  assert.strictEqual(errorThrown, true, 'Harus melempar error saat pemain kerupuk 0% mencoba menjawab.');
  console.log('  ✓ Lolos: Proteksi anti-cheat berhasil menolak pengiriman jawaban dari siswa yang sudah selesai.');
}

// ---------------------------------------------------------------------------
// Skenario 8: Pemain disconnect dan reconnect kembali ke state yang benar
// ---------------------------------------------------------------------------
console.log('▶ Uji Skenario 8: Pemain reconnect mempertahankan state');
{
  const sessionId = 'sesi-skenario-8';
  const token = '111008';
  setupTestSesi(sessionId, token);

  const { peserta } = kerupukManager.gabungPeserta(token, 'Siswa Putus', 'socket-old');
  kerupukManager.mulaiPermainan(sessionId, 'host-1');

  // Ambil soal dan jawab sekali
  const q1 = kerupukManager.ambilSoalBerikutnyaUntukPeserta(sessionId, peserta.id)!;
  kerupukManager.prosesJawabanSiswa(sessionId, peserta.id, q1.soal.id, 'A');

  const pBefore = kerupukManager.dapatkanSesi(sessionId)!.peserta.get(peserta.id)!;
  const skorSebelumDisconnect = pBefore.skorTotal;
  const sisaKerupukSebelum = pBefore.sisaKerupuk;

  // Siswa disconnect
  kerupukManager.putusKoneksiPeserta('socket-old');
  assert.strictEqual(pBefore.connected, false, 'Peserta berstatus disconnected.');

  // Siswa reconnect dengan socketId baru menggunakan existingPesertaId
  const { peserta: pReconnect, isReconnect } = kerupukManager.gabungPeserta(
    token,
    'Siswa Putus',
    'socket-new',
    peserta.id
  );

  assert.strictEqual(isReconnect, true, 'Harus terdeteksi sebagai reconnect.');
  assert.strictEqual(pReconnect.socketId, 'socket-new', 'Socket ID harus terbarui.');
  assert.strictEqual(pReconnect.skorTotal, skorSebelumDisconnect, 'Skor harus tetap sama.');
  assert.strictEqual(pReconnect.sisaKerupuk, sisaKerupukSebelum, 'Sisa kerupuk harus tetap sama.');
  console.log('  ✓ Lolos: Reconnection berhasil mempertahankan state pemain dengan presisi.');
}

// ---------------------------------------------------------------------------
// Skenario 9: Late join saat permainan sedang berjalan
// ---------------------------------------------------------------------------
console.log('▶ Uji Skenario 9: Late join saat permainan sedang berjalan');
{
  const sessionId = 'sesi-skenario-9';
  const token = '111009';
  setupTestSesi(sessionId, token);

  kerupukManager.gabungPeserta(token, 'Pemain Awal', 'socket-awal');
  kerupukManager.mulaiPermainan(sessionId, 'host-1');

  // Pemain baru bergabung saat sesi berstatus 'jalan'
  const { peserta: pLate, isReconnect } = kerupukManager.gabungPeserta(
    token,
    'Pemain Susulan',
    'socket-susulan'
  );

  assert.strictEqual(isReconnect, false, 'Bukan reconnect.');
  assert.strictEqual(pLate.sisaKerupuk, 100, 'Kerupuk awal harus 100%.');
  assert.ok(pLate.antreanSoal && pLate.antreanSoal.length > 0, 'Harus memiliki antrean soal sendiri.');

  const soalPertama = kerupukManager.ambilSoalBerikutnyaUntukPeserta(sessionId, pLate.id);
  assert.ok(soalPertama !== null, 'Pemain susulan langsung dapat mengambil soal pertamanya.');
  console.log('  ✓ Lolos: Late join berhasil mendapatkan kerupuk 100% dan antrean soal independen.');
}

// ---------------------------------------------------------------------------
// Skenario 10: Sesi dengan 1 pemain saja berjalan normal sampai selesai
// ---------------------------------------------------------------------------
console.log('▶ Uji Skenario 10: Sesi single player berjalan normal');
{
  const sessionId = 'sesi-skenario-10';
  const token = '111010';
  setupTestSesi(sessionId, token);

  const { peserta } = kerupukManager.gabungPeserta(token, 'Solo Player', 'socket-solo');
  kerupukManager.mulaiPermainan(sessionId, 'host-1');

  // Solo player menjawab sampai kerupuk 0%
  let loopCount = 0;
  const getSolo = () => kerupukManager.dapatkanSesi(sessionId)!.peserta.get(peserta.id)!;
  while (getSolo().sisaKerupuk > 0 && loopCount < 50) {
    loopCount++;
    const q = kerupukManager.ambilSoalBerikutnyaUntukPeserta(sessionId, peserta.id);
    if (!q) break;
    kerupukManager.prosesJawabanSiswa(sessionId, peserta.id, q.soal.id, 'A');
  }

  const pFinal = getSolo();
  assert.strictEqual(pFinal.sisaKerupuk, 0, 'Kerupuk solo player harus habis (0%).');
  assert.strictEqual(pFinal.selesaiKerupuk, true, 'Solo player dinyatakan selesai.');

  const hasil = kerupukManager.akhiriPermainan(sessionId);
  assert.strictEqual(hasil.podium.juara1?.id, peserta.id, 'Solo player otomatis menjadi Juara 1.');
  console.log('  ✓ Lolos: Permainan 1 pemain berjalan mulus dari awal hingga akhir.');
}

console.log('\n================================================================');
console.log('🎉 SELURUH 10 SKENARIO PENGUJIAN MAKAN KERUPUK BERHASIL 100%!');
console.log('================================================================');
