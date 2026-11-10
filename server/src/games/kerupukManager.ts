import crypto from 'crypto';
import { prisma } from '../db.js';
import {
  KonfigurasiKerupukSolo,
  SoloKerupukState,
  SoalTampilKerupuk,
  StateKerupukSolo,
  TipeGigitan,
  RiwayatGigitanItem,
  HasilGachaGigitan,
  bangunKonfigurasiKerupukSolo,
  buatStateKerupukAwal,
  hitungHasilJawabanKerupukSolo,
  validasiProbabilitas,
} from './makanKerupuk.js';

export interface SoalKerupuk {
  id: string;
  urutan: number;
  teks: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  jawabanBenar: string;
  penjelasan: string | null;
}

export interface ActivePresentationKerupuk {
  presentationId: string;
  questionId: string;
  nomorSoal: number;
  teks: string;
  pilihanList: Array<{ choiceId: string; label: 'A' | 'B' | 'C'; teks: string }>;
  pilihanMap: Map<string, 'A' | 'B' | 'C'>;
  correctChoiceId: string;
  jawabanBenarKode: 'A' | 'B' | 'C';
  penjelasan: string | null;
  tampilPadaMs: number;
  pausedDurationMs: number;
}

export interface LaporanKerupukSolo {
  sessionId: string;
  templateId: string;
  templateJudul: string;
  statusAkhir: 'FINISHED' | 'STOPPED';
  dihentikanManual: boolean;
  konfigurasi: KonfigurasiKerupukSolo;
  targetKerupuk: number;
  sisaKerupuk: number;
  progresPersen: number;
  skorTotal: number;
  skorPembelajaran: number;
  skorDasarBenar: number;
  totalBonusStreak: number;
  kaliBonusStreak: number;
  bonusKeberuntungan: number;
  bonusPenyelesaian: number;
  totalBenar: number;
  totalSalah: number;
  akurasiPersen: number;
  streakTertinggi: number;
  rataRataWaktuJawabMs: number;
  durasiBermainMs: number;
  statistikGigitan: Record<TipeGigitan, number>;
  riwayatGigitan: RiwayatGigitanItem[];
  totalSoalBank: number;
}

export interface SesiKerupukSoloActive {
  sessionId: string;
  templateId: string;
  templateJudul: string;
  hostId: string;
  state: StateKerupukSolo;
  config: KonfigurasiKerupukSolo;
  questions: SoalKerupuk[];
  antreanSoalIds: string[];
  terakhirSoalId?: string;
  nomorSoalCounter: number;
  activePresentation: ActivePresentationKerupuk | null;
  pausedAtMs?: number;
  pemainState: SoloKerupukState;
  questionStatsMap: Map<string, { jumlahBenar: number; jumlahSalah: number }>;
  hasil?: LaporanKerupukSolo;
}

const sesiKerupukMap = new Map<string, SesiKerupukSoloActive>();

function normalisasiKodeJawaban(raw: string): 'A' | 'B' | 'C' {
  const cleaned = String(raw || '').trim().toUpperCase();
  if (cleaned === 'A' || cleaned === 'B' || cleaned === 'C') {
    return cleaned;
  }
  throw new Error(`Kode kunci jawaban "${raw}" tidak valid pada bank soal.`);
}

/**
 * Mengacak daftar ID soal dengan algoritma Fisher-Yates berbasis crypto.randomInt.
 * Memastikan soal pertama pada siklus baru tidak sama dengan terakhirSoalId jika soal > 1.
 */
export function siapkanAntreanSoal(questions: SoalKerupuk[], terakhirSoalId?: string): string[] {
  if (!questions || questions.length === 0) return [];
  const ids = questions.map((q) => q.id);

  for (let i = ids.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = ids[i];
    ids[i] = ids[j];
    ids[j] = temp;
  }

  if (ids.length > 1 && terakhirSoalId && ids[0] === terakhirSoalId) {
    const swapIdx = crypto.randomInt(1, ids.length);
    const temp = ids[0];
    ids[0] = ids[swapIdx];
    ids[swapIdx] = temp;
  }

  return ids;
}

/**
 * Membentuk presentasi soal aman untuk dikirim ke client:
 * - Memiliki presentationId unik
 * - Setiap opsi memiliki choiceId unik
 * - Tidak mengandung indikator jawabanBenar atau isCorrect
 */
function buatPresentasiSoal(
  sesi: SesiKerupukSoloActive,
  sekarangMs: number = Date.now()
): ActivePresentationKerupuk {
  if (sesi.questions.length === 0) {
    throw new Error('Bank soal kosong. Tambahkan minimal 1 soal untuk memulai permainan.');
  }

  if (sesi.antreanSoalIds.length === 0) {
    sesi.antreanSoalIds = siapkanAntreanSoal(sesi.questions, sesi.terakhirSoalId);
  }

  const nextQuestionId = sesi.antreanSoalIds.shift();
  const soal = sesi.questions.find((q) => q.id === nextQuestionId) || sesi.questions[0];

  sesi.terakhirSoalId = soal.id;
  sesi.nomorSoalCounter += 1;

  const presentationId = crypto.randomUUID();
  const jawabanBenarKode = normalisasiKodeJawaban(soal.jawabanBenar);

  const pilihanRaw: Array<{ kode: 'A' | 'B' | 'C'; teks: string }> = [
    { kode: 'A', teks: soal.opsiA },
    { kode: 'B', teks: soal.opsiB },
    { kode: 'C', teks: soal.opsiC },
  ];

  const pilihanMap = new Map<string, 'A' | 'B' | 'C'>();
  let correctChoiceId = '';

  const pilihanList = pilihanRaw.map((item) => {
    const choiceId = `${presentationId}_${item.kode}_${crypto.randomBytes(4).toString('hex')}`;
    pilihanMap.set(choiceId, item.kode);
    if (item.kode === jawabanBenarKode) {
      correctChoiceId = choiceId;
    }
    return {
      choiceId,
      label: item.kode,
      teks: item.teks,
    };
  });

  return {
    presentationId,
    questionId: soal.id,
    nomorSoal: sesi.nomorSoalCounter,
    teks: soal.teks,
    pilihanList,
    pilihanMap,
    correctChoiceId,
    jawabanBenarKode,
    penjelasan: soal.penjelasan,
    tampilPadaMs: sekarangMs,
    pausedDurationMs: 0,
  };
}

export function serialisasiSoalTampil(
  pres: ActivePresentationKerupuk | null,
  totalSoalBank: number
): SoalTampilKerupuk | null {
  if (!pres) return null;
  return {
    presentationId: pres.presentationId,
    questionId: pres.questionId,
    nomorSoal: pres.nomorSoal,
    totalSoalBank,
    teks: pres.teks,
    pilihan: pres.pilihanList.map((p) => ({
      choiceId: p.choiceId,
      label: p.label,
      teks: p.teks,
    })),
  };
}

function bangunLaporanAkhir(
  sesi: SesiKerupukSoloActive,
  statusAkhir: 'FINISHED' | 'STOPPED',
  sekarangMs: number = Date.now()
): LaporanKerupukSolo {
  const st = sesi.pemainState;
  const totalJawab = st.totalBenar + st.totalSalah;
  const akurasiPersen = totalJawab > 0 ? Math.round((st.totalBenar / totalJawab) * 100) : 0;
  const durasiBermainMs =
    st.waktuMulaiMs !== null ? Math.max(0, (st.waktuSelesaiMs ?? sekarangMs) - st.waktuMulaiMs) : 0;

  return {
    sessionId: sesi.sessionId,
    templateId: sesi.templateId,
    templateJudul: sesi.templateJudul,
    statusAkhir,
    dihentikanManual: statusAkhir === 'STOPPED',
    konfigurasi: sesi.config,
    targetKerupuk: sesi.config.targetKerupuk,
    sisaKerupuk: st.sisaKerupuk,
    progresPersen: st.progresPersen,
    skorTotal: st.skorTotal,
    skorPembelajaran: st.skorPembelajaran,
    skorDasarBenar: st.skorDasarBenar,
    totalBonusStreak: st.totalBonusStreak,
    kaliBonusStreak: st.kaliBonusStreak,
    bonusKeberuntungan: st.bonusKeberuntungan,
    bonusPenyelesaian: st.bonusPenyelesaian,
    totalBenar: st.totalBenar,
    totalSalah: st.totalSalah,
    akurasiPersen,
    streakTertinggi: st.streakTertinggi,
    rataRataWaktuJawabMs: st.rataRataWaktuJawabMs,
    durasiBermainMs,
    statistikGigitan: { ...st.statistikGigitan },
    riwayatGigitan: [...st.riwayatGigitan],
    totalSoalBank: sesi.questions.length,
  };
}

export const kerupukManager = {
  /**
   * Menginisialisasi sesi Solo Makan Kerupuk pada status awal READY.
   * Menolak jika bank soal kosong atau konfigurasi probabilitas/target tidak valid.
   */
  inisialisasiSesi(
    sessionId: string,
    hostId: string,
    template: { id: string; judul: string },
    questions: SoalKerupuk[],
    userConfig?: Partial<KonfigurasiKerupukSolo>
  ): SesiKerupukSoloActive {
    if (!questions || questions.length === 0) {
      throw new Error('Template tidak memiliki soal. Tambahkan minimal 1 soal terlebih dahulu.');
    }

    if (userConfig?.probabilitas) {
      const cek = validasiProbabilitas(userConfig.probabilitas);
      if (!cek.valid) {
        throw new Error(cek.pesanError || 'Konfigurasi probabilitas tidak valid.');
      }
    }

    const configSnapshot = bangunKonfigurasiKerupukSolo(userConfig);
    const antreanSoalIds = siapkanAntreanSoal(questions);

    const sesi: SesiKerupukSoloActive = {
      sessionId,
      templateId: template.id,
      templateJudul: template.judul,
      hostId,
      state: 'READY',
      config: configSnapshot,
      questions: [...questions],
      antreanSoalIds,
      nomorSoalCounter: 0,
      activePresentation: null,
      pemainState: buatStateKerupukAwal(configSnapshot.targetKerupuk),
      questionStatsMap: new Map(),
    };

    sesiKerupukMap.set(sessionId, sesi);
    return sesi;
  },

  dapatkanSesi(sessionId: string): SesiKerupukSoloActive | undefined {
    return sesiKerupukMap.get(sessionId);
  },

  /**
   * Memulai permainan Solo: READY -> PLAYING, menampilkan soal pertama dengan presentationId unik.
   */
  mulaiPermainan(sessionId: string, hostId: string): SesiKerupukSoloActive {
    const sesi = sesiKerupukMap.get(sessionId);
    if (!sesi) throw new Error('Sesi Makan Kerupuk tidak ditemukan.');
    if (sesi.hostId !== hostId) {
      throw new Error('Anda tidak memiliki hak akses untuk mengendalikan sesi ini.');
    }
    if (sesi.state !== 'READY') {
      throw new Error(`Permainan tidak dapat dimulai karena berstatus ${sesi.state}.`);
    }
    if (sesi.questions.length === 0) {
      throw new Error('Bank soal kosong. Permainan tidak dapat dimulai.');
    }

    const now = Date.now();
    sesi.state = 'PLAYING';
    sesi.pemainState.waktuMulaiMs = now;
    sesi.activePresentation = buatPresentasiSoal(sesi, now);
    return sesi;
  },

  /**
   * Menjeda permainan: PLAYING -> PAUSED.
   * Soal aktif dan sisa kerupuk tetap dipertahankan; jawaban tidak dapat dikirim saat PAUSED.
   */
  jedaPermainan(sessionId: string, hostId: string): SesiKerupukSoloActive {
    const sesi = sesiKerupukMap.get(sessionId);
    if (!sesi) throw new Error('Sesi Makan Kerupuk tidak ditemukan.');
    if (sesi.hostId !== hostId) {
      throw new Error('Anda tidak memiliki hak akses untuk mengendalikan sesi ini.');
    }
    if (sesi.state !== 'PLAYING') {
      throw new Error(`Permainan hanya dapat dijeda saat berstatus PLAYING (saat ini: ${sesi.state}).`);
    }

    sesi.state = 'PAUSED';
    sesi.pausedAtMs = Date.now();
    return sesi;
  },

  /**
   * Melanjutkan permainan dari jeda: PAUSED -> PLAYING.
   * Mempertahankan soal yang sama persis tanpa memotong atau mereset progres.
   */
  lanjutPermainan(sessionId: string, hostId: string): SesiKerupukSoloActive {
    const sesi = sesiKerupukMap.get(sessionId);
    if (!sesi) throw new Error('Sesi Makan Kerupuk tidak ditemukan.');
    if (sesi.hostId !== hostId) {
      throw new Error('Anda tidak memiliki hak akses untuk mengendalikan sesi ini.');
    }
    if (sesi.state !== 'PAUSED') {
      throw new Error(`Permainan hanya dapat dilanjutkan dari status PAUSED (saat ini: ${sesi.state}).`);
    }

    const now = Date.now();
    if (sesi.pausedAtMs && sesi.activePresentation) {
      sesi.activePresentation.pausedDurationMs += Math.max(0, now - sesi.pausedAtMs);
    }
    sesi.pausedAtMs = undefined;
    sesi.state = 'PLAYING';
    return sesi;
  },

  /**
   * Mengubah state pause/resume secara terpadu.
   */
  ubahStatePermainan(
    sessionId: string,
    hostId: string,
    targetState: 'PLAYING' | 'PAUSED'
  ): SesiKerupukSoloActive {
    if (targetState === 'PAUSED') {
      return this.jedaPermainan(sessionId, hostId);
    }
    return this.lanjutPermainan(sessionId, hostId);
  },

  /**
   * Memproses jawaban guru secara otoritatif di backend.
   * Validasi berbasis presentationId & choiceId (mengabaikan flag isCorrect dari client).
   * Memblokir semua mutasi jika status bukan PLAYING atau kerupuk sudah habis.
   */
  prosesJawaban(
    sessionId: string,
    hostId: string,
    input: {
      presentationId: string;
      choiceId: string;
      questionId?: string;
    },
    options?: {
      randomNormalized?: number;
      nowMs?: number;
    }
  ): {
    sesi: SesiKerupukSoloActive;
    benar: boolean;
    jawabanBenarKode: 'A' | 'B' | 'C';
    jawabanBenarTeks: string;
    penjelasan: string | null;
    poinDidapat: number;
    poinDasar: number;
    bonusStreak: number;
    bonusPenyelesaian: number;
    gacha: HasilGachaGigitan | null;
    sisaKerupuk: number;
    targetKerupuk: number;
    progresPersen: number;
    sisaPersen: number;
    skorTotal: number;
    skorPembelajaran: number;
    bonusKeberuntungan: number;
    bonusPenyelesaianTotal: number;
    streakBenar: number;
    isFinished: boolean;
    soalBerikutnya: SoalTampilKerupuk | null;
    gigitanLogItem: RiwayatGigitanItem;
  } {
    const sesi = sesiKerupukMap.get(sessionId);
    if (!sesi) throw new Error('Sesi Makan Kerupuk tidak ditemukan.');
    if (sesi.hostId !== hostId) {
      throw new Error('Anda tidak memiliki hak akses ke sesi ini.');
    }

    if (sesi.state === 'PAUSED') {
      throw new Error('Permainan sedang dijeda (PAUSED). Lanjutkan terlebih dahulu untuk menjawab.');
    }
    if (sesi.state === 'READY') {
      throw new Error('Permainan belum dimulai (READY). Tekan Mulai terlebih dahulu.');
    }
    if (sesi.state === 'FINISHED' || sesi.state === 'STOPPED') {
      throw new Error(`Permainan sudah berakhir (${sesi.state}). Jawaban baru tidak diterima.`);
    }

    const activePres = sesi.activePresentation;
    if (!activePres) {
      throw new Error('Tidak ada soal aktif saat ini.');
    }

    if (!input.presentationId || input.presentationId !== activePres.presentationId) {
      throw new Error('ID presentasi soal tidak cocok atau soal sudah dijawab sebelumnya.');
    }

    if (input.questionId && input.questionId !== activePres.questionId) {
      throw new Error('ID soal tidak sesuai dengan soal yang sedang ditampilkan.');
    }

    if (!input.choiceId || !activePres.pilihanMap.has(input.choiceId)) {
      throw new Error('ID pilihan jawaban tidak valid untuk soal aktif.');
    }

    const sekarangMs = options?.nowMs ?? Date.now();
    const waktuJawabMs = Math.max(
      0,
      sekarangMs - activePres.tampilPadaMs - activePres.pausedDurationMs
    );

    const benar = input.choiceId === activePres.correctChoiceId;
    const pilihanBenarObj = activePres.pilihanList.find(
      (p) => p.choiceId === activePres.correctChoiceId
    );

    // Catat statistik jawaban per soal
    const prevStat = sesi.questionStatsMap.get(activePres.questionId) || {
      jumlahBenar: 0,
      jumlahSalah: 0,
    };
    if (benar) {
      prevStat.jumlahBenar += 1;
    } else {
      prevStat.jumlahSalah += 1;
    }
    sesi.questionStatsMap.set(activePres.questionId, prevStat);

    const hasilKalkulasi = hitungHasilJawabanKerupukSolo(
      sesi.pemainState,
      sesi.config,
      { questionId: activePres.questionId, nomorSoal: activePres.nomorSoal },
      benar,
      waktuJawabMs,
      sekarangMs,
      options?.randomNormalized
    );

    sesi.pemainState = hasilKalkulasi.stateUpdated;

    let soalBerikutnya: SoalTampilKerupuk | null = null;
    if (hasilKalkulasi.selesaiBaru || sesi.pemainState.sisaKerupuk <= 0) {
      sesi.state = 'FINISHED';
      sesi.activePresentation = null;
      sesi.hasil = bangunLaporanAkhir(sesi, 'FINISHED', sekarangMs);
    } else {
      const nextPres = buatPresentasiSoal(sesi, sekarangMs);
      sesi.activePresentation = nextPres;
      soalBerikutnya = serialisasiSoalTampil(nextPres, sesi.questions.length);
    }

    return {
      sesi,
      benar,
      jawabanBenarKode: activePres.jawabanBenarKode,
      jawabanBenarTeks: pilihanBenarObj?.teks || '',
      penjelasan: activePres.penjelasan,
      poinDidapat: hasilKalkulasi.poinDidapat,
      poinDasar: hasilKalkulasi.poinDasar,
      bonusStreak: hasilKalkulasi.bonusStreak,
      bonusPenyelesaian: hasilKalkulasi.bonusPenyelesaian,
      gacha: hasilKalkulasi.gacha,
      sisaKerupuk: sesi.pemainState.sisaKerupuk,
      targetKerupuk: sesi.config.targetKerupuk,
      progresPersen: sesi.pemainState.progresPersen,
      sisaPersen: sesi.pemainState.sisaPersen,
      skorTotal: sesi.pemainState.skorTotal,
      skorPembelajaran: sesi.pemainState.skorPembelajaran,
      bonusKeberuntungan: sesi.pemainState.bonusKeberuntungan,
      bonusPenyelesaianTotal: sesi.pemainState.bonusPenyelesaian,
      streakBenar: sesi.pemainState.streakBenar,
      isFinished: sesi.state === 'FINISHED',
      soalBerikutnya,
      gigitanLogItem: hasilKalkulasi.gigitanLogItem,
    };
  },

  /**
   * Menghentikan permainan secara manual oleh guru: status -> STOPPED.
   * Tidak memberikan bonus penyelesaian (+100) karena kerupuk belum 0.
   */
  hentikanPermainan(sessionId: string, hostId: string): SesiKerupukSoloActive {
    const sesi = sesiKerupukMap.get(sessionId);
    if (!sesi) throw new Error('Sesi Makan Kerupuk tidak ditemukan.');
    if (sesi.hostId !== hostId) {
      throw new Error('Anda tidak memiliki hak akses untuk menghentikan sesi ini.');
    }
    if (sesi.state === 'FINISHED' || sesi.state === 'STOPPED') {
      throw new Error(`Permainan sudah berakhir (${sesi.state}).`);
    }

    const now = Date.now();
    sesi.state = 'STOPPED';
    sesi.pausedAtMs = undefined;
    sesi.activePresentation = null;
    sesi.pemainState.waktuSelesaiMs = now;
    sesi.hasil = bangunLaporanAkhir(sesi, 'STOPPED', now);
    return sesi;
  },

  /**
   * Mereset sesi aktif ke status awal READY dengan skor 0 dan kerupuk penuh sesuai config snapshot.
   * Memastikan tidak ada skor atau sisa kerupuk sesi sebelumnya yang terbawa.
   */
  ulangPermainan(sessionId: string, hostId: string): SesiKerupukSoloActive {
    const sesi = sesiKerupukMap.get(sessionId);
    if (!sesi) throw new Error('Sesi Makan Kerupuk tidak ditemukan.');
    if (sesi.hostId !== hostId) {
      throw new Error('Anda tidak memiliki hak akses untuk mengulang sesi ini.');
    }

    sesi.state = 'READY';
    sesi.pausedAtMs = undefined;
    sesi.activePresentation = null;
    sesi.terakhirSoalId = undefined;
    sesi.nomorSoalCounter = 0;
    sesi.antreanSoalIds = siapkanAntreanSoal(sesi.questions);
    sesi.pemainState = buatStateKerupukAwal(sesi.config.targetKerupuk);
    sesi.questionStatsMap = new Map();
    sesi.hasil = undefined;
    return sesi;
  },

  /**
   * Membentuk snapshot status ringkas untuk dikirim ke frontend guru (LayarHostKerupuk).
   */
  serialisasiSesiUntukClient(sesi: SesiKerupukSoloActive) {
    const st = sesi.pemainState;
    return {
      sessionId: sesi.sessionId,
      game: 'makan_kerupuk' as const,
      mode: 'solo' as const,
      templateId: sesi.templateId,
      templateJudul: sesi.templateJudul,
      state: sesi.state,
      config: sesi.config,
      totalSoalBank: sesi.questions.length,
      sisaKerupuk: st.sisaKerupuk,
      targetKerupuk: st.targetKerupuk,
      progresPersen: st.progresPersen,
      sisaPersen: st.sisaPersen,
      skorTotal: st.skorTotal,
      skorPembelajaran: st.skorPembelajaran,
      skorDasarBenar: st.skorDasarBenar,
      totalBonusStreak: st.totalBonusStreak,
      kaliBonusStreak: st.kaliBonusStreak,
      bonusKeberuntungan: st.bonusKeberuntungan,
      bonusPenyelesaian: st.bonusPenyelesaian,
      totalBenar: st.totalBenar,
      totalSalah: st.totalSalah,
      streakBenar: st.streakBenar,
      streakTertinggi: st.streakTertinggi,
      rataRataWaktuJawabMs: st.rataRataWaktuJawabMs,
      terakhirGigitan: st.terakhirGigitan,
      riwayatGigitan: st.riwayatGigitan,
      statistikGigitan: st.statistikGigitan,
      soalSaatIni:
        sesi.state === 'PLAYING' || sesi.state === 'PAUSED'
          ? serialisasiSoalTampil(sesi.activePresentation, sesi.questions.length)
          : null,
      isFinished: sesi.state === 'FINISHED' || sesi.state === 'STOPPED',
      hasil: sesi.hasil || null,
    };
  },

  /**
   * Menyimpan hasil akhir Makan Kerupuk Mode Solo ke database (Session, SessionResult, QuestionStat)
   * Tanpa membuat baris SessionPlayer maupun token PIN.
   */
  async simpanHasilKeDatabase(sessionId: string): Promise<void> {
    const sesi = sesiKerupukMap.get(sessionId);
    if (!sesi || !sesi.hasil) return;

    const laporan = sesi.hasil;

    await prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: sesi.sessionId },
        data: {
          status: 'selesai',
          token: null,
          mode: 'solo',
          selesaiPada: new Date(),
          konfigurasi: JSON.stringify({
            config: sesi.config,
            laporanKerupukSolo: laporan,
          }),
        },
      });

      await tx.sessionResult.upsert({
        where: { sessionId: sesi.sessionId },
        update: {
          timMenang: laporan.statusAkhir === 'FINISHED' ? 'Selesai (Ludes)' : 'Dihentikan Guru',
          posisiAkhir: laporan.progresPersen,
          skorMerah: laporan.skorTotal,
          skorPutih: laporan.sisaKerupuk,
        },
        create: {
          sessionId: sesi.sessionId,
          timMenang: laporan.statusAkhir === 'FINISHED' ? 'Selesai (Ludes)' : 'Dihentikan Guru',
          posisiAkhir: laporan.progresPersen,
          skorMerah: laporan.skorTotal,
          skorPutih: laporan.sisaKerupuk,
        },
      });

      await tx.questionStat.deleteMany({
        where: { sessionId: sesi.sessionId },
      });

      for (const [questionId, stat] of sesi.questionStatsMap.entries()) {
        await tx.questionStat.create({
          data: {
            sessionId: sesi.sessionId,
            questionId,
            jumlahBenar: stat.jumlahBenar,
            jumlahSalah: stat.jumlahSalah,
          },
        });
      }
    });
  },

  /**
   * Memuat laporan hasil Makan Kerupuk Mode Solo dari database (saat sudah tidak di memori).
   */
  async muatLaporanDariDatabase(sessionId: string): Promise<LaporanKerupukSolo | null> {
    const sessionDb = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        template: {
          include: { questions: true },
        },
        result: true,
        questionStats: true,
      },
    });

    if (!sessionDb || sessionDb.template.game !== 'makan_kerupuk') {
      return null;
    }

    if (sessionDb.konfigurasi) {
      try {
        const parsed = JSON.parse(sessionDb.konfigurasi);
        if (parsed?.laporanKerupukSolo) {
          return parsed.laporanKerupukSolo as LaporanKerupukSolo;
        }
      } catch {
        // lanjut fallback di bawah
      }
    }

    if (!sessionDb.result) return null;

    let parsedConfig: KonfigurasiKerupukSolo = bangunKonfigurasiKerupukSolo();
    if (sessionDb.konfigurasi) {
      try {
        const raw = JSON.parse(sessionDb.konfigurasi);
        parsedConfig = bangunKonfigurasiKerupukSolo(raw?.config || raw);
      } catch {
        // default config
      }
    }

    const totalBenar = sessionDb.questionStats.reduce((a, b) => a + b.jumlahBenar, 0);
    const totalSalah = sessionDb.questionStats.reduce((a, b) => a + b.jumlahSalah, 0);
    const totalJawab = totalBenar + totalSalah;

    return {
      sessionId: sessionDb.id,
      templateId: sessionDb.templateId,
      templateJudul: sessionDb.template.judul,
      statusAkhir: sessionDb.result.skorPutih === 0 ? 'FINISHED' : 'STOPPED',
      dihentikanManual: sessionDb.result.skorPutih > 0,
      konfigurasi: parsedConfig,
      targetKerupuk: parsedConfig.targetKerupuk,
      sisaKerupuk: sessionDb.result.skorPutih,
      progresPersen: sessionDb.result.posisiAkhir,
      skorTotal: sessionDb.result.skorMerah,
      skorPembelajaran: 0,
      skorDasarBenar: 0,
      totalBonusStreak: 0,
      kaliBonusStreak: 0,
      bonusKeberuntungan: 0,
      bonusPenyelesaian: sessionDb.result.skorPutih === 0 ? 100 : 0,
      totalBenar,
      totalSalah,
      akurasiPersen: totalJawab > 0 ? Math.round((totalBenar / totalJawab) * 100) : 0,
      streakTertinggi: 0,
      rataRataWaktuJawabMs: 0,
      durasiBermainMs: 0,
      statistikGigitan: { besar: 0, sedang: 0, kecil: 0, sangat_kecil: 0, zonk: 0 },
      riwayatGigitan: [],
      totalSoalBank: sessionDb.template.questions.length,
    };
  },

  /**
   * Memulihkan sesi Makan Kerupuk dari DB ke memori apabila belum selesai (READY).
   */
  async pulihkanSesiDariDb(sessionId: string): Promise<SesiKerupukSoloActive | null> {
    const existing = sesiKerupukMap.get(sessionId);
    if (existing) return existing;

    const sessionDb = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        template: {
          include: { questions: { orderBy: { urutan: 'asc' } } },
        },
        result: true,
      },
    });

    if (!sessionDb || sessionDb.template.game !== 'makan_kerupuk') {
      return null;
    }

    let rawConfig: any;
    let laporanDb: LaporanKerupukSolo | undefined;
    if (sessionDb.konfigurasi) {
      try {
        const parsed = JSON.parse(sessionDb.konfigurasi);
        rawConfig = parsed?.config || parsed;
        if (parsed?.laporanKerupukSolo) {
          laporanDb = parsed.laporanKerupukSolo as LaporanKerupukSolo;
        }
      } catch {
        rawConfig = undefined;
      }
    }

    const config = bangunKonfigurasiKerupukSolo(rawConfig);
    const questions: SoalKerupuk[] = sessionDb.template.questions.map((q) => ({
      id: q.id,
      urutan: q.urutan,
      teks: q.teks,
      opsiA: q.opsiA,
      opsiB: q.opsiB,
      opsiC: q.opsiC,
      jawabanBenar: q.jawabanBenar,
      penjelasan: q.penjelasan,
    }));

    if (sessionDb.status === 'selesai') {
      const laporan = laporanDb || (await this.muatLaporanDariDatabase(sessionId)) || undefined;
      const stateSelesai: StateKerupukSolo =
        laporan?.statusAkhir === 'FINISHED' ? 'FINISHED' : 'STOPPED';
      const st = buatStateKerupukAwal(config.targetKerupuk);
      if (laporan) {
        st.sisaKerupuk = laporan.sisaKerupuk;
        st.progresPersen = laporan.progresPersen;
        st.sisaPersen = 100 - laporan.progresPersen;
        st.skorTotal = laporan.skorTotal;
        st.skorPembelajaran = laporan.skorPembelajaran;
        st.skorDasarBenar = laporan.skorDasarBenar;
        st.totalBonusStreak = laporan.totalBonusStreak;
        st.kaliBonusStreak = laporan.kaliBonusStreak;
        st.bonusKeberuntungan = laporan.bonusKeberuntungan;
        st.bonusPenyelesaian = laporan.bonusPenyelesaian;
        st.totalBenar = laporan.totalBenar;
        st.totalSalah = laporan.totalSalah;
        st.streakTertinggi = laporan.streakTertinggi;
        st.rataRataWaktuJawabMs = laporan.rataRataWaktuJawabMs;
        st.statistikGigitan = laporan.statistikGigitan;
        st.riwayatGigitan = laporan.riwayatGigitan;
        st.selesaiKerupuk = laporan.statusAkhir === 'FINISHED';
      }

      const restoredFinished: SesiKerupukSoloActive = {
        sessionId: sessionDb.id,
        templateId: sessionDb.templateId,
        templateJudul: sessionDb.template.judul,
        hostId: sessionDb.hostId,
        state: stateSelesai,
        config,
        questions,
        antreanSoalIds: [],
        nomorSoalCounter: laporan ? laporan.riwayatGigitan.length : 0,
        activePresentation: null,
        pemainState: st,
        questionStatsMap: new Map(),
        hasil: laporan,
      };
      sesiKerupukMap.set(sessionId, restoredFinished);
      return restoredFinished;
    }

    if (questions.length === 0) {
      return null;
    }

    return this.inisialisasiSesi(
      sessionDb.id,
      sessionDb.hostId,
      { id: sessionDb.template.id, judul: sessionDb.template.judul },
      questions,
      config
    );
  },

  hapusSesi(sessionId: string): void {
    sesiKerupukMap.delete(sessionId);
  },
};
