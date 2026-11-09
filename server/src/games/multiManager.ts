import {
  TimTarikTambang,
  HasilPemenang,
  POSISI_AWAL_TALI,
  BATAS_MIN_TALI,
  BATAS_MAX_TALI,
  hitungPosisiTali,
  tentukanPemenang,
} from './tarikTambang.js';

export interface PesertaMulti {
  id: string; // ID unik sementara sesi (UUID / random string)
  socketId: string;
  nama: string;
  tim: TimTarikTambang | null;
  connected: boolean;
  terakhirAktif: number;
}

export interface JawabanPesertaSoal {
  pesertaId: string;
  tim: TimTarikTambang;
  jawaban: string;
  benar: boolean;
  waktuJawabMs: number;
}

export interface SoalMulti {
  id: string;
  urutan: number;
  teks: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  jawabanBenar: string;
  penjelasan: string | null;
}

export interface SesiMultiplayerActive {
  sessionId: string;
  token: string;
  templateId: string;
  templateJudul: string;
  hostId: string;
  hostSocketId?: string;
  status: 'lobi' | 'jalan' | 'selesai';
  peserta: Map<string, PesertaMulti>; // key: pesertaId
  currentQuestionIndex: number;
  totalSoal: number;
  questions: SoalMulti[];
  taliPosition: number;
  skorMerah: number;
  skorPutih: number;
  // Timer soal aktif
  soalMulaiPada?: number;
  soalBerakhirPada?: number;
  timerHandle?: NodeJS.Timeout;
  intermissionHandle?: NodeJS.Timeout;
  // Rekap jawaban per soal: questionId -> Map<pesertaId, JawabanPesertaSoal>
  jawabanPerSoal: Map<string, Map<string, JawabanPesertaSoal>>;
  hasil?: {
    timMenang: HasilPemenang;
    posisiAkhir: number;
    skorMerah: number;
    skorPutih: number;
    totalPeserta: number;
    totalJawabanBenar: number;
    totalJawabanSalah: number;
  };
}

// In-memory store untuk seluruh sesi multiplayer aktif
const sesiMultiMap = new Map<string, SesiMultiplayerActive>(); // key: sessionId
const tokenToSessionIdMap = new Map<string, string>(); // key: token (6 digit)

export const multiManager = {
  /**
   * Membuat token 6 digit acak yang belum digunakan oleh sesi aktif
   */
  generateUniqueToken(): string {
    let token = '';
    let exists = true;
    let attempts = 0;

    while (exists && attempts < 100) {
      attempts++;
      token = Math.floor(100000 + Math.random() * 900000).toString();
      exists = tokenToSessionIdMap.has(token);
    }

    if (exists) {
      throw new Error('Gagal menghasilkan token unik. Silakan coba lagi.');
    }

    return token;
  },

  /**
   * Menginisialisasi sesi multiplayer baru
   */
  inisialisasiSesi(
    sessionId: string,
    token: string,
    hostId: string,
    template: { id: string; judul: string },
    questions: SoalMulti[]
  ): SesiMultiplayerActive {
    // Hapus sesi lama dengan token sama jika ada
    if (tokenToSessionIdMap.has(token)) {
      const oldId = tokenToSessionIdMap.get(token)!;
      this.hapusSesi(oldId);
    }

    const sesi: SesiMultiplayerActive = {
      sessionId,
      token,
      templateId: template.id,
      templateJudul: template.judul,
      hostId,
      status: 'lobi',
      peserta: new Map(),
      currentQuestionIndex: 0,
      totalSoal: questions.length,
      questions,
      taliPosition: POSISI_AWAL_TALI,
      skorMerah: 0,
      skorPutih: 0,
      jawabanPerSoal: new Map(),
    };

    sesiMultiMap.set(sessionId, sesi);
    tokenToSessionIdMap.set(token, sessionId);
    return sesi;
  },

  dapatkanSesi(sessionId: string): SesiMultiplayerActive | undefined {
    return sesiMultiMap.get(sessionId);
  },

  dapatkanSesiDariToken(token: string): SesiMultiplayerActive | undefined {
    const sessionId = tokenToSessionIdMap.get(token);
    if (!sessionId) return undefined;
    return sesiMultiMap.get(sessionId);
  },

  /**
   * Menambahkan siswa ke lobi atau memulihkan koneksi siswa yang reconnect
   */
  gabungPeserta(
    token: string,
    nama: string,
    socketId: string,
    existingPesertaId?: string
  ): {
    sesi: SesiMultiplayerActive;
    peserta: PesertaMulti;
    isReconnect: boolean;
  } {
    const sesi = this.dapatkanSesiDariToken(token);
    if (!sesi) {
      throw new Error('Kode token sesi tidak ditemukan atau permainan telah selesai.');
    }

    const cleanNama = nama.trim();
    if (!cleanNama) {
      throw new Error('Nama panggilan wajib diisi.');
    }

    // 1. Cek Reconnect berdasarkan existingPesertaId
    if (existingPesertaId && sesi.peserta.has(existingPesertaId)) {
      const p = sesi.peserta.get(existingPesertaId)!;
      p.socketId = socketId;
      p.connected = true;
      p.terakhirAktif = Date.now();
      return { sesi, peserta: p, isReconnect: true };
    }

    // 2. Cek Reconnect berdasarkan nama panggilan yang sama jika sesi sudah jalan
    for (const p of sesi.peserta.values()) {
      if (p.nama.toLowerCase() === cleanNama.toLowerCase()) {
        p.socketId = socketId;
        p.connected = true;
        p.terakhirAktif = Date.now();
        return { sesi, peserta: p, isReconnect: true };
      }
    }

    // 3. Jika sesi sudah jalan dan bukan reconnect, tolak
    if (sesi.status !== 'lobi') {
      throw new Error('Permainan sudah dimulai. Tidak dapat menerima peserta baru.');
    }

    // 4. Batas maksimal 40 siswa
    if (sesi.peserta.size >= 40) {
      throw new Error('Lobi sudah penuh (maksimal 40 siswa).');
    }

    // 5. Buat ID peserta unik baru
    const pesertaId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const pesertaBaru: PesertaMulti = {
      id: pesertaId,
      socketId,
      nama: cleanNama,
      tim: null,
      connected: true,
      terakhirAktif: Date.now(),
    };

    sesi.peserta.set(pesertaId, pesertaBaru);
    return { sesi, peserta: pesertaBaru, isReconnect: false };
  },

  /**
   * Menangani disconnect peserta sementara
   */
  putusKoneksiPeserta(socketId: string): { sessionId?: string; pesertaId?: string } {
    for (const sesi of sesiMultiMap.values()) {
      for (const [id, p] of sesi.peserta.entries()) {
        if (p.socketId === socketId) {
          p.connected = false;
          p.terakhirAktif = Date.now();
          return { sessionId: sesi.sessionId, pesertaId: id };
        }
      }
    }
    return {};
  },

  /**
   * Membagi peserta ke dua tim secara acak dan seimbang (selisih max 1)
   */
  bagiTimSeimbang(sesi: SesiMultiplayerActive): void {
    const listPeserta = Array.from(sesi.peserta.values());
    if (listPeserta.length < 2) {
      throw new Error('Minimal harus ada 2 peserta untuk memulai lomba tarik tambang.');
    }

    // Acak urutan peserta (Fisher-Yates)
    for (let i = listPeserta.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [listPeserta[i], listPeserta[j]] = [listPeserta[j], listPeserta[i]];
    }

    // Bagi seimbang selang-seling (Merah, Putih, Merah, Putih...)
    listPeserta.forEach((p, idx) => {
      p.tim = idx % 2 === 0 ? 'merah' : 'putih';
    });
  },

  /**
   * Memulai permainan multiplayer
   */
  mulaiPermainan(sessionId: string, hostId: string): SesiMultiplayerActive {
    const sesi = this.dapatkanSesi(sessionId);
    if (!sesi || sesi.hostId !== hostId) {
      throw new Error('Sesi tidak ditemukan atau Anda bukan pemilik sesi.');
    }

    if (sesi.status !== 'lobi') {
      throw new Error('Permainan pada sesi ini sudah dimulai sebelumnya.');
    }

    // Bagi tim seimbang
    this.bagiTimSeimbang(sesi);

    sesi.status = 'jalan';
    sesi.currentQuestionIndex = 0;
    sesi.taliPosition = POSISI_AWAL_TALI;
    sesi.skorMerah = 0;
    sesi.skorPutih = 0;

    return sesi;
  },

  /**
   * Menyiapkan timer 15 detik untuk soal aktif
   */
  mulaiTimerSoal(
    sessionId: string,
    durasiDetik: number = 15
  ): { soalMulaiPada: number; soalBerakhirPada: number } {
    const sesi = this.dapatkanSesi(sessionId);
    if (!sesi) throw new Error('Sesi tidak ditemukan.');

    if (sesi.timerHandle) {
      clearTimeout(sesi.timerHandle);
      sesi.timerHandle = undefined;
    }

    const now = Date.now();
    const endsAt = now + durasiDetik * 1000;
    sesi.soalMulaiPada = now;
    sesi.soalBerakhirPada = endsAt;

    return { soalMulaiPada: now, soalBerakhirPada: endsAt };
  },

  /**
   * Memproses jawaban dari siswa
   */
  prosesJawabanSiswa(
    sessionId: string,
    pesertaId: string,
    questionId: string,
    jawabanDipilih: string
  ): {
    benar: boolean;
    jawabanBenar: string;
    penjelasan: string | null;
    taliPosition: number;
    skorMerah: number;
    skorPutih: number;
    semuaSelesai: boolean;
    gameSelesai: boolean;
  } {
    const sesi = this.dapatkanSesi(sessionId);
    if (!sesi) {
      throw new Error('Sesi permainan tidak ditemukan.');
    }

    if (sesi.status !== 'jalan') {
      throw new Error('Permainan tidak sedang aktif.');
    }

    const peserta = sesi.peserta.get(pesertaId);
    if (!peserta || !peserta.tim) {
      throw new Error('Peserta tidak valid atau belum memiliki tim.');
    }

    const soalAktif = sesi.questions[sesi.currentQuestionIndex];
    if (!soalAktif || soalAktif.id !== questionId) {
      throw new Error('Soal yang dijawab sudah tidak aktif.');
    }

    // Cek waktu timer server
    if (sesi.soalBerakhirPada && Date.now() > sesi.soalBerakhirPada + 500) {
      throw new Error('Waktu untuk menjawab soal ini telah habis.');
    }

    // Ambil atau buat Map jawaban untuk soal aktif
    let mapJawaban = sesi.jawabanPerSoal.get(questionId);
    if (!mapJawaban) {
      mapJawaban = new Map();
      sesi.jawabanPerSoal.set(questionId, mapJawaban);
    }

    // Cegah jawaban ganda dari peserta yang sama
    if (mapJawaban.has(pesertaId)) {
      throw new Error('Anda sudah mengirim jawaban untuk soal ini.');
    }

    const jawabanBenar = soalAktif.jawabanBenar.toUpperCase();
    const cleanJawaban = jawabanDipilih.toUpperCase();
    const benar = cleanJawaban === jawabanBenar;

    // Hitung posisi tali baru secara atomik
    const posisiBaru = hitungPosisiTali(sesi.taliPosition, peserta.tim, benar);
    sesi.taliPosition = posisiBaru;

    if (benar) {
      if (peserta.tim === 'merah') {
        sesi.skorMerah += 1;
      } else {
        sesi.skorPutih += 1;
      }
    }

    // Catat jawaban peserta
    mapJawaban.set(pesertaId, {
      pesertaId,
      tim: peserta.tim,
      jawaban: cleanJawaban,
      benar,
      waktuJawabMs: Date.now() - (sesi.soalMulaiPada || Date.now()),
    });

    // Cek apakah tali menyentuh batas ekstrem (-8 atau +8)
    const taliMenyentuhBatas = posisiBaru <= BATAS_MIN_TALI || posisiBaru >= BATAS_MAX_TALI;

    // Cek apakah seluruh peserta yang terhubung sudah menjawab
    const activePesertaCount = Array.from(sesi.peserta.values()).filter((p) => p.connected).length;
    const semuaSelesai = mapJawaban.size >= Math.max(1, activePesertaCount);

    return {
      benar,
      jawabanBenar,
      penjelasan: soalAktif.penjelasan,
      taliPosition: sesi.taliPosition,
      skorMerah: sesi.skorMerah,
      skorPutih: sesi.skorPutih,
      semuaSelesai,
      gameSelesai: taliMenyentuhBatas,
    };
  },

  /**
   * Menutup soal saat ini dan memeriksa apakah lanjut atau selesai
   */
  selesaikanSoalAktif(sessionId: string): {
    questionIndex: number;
    jawabanBenar: string;
    penjelasan: string | null;
    isLastQuestion: boolean;
    isGameFinished: boolean;
    posisiTali: number;
    skorMerah: number;
    skorPutih: number;
  } {
    const sesi = this.dapatkanSesi(sessionId);
    if (!sesi) throw new Error('Sesi tidak ditemukan.');

    if (sesi.timerHandle) {
      clearTimeout(sesi.timerHandle);
      sesi.timerHandle = undefined;
    }

    const soalAktif = sesi.questions[sesi.currentQuestionIndex];
    const isExtreme = sesi.taliPosition <= BATAS_MIN_TALI || sesi.taliPosition >= BATAS_MAX_TALI;
    const isLastQuestion = sesi.currentQuestionIndex + 1 >= sesi.totalSoal;
    const isGameFinished = isExtreme || isLastQuestion;

    if (isGameFinished) {
      this.akhiriPermainan(sessionId);
    }

    return {
      questionIndex: sesi.currentQuestionIndex,
      jawabanBenar: soalAktif.jawabanBenar,
      penjelasan: soalAktif.penjelasan,
      isLastQuestion,
      isGameFinished,
      posisiTali: sesi.taliPosition,
      skorMerah: sesi.skorMerah,
      skorPutih: sesi.skorPutih,
    };
  },

  /**
   * Melangkah ke soal berikutnya
   */
  lanjutKeSoalBerikutnya(sessionId: string): number {
    const sesi = this.dapatkanSesi(sessionId);
    if (!sesi) throw new Error('Sesi tidak ditemukan.');

    sesi.currentQuestionIndex += 1;
    return sesi.currentQuestionIndex;
  },

  /**
   * Mengakhiri permainan dan merangkum hasil
   */
  akhiriPermainan(sessionId: string): SesiMultiplayerActive {
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
    const timMenang = tentukanPemenang(sesi.taliPosition);

    let totalBenar = 0;
    let totalSalah = 0;

    for (const mapJawaban of sesi.jawabanPerSoal.values()) {
      for (const j of mapJawaban.values()) {
        if (j.benar) totalBenar++;
        else totalSalah++;
      }
    }

    sesi.hasil = {
      timMenang,
      posisiAkhir: sesi.taliPosition,
      skorMerah: sesi.skorMerah,
      skorPutih: sesi.skorPutih,
      totalPeserta: sesi.peserta.size,
      totalJawabanBenar: totalBenar,
      totalJawabanSalah: totalSalah,
    };

    return sesi;
  },

  hapusSesi(sessionId: string): void {
    const sesi = sesiMultiMap.get(sessionId);
    if (sesi) {
      if (sesi.timerHandle) clearTimeout(sesi.timerHandle);
      if (sesi.intermissionHandle) clearTimeout(sesi.intermissionHandle);
      tokenToSessionIdMap.delete(sesi.token);
      sesiMultiMap.delete(sessionId);
    }
  },
};
