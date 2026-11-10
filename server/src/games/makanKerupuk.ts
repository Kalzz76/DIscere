import crypto from 'crypto';
import { z } from 'zod';

/**
 * Modul Domain Game Edukasi: Makan Kerupuk Challenge (Mode Solo — Perangkat Guru)
 * Mengatur tipe data konfigurasi target & probabilitas gigitan, preset kesulitan,
 * gacha gigitan berbasis RNG backend, validasi jawaban berbasis choiceId & presentationId,
 * serta kalkulasi skor terpisah (Pembelajaran, Keberuntungan, Penyelesaian).
 */

export type TipeGigitan = 'besar' | 'sedang' | 'kecil' | 'sangat_kecil' | 'zonk';
export type KesulitanKerupuk = 'mudah' | 'normal' | 'sulit' | 'custom';
export type TargetKerupukPreset = '50' | '100' | '150' | '200' | 'custom';
export type StateKerupukSolo = 'READY' | 'PLAYING' | 'PAUSED' | 'FINISHED' | 'STOPPED';

export interface ProbabilitasConfig {
  besar: number;        // -40% target, +40 poin keberuntungan
  sedang: number;       // -25% target, +25 poin keberuntungan
  kecil: number;        // -10% target, +10 poin keberuntungan
  sangat_kecil: number; // -5% target,  +5 poin keberuntungan (Gigitan Mini)
  zonk: number;         // 0% target,   +0 poin keberuntungan
}

export interface KonfigurasiKerupukSolo {
  targetKerupuk: number;
  targetPreset: TargetKerupukPreset;
  kesulitan: KesulitanKerupuk;
  probabilitas: ProbabilitasConfig;
}

export interface HasilGachaGigitan {
  tipe: TipeGigitan;
  label: string;
  berkurangPersen: number;
  penguranganPoinTarget: number;
  penguranganEfektifPoin: number;
  poinGigitan: number;
}

export interface PilihanSoalKerupuk {
  choiceId: string;
  label: 'A' | 'B' | 'C';
  teks: string;
}

export interface SoalTampilKerupuk {
  presentationId: string;
  questionId: string;
  nomorSoal: number;
  totalSoalBank: number;
  teks: string;
  pilihan: PilihanSoalKerupuk[];
}

export interface RiwayatGigitanItem {
  urutan: number;
  questionId: string;
  nomorSoal: number;
  benar: boolean;
  tipe: TipeGigitan | 'salah';
  label: string;
  penguranganPoin: number;
  poinPembelajaranDidapat: number;
  poinStreakDidapat: number;
  poinKeberuntunganDidapat: number;
  poinPenyelesaianDidapat: number;
  totalPoinDidapat: number;
  sisaKerupukSetelah: number;
  waktuJawabMs: number;
  timestamp: number;
}

export interface SoloKerupukState {
  sisaKerupuk: number;
  targetKerupuk: number;
  progresPersen: number;
  sisaPersen: number;
  skorTotal: number;
  skorPembelajaran: number; // Nilai jawaban benar (+100) + bonus streak (+50 saat mencapai streak 3)
  skorDasarBenar: number;   // Akumulasi +100 jawaban benar
  totalBonusStreak: number; // Akumulasi +50 setiap rangkaian streak mencapai 3
  kaliBonusStreak: number;
  bonusKeberuntungan: number; // Akumulasi poin dari ukuran gigitan
  bonusPenyelesaian: number;  // +100 diberikan 1x tepat saat sisaKerupuk mencapai 0
  totalBenar: number;
  totalSalah: number;
  streakBenar: number;
  streakTertinggi: number;
  bonusStreakDiberikanPadaRangkaian: boolean;
  selesaiKerupuk: boolean;
  waktuMulaiMs: number | null;
  waktuSelesaiMs: number | null;
  totalWaktuJawabMs: number;
  jumlahJawab: number;
  rataRataWaktuJawabMs: number;
  terakhirGigitan: HasilGachaGigitan | null;
  riwayatGigitan: RiwayatGigitanItem[];
  statistikGigitan: Record<TipeGigitan, number>;
}

export const TARGET_KERUPUK_PRESETS: readonly number[] = [50, 100, 150, 200];

export const PRESET_PROBABILITAS: Record<'normal' | 'mudah' | 'sulit', Readonly<ProbabilitasConfig>> = {
  normal: Object.freeze({
    besar: 15,
    sedang: 25,
    kecil: 35,
    sangat_kecil: 20,
    zonk: 5,
  }),
  mudah: Object.freeze({
    besar: 35,
    sedang: 30,
    kecil: 20,
    sangat_kecil: 12,
    zonk: 3,
  }),
  sulit: Object.freeze({
    besar: 5,
    sedang: 15,
    kecil: 30,
    sangat_kecil: 35,
    zonk: 15,
  }),
};

export interface GigitanSpec {
  label: string;
  persen: number;
  poin: number;
}

export const GIGITAN_INFO: Record<TipeGigitan, GigitanSpec> = {
  besar: { label: 'Gigitan Besar', persen: 40, poin: 40 },
  sedang: { label: 'Gigitan Sedang', persen: 25, poin: 25 },
  kecil: { label: 'Gigitan Kecil', persen: 10, poin: 10 },
  sangat_kecil: { label: 'Gigitan Mini', persen: 5, poin: 5 },
  zonk: { label: 'Zonk! Meleset', persen: 0, poin: 0 },
};

export const probabilitasSchema = z
  .object({
    besar: z.number().finite().min(0, 'Probabilitas tidak boleh negatif.'),
    sedang: z.number().finite().min(0, 'Probabilitas tidak boleh negatif.'),
    kecil: z.number().finite().min(0, 'Probabilitas tidak boleh negatif.'),
    sangat_kecil: z.number().finite().min(0, 'Probabilitas tidak boleh negatif.'),
    zonk: z.number().finite().min(0, 'Probabilitas tidak boleh negatif.'),
  })
  .refine(
    (p) => Math.abs(p.besar + p.sedang + p.kecil + p.sangat_kecil + p.zonk - 100) < 0.001,
    { message: 'Total seluruh probabilitas gigitan harus tepat 100%.' }
  );

export const konfigurasiKerupukSoloSchema = z.object({
  targetKerupuk: z
    .number()
    .int('Target kerupuk harus berupa bilangan bulat.')
    .min(10, 'Target kerupuk minimal 10 poin.')
    .max(1000, 'Target kerupuk maksimal 1000 poin.')
    .default(100),
  targetPreset: z.enum(['50', '100', '150', '200', 'custom']).optional(),
  kesulitan: z.enum(['mudah', 'normal', 'sulit', 'custom']).default('normal'),
  probabilitas: probabilitasSchema.optional(),
});

/**
 * Validasi manual probabilitas gacha gigitan agar totalnya tepat 100%.
 */
export function validasiProbabilitas(prob: ProbabilitasConfig): {
  valid: boolean;
  total: number;
  pesanError?: string;
} {
  if (!prob || typeof prob !== 'object') {
    return { valid: false, total: 0, pesanError: 'Konfigurasi probabilitas wajib diisi.' };
  }

  const keys: TipeGigitan[] = ['besar', 'sedang', 'kecil', 'sangat_kecil', 'zonk'];
  let total = 0;

  for (const key of keys) {
    const val = Number(prob[key]);
    if (!Number.isFinite(val) || val < 0) {
      return {
        valid: false,
        total: 0,
        pesanError: `Nilai probabilitas "${key}" harus berupa angka non-negatif.`,
      };
    }
    total += val;
  }

  if (Math.abs(total - 100) > 0.001) {
    return {
      valid: false,
      total: Number(total.toFixed(2)),
      pesanError: `Total probabilitas gigitan harus tepat 100% (saat ini: ${total}%).`,
    };
  }

  return { valid: true, total: 100 };
}

/**
 * Membangun snapshot konfigurasi immutable untuk sesi Solo Makan Kerupuk.
 * Melempar error jika probabilitas atau targetKerupuk tidak valid.
 */
export function bangunKonfigurasiKerupukSolo(
  input?: Partial<{
    targetKerupuk: number;
    targetPreset: TargetKerupukPreset;
    kesulitan: KesulitanKerupuk;
    probabilitas: ProbabilitasConfig;
  }>
): KonfigurasiKerupukSolo {
  const targetKerupuk = input?.targetKerupuk ?? 100;
  if (!Number.isInteger(targetKerupuk) || targetKerupuk < 10 || targetKerupuk > 1000) {
    throw new Error('Target kerupuk harus bilangan bulat antara 10 hingga 1000 poin.');
  }

  const targetPreset: TargetKerupukPreset =
    input?.targetPreset ??
    (TARGET_KERUPUK_PRESETS.includes(targetKerupuk)
      ? (String(targetKerupuk) as TargetKerupukPreset)
      : 'custom');

  const kesulitan: KesulitanKerupuk = input?.kesulitan ?? 'normal';

  let rawProb: ProbabilitasConfig;
  if (kesulitan === 'custom' || input?.probabilitas) {
    rawProb = {
      besar: Number(input?.probabilitas?.besar ?? PRESET_PROBABILITAS.normal.besar),
      sedang: Number(input?.probabilitas?.sedang ?? PRESET_PROBABILITAS.normal.sedang),
      kecil: Number(input?.probabilitas?.kecil ?? PRESET_PROBABILITAS.normal.kecil),
      sangat_kecil: Number(
        input?.probabilitas?.sangat_kecil ?? PRESET_PROBABILITAS.normal.sangat_kecil
      ),
      zonk: Number(input?.probabilitas?.zonk ?? PRESET_PROBABILITAS.normal.zonk),
    };
  } else {
    rawProb = { ...PRESET_PROBABILITAS[kesulitan] };
  }

  const cek = validasiProbabilitas(rawProb);
  if (!cek.valid) {
    throw new Error(cek.pesanError || 'Konfigurasi probabilitas tidak valid.');
  }

  return Object.freeze({
    targetKerupuk,
    targetPreset,
    kesulitan,
    probabilitas: Object.freeze({ ...rawProb }),
  });
}

/**
 * Menghitung jumlah pengurangan poin kerupuk proporsional terhadap targetKerupuk.
 * Contoh untuk target 100: Besar=40, Sedang=25, Kecil=10, Mini=5, Zonk=0.
 * Contoh untuk target 200: Besar=80, Sedang=50, Kecil=20, Mini=10, Zonk=0.
 */
export function hitungPenguranganGigitan(tipe: TipeGigitan, targetKerupuk: number): number {
  const spec = GIGITAN_INFO[tipe];
  if (spec.persen <= 0) return 0;
  return Math.max(1, Math.round((targetKerupuk * spec.persen) / 100));
}

/**
 * Menghitung persentase progres kerupuk dimakan [0..100] dan sisa persen [0..100].
 */
export function hitungPersentaseKerupuk(sisaKerupuk: number, targetKerupuk: number): {
  progresPersen: number;
  sisaPersen: number;
} {
  const safeTarget = Math.max(1, targetKerupuk);
  const clampedSisa = Math.max(0, Math.min(safeTarget, sisaKerupuk));
  const sisaPersen = Math.min(100, Math.max(0, Math.round((clampedSisa / safeTarget) * 100)));
  const progresPersen = Math.min(100, Math.max(0, 100 - sisaPersen));
  return { progresPersen, sisaPersen };
}

/**
 * Mengundi hasil gacha gigitan kerupuk secara acak di backend menggunakan crypto.randomInt.
 * RNG pernah tidak boleh dijalankan di client.
 */
export function drawGachaGigitan(
  prob: ProbabilitasConfig,
  targetKerupuk: number = 100,
  randomNormalized?: number // opsional khusus dependency injection pada pengujian unit deterministik
): HasilGachaGigitan {
  const keys: TipeGigitan[] = ['besar', 'sedang', 'kecil', 'sangat_kecil', 'zonk'];
  const validKeys = keys.filter((k) => Number(prob[k]) > 0);
  if (validKeys.length === 0) {
    throw new Error('Tidak ada probabilitas gigitan positif yang dapat diundi.');
  }

  let rollPercent: number;
  if (typeof randomNormalized === 'number') {
    rollPercent = Math.min(99.999999, Math.max(0, randomNormalized * 100));
  } else {
    // Gunakan skala 10.000 via crypto.randomInt agar mendukung pecahan desimal probabilitas hingga 0.01%
    const r = crypto.randomInt(0, 10000);
    rollPercent = r / 100;
  }

  let kumulatif = 0;
  let terpilih: TipeGigitan = validKeys[validKeys.length - 1];

  for (const key of validKeys) {
    kumulatif += Number(prob[key]);
    if (rollPercent < kumulatif) {
      terpilih = key;
      break;
    }
  }

  const info = GIGITAN_INFO[terpilih];
  const penguranganPoinTarget = hitungPenguranganGigitan(terpilih, targetKerupuk);

  return {
    tipe: terpilih,
    label: info.label,
    berkurangPersen: info.persen,
    penguranganPoinTarget,
    penguranganEfektifPoin: penguranganPoinTarget,
    poinGigitan: info.poin,
  };
}

/**
 * Membuat state awal Solo Kerupuk bersih (nol skor, kerupuk utuh sesuai target).
 */
export function buatStateKerupukAwal(targetKerupuk: number): SoloKerupukState {
  return {
    sisaKerupuk: targetKerupuk,
    targetKerupuk,
    progresPersen: 0,
    sisaPersen: 100,
    skorTotal: 0,
    skorPembelajaran: 0,
    skorDasarBenar: 0,
    totalBonusStreak: 0,
    kaliBonusStreak: 0,
    bonusKeberuntungan: 0,
    bonusPenyelesaian: 0,
    totalBenar: 0,
    totalSalah: 0,
    streakBenar: 0,
    streakTertinggi: 0,
    bonusStreakDiberikanPadaRangkaian: false,
    selesaiKerupuk: false,
    waktuMulaiMs: null,
    waktuSelesaiMs: null,
    totalWaktuJawabMs: 0,
    jumlahJawab: 0,
    rataRataWaktuJawabMs: 0,
    terakhirGigitan: null,
    riwayatGigitan: [],
    statistikGigitan: {
      besar: 0,
      sedang: 0,
      kecil: 0,
      sangat_kecil: 0,
      zonk: 0,
    },
  };
}

export interface HasilProsesJawabanKerupuk {
  benar: boolean;
  poinDidapat: number;
  poinDasar: number;
  bonusStreak: number;
  bonusPenyelesaian: number;
  gacha: HasilGachaGigitan | null;
  sisaKerupukBaru: number;
  progresPersenBaru: number;
  selesaiBaru: boolean;
  stateUpdated: SoloKerupukState;
  gigitanLogItem: RiwayatGigitanItem;
}

/**
 * Memproses hasil jawaban guru pada Solo Mode Makan Kerupuk Challenge:
 * - Hanya boleh dipanggil ketika status permainan 'PLAYING' & kerupuk belum 0.
 * - Jawaban benar: +100 skorPembelajaran, +50 sekali per rangkaian saat mencapai streak 3,
 *   undian gigitan (besar/sedang/kecil/mini/zonk), kurangi sisaKerupuk proporsional (clamp >= 0),
 *   +100 bonusPenyelesaian sekali saat sisaKerupuk tepat mencapai 0.
 * - Jawaban salah: +0 poin, reset streak & flag streak rangkaian, tanpa gigitan.
 */
export function hitungHasilJawabanKerupukSolo(
  state: SoloKerupukState,
  config: KonfigurasiKerupukSolo,
  soalMeta: { questionId: string; nomorSoal: number },
  benar: boolean,
  waktuJawabMs: number,
  sekarangMs: number = Date.now(),
  randomNormalized?: number
): HasilProsesJawabanKerupuk {
  if (state.selesaiKerupuk || state.sisaKerupuk <= 0) {
    throw new Error('Permainan sudah selesai (kerupuk sudah habis).');
  }

  const safeWaktuMs = Math.max(0, Math.round(waktuJawabMs));
  const updated: SoloKerupukState = {
    ...state,
    riwayatGigitan: [...state.riwayatGigitan],
    statistikGigitan: { ...state.statistikGigitan },
  };

  updated.jumlahJawab += 1;
  updated.totalWaktuJawabMs += safeWaktuMs;
  updated.rataRataWaktuJawabMs = Math.round(updated.totalWaktuJawabMs / updated.jumlahJawab);

  if (!benar) {
    updated.totalSalah += 1;
    updated.streakBenar = 0;
    updated.bonusStreakDiberikanPadaRangkaian = false;

    const logSalah: RiwayatGigitanItem = {
      urutan: updated.riwayatGigitan.length + 1,
      questionId: soalMeta.questionId,
      nomorSoal: soalMeta.nomorSoal,
      benar: false,
      tipe: 'salah',
      label: 'Jawaban Salah (Tidak Menggigit)',
      penguranganPoin: 0,
      poinPembelajaranDidapat: 0,
      poinStreakDidapat: 0,
      poinKeberuntunganDidapat: 0,
      poinPenyelesaianDidapat: 0,
      totalPoinDidapat: 0,
      sisaKerupukSetelah: updated.sisaKerupuk,
      waktuJawabMs: safeWaktuMs,
      timestamp: sekarangMs,
    };
    updated.riwayatGigitan.push(logSalah);

    return {
      benar: false,
      poinDidapat: 0,
      poinDasar: 0,
      bonusStreak: 0,
      bonusPenyelesaian: 0,
      gacha: null,
      sisaKerupukBaru: updated.sisaKerupuk,
      progresPersenBaru: updated.progresPersen,
      selesaiBaru: false,
      stateUpdated: updated,
      gigitanLogItem: logSalah,
    };
  }

  // Jawaban Benar
  const poinDasar = 100;
  updated.totalBenar += 1;
  updated.skorDasarBenar += poinDasar;
  updated.streakBenar += 1;
  if (updated.streakBenar > updated.streakTertinggi) {
    updated.streakTertinggi = updated.streakBenar;
  }

  // Bonus streak +50 diberikan SATU KALI pada setiap rangkaian ketika mencapai tepat 3
  let bonusStreak = 0;
  if (updated.streakBenar === 3 && !updated.bonusStreakDiberikanPadaRangkaian) {
    bonusStreak = 50;
    updated.bonusStreakDiberikanPadaRangkaian = true;
    updated.totalBonusStreak += bonusStreak;
    updated.kaliBonusStreak += 1;
  }

  updated.skorPembelajaran += poinDasar + bonusStreak;

  // Undi gigitan kerupuk di backend menggunakan konfigurasi snapshot sesi
  const gachaRaw = drawGachaGigitan(config.probabilitas, config.targetKerupuk, randomNormalized);
  const sisaSebelum = updated.sisaKerupuk;
  const sisaBaru = Math.max(0, sisaSebelum - gachaRaw.penguranganPoinTarget);
  const penguranganEfektif = sisaSebelum - sisaBaru;

  const gacha: HasilGachaGigitan = {
    ...gachaRaw,
    penguranganEfektifPoin: penguranganEfektif,
  };

  updated.statistikGigitan[gacha.tipe] += 1;
  updated.bonusKeberuntungan += gacha.poinGigitan;
  updated.sisaKerupuk = sisaBaru;
  updated.terakhirGigitan = gacha;

  const { progresPersen, sisaPersen } = hitungPersentaseKerupuk(sisaBaru, config.targetKerupuk);
  updated.progresPersen = progresPersen;
  updated.sisaPersen = sisaPersen;

  // Bonus penyelesaian +100 hanya 1x ketika sisa kerupuk pertama kali mencapai 0
  let bonusPenyelesaian = 0;
  let selesaiBaru = false;
  if (sisaBaru === 0 && !updated.selesaiKerupuk) {
    bonusPenyelesaian = 100;
    updated.bonusPenyelesaian = 100;
    updated.selesaiKerupuk = true;
    updated.waktuSelesaiMs = sekarangMs;
    selesaiBaru = true;
  }

  const poinDidapat = poinDasar + bonusStreak + gacha.poinGigitan + bonusPenyelesaian;
  updated.skorTotal =
    updated.skorPembelajaran + updated.bonusKeberuntungan + updated.bonusPenyelesaian;

  const logBenar: RiwayatGigitanItem = {
    urutan: updated.riwayatGigitan.length + 1,
    questionId: soalMeta.questionId,
    nomorSoal: soalMeta.nomorSoal,
    benar: true,
    tipe: gacha.tipe,
    label: gacha.label,
    penguranganPoin: penguranganEfektif,
    poinPembelajaranDidapat: poinDasar,
    poinStreakDidapat: bonusStreak,
    poinKeberuntunganDidapat: gacha.poinGigitan,
    poinPenyelesaianDidapat: bonusPenyelesaian,
    totalPoinDidapat: poinDidapat,
    sisaKerupukSetelah: sisaBaru,
    waktuJawabMs: safeWaktuMs,
    timestamp: sekarangMs,
  };
  updated.riwayatGigitan.push(logBenar);

  return {
    benar: true,
    poinDidapat,
    poinDasar,
    bonusStreak,
    bonusPenyelesaian,
    gacha,
    sisaKerupukBaru: sisaBaru,
    progresPersenBaru: progresPersen,
    selesaiBaru,
    stateUpdated: updated,
    gigitanLogItem: logBenar,
  };
}
