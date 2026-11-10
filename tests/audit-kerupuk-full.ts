import assert from 'assert';
import { kerupukManager, siapkanAntreanSoal, SoalKerupuk } from '../server/src/games/kerupukManager.js';
import { PRESET_PROBABILITAS } from '../server/src/games/makanKerupuk.js';

console.log('================================================================');
console.log('🧪 AUDIT LOGIKA MODE SOLO — MAKAN KERUPUK CHALLENGE');
console.log('================================================================\n');

const mockQuestions: SoalKerupuk[] = [
  {
    id: 'audit-q1',
    urutan: 1,
    teks: 'Ibukota Indonesia adalah?',
    opsiA: 'Jakarta',
    opsiB: 'Bandung',
    opsiC: 'Surabaya',
    jawabanBenar: 'A',
    penjelasan: 'Jakarta adalah ibu kota Indonesia.',
  },
  {
    id: 'audit-q2',
    urutan: 2,
    teks: 'Warna bendera Indonesia?',
    opsiA: 'Merah Putih',
    opsiB: 'Biru Kuning',
    opsiC: 'Hijau Hitam',
    jawabanBenar: 'A',
    penjelasan: 'Merah Putih.',
  },
  {
    id: 'audit-q3',
    urutan: 3,
    teks: 'Hari kemerdekaan RI?',
    opsiA: '17 Agustus',
    opsiB: '1 Januari',
    opsiC: '25 Desember',
    jawabanBenar: 'A',
    penjelasan: '17 Agustus 1945.',
  },
];

// Audit 1: Siklus Berulang Tanpa Batas Timer saat Target 200 dengan Bank Soal 3 Item
console.log('▶ Audit 1: Siklus acak soal berulang untuk target panjang (200 poin)');
{
  const sid = 'audit-solo-1';
  kerupukManager.hapusSesi(sid);
  const sesi = kerupukManager.inisialisasiSesi(
    sid,
    'guru-audit',
    { id: 't-audit', judul: 'Audit Siklus Soal' },
    mockQuestions,
    {
      targetKerupuk: 200,
      kesulitan: 'custom',
      probabilitas: { besar: 0, sedang: 0, kecil: 100, sangat_kecil: 0, zonk: 0 }, // -20 pt per benar -> butuh 10 soal benar (> 3 bank soal!)
    }
  );

  kerupukManager.mulaiPermainan(sid, 'guru-audit');
  let prevQId = '';
  let step = 0;

  while (sesi.state === 'PLAYING' && step < 20) {
    step += 1;
    const pres = sesi.activePresentation!;
    if (prevQId) {
      assert.notStrictEqual(
        pres.questionId,
        prevQId,
        'Soal tidak boleh muncul sama 2 kali berturut-turut pada bank soal > 1'
      );
    }
    prevQId = pres.questionId;
    kerupukManager.prosesJawaban(sid, 'guru-audit', {
      presentationId: pres.presentationId,
      choiceId: pres.correctChoiceId,
    });
  }

  assert.strictEqual(step, 10, 'Target 200 dengan kecil (-20 pt) selesai tepat dalam 10 jawaban benar');
  assert.strictEqual(sesi.state, 'FINISHED');
  assert.strictEqual(sesi.pemainState.sisaKerupuk, 0);
  assert.strictEqual(sesi.pemainState.bonusPenyelesaian, 100);
  kerupukManager.hapusSesi(sid);
  console.log('  ✓ Lolos: Soal teracak berulang melampaui ukuran bank tanpa pengulangan berturutan.');
}

// Audit 2: Penjagaan Akses Guru & Isolasi Sesi Paralel
console.log('▶ Audit 2: Penjagaan kepemilikan sesi & antrean Fisher-Yates');
{
  const sidA = 'audit-solo-a';
  const sidB = 'audit-solo-b';
  kerupukManager.hapusSesi(sidA);
  kerupukManager.hapusSesi(sidB);

  const sesiA = kerupukManager.inisialisasiSesi(
    sidA,
    'guru-a',
    { id: 't1', judul: 'Sesi Guru A' },
    mockQuestions,
    { targetKerupuk: 100, kesulitan: 'normal', probabilitas: { ...PRESET_PROBABILITAS.normal } }
  );
  const sesiB = kerupukManager.inisialisasiSesi(
    sidB,
    'guru-b',
    { id: 't1', judul: 'Sesi Guru B' },
    mockQuestions,
    { targetKerupuk: 150, kesulitan: 'mudah' }
  );

  assert.throws(
    () => kerupukManager.mulaiPermainan(sidA, 'guru-b'),
    'Guru lain wajib dilarang mengendalikan sesi Guru A'
  );

  kerupukManager.mulaiPermainan(sidA, 'guru-a');
  kerupukManager.mulaiPermainan(sidB, 'guru-b');

  assert.strictEqual(sesiA.config.targetKerupuk, 100);
  assert.strictEqual(sesiB.config.targetKerupuk, 150);

  const antrean = siapkanAntreanSoal(mockQuestions, 'audit-q1');
  assert.strictEqual(antrean.length, 3);
  assert.notStrictEqual(antrean[0], 'audit-q1');

  kerupukManager.hapusSesi(sidA);
  kerupukManager.hapusSesi(sidB);
  console.log('  ✓ Lolos: Kepemilikan sesi & snapshot konfigurasi terisolasi sempurna.');
}

console.log('\n================================================================');
console.log('🎉 AUDIT LOGIKA MODE SOLO MAKAN KERUPUK SELESAI 100%!');
console.log('================================================================');
