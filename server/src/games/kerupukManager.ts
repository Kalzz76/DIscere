import crypto from 'crypto';
import {
  ProbabilitasConfig,
  PesertaKerupukState,
  HasilGachaGigitan,
  PRESET_PROBABILITAS,
  validasiProbabilitas,
  prosesJawabanKerupuk,
  urutkanLeaderboard,
  HasilProsesJawaban,
} from './makanKerupuk.js';
import { multiManager } from './multiManager.js';

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

export interface ConfigMakanKerupuk {
  probabilitas: ProbabilitasConfig;
  maxPeserta: number; // default: 30 (fleksibel 10..100)
  durasiSoalDetik: number; // default: 15 (fleksibel 10..60)
  allowLateJoin: boolean; // default: true
}

export interface JawabanPesertaKerupuk {
  pesertaId: string;
  jawaban: string;
  benar: boolean;
  waktuJawabMs: number;
  gacha: HasilGachaGigitan | null;
  poinDidapat: number;
}

export interface HasilAkhirKerupuk {
  leaderboard: PesertaKerupukState[];
  podium: {
    juara1?: PesertaKerupukState;
    juara2?: PesertaKerupukState;
    juara3?: PesertaKerupukState;
  };
  totalPeserta: number;
  totalSoal: number;
  totalJawabanBenar: number;
  totalJawabanSalah: number;
  totalKerupukHabis: number;
}

export interface SesiKerupukActive {
  sessionId: string;
  token: string;
  templateId: string;
  templateJudul: string;
  hostId: string;
  hostSocketId?: string;
  status: 'lobi' | 'jalan' | 'selesai';
  config: ConfigMakanKerupuk;
  peserta: Map<string, PesertaKerupukState>; // key: pesertaId
  currentQuestionIndex: number;
  totalSoal: number;
  questions: SoalKerupuk[];
  soalMulaiPada?: number;
  soalBerakhirPada?: number;
  timerHandle?: NodeJS.Timeout;
  intermissionHandle?: NodeJS.Timeout;
  // questionId -> (pesertaId -> JawabanPesertaKerupuk)
  jawabanPerSoal: Map<string, Map<string, JawabanPesertaKerupuk>>;
  hasil?: HasilAkhirKerupuk;
}

// In-memory store untuk sesi Makan Kerupuk
const sesiKerupukMap = new Map<string, SesiKerupukActive>(); // key: sessionId
const tokenToSessionIdMap = new Map<string, string>(); // key: token (6 digit)

export const kerupukManager = {
  /**
   * Menghasilkan token 6 digit unik yang tidak bertabrakan dengan sesi tarik tambang maupun makan kerupuk
   */
  generateUniqueToken(): string {
    let token = '';
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 100) {
      attempts++;
      token = Math.floor(100000 + Math.random() * 900000).toString();
      exists = tokenToSessionIdMap.has(token) || Boolean(multiManager.dapatkanSesiDariToken(token));
    }

    if (exists) {
      throw new Error('Gagal menghasilkan token unik untuk sesi Makan Kerupuk.');
    }

    return token;
  },

  /**
   * Menginisialisasi sesi baru Makan Kerupuk
   */
  inisialisasiSesi(
    sessionId: string,
    token: string,
    hostId: string,
    template: { id: string; judul: string },
    questions: SoalKerupuk[],
    userConfig?: Partial<ConfigMakanKerupuk>
  ): SesiKerupukActive {
    // Bersihkan sesi lama dengan token sama jika ada
    if (tokenToSessionIdMap.has(token)) {
      const oldId = tokenToSessionIdMap.get(token)!;
      this.hapusSesi(oldId);
    }

    // Validasi probabilitas gacha, fallback ke preset normal jika tidak valid
    let probabilitas = userConfig?.probabilitas || PRESET_PROBABILITAS.normal;
    const checkProb = validasiProbabilitas(probabilitas);
    if (!checkProb.valid) {
      probabilitas = PRESET_PROBABILITAS.normal;
    }

    const config: ConfigMakanKerupuk = {
      probabilitas,
      maxPeserta: userConfig?.maxPeserta && userConfig.maxPeserta > 0 ? userConfig.maxPeserta : 30,
      durasiSoalDetik:
        userConfig?.durasiSoalDetik && userConfig.durasiSoalDetik >= 5
          ? userConfig.durasiSoalDetik
          : 15,
      allowLateJoin: userConfig?.allowLateJoin ?? true,
    };

    const sesi: SesiKerupukActive = {
      sessionId,
      token,
      templateId: template.id,
      templateJudul: template.judul,
      hostId,
      status: 'lobi',
      config,
      peserta: new Map(),
      currentQuestionIndex: 0,
      totalSoal: questions.length,
      questions,
      jawabanPerSoal: new Map(),
    };

    sesiKerupukMap.set(sessionId, sesi);
    tokenToSessionIdMap.set(token, sessionId);
    return sesi;
  },

  dapatkanSesi(sessionId: string): SesiKerupukActive | undefined {
    return sesiKerupukMap.get(sessionId);
  },

  dapatkanSesiDariToken(token: string): SesiKerupukActive | undefined {
    const sessionId = tokenToSessionIdMap.get(token);
    if (!sessionId) return undefined;
    return sesiKerupukMap.get(sessionId);
  },

  /**
   * Menambahkan siswa ke sesi atau memulihkan koneksi siswa (reconnect)
   */
  gabungPeserta(
    token: string,
    nama: string,
    socketId: string,
    existingPesertaId?: string
  ): {
    sesi: SesiKerupukActive;
    peserta: PesertaKerupukState;
    isReconnect: boolean;
  } {
    const sesi = this.dapatkanSesiDariToken(token);
    if (!sesi) {
      throw new Error('Sesi Makan Kerupuk tidak ditemukan atau token tidak valid.');
    }

    if (sesi.status === 'selesai') {
      throw new Error('Permainan pada sesi ini telah berakhir.');
    }

    const cleanNama = nama.trim().slice(0, 25);
    if (!cleanNama) {
      throw new Error('Nama panggilan tidak boleh kosong.');
    }

    // 1. Reconnect jika existingPesertaId diberikan dan terdaftar
    if (existingPesertaId && sesi.peserta.has(existingPesertaId)) {
      const p = sesi.peserta.get(existingPesertaId)!;
      p.socketId = socketId;
      p.connected = true;
      return { sesi, peserta: p, isReconnect: true };
    }

    // 2. Reconnect jika ada peserta yang putus dengan nama yang sama persis
    for (const p of sesi.peserta.values()) {
      if (p.nama.toLowerCase() === cleanNama.toLowerCase() && !p.connected) {
        p.socketId = socketId;
        p.connected = true;
        return { sesi, peserta: p, isReconnect: true };
      }
    }

    // 3. Cek late join jika game sudah berjalan
    if (sesi.status === 'jalan' && !sesi.config.allowLateJoin) {
      throw new Error('Permainan sudah dimulai dan guru tidak mengizinkan peserta susulan.');
    }

    // 4. Cek kapasitas maksimum peserta
    if (sesi.peserta.size >= sesi.config.maxPeserta) {
      throw new Error(
        `Kapasitas sesi penuh (maksimum ${sesi.config.maxPeserta} peserta). Hubungi guru Anda.`
      );
    }

    // 5. Cek duplikasi nama jika nama masih dipakai oleh user yang aktif
    let finalNama = cleanNama;
    let duplicateIndex = 1;
    while (
      Array.from(sesi.peserta.values()).some(
        (p) => p.connected && p.nama.toLowerCase() === finalNama.toLowerCase()
      )
    ) {
      duplicateIndex++;
      finalNama = `${cleanNama} (${duplicateIndex})`;
    }

    const pesertaId = crypto.randomUUID();
    const pesertaBaru: PesertaKerupukState = {
      id: pesertaId,
      socketId,
      nama: finalNama,
      connected: true,
      sisaKerupuk: 100,
      skorTotal: 0,
      skorPengetahuan: 0,
      skorKeberuntungan: 0,
      totalBenar: 0,
      totalSalah: 0,
      streakBenar: 0,
      totalBonusStreak: 0,
      selesaiKerupuk: false,
      waktuSelesaiMs: null,
    };

    sesi.peserta.set(pesertaId, pesertaBaru);
    return { sesi, peserta: pesertaBaru, isReconnect: false };
  },

  /**
   * Menangani disconnect peserta
   */
  putusKoneksiPeserta(socketId: string): { sessionId?: string; pesertaId?: string } {
    for (const sesi of sesiKerupukMap.values()) {
      for (const [id, p] of sesi.peserta.entries()) {
        if (p.socketId === socketId) {
          p.connected = false;
          return { sessionId: sesi.sessionId, pesertaId: id };
        }
      }
    }
    return {};
  },

  /**
   * Memulai permainan Makan Kerupuk oleh Guru (Host)
   */
  mulaiPermainan(sessionId: string, hostId: string): SesiKerupukActive {
    const sesi = this.dapatkanSesi(sessionId);
    if (!sesi || sesi.hostId !== hostId) {
      throw new Error('Sesi tidak ditemukan atau Anda bukan pemilik sesi.');
    }

    if (sesi.status !== 'lobi') {
      throw new Error('Permainan pada sesi ini sudah dimulai sebelumnya.');
    }

    if (sesi.peserta.size === 0) {
      throw new Error('Belum ada siswa yang bergabung di lobi.');
    }

    sesi.status = 'jalan';
    sesi.currentQuestionIndex = 0;

    return sesi;
  },

  /**
   * Menyiapkan timer soal aktif
   */
  mulaiTimerSoal(
    sessionId: string,
    durasiDetik?: number
  ): { soalMulaiPada: number; soalBerakhirPada: number } {
    const sesi = this.dapatkanSesi(sessionId);
    if (!sesi) throw new Error('Sesi tidak ditemukan.');

    if (sesi.timerHandle) {
      clearTimeout(sesi.timerHandle);
      sesi.timerHandle = undefined;
    }

    const durasi = durasiDetik || sesi.config.durasiSoalDetik || 15;
    const now = Date.now();
    const endsAt = now + durasi * 1000;
    sesi.soalMulaiPada = now;
    sesi.soalBerakhirPada = endsAt;

    return { soalMulaiPada: now, soalBerakhirPada: endsAt };
  },

  /**
   * Memproses jawaban dari siswa secara real-time
   */
  prosesJawabanSiswa(
    sessionId: string,
    pesertaId: string,
    questionId: string,
    jawabanDipilih: string
  ): {
    hasilJawaban: HasilProsesJawaban;
    leaderboard: PesertaKerupukState[];
    semuaSelesai: boolean;
    gameSelesaiSemuaHabis: boolean;
  } {
    const sesi = this.dapatkanSesi(sessionId);
    if (!sesi) throw new Error('Sesi permainan tidak ditemukan.');

    if (sesi.status !== 'jalan') {
      throw new Error('Permainan tidak sedang berjalan.');
    }

    const peserta = sesi.peserta.get(pesertaId);
    if (!peserta) {
      throw new Error('Peserta tidak terdaftar dalam sesi ini.');
    }

    const soalAktif = sesi.questions[sesi.currentQuestionIndex];
    if (!soalAktif) {
      throw new Error('Tidak ada soal yang sedang aktif.');
    }

    // Resolusi ID soal: toleransi jika client mengirimkan questionId/id kosong atau undefined
    const resolvedQuestionId =
      questionId && questionId !== 'undefined' && questionId !== 'null'
        ? questionId
        : soalAktif.id;

    if (soalAktif.id !== resolvedQuestionId) {
      throw new Error('Soal yang dijawab sudah tidak aktif.');
    }

    // Validasi window waktu dengan toleransi 1 detik
    if (sesi.soalBerakhirPada && Date.now() > sesi.soalBerakhirPada + 1000) {
      throw new Error('Waktu untuk menjawab soal ini telah habis.');
    }

    // Ambil atau buat Map jawaban untuk soal aktif
    let mapJawaban = sesi.jawabanPerSoal.get(soalAktif.id);
    if (!mapJawaban) {
      mapJawaban = new Map();
      sesi.jawabanPerSoal.set(soalAktif.id, mapJawaban);
    }

    // Cegah jawaban ganda
    if (mapJawaban.has(pesertaId)) {
      throw new Error('Anda sudah mengirimkan jawaban untuk soal ini.');
    }

    const waktuJawabMs = Date.now() - (sesi.soalMulaiPada || Date.now());

    // Hitung poin, gacha kerupuk, streak, dan finish bonus
    const hasilJawaban = prosesJawabanKerupuk({
      peserta,
      jawabanSiswa: jawabanDipilih,
      kunciJawaban: soalAktif.jawabanBenar,
      opsiA: soalAktif.opsiA,
      opsiB: soalAktif.opsiB,
      opsiC: soalAktif.opsiC,
      probabilitasConfig: sesi.config.probabilitas,
      waktuJawabTimestamp: Date.now(),
    });

    // Update state peserta
    sesi.peserta.set(pesertaId, hasilJawaban.pesertaUpdated);

    // Catat log jawaban
    mapJawaban.set(pesertaId, {
      pesertaId,
      jawaban: jawabanDipilih.toUpperCase(),
      benar: hasilJawaban.benar,
      waktuJawabMs,
      gacha: hasilJawaban.gacha,
      poinDidapat: hasilJawaban.poinDidapat,
    });

    // Cek apakah seluruh peserta yang terhubung sudah menjawab
    const pesertaAktif = Array.from(sesi.peserta.values()).filter((p) => p.connected);
    const semuaSelesai = mapJawaban.size >= Math.max(1, pesertaAktif.length);

    // Cek apakah SEMUA peserta telah menghabiskan kerupuknya
    const semuaKerupukHabis =
      pesertaAktif.length > 0 && pesertaAktif.every((p) => p.sisaKerupuk === 0);

    const leaderboard = this.dapatkanLeaderboard(sessionId);

    return {
      hasilJawaban,
      leaderboard,
      semuaSelesai,
      gameSelesaiSemuaHabis: semuaKerupukHabis,
    };
  },

  /**
   * Mendapatkan leaderboard terurut berdasarkan 4 kriteria
   */
  dapatkanLeaderboard(sessionId: string): PesertaKerupukState[] {
    const sesi = this.dapatkanSesi(sessionId);
    if (!sesi) return [];
    return urutkanLeaderboard(Array.from(sesi.peserta.values()));
  },

  /**
   * Menutup soal saat ini dan memeriksa apakah lanjut ke soal berikutnya atau selesai
   */
  selesaikanSoalAktif(sessionId: string): {
    questionIndex: number;
    isLastQuestion: boolean;
    rekapSoal: {
      questionId: string;
      totalJawaban: number;
      totalBenar: number;
      totalSalah: number;
    };
  } {
    const sesi = this.dapatkanSesi(sessionId);
    if (!sesi) throw new Error('Sesi tidak ditemukan.');

    if (sesi.timerHandle) {
      clearTimeout(sesi.timerHandle);
      sesi.timerHandle = undefined;
    }

    const soalAktif = sesi.questions[sesi.currentQuestionIndex];
    const mapJawaban = soalAktif ? sesi.jawabanPerSoal.get(soalAktif.id) : null;

    let totalBenar = 0;
    let totalSalah = 0;

    if (mapJawaban) {
      for (const j of mapJawaban.values()) {
        if (j.benar) totalBenar++;
        else totalSalah++;
      }
    }

    const isLastQuestion = sesi.currentQuestionIndex >= sesi.totalSoal - 1;

    return {
      questionIndex: sesi.currentQuestionIndex,
      isLastQuestion,
      rekapSoal: {
        questionId: soalAktif?.id || '',
        totalJawaban: mapJawaban?.size || 0,
        totalBenar,
        totalSalah,
      },
    };
  },

  /**
   * Melangkah ke soal berikutnya
   */
  lanjutSoalBerikutnya(sessionId: string): {
    currentQuestionIndex: number;
    soal: SoalKerupuk;
    isLastQuestion: boolean;
  } {
    const sesi = this.dapatkanSesi(sessionId);
    if (!sesi) throw new Error('Sesi tidak ditemukan.');

    sesi.currentQuestionIndex += 1;
    if (sesi.currentQuestionIndex >= sesi.totalSoal) {
      throw new Error('Seluruh soal sudah selesai dimainkan.');
    }

    const soal = sesi.questions[sesi.currentQuestionIndex];
    const isLastQuestion = sesi.currentQuestionIndex === sesi.totalSoal - 1;

    return {
      currentQuestionIndex: sesi.currentQuestionIndex,
      soal,
      isLastQuestion,
    };
  },

  /**
   * Mengakhiri sesi permainan dan membentuk podium serta rekapitulasi hasil
   */
  akhiriPermainan(sessionId: string): HasilAkhirKerupuk {
    const sesi = this.dapatkanSesi(sessionId);
    if (!sesi) throw new Error('Sesi tidak ditemukan.');

    if (sesi.timerHandle) {
      clearTimeout(sesi.timerHandle);
      sesi.timerHandle = undefined;
    }
    if (sesi.intermissionHandle) {
      clearTimeout(sesi.intermissionHandle);
      sesi.intermissionHandle = undefined;
    }

    sesi.status = 'selesai';

    const leaderboard = this.dapatkanLeaderboard(sessionId);
    const juara1 = leaderboard[0];
    const juara2 = leaderboard[1];
    const juara3 = leaderboard[2];

    let totalJawabanBenar = 0;
    let totalJawabanSalah = 0;
    let totalKerupukHabis = 0;

    for (const p of leaderboard) {
      totalJawabanBenar += p.totalBenar;
      totalJawabanSalah += p.totalSalah;
      if (p.selesaiKerupuk) {
        totalKerupukHabis += 1;
      }
    }

    const hasil: HasilAkhirKerupuk = {
      leaderboard,
      podium: {
        juara1,
        juara2,
        juara3,
      },
      totalPeserta: leaderboard.length,
      totalSoal: sesi.totalSoal,
      totalJawabanBenar,
      totalJawabanSalah,
      totalKerupukHabis,
    };

    sesi.hasil = hasil;
    return hasil;
  },

  /**
   * Menghapus sesi dan membersihkan timer
   */
  hapusSesi(sessionId: string): void {
    const sesi = sesiKerupukMap.get(sessionId);
    if (sesi) {
      if (sesi.timerHandle) clearTimeout(sesi.timerHandle);
      if (sesi.intermissionHandle) clearTimeout(sesi.intermissionHandle);
      tokenToSessionIdMap.delete(sesi.token);
      sesiKerupukMap.delete(sessionId);
    }
  },
};

