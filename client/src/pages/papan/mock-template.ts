/**
 * MOCK TEMPLATE GAME (DATA TIRUAN CADANGAN)
 *
 * Catatan Arsitektur:
 * File ini HANYA dipakai sebagai fallback jika endpoint API resmi (`/api/template` atau
 * `/api/template/pustaka`) mengembalikan 404 atau server dalam mode pengembangan tanpa database.
 * Sediakan satu tempat konfigurasi di bawah untuk mengaktifkan/menonaktifkan mock ini.
 */

export const USE_MOCK_TEMPLATE_FALLBACK = true;

export interface GameTemplateItem {
  id: string;
  judul: string;
  game: string;
  mode: 'solo' | 'multi';
  questionsCount: number;
  deskripsi?: string;
}

export const MOCK_TEMPLATES_SAYA: GameTemplateItem[] = [
  {
    id: 'mock-saya-1',
    judul: 'Latihan Pecahan dan Desimal Kelas 5',
    game: 'tarik_tambang',
    mode: 'solo',
    questionsCount: 5,
    deskripsi: 'Mengubah pecahan biasa ke desimal dan operasi penjumlahan pecahan.',
  },
  {
    id: 'mock-saya-2',
    judul: 'Kuis Cepat Tata Surya & Planet',
    game: 'tarik_tambang',
    mode: 'multi',
    questionsCount: 8,
    deskripsi: 'Ciri-ciri planet dalam dan luar tata surya untuk kelas 6.',
  },
  {
    id: 'mock-saya-3',
    judul: 'Tantangan Makan Kerupuk Sains',
    game: 'makan_kerupuk',
    mode: 'multi',
    questionsCount: 10,
    deskripsi: 'Lomba seru kerupuk virtual (mendukung Mode Multiplayer HP Siswa maupun Mode Solo Guru).',
  },
];

export const MOCK_TEMPLATES_PUSTAKA: GameTemplateItem[] = [
  {
    id: 'mock-pustaka-1',
    judul: 'Ekosistem dan Rantai Makanan (Pustaka Resmi)',
    game: 'tarik_tambang',
    mode: 'solo',
    questionsCount: 5,
    deskripsi: 'Produsen, konsumen, dan dekomposer dalam jaring-jaring makanan.',
  },
  {
    id: 'mock-pustaka-2',
    judul: 'Operasi Aljabar Dasar SMP Kelas 7',
    game: 'tarik_tambang',
    mode: 'multi',
    questionsCount: 7,
    deskripsi: 'Penyederhanaan suku sejenis dan perkalian bentuk aljabar.',
  },
  {
    id: 'mock-pustaka-3',
    judul: 'Kemerdekaan & Pahlawan Nasional 17 Agustus',
    game: 'tarik_tambang',
    mode: 'multi',
    questionsCount: 6,
    deskripsi: 'Sejarah proklamasi dan tokoh-tokoh kemerdekaan Republik Indonesia.',
  },
];

