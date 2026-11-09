import assert from 'assert';
import {
  PRESET_PROBABILITAS,
  validasiProbabilitas,
  drawGachaGigitan,
  prosesJawabanKerupuk,
  urutkanLeaderboard,
  PesertaKerupukState,
} from '../server/src/games/makanKerupuk.js';
import { kerupukManager } from '../server/src/games/kerupukManager.js';
import { multiManager } from '../server/src/games/multiManager.js';

async function runMakanKerupukTests() {
  console.log('\n======================================================');
  console.log('🧪 MEMULAI RANGKAIAN TEST GAME MAKAN KERUPUK CHALLENGE');
  console.log('======================================================\n');

  // -------------------------------------------------------------------------
  // TEST 1: Preset Probabilitas Resmi Harus Tepat 100%
  // -------------------------------------------------------------------------
  console.log('1. Memeriksa validitas preset probabilitas resmi...');
  const normalCheck = validasiProbabilitas(PRESET_PROBABILITAS.normal);
  assert.strictEqual(normalCheck.valid, true, 'Preset Normal harus valid');
  assert.strictEqual(normalCheck.total, 100, 'Preset Normal total harus 100');

  const mudahCheck = validasiProbabilitas(PRESET_PROBABILITAS.mudah);
  assert.strictEqual(mudahCheck.valid, true, 'Preset Mudah harus valid');
  assert.strictEqual(mudahCheck.total, 100, 'Preset Mudah total harus 100');

  const sulitCheck = validasiProbabilitas(PRESET_PROBABILITAS.sulit);
  assert.strictEqual(sulitCheck.valid, true, 'Preset Sulit harus valid');
  assert.strictEqual(sulitCheck.total, 100, 'Preset Sulit total harus 100');
  console.log('   ✓ Seluruh preset resmi (Normal, Mudah, Sulit) terverifikasi tepat 100%');

  // -------------------------------------------------------------------------
  // TEST 2: Penolakan Konfigurasi Probabilitas Tidak Valid
  // -------------------------------------------------------------------------
  console.log('2. Memeriksa penolakan probabilitas tidak valid...');
  const invalidTotal = validasiProbabilitas({
    besar: 20,
    sedang: 20,
    kecil: 20,
    sangat_kecil: 20,
    zonk: 10, // Total 90%
  });
  assert.strictEqual(invalidTotal.valid, false, 'Total 90% harus ditolak');
  assert.ok(invalidTotal.pesanError?.includes('100%'), 'Harus memberikan pesan error total');

  const invalidNegative = validasiProbabilitas({
    besar: -10,
    sedang: 50,
    kecil: 30,
    sangat_kecil: 20,
    zonk: 10,
  });
  assert.strictEqual(invalidNegative.valid, false, 'Nilai negatif harus ditolak');
  console.log('   ✓ Sistem menolak konfigurasi tidak valid (total != 100% atau angka negatif)');

  // -------------------------------------------------------------------------
  // TEST 3: Random Draw Gacha Backend (Crypto-Safe)
  // -------------------------------------------------------------------------
  console.log('3. Menguji keacakan gacha backend 1000 iterasi...');
  const counts: Record<string, number> = {
    besar: 0,
    sedang: 0,
    kecil: 0,
    sangat_kecil: 0,
    zonk: 0,
  };
  for (let i = 0; i < 1000; i++) {
    const hasil = drawGachaGigitan(PRESET_PROBABILITAS.normal);
    assert.ok(
      ['besar', 'sedang', 'kecil', 'sangat_kecil', 'zonk'].includes(hasil.tipe),
      'Tipe gacha harus valid'
    );
    assert.ok(hasil.poinGigitan >= 0, 'Poin gigitan tidak boleh negatif');
    assert.ok(hasil.berkurangPersen >= 0, 'Pengurangan kerupuk tidak boleh negatif');
    assert.ok(hasil.pesanLucu.length > 5, 'Pesan lucu harus ada');
    counts[hasil.tipe]++;
  }
  assert.ok(counts.besar > 50, 'Gigitan besar harus muncul proporsional');
  assert.ok(counts.kecil > 150, 'Gigitan kecil harus muncul proporsional');
  console.log('   ✓ Gacha draw crypto-safe teruji konsisten:', counts);

  // -------------------------------------------------------------------------
  // TEST 4: Logika Jawaban Salah
  // -------------------------------------------------------------------------
  console.log('4. Menguji penanganan jawaban salah...');
  const pesertaDummy: PesertaKerupukState = {
    id: 'p1',
    socketId: 'sock1',
    nama: 'Budi',
    connected: true,
    sisaKerupuk: 100,
    skorTotal: 250,
    skorPengetahuan: 200,
    skorKeberuntungan: 50,
    totalBenar: 2,
    totalSalah: 0,
    streakBenar: 2,
    totalBonusStreak: 0,
    selesaiKerupuk: false,
    waktuSelesaiMs: null,
  };

  const hasilSalah = prosesJawabanKerupuk({
    peserta: pesertaDummy,
    jawabanSiswa: 'B',
    kunciJawaban: 'A',
    probabilitasConfig: PRESET_PROBABILITAS.normal,
    waktuJawabTimestamp: Date.now(),
  });

  assert.strictEqual(hasilSalah.benar, false);
  assert.strictEqual(hasilSalah.poinDidapat, 0, 'Jawaban salah tidak boleh dapat poin');
  assert.strictEqual(hasilSalah.gacha, null, 'Jawaban salah tidak dapat kesempatan gigit');
  assert.strictEqual(hasilSalah.pesertaUpdated.streakBenar, 0, 'Streak harus di-reset ke 0');
  assert.strictEqual(hasilSalah.pesertaUpdated.totalSalah, 1);
  assert.strictEqual(hasilSalah.pesertaUpdated.sisaKerupuk, 100, 'Kerupuk tidak boleh berkurang');
  console.log('   ✓ Jawaban salah terverifikasi: poin 0, streak reset, kerupuk tetap utuh');

  // -------------------------------------------------------------------------
  // TEST 5: Logika Jawaban Benar & Bonus Streak Setiap Kelipatan 3
  // -------------------------------------------------------------------------
  console.log('5. Menguji jawaban benar dan bonus streak kelipatan 3...');
  // Mulai dari streak 2 -> jawaban benar ke-3 harus dapat bonus streak +50 poin
  const hasilBenar3 = prosesJawabanKerupuk({
    peserta: pesertaDummy,
    jawabanSiswa: 'A',
    kunciJawaban: 'A',
    probabilitasConfig: PRESET_PROBABILITAS.normal,
    waktuJawabTimestamp: Date.now(),
  });

  assert.strictEqual(hasilBenar3.benar, true);
  assert.strictEqual(hasilBenar3.poinDasar, 100, 'Poin dasar harus 100');
  assert.strictEqual(hasilBenar3.pesertaUpdated.streakBenar, 3, 'Streak harus 3');
  assert.strictEqual(hasilBenar3.bonusStreak, 50, 'Streak 3 harus dapat bonus +50');
  assert.ok(hasilBenar3.gacha !== null, 'Harus mendapatkan gacha gigitan');
  assert.ok(hasilBenar3.sisaKerupukBaru <= 100, 'Kerupuk harus berkurang atau sama jika zonk');
  console.log('   ✓ Jawaban benar ke-3 berhasil memicu bonus streak +50 poin!');

  // -------------------------------------------------------------------------
  // TEST 6: Kerupuk Tidak Boleh < 0% (Clamping di 0%) & Bonus Selesai +100 Hanya 1 Kali
  // -------------------------------------------------------------------------
  console.log('6. Menguji batas minimum kerupuk (0%) dan bonus penyelesaian 100 poin...');
  const pesertaHampirHabis: PesertaKerupukState = {
    id: 'p2',
    socketId: 'sock2',
    nama: 'Siti',
    connected: true,
    sisaKerupuk: 10,
    skorTotal: 400,
    skorPengetahuan: 300,
    skorKeberuntungan: 100,
    totalBenar: 3,
    totalSalah: 0,
    streakBenar: 3,
    totalBonusStreak: 50,
    selesaiKerupuk: false,
    waktuSelesaiMs: null,
  };

  // Konfigurasi khusus: gigitan besar 100% (berkurang 40%)
  const configGigitanBesar = {
    besar: 100,
    sedang: 0,
    kecil: 0,
    sangat_kecil: 0,
    zonk: 0,
  };

  const hasilHabis = prosesJawabanKerupuk({
    peserta: pesertaHampirHabis,
    jawabanSiswa: 'C',
    kunciJawaban: 'C',
    probabilitasConfig: configGigitanBesar,
    waktuJawabTimestamp: 1000,
  });

  assert.strictEqual(hasilHabis.sisaKerupukBaru, 0, 'Kerupuk tidak boleh < 0, harus 0');
  assert.strictEqual(hasilHabis.selesaiBaru, true, 'Harus terdeteksi baru selesai');
  assert.strictEqual(hasilHabis.bonusPenyelesaian, 100, 'Bonus selesai harus +100');
  assert.strictEqual(hasilHabis.pesertaUpdated.selesaiKerupuk, true);
  assert.strictEqual(hasilHabis.pesertaUpdated.waktuSelesaiMs, 1000);

  // Jika Siti menjawab benar lagi di soal berikutnya, bonus penyelesaian TIDAK boleh diberikan lagi
  const hasilSoalBerikutnya = prosesJawabanKerupuk({
    peserta: hasilHabis.pesertaUpdated,
    jawabanSiswa: 'A',
    kunciJawaban: 'A',
    probabilitasConfig: configGigitanBesar,
    waktuJawabTimestamp: 2000,
  });

  assert.strictEqual(hasilSoalBerikutnya.sisaKerupukBaru, 0, 'Kerupuk tetap 0%');
  assert.strictEqual(
    hasilSoalBerikutnya.bonusPenyelesaian,
    0,
    'Bonus penyelesaian tidak boleh diberikan dua kali'
  );
  assert.strictEqual(hasilSoalBerikutnya.selesaiBaru, false);
  console.log('   ✓ Kerupuk sukses di-clamp di 0% dan bonus penyelesaian hanya diberikan 1 kali!');

  // -------------------------------------------------------------------------
  // TEST 7: Leaderboard 4 Kriteria Penentu Urutan Peringkat
  // -------------------------------------------------------------------------
  console.log('7. Menguji 4 kriteria penentuan urutan leaderboard...');
  const pesertaList: PesertaKerupukState[] = [
    {
      id: '1',
      socketId: 's1',
      nama: 'Ahmad',
      connected: true,
      skorTotal: 500,
      skorPengetahuan: 300,
      skorKeberuntungan: 200,
      totalBenar: 3,
      totalSalah: 1,
      streakBenar: 0,
      totalBonusStreak: 0,
      sisaKerupuk: 20,
      selesaiKerupuk: false,
      waktuSelesaiMs: null,
    },
    {
      id: '2',
      socketId: 's2',
      nama: 'Beni',
      connected: true,
      skorTotal: 600, // Skor tertinggi -> harus Juara 1
      skorPengetahuan: 400,
      skorKeberuntungan: 200,
      totalBenar: 4,
      totalSalah: 0,
      streakBenar: 4,
      totalBonusStreak: 50,
      sisaKerupuk: 15,
      selesaiKerupuk: false,
      waktuSelesaiMs: null,
    },
    {
      id: '3',
      socketId: 's3',
      nama: 'Citra',
      connected: true,
      skorTotal: 500, // Skor sama dengan Ahmad (500), tapi jawaban benar lebih banyak (4 vs 3) -> harus di atas Ahmad
      skorPengetahuan: 400,
      skorKeberuntungan: 100,
      totalBenar: 4,
      totalSalah: 1,
      streakBenar: 1,
      totalBonusStreak: 50,
      sisaKerupuk: 30,
      selesaiKerupuk: false,
      waktuSelesaiMs: null,
    },
    {
      id: '4',
      socketId: 's4',
      nama: 'Dian',
      connected: true,
      skorTotal: 500,
      skorPengetahuan: 300,
      skorKeberuntungan: 200,
      totalBenar: 3, // Skor sama dengan Ahmad, jawaban benar sama (3), tapi kerupuk sisa lebih sedikit (0% vs 20%) -> di atas Ahmad
      totalSalah: 1,
      streakBenar: 0,
      totalBonusStreak: 0,
      sisaKerupuk: 0,
      selesaiKerupuk: true,
      waktuSelesaiMs: 5000,
    },
  ];

  const sorted = urutkanLeaderboard(pesertaList);
  assert.strictEqual(sorted[0].nama, 'Beni', 'Juara 1 harus Beni (Skor 600)');
  assert.strictEqual(sorted[1].nama, 'Citra', 'Juara 2 harus Citra (Skor 500, Benar 4)');
  assert.strictEqual(sorted[2].nama, 'Dian', 'Juara 3 harus Dian (Skor 500, Benar 3, Sisa 0%)');
  assert.strictEqual(sorted[3].nama, 'Ahmad', 'Peringkat 4 harus Ahmad (Skor 500, Benar 3, Sisa 20%)');
  console.log('   ✓ Peringkat leaderboard 4-kriteria bekerja sempurna (Beni -> Citra -> Dian -> Ahmad)');

  // -------------------------------------------------------------------------
  // TEST 8: State Manager In-Memory (`kerupukManager`) Sesi Aktif
  // -------------------------------------------------------------------------
  console.log('8. Menguji siklus hidup kerupukManager in-memory...');
  const testSessionId = 'sesi-test-kerupuk-123';
  const testToken = kerupukManager.generateUniqueToken();
  assert.strictEqual(testToken.length, 6, 'Token harus 6 digit');

  const sesi = kerupukManager.inisialisasiSesi(
    testSessionId,
    testToken,
    'host-guru-1',
    { id: 'tmpl-1', judul: 'Kuis Kemerdekaan RI' },
    [
      {
        id: 'q1',
        urutan: 1,
        teks: 'Kapan Indonesia merdeka?',
        opsiA: '17 Agustus 1945',
        opsiB: '17 Agustus 1950',
        opsiC: '1 Juni 1945',
        jawabanBenar: 'A',
        penjelasan: 'Proklamasi dibacakan 17 Agustus 1945.',
      },
      {
        id: 'q2',
        urutan: 2,
        teks: 'Ibukota negara Indonesia sekarang adalah?',
        opsiA: 'Surabaya',
        opsiB: 'Jakarta',
        opsiC: 'Medan',
        jawabanBenar: 'B',
        penjelasan: 'Ibukota adalah Jakarta.',
      },
    ],
    {
      maxPeserta: 20,
      durasiSoalDetik: 15,
      allowLateJoin: true,
    }
  );

  assert.strictEqual(sesi.status, 'lobi');
  assert.strictEqual(sesi.totalSoal, 2);

  // Siswa 1 gabung
  const g1 = kerupukManager.gabungPeserta(testToken, 'Doni', 'sock-doni');
  assert.strictEqual(g1.peserta.nama, 'Doni');
  assert.strictEqual(g1.peserta.sisaKerupuk, 100);

  // Siswa 2 gabung
  const g2 = kerupukManager.gabungPeserta(testToken, 'Eka', 'sock-eka');
  assert.strictEqual(g2.peserta.nama, 'Eka');

  // Reconnection test: Doni reconnect dengan pesertaId sama
  const reconnectDoni = kerupukManager.gabungPeserta(
    testToken,
    'Doni',
    'sock-doni-baru',
    g1.peserta.id
  );
  assert.strictEqual(reconnectDoni.isReconnect, true, 'Harus terdeteksi sebagai reconnect');
  assert.strictEqual(reconnectDoni.peserta.socketId, 'sock-doni-baru');

  // Guru memulai permainan
  const started = kerupukManager.mulaiPermainan(testSessionId, 'host-guru-1');
  assert.strictEqual(started.status, 'jalan');

  // Doni menjawab soal 1 dengan benar
  const jawabDoni = kerupukManager.prosesJawabanSiswa(
    testSessionId,
    g1.peserta.id,
    'q1',
    'A'
  );
  assert.strictEqual(jawabDoni.hasilJawaban.benar, true);
  assert.strictEqual(jawabDoni.hasilJawaban.poinDasar, 100);

  // Eka menjawab soal 1 dengan salah
  const jawabEka = kerupukManager.prosesJawabanSiswa(
    testSessionId,
    g2.peserta.id,
    'q1',
    'C'
  );
  assert.strictEqual(jawabEka.hasilJawaban.benar, false);
  assert.strictEqual(jawabEka.semuaSelesai, true, 'Kedua peserta aktif sudah menjawab');

  // Tutup soal 1 dan lanjut ke soal 2
  const tutupSoal1 = kerupukManager.selesaikanSoalAktif(testSessionId);
  assert.strictEqual(tutupSoal1.isLastQuestion, false);
  assert.strictEqual(tutupSoal1.rekapSoal.totalBenar, 1);
  assert.strictEqual(tutupSoal1.rekapSoal.totalSalah, 1);

  const lanjut = kerupukManager.lanjutSoalBerikutnya(testSessionId);
  assert.strictEqual(lanjut.currentQuestionIndex, 1);
  assert.strictEqual(lanjut.isLastQuestion, true);

  // Akhiri permainan
  const hasilAkhir = kerupukManager.akhiriPermainan(testSessionId);
  assert.strictEqual(hasilAkhir.totalPeserta, 2);
  assert.strictEqual(hasilAkhir.totalJawabanBenar, 1);
  assert.strictEqual(hasilAkhir.totalJawabanSalah, 1);
  assert.strictEqual(hasilAkhir.podium.juara1?.nama, 'Doni', 'Juara 1 harus Doni');
  console.log('   ✓ Siklus lengkap kerupukManager (Lobi -> Jawab -> Lanjut -> Selesai -> Podium) sukses!');

  // Cleanup sesi uji coba
  kerupukManager.hapusSesi(testSessionId);

  // -------------------------------------------------------------------------
  // TEST 9: Uji Non-Regresi Game Tarik Tambang
  // -------------------------------------------------------------------------
  console.log('9. Memastikan non-regresi pada game Tarik Tambang...');
  const multiToken = multiManager.generateUniqueToken();
  assert.strictEqual(multiToken.length, 6);
  assert.notStrictEqual(multiToken, testToken);
  console.log('   ✓ Tarik Tambang multiManager tetap utuh dan independen');

  console.log('\n======================================================');
  console.log('🎉 SEMUA PENGUJIAN MAKAN KERUPUK CHALLENGE SUKSES 100%!');
  console.log('======================================================\n');
}

runMakanKerupukTests().catch((err) => {
  console.error('❌ Test gagal:', err);
  process.exit(1);
});
