import assert from 'assert';
import { kerupukManager, siapkanAntreanSoal, SoalKerupuk } from '../server/src/games/kerupukManager.js';
import { kerupukMultiManager } from '../server/src/games/kerupukMultiManager.js';
import { PRESET_PROBABILITAS } from '../server/src/games/makanKerupuk.js';

console.log('================================================================');
console.log('🧪 AUDIT LOGIKA DUAL MODE — MAKAN KERUPUK CHALLENGE');
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

// Audit 1: Siklus Soal Acak Berulang Target 200 (Solo)
console.log('▶ Audit 1: Siklus acak soal berulang target 200 poin pada Solo Mode');
{
  const sid = 'audit-solo-1';
  kerupukManager.hapusSesi(sid);
  const sesi = kerupukManager.inisialisasiSesi(
    sid,
    'guru-audit',
    { id: 't-audit', judul: 'Audit Solo' },
    mockQuestions,
    {
      targetKerupuk: 200,
      kesulitan: 'custom',
      probabilitas: { besar: 0, sedang: 0, kecil: 100, sangat_kecil: 0, zonk: 0 },
    }
  );
  kerupukManager.mulaiPermainan(sid, 'guru-audit');
  let prevQId = '';
  let step = 0;

  while (sesi.state === 'PLAYING' && step < 20) {
    step += 1;
    const pres = sesi.activePresentation!;
    if (prevQId) {
      assert.notStrictEqual(pres.questionId, prevQId);
    }
    prevQId = pres.questionId;
    kerupukManager.prosesJawaban(sid, 'guru-audit', {
      presentationId: pres.presentationId,
      choiceId: pres.correctChoiceId,
    });
  }

  assert.strictEqual(step, 10);
  assert.strictEqual(sesi.state, 'FINISHED');
  assert.strictEqual(sesi.pemainState.sisaKerupuk, 0);
  assert.strictEqual(sesi.pemainState.bonusPenyelesaian, 100);
  kerupukManager.hapusSesi(sid);
  console.log('  ✓ Lolos: Solo Mode menyelesaikan 10 putaran tanpa repeat berurutan.');
}

// Audit 2: Multiplayer Auto-End saat Semua Aktif Selesai & Pemblokiran Pemain Selesai
console.log('▶ Audit 2: Multiplayer Mode auto-end & isolasi progres per pemain');
{
  const mid = 'audit-multi-1';
  const tok = '774411';
  kerupukMultiManager.hapusSesi(mid);
  kerupukMultiManager.inisialisasiSesi(
    mid,
    tok,
    'guru-multi',
    { id: 't-m', judul: 'Audit Multi' },
    mockQuestions,
    {
      targetKerupuk: 50,
      kesulitan: 'custom',
      probabilitas: { besar: 100, sedang: 0, kecil: 0, sangat_kecil: 0, zonk: 0 },
    }
  );

  const p1 = kerupukMultiManager.gabungPeserta(tok, 'Pemain A', 's-a');
  const p2 = kerupukMultiManager.gabungPeserta(tok, 'Pemain B', 's-b');
  kerupukMultiManager.mulaiPermainan(mid, 'guru-multi');

  // Pemain A menyelesaikan 3x benar -> selesai; Pemain B masih bermain!
  for (let i = 0; i < 3; i++) {
    kerupukMultiManager.ambilSoalBerikutnyaUntukPeserta(mid, p1.peserta.id);
    const pres = p1.peserta.activePresentation!;
    const res = kerupukMultiManager.prosesJawabanSiswa(mid, p1.peserta.id, {
      presentationId: pres.presentationId,
      choiceId: pres.correctChoiceId,
    });
    if (i < 2) assert.strictEqual(res.pemainSelesai, false);
    else {
      assert.strictEqual(res.pemainSelesai, true);
      assert.strictEqual(res.gameSelesaiSemuaHabis, false, 'Game lanjut karena Pemain B belum selesai');
    }
  }

  assert.strictEqual(
    kerupukMultiManager.ambilSoalBerikutnyaUntukPeserta(mid, p1.peserta.id),
    null,
    'Pemain A selesai tidak menerima soal lagi'
  );
  assert.ok(
    kerupukMultiManager.ambilSoalBerikutnyaUntukPeserta(mid, p2.peserta.id) !== null,
    'Pemain B masih menerima soal'
  );

  // Pemain B menyelesaikan -> semua aktif selesai -> gameSelesaiSemuaHabis = true!
  for (let i = 0; i < 3; i++) {
    kerupukMultiManager.ambilSoalBerikutnyaUntukPeserta(mid, p2.peserta.id);
    const pres = p2.peserta.activePresentation!;
    const res = kerupukMultiManager.prosesJawabanSiswa(mid, p2.peserta.id, {
      presentationId: pres.presentationId,
      choiceId: pres.correctChoiceId,
    });
    if (i === 2) {
      assert.strictEqual(res.gameSelesaiSemuaHabis, true);
    }
  }

  const antrean = siapkanAntreanSoal(mockQuestions, 'audit-q1');
  assert.notStrictEqual(antrean[0], 'audit-q1');
  assert.strictEqual(PRESET_PROBABILITAS.normal.besar, 15);
  kerupukMultiManager.hapusSesi(mid);
  console.log('  ✓ Lolos: Isolasi progres per pemain & auto-finish Multiplayer terverifikasi.');
}

console.log('\n================================================================');
console.log('🎉 AUDIT LOGIKA DUAL MODE MAKAN KERUPUK SELESAI 100%!');
console.log('================================================================');
