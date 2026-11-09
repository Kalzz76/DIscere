/**
 * Logika murni permainan Tarik Tambang untuk Discere.
 * Satu sumber kebenaran (single source of truth) untuk seluruh komponen.
 */

export type TimTarikTambang = 'merah' | 'putih';
export type HasilPemenang = 'merah' | 'putih' | 'seri';

export const BATAS_MIN_TALI = -8;
export const BATAS_MAX_TALI = 8;
export const POSISI_AWAL_TALI = 0;

/**
 * Menghitung posisi tali baru berdasarkan tim yang menjawab dan status kebenaran jawaban.
 *
 * Aturan:
 * - Tim Merah benar: posisi berkurang 1 (menuju -8)
 * - Tim Putih benar: posisi bertambah 1 (menuju +8)
 * - Jawaban salah: posisi tidak berubah
 * - Posisi dijaga dalam rentang [-8, +8]
 */
export function hitungPosisiTali(
  posisiSaatIni: number,
  tim: TimTarikTambang,
  benar: boolean
): number {
  if (!benar) {
    return posisiSaatIni;
  }

  if (tim === 'merah') {
    return Math.max(BATAS_MIN_TALI, posisiSaatIni - 1);
  }

  if (tim === 'putih') {
    return Math.min(BATAS_MAX_TALI, posisiSaatIni + 1);
  }

  return posisiSaatIni;
}

/**
 * Memeriksa apakah permainan sudah selesai.
 *
 * Selesai jika:
 * 1. Tali mencapai posisi ekstrem (-8 atau +8)
 * 2. Seluruh soal sudah dimainkan (indeksSoalBerikutnya >= totalSoal)
 */
export function cekKondisiSelesai(
  posisiTali: number,
  soalSudahDimainkan: number,
  totalSoal: number
): boolean {
  if (posisiTali <= BATAS_MIN_TALI || posisiTali >= BATAS_MAX_TALI) {
    return true;
  }

  if (soalSudahDimainkan >= totalSoal) {
    return true;
  }

  return false;
}

/**
 * Menentukan pemenang berdasarkan posisi tali akhir.
 *
 * Aturan:
 * - posisi == -8  -> Tim Merah menang
 * - posisi == +8  -> Tim Putih menang
 * - posisi < 0    -> Tim Merah menang (lebih dekat ke wilayah Merah)
 * - posisi > 0    -> Tim Putih menang (lebih dekat ke wilayah Putih)
 * - posisi == 0   -> Seri
 */
export function tentukanPemenang(posisiTali: number): HasilPemenang {
  if (posisiTali < 0) {
    return 'merah';
  }
  if (posisiTali > 0) {
    return 'putih';
  }
  return 'seri';
}

/**
 * Menentukan giliran berikutnya secara bergantian (Merah -> Putih -> Merah).
 */
export function giliranBerikutnya(giliranSaatIni: TimTarikTambang): TimTarikTambang {
  return giliranSaatIni === 'merah' ? 'putih' : 'merah';
}

