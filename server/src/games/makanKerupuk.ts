import crypto from 'crypto';

export type GigitanType = 'besar' | 'sedang' | 'kecil' | 'sangat_kecil' | 'zonk';

export interface ProbabilitasConfig {
  besar: number;        // default: 15% (berkurang 40%, poin +40)
  sedang: number;       // default: 25% (berkurang 25%, poin +25)
  kecil: number;        // default: 35% (berkurang 10%, poin +10)
  sangat_kecil: number; // default: 20% (berkurang 5%, poin +5)
  zonk: number;         // default: 5%  (berkurang 0%, poin +0)
}

export interface HasilGachaGigitan {
  tipe: GigitanType;
  label: string;
  berkurangPersen: number;
  poinGigitan: number;
  pesanLucu: string;
}

export interface PesertaKerupukState {
  id: string;
  socketId: string;
  nama: string;
  connected: boolean;
  sisaKerupuk: number;         // 100% sampai 0% (tidak boleh < 0)
  skorTotal: number;           // total akumulasi seluruh skor
  skorPengetahuan: number;     // jumlah jawaban benar * 100
  skorKeberuntungan: number;   // total bonus poin dari gigitan gacha
  totalBenar: number;
  totalSalah: number;
  streakBenar: number;         // reset ke 0 jika salah
  totalBonusStreak: number;    // akumulasi bonus streak (+50 tiap kelipatan 3)
  selesaiKerupuk: boolean;     // true jika kerupuk sudah mencapai 0%
  waktuSelesaiMs: number | null; // timestamp saat kerupuk mencapai 0%
  terakhirGigitan?: HasilGachaGigitan;
}

// ---------------------------------------------------------------------------
// 1. PRESET PROBABILITAS RESMI (Semua Wajib Tepat 100%)
// ---------------------------------------------------------------------------
export const PRESET_PROBABILITAS: Record<'mudah' | 'normal' | 'sulit', ProbabilitasConfig> = {
  // Preset Normal: Sesuai spesifikasi prompt (15 + 25 + 35 + 20 + 5 = 100%)
  normal: {
    besar: 15,
    sedang: 25,
    kecil: 35,
    sangat_kecil: 20,
    zonk: 5,
  },
  // Preset Mudah: Peluang gigitan besar lebih tinggi, zonk lebih rendah (35 + 30 + 20 + 12 + 3 = 100%)
  mudah: {
    besar: 35,
    sedang: 30,
    kecil: 20,
    sangat_kecil: 12,
    zonk: 3,
  },
  // Preset Sulit: Peluang gigitan besar lebih rendah, zonk lebih tinggi (5 + 15 + 30 + 35 + 15 = 100%)
  sulit: {
    besar: 5,
    sedang: 15,
    kecil: 30,
    sangat_kecil: 35,
    zonk: 15,
  },
};

// Data spesifikasi ukuran gigitan
export const GIGITAN_INFO: Record<GigitanType, { berkurangPersen: number; poinGigitan: number; label: string; pesanLucu: string }> = {
  besar: {
    berkurangPersen: 40,
    poinGigitan: 40,
    label: 'Gigitan Besar!',
    pesanLucu: 'Nyam! Mulut dibuka lebar, kerupuk langsung ludes banyak!',
  },
  sedang: {
    berkurangPersen: 25,
    poinGigitan: 25,
    label: 'Gigitan Sedang!',
    pesanLucu: 'Kriuk mantap! Gigitan terukur dan terkendali.',
  },
  kecil: {
    berkurangPersen: 10,
    poinGigitan: 10,
    label: 'Gigitan Kecil!',
    pesanLucu: 'Kriuk kecil, kerupuk bergoyang tertiup angin!',
  },
  sangat_kecil: {
    berkurangPersen: 5,
    poinGigitan: 5,
    label: 'Gigitan Sangat Kecil!',
    pesanLucu: 'Hap! Cuma kena ujung kerupuknya sedikit.',
  },
  zonk: {
    berkurangPersen: 0,
    poinGigitan: 0,
    label: 'Tidak Kena (Zonk)!',
    pesanLucu: 'Aduh! Kerupuknya melayang menghindar, tidak tergigit!',
  },
};

// ---------------------------------------------------------------------------
// 2. FUNGSI VALIDASI PROBABILITAS
// ---------------------------------------------------------------------------
export function validasiProbabilitas(config: ProbabilitasConfig): {
  valid: boolean;
  total: number;
  pesanError?: string;
} {
  const { besar, sedang, kecil, sangat_kecil, zonk } = config;

  // Cek apakah ada nilai negatif atau bukan angka
  const items = [besar, sedang, kecil, sangat_kecil, zonk];
  for (const val of items) {
    if (typeof val !== 'number' || isNaN(val) || val < 0 || val > 100) {
      return {
        valid: false,
        total: 0,
        pesanError: 'Setiap nilai probabilitas harus berupa angka antara 0% dan 100%.',
      };
    }
  }

  // Hitung total dengan pembulatan presisi desimal 2 angka
  const total = Math.round((besar + sedang + kecil + sangat_kecil + zonk) * 100) / 100;

  if (total !== 100) {
    return {
      valid: false,
      total,
      pesanError: `Total probabilitas harus tepat 100%. Saat ini: ${total}%.`,
    };
  }

  return { valid: true, total: 100 };
}

// ---------------------------------------------------------------------------
// 3. FUNGSI GACHA RANDOM DRAW DI BACKEND (CRYPTO-SAFE)
// ---------------------------------------------------------------------------
export function drawGachaGigitan(config: ProbabilitasConfig): HasilGachaGigitan {
  // Ambil angka acak kriptografis antara 0 dan 99.9999
  const randomVal = crypto.randomInt(0, 100000) / 1000; // 0.000 s/d 99.999

  let kumulatif = 0;

  // 1. Cek Gigitan Besar
  kumulatif += config.besar;
  if (randomVal < kumulatif) {
    const info = GIGITAN_INFO.besar;
    return { tipe: 'besar', ...info };
  }

  // 2. Cek Gigitan Sedang
  kumulatif += config.sedang;
  if (randomVal < kumulatif) {
    const info = GIGITAN_INFO.sedang;
    return { tipe: 'sedang', ...info };
  }

  // 3. Cek Gigitan Kecil
  kumulatif += config.kecil;
  if (randomVal < kumulatif) {
    const info = GIGITAN_INFO.kecil;
    return { tipe: 'kecil', ...info };
  }

  // 4. Cek Gigitan Sangat Kecil
  kumulatif += config.sangat_kecil;
  if (randomVal < kumulatif) {
    const info = GIGITAN_INFO.sangat_kecil;
    return { tipe: 'sangat_kecil', ...info };
  }

  // 5. Sisanya adalah Zonk
  const info = GIGITAN_INFO.zonk;
  return { tipe: 'zonk', ...info };
}

// ---------------------------------------------------------------------------
// 4. LOGIKA PERHITUNGAN SKOR & KERUPUK SETIAP JAWABAN
// ---------------------------------------------------------------------------
export interface ProsesJawabanParams {
  peserta: PesertaKerupukState;
  jawabanSiswa: string;
  kunciJawaban: string;
  probabilitasConfig: ProbabilitasConfig;
  waktuJawabTimestamp: number;
}

export interface HasilProsesJawaban {
  benar: boolean;
  poinDidapat: number;
  poinDasar: number;
  bonusStreak: number;
  bonusPenyelesaian: number;
  gacha: HasilGachaGigitan | null;
  sisaKerupukBaru: number;
  selesaiBaru: boolean;
  pesertaUpdated: PesertaKerupukState;
}

export function prosesJawabanKerupuk(params: ProsesJawabanParams): HasilProsesJawaban {
  const { peserta, jawabanSiswa, kunciJawaban, probabilitasConfig, waktuJawabTimestamp } = params;
  const benar = jawabanSiswa.trim().toUpperCase() === kunciJawaban.trim().toUpperCase();

  // Clone peserta state agar immutability terjaga
  const updated: PesertaKerupukState = { ...peserta };

  if (!benar) {
    // JAWABAN SALAH:
    // - Tidak ada poin
    // - Streak reset ke 0
    // - Tidak ada kesempatan gigit (tidak ada gacha)
    updated.totalSalah += 1;
    updated.streakBenar = 0;
    delete updated.terakhirGigitan;

    return {
      benar: false,
      poinDidapat: 0,
      poinDasar: 0,
      bonusStreak: 0,
      bonusPenyelesaian: 0,
      gacha: null,
      sisaKerupukBaru: updated.sisaKerupuk,
      selesaiBaru: false,
      pesertaUpdated: updated,
    };
  }

  // JAWABAN BENAR:
  // 1. Poin dasar jawaban benar: +100
  const poinDasar = 100;
  updated.totalBenar += 1;
  updated.skorPengetahuan += poinDasar;
  updated.streakBenar += 1;

  // 2. Bonus streak: +50 setiap mencapai 3 jawaban benar berturut-turut (3, 6, 9, dst.)
  let bonusStreak = 0;
  if (updated.streakBenar > 0 && updated.streakBenar % 3 === 0) {
    bonusStreak = 50;
    updated.totalBonusStreak += bonusStreak;
  }

  // 3. Kesempatan Menggigit Kerupuk (Random Draw di Backend)
  const gacha = drawGachaGigitan(probabilitasConfig);
  updated.terakhirGigitan = gacha;
  updated.skorKeberuntungan += gacha.poinGigitan;

  // 4. Pengurangan Kerupuk (Tidak boleh kurang dari 0%)
  const sisaSebelumnya = updated.sisaKerupuk;
  const sisaKerupukBaru = Math.max(0, sisaSebelumnya - gacha.berkurangPersen);
  updated.sisaKerupuk = sisaKerupukBaru;

  // 5. Bonus Penyelesaian: +100 poin (HANYA DIBERIKAN 1 KALI ketika kerupuk pertama kali mencapai 0%)
  let bonusPenyelesaian = 0;
  let selesaiBaru = false;
  if (!updated.selesaiKerupuk && sisaKerupukBaru === 0) {
    bonusPenyelesaian = 100;
    updated.selesaiKerupuk = true;
    updated.waktuSelesaiMs = waktuJawabTimestamp;
    selesaiBaru = true;
  }

  // Total poin yang didapatkan pada soal ini
  const poinDidapat = poinDasar + bonusStreak + gacha.poinGigitan + bonusPenyelesaian;
  updated.skorTotal += poinDidapat;

  return {
    benar: true,
    poinDidapat,
    poinDasar,
    bonusStreak,
    bonusPenyelesaian,
    gacha,
    sisaKerupukBaru,
    selesaiBaru,
    pesertaUpdated: updated,
  };
}

// ---------------------------------------------------------------------------
// 5. SISTEM PENENTUAN PERINGKAT & LEADERBOARD (4 URUTAN ATURAN)
// ---------------------------------------------------------------------------
/**
 * Urutan kriteria peringkat:
 * 1. Total skor tertinggi (skorTotal desc)
 * 2. Jumlah jawaban benar terbanyak (totalBenar desc)
 * 3. Persentase kerupuk tersisa paling sedikit (sisaKerupuk asc)
 * 4. Waktu penyelesaian paling cepat (waktuSelesaiMs asc)
 * Catatan: Pemain yang berhasil menghabiskan kerupuk ditempatkan lebih atas jika kriteria sebelumnya sama.
 */
export function urutkanLeaderboard(pesertaList: PesertaKerupukState[]): PesertaKerupukState[] {
  return [...pesertaList].sort((a, b) => {
    // Kriteria 1: Total Skor Tertinggi
    if (b.skorTotal !== a.skorTotal) {
      return b.skorTotal - a.skorTotal;
    }

    // Kriteria 2: Jumlah Jawaban Benar Terbanyak
    if (b.totalBenar !== a.totalBenar) {
      return b.totalBenar - a.totalBenar;
    }

    // Kriteria 3: Persentase Kerupuk Tersisa Paling Sedikit
    if (a.sisaKerupuk !== b.sisaKerupuk) {
      return a.sisaKerupuk - b.sisaKerupuk;
    }

    // Pemain yang berhasil menghabiskan kerupuk diprioritaskan
    if (a.selesaiKerupuk !== b.selesaiKerupuk) {
      return a.selesaiKerupuk ? -1 : 1;
    }

    // Kriteria 4: Waktu Penyelesaian Paling Cepat
    if (a.waktuSelesaiMs && b.waktuSelesaiMs && a.waktuSelesaiMs !== b.waktuSelesaiMs) {
      return a.waktuSelesaiMs - b.waktuSelesaiMs;
    }

    // Fallback: Urutan nama
    return a.nama.localeCompare(b.nama);
  });
}
