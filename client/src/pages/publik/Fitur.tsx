import { Link } from 'react-router';
import { LayoutPublik } from './LayoutPublik';
import { Button, Card, Badge } from '../../components';
import {
  Presentation,
  Trophy,
  Smartphone,
  Sparkles,
  Users,
  LineChart,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function Fitur() {
  const daftarFitur = [
    {
      kategori: 'Papan Tulis Digital',
      judul: 'Kanvas Tak Terbatas dengan Fabric.js',
      deskripsi:
        'Jelaskan materi tanpa batasan ruang. Geser dan perbesar (pan & zoom) kanvas dengan mulus, gunakan beragam pena warna, buat bentuk geometris, tabel, dan sematkan gambar dengan mudah.',
      ikon: <Presentation className="w-8 h-8 text-[#D7262E]" />,
      poin: [
        '3 pilihan ketebalan pena dan penghapus objek presisi',
        'Bentuk geometris: kotak, lingkaran, panah, garis, dan tabel',
        'Laser pointer untuk memusatkan perhatian murid',
        'Penyimpanan otomatis riwayat perubahan ke database lokal',
      ],
    },
    {
      kategori: 'Game Edukasi 17-an',
      judul: 'Lomba Tarik Tambang Interaktif',
      deskripsi:
        'Ubah kuis materi menjadi arena lomba tarik tambang yang seru. Seluruh kelas dibagi menjadi Tim Merah dan Tim Putih. Jawaban benar menarik tali ke arah tim masing-masing.',
      ikon: <Trophy className="w-8 h-8 text-[#F5B700]" />,
      poin: [
        'Visualisasi tali realtime dengan bendera merah putih',
        'Setiap jawaban benar menarik tali 1 langkah (skala -8 hingga +8)',
        'Perhitungan posisi tali dan penentuan pemenang di server',
        'Layar perayaan pemenang yang memotivasi kekompakan kelas',
      ],
    },
    {
      kategori: 'Fleksibilitas Perangkat',
      judul: 'Mode Solo dan Mode Multiplayer',
      deskripsi:
        'Dua mode permainan yang disesuaikan dengan aturan perangkat di sekolah Anda. Mainkan dengan satu layar proyektor bersama atau dengan gawai masing-masing murid.',
      ikon: <Smartphone className="w-8 h-8 text-[#1E2A5A] dark:text-blue-300]" />,
      poin: [
        'Mode Solo: Cukup satu layar guru (proyektor/TV), murid maju bergantian',
        'Mode Multiplayer: Siswa bergabung dengan token 6 angka dan QR code',
        'Batas waktu 15 detik per soal untuk memacu konsentrasi',
        'Penjelasan jawaban langsung muncul di layar siswa saat menjawab salah',
      ],
    },
    {
      kategori: 'Kecerdasan Buatan',
      judul: 'Asisten AI Pembuat Soal & Tanya AI',
      deskripsi:
        'Hemat waktu berharga Anda. Tempelkan materi pelajaran dan AI akan menyusun soal kuis lengkap dengan 3 opsi dan penjelasannya. Di papan tulis, lingkari soal untuk langsung dijawab oleh AI.',
      ikon: <Sparkles className="w-8 h-8 text-[#F5B700]" />,
      poin: [
        'Pembuat soal otomatis untuk jenjang SD dan SMP',
        'Validasi ketat: tepat 3 pilihan jawaban dan 1 jawaban benar',
        'Hasil AI wajib ditinjau dan dapat disunting guru sebelum disimpan',
        'Cache cerdas untuk menghemat kuota harian pemanggilan AI',
      ],
    },
    {
      kategori: 'Kolaborasi Kelas',
      judul: 'Tautan Kolaborasi Viewer & Editor',
      deskripsi:
        'Ajak murid berkolaborasi langsung di kanvas yang sama. Bagikan tautan instan dengan hak akses khusus tanpa murid perlu membuat akun.',
      ikon: <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />,
      poin: [
        'Tautan instan dengan peran Viewer (melihat) atau Editor (menggambar)',
        'Guru memegang kontrol penuh untuk mencabut tautan sewaktu-waktu',
        'Sinkronisasi objek realtime melalui Socket.IO',
        'Murid cukup memasukkan nama panggilan untuk mulai membuka papan',
      ],
    },
    {
      kategori: 'Evaluasi Pembelajaran',
      judul: 'Statistik Soal Paling Sering Salah',
      deskripsi:
        'Ketahui materi mana yang belum dipahami kelas secara objektif. Setiap sesi permainan merekam statistik akurasi per soal tanpa mengumpulkan data pribadi siswa.',
      ikon: <LineChart className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />,
      poin: [
        'Rekapitulasi jumlah benar dan salah untuk setiap butir pertanyaan',
        'Highlight otomatis soal yang paling banyak dijawab salah',
        'Riwayat sesi tersimpan rapi di dashboard akun guru',
        'Tanpa pencatatan nilai individual siswa demi menjaga rasa percaya diri',
      ],
    },
  ];

  return (
    <LayoutPublik>
      <div className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge variant="merah">Fitur Platform</Badge>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white font-['Baloo_2']">
              Segala yang Anda Butuhkan untuk Kelas Interaktif
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Discere menggabungkan kenyamanan papan tulis digital dengan kegembiraan kompetisi tarik tambang 17-an.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {daftarFitur.map((fitur, idx) => (
              <Card key={idx} padding="lg" hoverable className="flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800">
                      {fitur.ikon}
                    </div>
                    <Badge variant="slate" size="sm">
                      {fitur.kategori}
                    </Badge>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-['Baloo_2']">
                      {fitur.judul}
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {fitur.deskripsi}
                    </p>
                  </div>
                  <ul className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400">
                    {fitur.poin.map((p, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-16 text-center">
            <Link to="/daftar">
              <Button variant="utama" size="lg" icon={<ArrowRight className="w-5 h-5" />}>
                Coba Semua Fitur Gratis
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </LayoutPublik>
  );
}
