import { Link } from 'react-router';
import { LayoutPublik } from './LayoutPublik';
import { Button, Card, Badge } from '../../components';
import {
  UserCheck,
  MonitorOff,
  Cpu,
  Lock,
  Smile,
  Server,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function Kelebihan() {
  const kelebihanList = [
    {
      ikon: <UserCheck className="w-8 h-8 text-[#D7262E]" />,
      judul: 'Siswa Masuk Tanpa Akun',
      deskripsi:
        'Murid tidak perlu mengingat email atau password. Siswa cukup membuka alamat jaringan lokal, memasukkan token 6 angka dan nama panggilan, lalu langsung siap bertanding.',
    },
    {
      ikon: <MonitorOff className="w-8 h-8 text-[#F5B700]" />,
      judul: 'Tetap Seru Tanpa Membawa HP',
      deskripsi:
        'Banyak sekolah dasar melarang murid membawa gawai. Mode Solo memungkinkan seluruh kelas berkompetisi hanya dengan satu layar laptop guru yang terhubung ke proyektor.',
    },
    {
      ikon: <Cpu className="w-8 h-8 text-[#1E2A5A] dark:text-blue-300" />,
      judul: 'Sangat Hemat Sumber Daya',
      deskripsi:
        'Aplikasi dipaket 100% lokal tanpa dependensi CDN eksternal. Dapat dijalankan langsung dari satu laptop laptop guru dengan basis data SQLite yang ringan.',
    },
    {
      ikon: <Lock className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />,
      judul: 'Privasi Terjamin & Patuh UU PDP',
      deskripsi:
        'Nama panggilan siswa hanya disimpan sementara di memori server dan dihapus saat sesi berakhir. Materi dan papan tulis guru bersifat privat dan tidak dapat diakses admin.',
    },
    {
      ikon: <Smile className="w-8 h-8 text-purple-600 dark:text-purple-400" />,
      judul: 'Evaluasi Tanpa Rasa Cemas',
      deskripsi:
        'Kuis kompetisi berkelompok membuat evaluasi materi terasa seperti bermain game 17-an. Siswa belajar dari pembahasan kesalahan tanpa merasa dihakimi.',
    },
    {
      ikon: <Server className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
      judul: 'Bebas Ketergantungan Internet',
      deskripsi:
        'Saat internet sekolah lambat atau mati, permainan kuis dan papan tulis tetap dapat berjalan normal di jaringan WiFi lokal yang sama.',
    },
  ];

  return (
    <LayoutPublik>
      <div className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <Badge variant="hijau">Kelebihan Utama</Badge>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white font-['Baloo_2']">
              Dirancang Berakar dari Realitas Sekolah
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Menghadirkan teknologi edukasi yang benar-benar bisa diterapkan di berbagai kondisi ruang kelas di Indonesia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {kelebihanList.map((item, idx) => (
              <Card key={idx} padding="lg" hoverable className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 w-fit">
                  {item.ikon}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white font-['Baloo_2']">
                  {item.judul}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.deskripsi}
                </p>
              </Card>
            ))}
          </div>

          {/* Kotak Perbandingan */}
          <div className="mt-16 bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center gap-3 text-[#D7262E]">
              <ShieldAlert className="w-7 h-7" />
              <h2 className="text-2xl font-bold font-['Baloo_2'] text-slate-900 dark:text-white">
                Komitmen Kami Terhadap Privasi Murid
              </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Di Discere, kami memandang privasi data anak sebagai hal utama. Tidak ada pelacakan perilaku, tidak ada iklan, dan tidak ada database profil anak yang dapat bocor. Aplikasi ini mengutamakan keterlibatan murni dalam belajar dan kebersamaan di ruang kelas.
            </p>
            <div className="pt-2">
              <Link to="/privasi">
                <Button variant="sekunder" size="md">
                  Baca Kebijakan Privasi Lengkap <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </LayoutPublik>
  );
}
