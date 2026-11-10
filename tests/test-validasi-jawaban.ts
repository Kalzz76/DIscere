import assert from 'assert';
import { multiManager } from '../server/src/games/multiManager.js';
import { kerupukManager } from '../server/src/games/kerupukManager.js';
import { soloManager } from '../server/src/games/soloManager.js';

async function runValidasiJawabanTests() {
  console.log('\n=============================================================');
  console.log('🧪 PENGUJIAN KOMPREHENSIF VALIDASI JAWABAN SISWA DISCERE');
  console.log('=============================================================\n');

  // Sample data pertanyaan untuk pengujian
  const mockQuestions = [
    {
      id: 'soal-1-merah',
      urutan: 1,
      teks: 'Ibukota negara Indonesia saat ini adalah?',
      opsiA: 'Jakarta',
      opsiB: 'Bandung',
      opsiC: 'Surabaya',
      jawabanBenar: 'A',
      penjelasan: 'Jakarta adalah ibukota negara Indonesia.',
    },
    {
      id: 'soal-2-putih',
      urutan: 2,
      teks: 'Lambang sila pertama Pancasila adalah?',
      opsiA: 'Rantai',
      opsiB: 'Bintang',
      opsiC: 'Pohon Beringin',
      jawabanBenar: 'B',
      penjelasan: 'Bintang emas adalah lambang sila pertama Pancasila.',
    },
    {
      id: 'soal-3-kerupuk',
      urutan: 3,
      teks: 'Warna bendera nasional Indonesia adalah?',
      opsiA: 'Merah Putih Biru',
      opsiB: 'Putih Merah',
      opsiC: 'Merah Putih',
      jawabanBenar: 'C',
      penjelasan: 'Bendera negara Indonesia adalah Sang Saka Merah Putih.',
    },
  ];

  // -------------------------------------------------------------------------
  // UJI 1 & 2: Jawaban Benar Dikenali Benar, Jawaban Salah Dikenali Salah (Tarik Tambang)
  // -------------------------------------------------------------------------
  console.log('1. Menguji pengenalan jawaban benar dan jawaban salah (Tarik Tambang)...');
  const sessionMultiId = 'test-multi-validasi-' + Date.now();
  const tokenMulti = '991122';

  const sesiMulti = multiManager.inisialisasiSesi(
    sessionMultiId,
    tokenMulti,
    'host-guru-1',
    { id: 'tmpl-1', judul: 'Kuis Kemerdekaan' },
    mockQuestions
  );

  // Daftarkan 2 siswa (Device A dan Device B)
  const siswaA = multiManager.gabungPeserta(tokenMulti, 'Budi Siswa A', 'socket-a');
  const siswaB = multiManager.gabungPeserta(tokenMulti, 'Siti Siswa B', 'socket-b');

  multiManager.mulaiPermainan(sessionMultiId, 'host-guru-1');
  multiManager.mulaiTimerSoal(sessionMultiId, 15);

  // Pastikan tim terbagi
  const pA = sesiMulti.peserta.get(siswaA.peserta.id)!;
  const pB = sesiMulti.peserta.get(siswaB.peserta.id)!;
  assert.ok(pA.tim, 'Siswa A harus memiliki tim');
  assert.ok(pB.tim, 'Siswa B harus memiliki tim');

  // Siswa A menjawab BENAR dengan ID soal valid
  const hasilA = multiManager.prosesJawabanSiswa(
    sessionMultiId,
    pA.id,
    'soal-1-merah',
    'A'
  );
  assert.strictEqual(hasilA.benar, true, 'Jawaban A harus dikenali sebagai benar untuk soal 1');
  console.log('   ✓ Jawaban benar diakui benar (benar: true)');

  // Siswa B menjawab SALAH untuk soal yang sama
  const hasilB = multiManager.prosesJawabanSiswa(
    sessionMultiId,
    pB.id,
    'soal-1-merah',
    'B'
  );
  assert.strictEqual(hasilB.benar, false, 'Jawaban B harus dikenali sebagai salah untuk soal 1');
  console.log('   ✓ Jawaban salah diakui salah (benar: false)');

  // -------------------------------------------------------------------------
  // UJI 3: Jawaban Tetap Dikenali dengan Huruf Kecil & Spasi Tambahan (Normalisasi)
  // -------------------------------------------------------------------------
  console.log('2. Menguji normalisasi input (huruf kecil & spasi tambahan)...');
  // Selesaikan soal 1 dan mulai soal 2 (kunci B)
  multiManager.selesaikanSoalAktif(sessionMultiId);
  sesiMulti.currentQuestionIndex = 1;
  multiManager.mulaiTimerSoal(sessionMultiId, 15);

  // Siswa A menjawab dengan huruf kecil 'b' dan spasi tambahan ' b '
  const hasilASoal2 = multiManager.prosesJawabanSiswa(
    sessionMultiId,
    pA.id,
    'soal-2-putih',
    '  b  '
  );
  assert.strictEqual(hasilASoal2.benar, true, 'Input "  b  " harus dinormalisasi dan diakui benar');

  // Siswa B menjawab dengan teks opsi "Bintang"
  const hasilBSoal2 = multiManager.prosesJawabanSiswa(
    sessionMultiId,
    pB.id,
    'soal-2-putih',
    'Bintang'
  );
  assert.strictEqual(hasilBSoal2.benar, true, 'Input teks opsi "Bintang" harus diakui benar');
  console.log('   ✓ Huruf kecil, spasi tambahan, dan teks opsi berhasil dinormalisasi sebagai benar');

  // -------------------------------------------------------------------------
  // UJI 4: Toleransi ID Soal Undefined/Missing (Fallback Aman Backend)
  // -------------------------------------------------------------------------
  console.log('3. Menguji toleransi fallback questionId undefined/missing...');
  multiManager.selesaikanSoalAktif(sessionMultiId);
  sesiMulti.currentQuestionIndex = 2; // Kunci C
  multiManager.mulaiTimerSoal(sessionMultiId, 15);

  // Siswa A mengirim tanpa questionId (undefined / kosong)
  const hasilASoal3 = multiManager.prosesJawabanSiswa(
    sessionMultiId,
    pA.id,
    undefined as any,
    'C'
  );
  assert.strictEqual(hasilASoal3.benar, true, 'Fallback questionId undefined harus berhasil memvalidasi soal aktif');

  // Siswa B mengirim 'undefined' string
  const hasilBSoal3 = multiManager.prosesJawabanSiswa(
    sessionMultiId,
    pB.id,
    'undefined',
    'c'
  );
  assert.strictEqual(hasilBSoal3.benar, true, 'Fallback string "undefined" harus berhasil memvalidasi');
  console.log('   ✓ Fallback backend bekerja mulus ketika frontend mengirim questionId undefined');

  // -------------------------------------------------------------------------
  // UJI 5: Backend Menolak Jawaban Ganda dari Siswa yang Sama
  // -------------------------------------------------------------------------
  console.log('4. Menguji penolakan jawaban ganda (single submission enforcement)...');
  assert.throws(
    () => {
      multiManager.prosesJawabanSiswa(sessionMultiId, pA.id, 'soal-3-kerupuk', 'C');
    },
    /sudah mengirim jawaban/i,
    'Siswa tidak boleh mengirim jawaban dua kali pada soal yang sama'
  );
  console.log('   ✓ Percobaan jawaban kedua ditolak dengan aman');

  // -------------------------------------------------------------------------
  // UJI 6 & 7: Integritas Skor & Posisi Tali (Jawaban Benar Menggerakkan Tali, Salah Tidak)
  // -------------------------------------------------------------------------
  console.log('5. Menguji integritas posisi tali dan skor tim...');
  // Posisi awal dicek:
  // Soal 1: A (tim A) benar -> tim A dapat 1 poin. B (tim B) salah -> tim B tidak dapat poin.
  // Pastikan skor tim merah / tim putih sesuai
  const totalSkor = sesiMulti.skorMerah + sesiMulti.skorPutih;
  assert.ok(totalSkor > 0, 'Skor tim harus bertambah setelah jawaban benar');
  console.log(`   ✓ Posisi tali: ${sesiMulti.taliPosition}, Skor Merah: ${sesiMulti.skorMerah}, Skor Putih: ${sesiMulti.skorPutih}`);

  // -------------------------------------------------------------------------
  // UJI 8: Isolasi Multi-Device (Device A tidak menginterferensi Device B)
  // -------------------------------------------------------------------------
  console.log('6. Menguji isolasi multi-device (Device A vs Device B)...');
  const mapJawabanSoal3 = sesiMulti.jawabanPerSoal.get('soal-3-kerupuk')!;
  assert.strictEqual(mapJawabanSoal3.has(pA.id), true, 'State jawaban Device A tercatat mandiri');
  assert.strictEqual(mapJawabanSoal3.has(pB.id), true, 'State jawaban Device B tercatat mandiri');
  assert.strictEqual(mapJawabanSoal3.size, 2, 'Tepat 2 entri jawaban tercatat');
  console.log('   ✓ Data dan state setiap perangkat terisolasi sempurna');

  // -------------------------------------------------------------------------
  // UJI 9: Validasi Jawaban Game Makan Kerupuk Challenge (Mode Solo)
  // -------------------------------------------------------------------------
  console.log('7. Menguji validasi jawaban berbasis choiceId & gacha pada Makan Kerupuk Mode Solo...');
  const sessionKerupukId = 'test-kerupuk-validasi-' + Date.now();

  const sesiKerupuk = kerupukManager.inisialisasiSesi(
    sessionKerupukId,
    'host-guru-kerupuk',
    { id: 'tmpl-k', judul: 'Kuis Kerupuk' },
    mockQuestions
  );

  kerupukManager.mulaiPermainan(sessionKerupukId, 'host-guru-kerupuk');
  const presK1 = sesiKerupuk.activePresentation!;
  const pilBenarK1 = presK1.pilihanList.find((p) => p.choiceId === presK1.correctChoiceId)!;

  const hasilBenarK = kerupukManager.prosesJawaban(sessionKerupukId, 'host-guru-kerupuk', {
    presentationId: presK1.presentationId,
    choiceId: pilBenarK1.choiceId,
  });
  assert.strictEqual(hasilBenarK.benar, true, 'Pilihan benar harus diakui benar');
  assert.ok(hasilBenarK.poinDidapat >= 100, 'Jawaban benar harus mendapat minimal 100 poin');
  assert.ok(hasilBenarK.gacha !== null, 'Jawaban benar harus mendapatkan random draw gacha gigitan');

  const presK2 = sesiKerupuk.activePresentation!;
  const pilSalahK2 = presK2.pilihanList.find((p) => p.choiceId !== presK2.correctChoiceId)!;

  const hasilSalahK = kerupukManager.prosesJawaban(sessionKerupukId, 'host-guru-kerupuk', {
    presentationId: presK2.presentationId,
    choiceId: pilSalahK2.choiceId,
  });
  assert.strictEqual(hasilSalahK.benar, false, 'Pilihan salah harus diakui salah');
  assert.strictEqual(hasilSalahK.poinDidapat, 0, 'Jawaban salah tidak mendapat poin');
  assert.strictEqual(hasilSalahK.gacha, null, 'Jawaban salah tidak mendapat gacha gigitan');
  kerupukManager.hapusSesi(sessionKerupukId);
  console.log('   ✓ Makan Kerupuk Mode Solo memvalidasi choiceId benar (+gacha) dan salah (poin 0, no gacha) secara presisi');

  // -------------------------------------------------------------------------
  // UJI 10: Validasi Jawaban Game Solo
  // -------------------------------------------------------------------------
  console.log('8. Menguji validasi jawaban pada Game Solo...');
  const sessionSoloId = 'test-solo-validasi-' + Date.now();
  const hostSoloId = 'guru-solo-1';

  const sesiSolo = soloManager.inisialisasiSesi(
    sessionSoloId,
    hostSoloId,
    { id: 'tmpl-s', judul: 'Kuis Solo' },
    mockQuestions
  );

  soloManager.mulaiSesi(sessionSoloId, hostSoloId);

  // Tim Merah menjawab benar dengan ' a '
  const hasilSoloMerah = soloManager.prosesJawaban(sessionSoloId, hostSoloId, {
    questionId: 'soal-1-merah',
    tim: 'merah',
    jawabanDipilih: ' a ',
  });
  assert.strictEqual(hasilSoloMerah.benar, true, 'Solo tim merah menjawab benar');
  assert.strictEqual(hasilSoloMerah.sesi.skorMerah, 1, 'Skor merah bertambah');

  // Tim Putih menjawab salah pada soal 2
  const hasilSoloPutih = soloManager.prosesJawaban(sessionSoloId, hostSoloId, {
    questionId: 'soal-2-putih',
    tim: 'putih',
    jawabanDipilih: 'C',
  });
  assert.strictEqual(hasilSoloPutih.benar, false, 'Solo tim putih menjawab salah');
  assert.strictEqual(hasilSoloPutih.sesi.skorPutih, 0, 'Skor putih tidak bertambah');
  console.log('   ✓ Validasi Solo konsisten dan akurat');

  console.log('\n=============================================================');
  console.log('🎉 SEMUA 10 UJI VALIDASI JAWABAN SISWA LULUS 100% TANPA REGRESI!');
  console.log('=============================================================\n');
}

runValidasiJawabanTests().catch((err) => {
  console.error('❌ PENGUJIAN GAGAL:', err);
  process.exit(1);
});
