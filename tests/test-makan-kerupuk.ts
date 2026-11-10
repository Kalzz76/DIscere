import assert from 'assert';
import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { prisma } from '../server/src/db.js';
import { authRouter } from '../server/src/routes/auth.js';
import { templateRouter } from '../server/src/routes/template.js';
import { sesiRouter } from '../server/src/routes/sesi.js';
import { errorHandler } from '../server/src/middleware/error.js';
import {
  PRESET_PROBABILITAS,
  validasiProbabilitas,
  bangunKonfigurasiKerupukSolo,
  konfigurasiKerupukSoloSchema,
  hitungPenguranganGigitan,
  drawGachaGigitan,
  buatStateKerupukAwal,
  hitungHasilJawabanKerupukSolo,
} from '../server/src/games/makanKerupuk.js';
import { kerupukManager, SoalKerupuk, siapkanAntreanSoal } from '../server/src/games/kerupukManager.js';

const MOCK_QUESTIONS: SoalKerupuk[] = [
  {
    id: 'mk-q-1',
    urutan: 1,
    teks: 'Kemerdekaan Indonesia diproklamasikan pada tahun?',
    opsiA: '1945',
    opsiB: '1948',
    opsiC: '1950',
    jawabanBenar: 'A',
    penjelasan: 'Proklamasi dibacakan pada 17 Agustus 1945.',
  },
  {
    id: 'mk-q-2',
    urutan: 2,
    teks: 'Warna bendera negara Indonesia adalah?',
    opsiA: 'Biru Putih',
    opsiB: 'Merah Putih',
    opsiC: 'Merah Biru',
    jawabanBenar: 'B',
    penjelasan: 'Sang Saka Merah Putih.',
  },
  {
    id: 'mk-q-3',
    urutan: 3,
    teks: 'Ibukota Provinsi Jawa Barat adalah?',
    opsiA: 'Semarang',
    opsiB: 'Surabaya',
    opsiC: 'Bandung',
    jawabanBenar: 'C',
    penjelasan: 'Bandung adalah ibu kota Jawa Barat.',
  },
];

function jalankanUnitTests() {
  console.log('▶ BAGIAN A: UNIT TEST ENGINE MODE SOLO MAKAN KERUPUK CHALLENGE');

  // 1. Preset probabilitas resmi & validasi 100%
  console.log('1. Menguji preset kesulitan (Mudah, Normal, Sulit) & penolakan konfigurasi invalid...');
  assert.strictEqual(validasiProbabilitas(PRESET_PROBABILITAS.mudah).valid, true);
  assert.strictEqual(validasiProbabilitas(PRESET_PROBABILITAS.normal).valid, true);
  assert.strictEqual(validasiProbabilitas(PRESET_PROBABILITAS.sulit).valid, true);

  assert.strictEqual(
    validasiProbabilitas({ besar: 20, sedang: 20, kecil: 20, sangat_kecil: 20, zonk: 10 }).valid,
    false,
    'Total != 100% harus ditolak'
  );
  assert.strictEqual(
    validasiProbabilitas({ besar: -5, sedang: 45, kecil: 30, sangat_kecil: 20, zonk: 10 }).valid,
    false,
    'Probabilitas negatif harus ditolak'
  );
  assert.throws(
    () =>
      konfigurasiKerupukSoloSchema.parse({
        targetKerupuk: 5,
        kesulitan: 'normal',
      }),
    'Target kerupuk < 10 harus ditolak oleh Zod'
  );
  assert.throws(
    () =>
      bangunKonfigurasiKerupukSolo({
        targetKerupuk: 100,
        kesulitan: 'custom',
        probabilitas: { besar: 50, sedang: 20, kecil: 10, sangat_kecil: 10, zonk: 5 },
      }),
    'Konfigurasi custom dengan jumlah 95% harus ditolak'
  );

  // 2. Snapshot konfigurasi bersifat immutable
  const configSnap = bangunKonfigurasiKerupukSolo({
    targetKerupuk: 150,
    kesulitan: 'sulit',
  });
  assert.strictEqual(Object.isFrozen(configSnap), true, 'Config utama harus immutable');
  assert.strictEqual(Object.isFrozen(configSnap.probabilitas), true, 'Probabilitas harus immutable');

  // 3. Pengurangan proporsional sesuai target 50, 100, 150, 200, Custom
  console.log('2. Menguji pengurangan kerupuk proporsional terhadap target...');
  assert.strictEqual(hitungPenguranganGigitan('besar', 100), 40);
  assert.strictEqual(hitungPenguranganGigitan('sedang', 100), 25);
  assert.strictEqual(hitungPenguranganGigitan('kecil', 100), 10);
  assert.strictEqual(hitungPenguranganGigitan('sangat_kecil', 100), 5);
  assert.strictEqual(hitungPenguranganGigitan('zonk', 100), 0);

  assert.strictEqual(hitungPenguranganGigitan('besar', 200), 80);
  assert.strictEqual(hitungPenguranganGigitan('sedang', 200), 50);
  assert.strictEqual(hitungPenguranganGigitan('kecil', 200), 20);
  assert.strictEqual(hitungPenguranganGigitan('sangat_kecil', 200), 10);
  assert.strictEqual(hitungPenguranganGigitan('zonk', 200), 0);

  assert.strictEqual(hitungPenguranganGigitan('besar', 50), 20);
  assert.strictEqual(hitungPenguranganGigitan('sedang', 150), 38);
  assert.strictEqual(hitungPenguranganGigitan('kecil', 120), 12);

  // 4. Verifikasi keacakan 5 tipe gigitan (Besar, Sedang, Kecil, Mini, Zonk) di backend RNG
  console.log('3. Menguji seluruh 5 jenis hasil gigitan & RNG backend...');
  // Normal: besar[0..15), sedang[15..40), kecil[40..75), sangat_kecil[75..95), zonk[95..100)
  assert.strictEqual(drawGachaGigitan(PRESET_PROBABILITAS.normal, 100, 0.05).tipe, 'besar');
  assert.strictEqual(drawGachaGigitan(PRESET_PROBABILITAS.normal, 100, 0.2).tipe, 'sedang');
  assert.strictEqual(drawGachaGigitan(PRESET_PROBABILITAS.normal, 100, 0.5).tipe, 'kecil');
  assert.strictEqual(drawGachaGigitan(PRESET_PROBABILITAS.normal, 100, 0.85).tipe, 'sangat_kecil');
  assert.strictEqual(drawGachaGigitan(PRESET_PROBABILITAS.normal, 100, 0.98).tipe, 'zonk');

  // Statistik 1000 undian tanpa mock RNG (crypto.randomInt asli)
  const rngCounts: Record<string, number> = {
    besar: 0,
    sedang: 0,
    kecil: 0,
    sangat_kecil: 0,
    zonk: 0,
  };
  for (let i = 0; i < 1000; i++) {
    rngCounts[drawGachaGigitan(PRESET_PROBABILITAS.normal, 100).tipe]++;
  }
  assert.ok(rngCounts.besar > 50 && rngCounts.kecil > 200 && rngCounts.zonk > 10);

  // 5. Kalkulasi skor terpisah, streak 3 satu kali per rangkaian, clamp >= 0, & bonus penyelesaian
  console.log('4. Menguji skor terpisah, bonus streak 3, clamp kerupuk, dan bonus penyelesaian...');
  const conf100 = bangunKonfigurasiKerupukSolo({ targetKerupuk: 100, kesulitan: 'normal' });
  let st = buatStateKerupukAwal(100);

  // Benar 1 (zonk roll=0.99 -> -0 pt): +100 pembelajaran, +0 luck, streak 1
  let h = hitungHasilJawabanKerupukSolo(st, conf100, { questionId: 'q1', nomorSoal: 1 }, true, 1200, 1000, 0.99);
  st = h.stateUpdated;
  assert.strictEqual(st.skorPembelajaran, 100);
  assert.strictEqual(st.bonusKeberuntungan, 0);
  assert.strictEqual(st.streakBenar, 1);

  // Benar 2 (sangat_kecil roll=0.80 -> -5 pt): +100 pemb, +5 luck, streak 2, sisa 95
  h = hitungHasilJawabanKerupukSolo(st, conf100, { questionId: 'q2', nomorSoal: 2 }, true, 1000, 2000, 0.80);
  st = h.stateUpdated;
  assert.strictEqual(st.skorPembelajaran, 200);
  assert.strictEqual(st.bonusKeberuntungan, 5);
  assert.strictEqual(st.sisaKerupuk, 95);
  assert.strictEqual(st.streakBenar, 2);

  // Benar 3 (kecil roll=0.50 -> -10 pt): +100 pemb + 50 STREAK! +10 luck, streak 3, sisa 85
  h = hitungHasilJawabanKerupukSolo(st, conf100, { questionId: 'q3', nomorSoal: 3 }, true, 1100, 3000, 0.50);
  st = h.stateUpdated;
  assert.strictEqual(h.bonusStreak, 50, 'Streak mencapai 3 harus memberi +50 satu kali');
  assert.strictEqual(st.skorPembelajaran, 350);
  assert.strictEqual(st.bonusKeberuntungan, 15);
  assert.strictEqual(st.sisaKerupuk, 85);

  // Benar 4 (sedang roll=0.20 -> -25 pt): streak 4 -> TIDAK dapat bonus streak kedua di rangkaian sama!
  h = hitungHasilJawabanKerupukSolo(st, conf100, { questionId: 'q1', nomorSoal: 4 }, true, 900, 4000, 0.20);
  st = h.stateUpdated;
  assert.strictEqual(h.bonusStreak, 0, 'Streak ke-4 tidak boleh menggandakan bonus streak');
  assert.strictEqual(st.skorPembelajaran, 450);
  assert.strictEqual(st.bonusKeberuntungan, 40);
  assert.strictEqual(st.sisaKerupuk, 60);

  // Salah -> 0 poin, tidak menggigit (sisa tetap 60), streak reset ke 0
  h = hitungHasilJawabanKerupukSolo(st, conf100, { questionId: 'q2', nomorSoal: 5 }, false, 1500, 5000);
  st = h.stateUpdated;
  assert.strictEqual(h.poinDidapat, 0);
  assert.strictEqual(h.gacha, null);
  assert.strictEqual(st.sisaKerupuk, 60);
  assert.strictEqual(st.streakBenar, 0);
  assert.strictEqual(st.skorPembelajaran, 450);

  // Rangkaian streak baru: Benar 1, 2, 3 lagi! Harus dapat bonus streak +50 lagi saat mencapai 3
  h = hitungHasilJawabanKerupukSolo(st, conf100, { questionId: 'q1', nomorSoal: 6 }, true, 1000, 6000, 0.50); // sisa 50
  st = h.stateUpdated;
  h = hitungHasilJawabanKerupukSolo(st, conf100, { questionId: 'q2', nomorSoal: 7 }, true, 1000, 7000, 0.50); // sisa 40
  st = h.stateUpdated;
  h = hitungHasilJawabanKerupukSolo(st, conf100, { questionId: 'q3', nomorSoal: 8 }, true, 1000, 8000, 0.20); // -25 -> sisa 15, streak=3 -> +50!
  st = h.stateUpdated;
  assert.strictEqual(h.bonusStreak, 50, 'Rangkaian streak baru saat mencapai 3 harus memberi +50 lagi');
  assert.strictEqual(st.kaliBonusStreak, 2);
  assert.strictEqual(st.sisaKerupuk, 15);

  // Terakhir: sisa tinggal 15, kena gigitan BESAR (-40)! Harus clamp ke 0 (bukan -25) & +100 bonusPenyelesaian!
  h = hitungHasilJawabanKerupukSolo(st, conf100, { questionId: 'q1', nomorSoal: 9 }, true, 900, 9000, 0.01);
  st = h.stateUpdated;
  assert.strictEqual(st.sisaKerupuk, 0, 'Sisa kerupuk wajib ter-clamp di 0, bukan negatif');
  assert.strictEqual(h.gacha?.penguranganEfektifPoin, 15);
  assert.strictEqual(st.progresPersen, 100);
  assert.strictEqual(h.bonusPenyelesaian, 100);
  assert.strictEqual(st.bonusPenyelesaian, 100);
  assert.strictEqual(
    st.skorTotal,
    st.skorPembelajaran + st.bonusKeberuntungan + st.bonusPenyelesaian,
    'Skor Total harus akurat = Pembelajaran + Keberuntungan + Penyelesaian'
  );

  // 6. State Machine Manager: READY -> PLAYING <-> PAUSED -> STOPPED & Restart bersih
  console.log('5. Menguji State Machine (READY/PLAYING/PAUSED/FINISHED/STOPPED), validasi choiceId, dan anti-repeat...');
  assert.throws(
    () =>
      kerupukManager.inisialisasiSesi('sesi-empty', 'guru-1', { id: 't', judul: 'Kosong' }, []),
    'Bank soal kosong harus ditolak saat inisialisasi'
  );

  const sesiId = 'unit-sesi-' + Date.now();
  const s = kerupukManager.inisialisasiSesi(
    sesiId,
    'guru-1',
    { id: 'tmpl-u', judul: 'Uji Unit' },
    MOCK_QUESTIONS,
    { targetKerupuk: 50, kesulitan: 'normal' }
  );
  assert.strictEqual(s.state, 'READY');
  assert.strictEqual(s.activePresentation, null);

  // Jawaban saat READY wajib ditolak
  assert.throws(
    () =>
      kerupukManager.prosesJawaban(sesiId, 'guru-1', {
        presentationId: 'fake',
        choiceId: 'fake',
      }),
    'Menjawab saat READY wajib ditolak'
  );

  // Mulai -> PLAYING
  kerupukManager.mulaiPermainan(sesiId, 'guru-1');
  assert.strictEqual(s.state, 'PLAYING');
  const pres1 = s.activePresentation!;
  assert.ok(pres1.presentationId);
  assert.strictEqual(pres1.pilihanList.length, 3);
  assert.ok(!('jawabanBenar' in kerupukManager.serialisasiSesiUntukClient(s).soalSaatIni!), 'Tidak boleh mengirim kunci ke frontend');

  // Pause -> PAUSED -> soal tetap sama, jawaban ditolak
  kerupukManager.jedaPermainan(sesiId, 'guru-1');
  assert.strictEqual(s.state, 'PAUSED');
  assert.throws(
    () =>
      kerupukManager.prosesJawaban(sesiId, 'guru-1', {
        presentationId: pres1.presentationId,
        choiceId: pres1.correctChoiceId,
      }),
    'Menjawab saat PAUSED wajib ditolak'
  );
  assert.strictEqual(s.pemainState.skorTotal, 0, 'Skor tidak boleh berubah saat PAUSED');

  // Resume -> PLAYING -> soal tetap sama (presentationId & questionId sama persis)
  kerupukManager.lanjutPermainan(sesiId, 'guru-1');
  assert.strictEqual(s.state, 'PLAYING');
  assert.strictEqual(s.activePresentation!.presentationId, pres1.presentationId);

  // Replay attack setelah jawab harus ditolak
  const ansRes = kerupukManager.prosesJawaban(
    sesiId,
    'guru-1',
    {
      presentationId: pres1.presentationId,
      choiceId: pres1.correctChoiceId,
    },
    { randomNormalized: 0.99 } // zonk agar tetap PLAYING
  );
  assert.strictEqual(ansRes.benar, true);
  assert.throws(
    () =>
      kerupukManager.prosesJawaban(sesiId, 'guru-1', {
        presentationId: pres1.presentationId,
        choiceId: pres1.correctChoiceId,
      }),
    'Submit ulang presentationId yang sama wajib ditolak'
  );

  // Verifikasi antrean reshuffle tidak mengulang soal sama berturut-turut jika bank soal > 1
  for (let i = 0; i < 20; i++) {
    const qIds = siapkanAntreanSoal(MOCK_QUESTIONS, MOCK_QUESTIONS[0].id);
    assert.notStrictEqual(qIds[0], MOCK_QUESTIONS[0].id, 'Soal awal siklus baru tidak boleh sama dengan terakhir sebelumnya');
  }

  // Stop manual -> STOPPED, tanpa bonus penyelesaian, tolak jawaban lanjutan
  kerupukManager.hentikanPermainan(sesiId, 'guru-1');
  assert.strictEqual(s.state, 'STOPPED');
  assert.strictEqual(s.pemainState.bonusPenyelesaian, 0);
  assert.strictEqual(s.activePresentation, null, 'Tidak ada soal aktif setelah STOPPED');
  assert.throws(
    () =>
      kerupukManager.prosesJawaban(sesiId, 'guru-1', {
        presentationId: s.activePresentation || ('x' as any),
        choiceId: 'y',
      }),
    'Jawaban setelah STOPPED wajib ditolak'
  );

  // Restart -> bersih total skor = 0 & sisaKerupuk = 50
  kerupukManager.ulangPermainan(sesiId, 'guru-1');
  assert.strictEqual(s.state, 'READY');
  assert.strictEqual(s.pemainState.skorTotal, 0);
  assert.strictEqual(s.pemainState.sisaKerupuk, 50);
  assert.strictEqual(s.pemainState.riwayatGigitan.length, 0);
  kerupukManager.hapusSesi(sesiId);

  console.log('   ✓ Seluruh skenario unit test Mode Solo lulus 100%!\n');
}

async function jalankanIntegrationTests() {
  console.log('▶ BAGIAN B: INTEGRATION TEST HTTP API & PERSISTENSI DATABASE');

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  app.use('/api/template', templateRouter);
  app.use('/api/sesi', sesiRouter);
  app.use(errorHandler);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  let createdTemplateId: string | null = null;
  let emptyTemplateId: string | null = null;
  const createdSessionIds: string[] = [];

  try {
    // 1. Login Guru Demo
    const loginRes = await fetch(`${baseUrl}/api/auth/masuk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'guru@discere.local',
        kataSandi: 'GuruDiscere2026!',
      }),
    });
    assert.strictEqual(loginRes.ok, true);
    const cookieHeader = loginRes.headers.get('set-cookie');
    assert.ok(cookieHeader);
    const guruCookie = cookieHeader.split(';')[0];

    // 2. Buat template Makan Kerupuk (mode dipaksa 'solo' di server walaupun dikirim 'multi')
    const tmplRes = await fetch(`${baseUrl}/api/template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: guruCookie },
      body: JSON.stringify({
        judul: `Uji Kerupuk Solo ${Date.now()}`,
        game: 'makan_kerupuk',
        mode: 'multi',
        questions: MOCK_QUESTIONS.map((q) => ({
          urutan: q.urutan,
          teks: q.teks,
          opsiA: q.opsiA,
          opsiB: q.opsiB,
          opsiC: q.opsiC,
          jawabanBenar: q.jawabanBenar,
          penjelasan: q.penjelasan,
        })),
      }),
    });
    assert.strictEqual(tmplRes.status, 201);
    const tmplData: any = await tmplRes.json();
    createdTemplateId = tmplData.template.id;
    assert.strictEqual(tmplData.template.mode, 'solo', 'Template makan_kerupuk harus otomatis ber-mode solo');

    const kunciTeksMap = new Map<string, string>();
    for (const q of tmplData.template.questions) {
      const benarTeks = q.jawabanBenar === 'A' ? q.opsiA : q.jawabanBenar === 'B' ? q.opsiB : q.opsiC;
      kunciTeksMap.set(q.id, benarTeks);
    }

    // 3. Tolak konfigurasi invalid (probabilitas total 80%)
    const invalidCfgRes = await fetch(`${baseUrl}/api/sesi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: guruCookie },
      body: JSON.stringify({
        templateId: createdTemplateId,
        game: 'makan_kerupuk',
        mode: 'solo',
        kerupukConfig: {
          targetKerupuk: 100,
          kesulitan: 'custom',
          probabilitas: { besar: 20, sedang: 20, kecil: 20, sangat_kecil: 10, zonk: 10 },
        },
      }),
    });
    assert.strictEqual(invalidCfgRes.status, 400, 'Probabilitas != 100% wajib ditolak HTTP 400');

    // 4. Tolak template dengan bank soal kosong
    emptyTemplateId = (
      await prisma.template.create({
        data: { judul: 'Kosong Uji Kerupuk', game: 'makan_kerupuk', mode: 'solo' },
      })
    ).id;
    const emptySessionRes = await fetch(`${baseUrl}/api/sesi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: guruCookie },
      body: JSON.stringify({
        templateId: emptyTemplateId,
        game: 'makan_kerupuk',
      }),
    });
    assert.strictEqual(emptySessionRes.status, 400, 'Template kosong wajib ditolak HTTP 400');

    // 5. Buat Sesi 1 (Custom Target 50, Custom Probabilitas besar=100% agar deterministik 2 langkah selesai!)
    const s1Res = await fetch(`${baseUrl}/api/sesi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: guruCookie },
      body: JSON.stringify({
        templateId: createdTemplateId,
        game: 'makan_kerupuk',
        mode: 'solo',
        kerupukConfig: {
          targetKerupuk: 50,
          targetPreset: '50',
          kesulitan: 'custom',
          probabilitas: { besar: 100, sedang: 0, kecil: 0, sangat_kecil: 0, zonk: 0 },
        },
      }),
    });
    assert.strictEqual(s1Res.status, 201);
    const s1Data: any = await s1Res.json();
    const s1Id: string = s1Data.session.id;
    createdSessionIds.push(s1Id);

    assert.strictEqual(s1Data.session.mode, 'solo');
    assert.strictEqual(s1Data.session.state, 'READY');
    assert.strictEqual(s1Data.session.token, undefined, 'Mode Solo tidak menghasilkan token PIN');
    assert.strictEqual(s1Data.session.qrDataUrl, undefined, 'Mode Solo tidak menghasilkan QR');

    // Pastikan DB Session tidak menyimpan token
    const s1Db = await prisma.session.findUnique({ where: { id: s1Id } });
    assert.strictEqual(s1Db?.token, null);
    assert.strictEqual(s1Db?.mode, 'solo');

    // 6. Mulai -> PLAYING -> PAUSE -> Tolak jawab saat PAUSED -> RESUME
    const startRes = await fetch(`${baseUrl}/api/sesi/${s1Id}/mulai`, {
      method: 'POST',
      headers: { Cookie: guruCookie },
    });
    assert.strictEqual(startRes.ok, true);
    const startJson: any = await startRes.json();
    assert.strictEqual(startJson.session.state, 'PLAYING');
    let soal = startJson.session.soalSaatIni;
    assert.ok(soal?.presentationId && soal.pilihan.length === 3);

    const pauseRes = await fetch(`${baseUrl}/api/sesi/${s1Id}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: guruCookie },
      body: JSON.stringify({ state: 'PAUSED' }),
    });
    assert.strictEqual(pauseRes.ok, true);

    const rejectPaused = await fetch(`${baseUrl}/api/sesi/${s1Id}/jawab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: guruCookie },
      body: JSON.stringify({
        presentationId: soal.presentationId,
        choiceId: soal.pilihan[0].choiceId,
      }),
    });
    assert.strictEqual(rejectPaused.status, 400, 'Jawab saat PAUSED wajib ditolak HTTP 400');

    const resumeRes = await fetch(`${baseUrl}/api/sesi/${s1Id}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: guruCookie },
      body: JSON.stringify({ state: 'PLAYING' }),
    });
    assert.strictEqual(resumeRes.ok, true);

    // 7. Uji Restart tengah permainan via POST /ulang tidak menyisakan skor
    const benarTeks1 = kunciTeksMap.get(soal.questionId)!;
    const benarChoice1 = soal.pilihan.find((p: any) => p.teks === benarTeks1)!;
    const j1Res = await fetch(`${baseUrl}/api/sesi/${s1Id}/jawab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: guruCookie },
      body: JSON.stringify({
        presentationId: soal.presentationId,
        choiceId: benarChoice1.choiceId,
      }),
    });
    const j1Json: any = await j1Res.json();
    assert.strictEqual(j1Json.benar, true);
    assert.strictEqual(j1Json.sisaKerupuk, 30); // 50 - 20 = 30
    assert.strictEqual(j1Json.skorTotal, 140); // 100 + 40

    const ulangMid = await fetch(`${baseUrl}/api/sesi/${s1Id}/ulang`, {
      method: 'POST',
      headers: { Cookie: guruCookie },
    });
    assert.strictEqual(ulangMid.ok, true);
    const ulangJson: any = await ulangMid.json();
    assert.strictEqual(ulangJson.session.state, 'READY');
    assert.strictEqual(ulangJson.session.skorTotal, 0, 'Skor setelah ulang wajib 0');
    assert.strictEqual(ulangJson.session.sisaKerupuk, 50, 'Sisa kerupuk setelah ulang wajib utuh');

    // 8. Mainkan ulang sampai FINISHED (Target 50, Besar -20 -> -20 -> -20 (sisa 10 -> clamp 0)) = 3x benar -> SEKALIGUS Streak 3 + Bonus Ludes!
    const start2Res = await fetch(`${baseUrl}/api/sesi/${s1Id}/mulai`, {
      method: 'POST',
      headers: { Cookie: guruCookie },
    });
    soal = ((await start2Res.json()) as any).session.soalSaatIni;

    let lastStepJson: any = null;
    for (let step = 1; step <= 3; step++) {
      const benarTeks = kunciTeksMap.get(soal.questionId)!;
      const pilBenar = soal.pilihan.find((p: any) => p.teks === benarTeks)!;
      const ansRes = await fetch(`${baseUrl}/api/sesi/${s1Id}/jawab`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: guruCookie },
        body: JSON.stringify({
          presentationId: soal.presentationId,
          choiceId: pilBenar.choiceId,
        }),
      });
      assert.strictEqual(ansRes.ok, true);
      lastStepJson = await ansRes.json();
      assert.strictEqual(lastStepJson.benar, true);
      soal = lastStepJson.soalBerikutnya;
    }

    assert.strictEqual(lastStepJson.isFinished, true);
    assert.strictEqual(lastStepJson.session.state, 'FINISHED');
    assert.strictEqual(lastStepJson.sisaKerupuk, 0);
    assert.strictEqual(lastStepJson.soalBerikutnya, null, 'Tidak ada soal baru setelah FINISHED');
    assert.strictEqual(lastStepJson.skorPembelajaran, 350, '3x benar (+300) + 1x streak 3 (+50) = 350');
    assert.strictEqual(lastStepJson.bonusKeberuntungan, 120, '3x gigitan besar (+40) = 120');
    assert.strictEqual(lastStepJson.bonusPenyelesaianTotal, 100, 'Bonus penyelesaian = +100');
    assert.strictEqual(lastStepJson.skorTotal, 570);

    // Tolak jawaban setelah FINISHED
    const afterFinish = await fetch(`${baseUrl}/api/sesi/${s1Id}/jawab`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: guruCookie },
      body: JSON.stringify({
        presentationId: 'stale',
        choiceId: 'stale',
      }),
    });
    assert.strictEqual(afterFinish.status, 400);

    // Pastikan TIDAK ADA satupun SessionPlayer row tercipta di DB
    const playerRowsCount = await prisma.sessionPlayer.count({ where: { sessionId: s1Id } });
    assert.strictEqual(playerRowsCount, 0, 'Mode Solo tidak boleh membuat SessionPlayer');

    // Verifikasi GET /hasil & GET /riwayat/:id
    const hasilRes = await fetch(`${baseUrl}/api/sesi/${s1Id}/hasil`, {
      headers: { Cookie: guruCookie },
    });
    assert.strictEqual(hasilRes.ok, true);
    const hasilData: any = await hasilRes.json();
    assert.strictEqual(hasilData.hasil.skorTotal, 570);
    assert.strictEqual(hasilData.hasil.statusAkhir, 'FINISHED');

    const riwayatDetailRes = await fetch(`${baseUrl}/api/sesi/riwayat/${s1Id}`, {
      headers: { Cookie: guruCookie },
    });
    assert.strictEqual(riwayatDetailRes.ok, true);
    const riwayatDetail: any = await riwayatDetailRes.json();
    assert.strictEqual(riwayatDetail.detail.mode, 'SOLO');
    assert.strictEqual(riwayatDetail.detail.laporanKerupukSolo.skorTotal, 570);

    // 9. Sesi 2 lewat /main-lagi + Uji STOPPED manual + cek skor baru dimulai dari 0
    const mainLagiRes = await fetch(`${baseUrl}/api/sesi/${s1Id}/main-lagi`, {
      method: 'POST',
      headers: { Cookie: guruCookie },
    });
    assert.strictEqual(mainLagiRes.status, 201);
    const mainLagiData: any = await mainLagiRes.json();
    const s2Id: string = mainLagiData.sessionId;
    createdSessionIds.push(s2Id);
    assert.strictEqual(mainLagiData.session.skorTotal, 0);
    assert.strictEqual(mainLagiData.session.sisaKerupuk, 50);

    const startS2 = await fetch(`${baseUrl}/api/sesi/${s2Id}/mulai`, {
      method: 'POST',
      headers: { Cookie: guruCookie },
    });
    assert.strictEqual(startS2.ok, true);

    const stopS2 = await fetch(`${baseUrl}/api/sesi/${s2Id}/selesai`, {
      method: 'POST',
      headers: { Cookie: guruCookie },
    });
    assert.strictEqual(stopS2.ok, true);
    const stopJson: any = await stopS2.json();
    assert.strictEqual(stopJson.session.state, 'STOPPED');
    assert.strictEqual(stopJson.hasil.bonusPenyelesaian, 0, 'STOPPED tidak mendapat bonus penyelesaian');

    console.log('   ✓ Seluruh skenario integrasi HTTP & database lulus 100%!\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const sid of createdSessionIds) {
      kerupukManager.hapusSesi(sid);
      await prisma.session.deleteMany({ where: { id: sid } });
    }
    if (createdTemplateId) {
      await prisma.template.deleteMany({ where: { id: createdTemplateId } });
    }
    if (emptyTemplateId) {
      await prisma.template.deleteMany({ where: { id: emptyTemplateId } });
    }
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('\n==============================================================');
  console.log('PENGUJIAN LENGKAP MAKAN KERUPUK CHALLENGE — MODE SOLO');
  console.log('==============================================================\n');
  jalankanUnitTests();
  await jalankanIntegrationTests();
  console.log('==============================================================');
  console.log('SEMUA 19 SKENARIO MAKAN KERUPUK MODE SOLO LULUS 100%!');
  console.log('==============================================================\n');
}

main().catch((err) => {
  console.error('❌ PENGUJIAN MAKAN KERUPUK SOLO GAGAL:', err);
  process.exit(1);
});
