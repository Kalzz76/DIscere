import {
  TimTarikTambang,
  HasilPemenang,
  POSISI_AWAL_TALI,
  hitungPosisiTali,
  cekKondisiSelesai,
  tentukanPemenang,
  giliranBerikutnya,
} from './tarikTambang.js';

export type GameState = 'READY' | 'PLAYING' | 'PAUSED' | 'FINISHED';

export interface SoalSesi {
  id: string;
  urutan: number;
  teks: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  jawabanBenar: string;
  penjelasan: string | null;
}

export interface LogJawabanItem {
  questionId: string;
  nomorSoal: number;
  teksSoal: string;
  tim: TimTarikTambang;
  jawabanDipilih: string;
  jawabanBenar: string;
  benar: boolean;
  posisiSetelah: number;
}

export interface ActiveSoloSession {
  sessionId: string;
  templateId: string;
  templateJudul: string;
  hostId: string;
  state: GameState;
  currentQuestionIndex: number;
  currentTurn: TimTarikTambang;
  taliPosition: number;
  skorMerah: number;
  skorPutih: number;
  totalSoal: number;
  questions: SoalSesi[];
  logJawaban: LogJawabanItem[];
  hasil?: {
    timMenang: HasilPemenang;
    posisiAkhir: number;
    skorMerah: number;
    skorPutih: number;
    totalBenar: number;
    totalSalah: number;
  };
}

// In-memory store untuk sesi solo yang aktif
const sesiSoloMap = new Map<string, ActiveSoloSession>();

export const soloManager = {
  inisialisasiSesi(
    sessionId: string,
    hostId: string,
    template: { id: string; judul: string },
    questions: SoalSesi[]
  ): ActiveSoloSession {
    const sesi: ActiveSoloSession = {
      sessionId,
      templateId: template.id,
      templateJudul: template.judul,
      hostId,
      state: 'READY',
      currentQuestionIndex: 0,
      currentTurn: 'merah', // Permainan selalu dimulai dari Tim Merah
      taliPosition: POSISI_AWAL_TALI,
      skorMerah: 0,
      skorPutih: 0,
      totalSoal: questions.length,
      questions,
      logJawaban: [],
    };
    sesiSoloMap.set(sessionId, sesi);
    return sesi;
  },

  dapatkanSesi(sessionId: string, hostId?: string): ActiveSoloSession | undefined {
    const sesi = sesiSoloMap.get(sessionId);
    if (!sesi) return undefined;
    if (hostId && sesi.hostId !== hostId) {
      return undefined;
    }
    return sesi;
  },

  mulaiSesi(sessionId: string, hostId: string): ActiveSoloSession {
    const sesi = this.dapatkanSesi(sessionId, hostId);
    if (!sesi) {
      throw new Error('Sesi tidak ditemukan atau Anda tidak berwenang.');
    }
    if (sesi.state === 'FINISHED') {
      throw new Error('Permainan pada sesi ini sudah selesai.');
    }
    sesi.state = 'PLAYING';
    return sesi;
  },

  ubahStateSesi(
    sessionId: string,
    hostId: string,
    stateBaru: 'PLAYING' | 'PAUSED'
  ): ActiveSoloSession {
    const sesi = this.dapatkanSesi(sessionId, hostId);
    if (!sesi) {
      throw new Error('Sesi tidak ditemukan atau Anda tidak berwenang.');
    }
    if (sesi.state === 'FINISHED') {
      throw new Error('Permainan pada sesi ini sudah selesai.');
    }
    sesi.state = stateBaru;
    return sesi;
  },

  prosesJawaban(
    sessionId: string,
    hostId: string,
    input: {
      questionId: string;
      tim: TimTarikTambang;
      jawabanDipilih: string;
    }
  ): {
    sesi: ActiveSoloSession;
    benar: boolean;
    jawabanBenar: string;
    penjelasan: string | null;
    selesai: boolean;
  } {
    const sesi = this.dapatkanSesi(sessionId, hostId);
    if (!sesi) {
      throw new Error('Sesi tidak ditemukan atau Anda tidak berwenang.');
    }

    if (sesi.state !== 'PLAYING') {
      throw new Error('Permainan sedang tidak dalam status bermain (PAUSED/READY/FINISHED).');
    }

    // Validasi giliran
    if (input.tim !== sesi.currentTurn) {
      throw new Error(`Saat ini giliran Tim ${sesi.currentTurn === 'merah' ? 'Merah' : 'Putih'}.`);
    }

    // Validasi soal aktif
    const soalSaatIni = sesi.questions[sesi.currentQuestionIndex];
    if (!soalSaatIni || soalSaatIni.id !== input.questionId) {
      throw new Error('Soal yang dijawab tidak sesuai dengan giliran soal aktif.');
    }

    // Validasi kebenaran jawaban
    const jawabanBenar = soalSaatIni.jawabanBenar.toUpperCase();
    const jawabanDipilih = input.jawabanDipilih.toUpperCase();
    const benar = jawabanDipilih === jawabanBenar;

    // Hitung posisi tali baru
    const posisiBaru = hitungPosisiTali(sesi.taliPosition, input.tim, benar);
    sesi.taliPosition = posisiBaru;

    if (benar) {
      if (input.tim === 'merah') {
        sesi.skorMerah += 1;
      } else {
        sesi.skorPutih += 1;
      }
    }

    // Catat ke log jawaban
    sesi.logJawaban.push({
      questionId: soalSaatIni.id,
      nomorSoal: sesi.currentQuestionIndex + 1,
      teksSoal: soalSaatIni.teks,
      tim: input.tim,
      jawabanDipilih,
      jawabanBenar,
      benar,
      posisiSetelah: posisiBaru,
    });

    const indeksBerikutnya = sesi.currentQuestionIndex + 1;
    sesi.currentQuestionIndex = indeksBerikutnya;
    sesi.currentTurn = giliranBerikutnya(sesi.currentTurn);

    // Cek apakah selesai
    const selesai = cekKondisiSelesai(posisiBaru, indeksBerikutnya, sesi.totalSoal);
    if (selesai) {
      sesi.state = 'FINISHED';
      const timMenang = tentukanPemenang(posisiBaru);
      const totalBenar = sesi.logJawaban.filter((l) => l.benar).length;
      const totalSalah = sesi.logJawaban.length - totalBenar;

      sesi.hasil = {
        timMenang,
        posisiAkhir: posisiBaru,
        skorMerah: sesi.skorMerah,
        skorPutih: sesi.skorPutih,
        totalBenar,
        totalSalah,
      };
    }

    return {
      sesi,
      benar,
      jawabanBenar,
      penjelasan: soalSaatIni.penjelasan,
      selesai,
    };
  },

  selesaikanSesi(sessionId: string, hostId: string): ActiveSoloSession {
    const sesi = this.dapatkanSesi(sessionId, hostId);
    if (!sesi) {
      throw new Error('Sesi tidak ditemukan atau Anda tidak berwenang.');
    }

    sesi.state = 'FINISHED';
    const timMenang = tentukanPemenang(sesi.taliPosition);
    const totalBenar = sesi.logJawaban.filter((l) => l.benar).length;
    const totalSalah = sesi.logJawaban.length - totalBenar;

    sesi.hasil = {
      timMenang,
      posisiAkhir: sesi.taliPosition,
      skorMerah: sesi.skorMerah,
      skorPutih: sesi.skorPutih,
      totalBenar,
      totalSalah,
    };

    return sesi;
  },

  hapusSesi(sessionId: string): void {
    sesiSoloMap.delete(sessionId);
  },
};

