import { Link } from 'react-router';
import { LayoutPublik } from './LayoutPublik';
import { Button, Card, Badge } from '../../components';
import {
  BookOpen,
  HelpCircle,
  ArrowRight,
  Tv,
  Wifi,
} from 'lucide-react';

export default function Dokumentasi() {
  const panduan = [
    {
      langkah: '1',
      judul: 'Mendaftar dan Masuk Akun Guru',
      deskripsi:
        'Kunjungi halaman pendaftaran di /daftar. Masukkan nama lengkap, email, kata sandi (minimal 8 karakter), dan nama sekolah. Setelah berhasil, Anda akan langsung diarahkan ke Dashboard Guru.',
      tips: 'Pastikan kata sandi Anda aman. Akun guru Anda adalah tempat semua template dan papan tulis tersimpan.',
    },
    {
      langkah: '2',
      judul: 'Membuat Template Soal (Manual atau AI)',
      deskripsi:
        'Buka menu "Template" lalu klik "Template Baru". Anda bisa memilih mode Solo atau Multiplayer. Masukkan soal dan 3 opsi jawaban beserta penjelasan, atau gunakan tombol "Buat Soal dengan AI" dengan menempelkan ringkasan materi pelajaran.',
      tips: 'Soal dari AI selalu bisa Anda sunting dan periksa kembali sebelum disimpan.',
    },
    {
      langkah: '3',
      judul: 'Mengajar di Papan Tulis Digital',
      deskripsi:
        'Buka menu "Papan Tulis" untuk memulai kanvas baru. Gunakan tool pena di panel kiri untuk menulis penjelasan. Jika ada soal latihan yang membutuhkan penyelesaian cepat, gunakan fitur "Tanya AI" dengan melingkari area soal di kanvas.',
      tips: 'Papan tulis Anda tersimpan otomatis setiap kali Anda selesai menggambar atau menulis.',
    },
    {
      langkah: '4',
      judul: 'Menjalankan Game Lomba Tarik Tambang',
      deskripsi:
        'Dari dalam papan tulis atau dashboard, pilih template lalu klik "Mulai Lomba". Jika memilih Mode Solo, proyeksikan layar ke depan kelas. Jika memilih Mode Multiplayer, tampilkan QR code dan token 6 angka agar siswa dapat bergabung dari HP masing-masing.',
      tips: 'Server akan otomatis membagi murid ke dalam Tim Merah dan Tim Putih secara seimbang.',
    },
    {
      langkah: '5',
      judul: 'Evaluasi & Refleksi Pembelajaran',
      deskripsi:
        'Setelah lomba selesai dan tim pemenang diumumkan, buka menu "Riwayat Sesi" untuk melihat butir soal mana yang paling banyak dijawab salah oleh siswa untuk dibahas bersama.',
      tips: 'Pembahasan soal yang paling sering salah menjadi momen terbaik untuk pemantapan materi.',
    },
  ];

  const faq = [
    {
      tanya: 'Bagaimana cara siswa membuka game jika menggunakan WiFi sekolah?',
      jawab:
        'Pastikan laptop guru dan smartphone siswa terhubung ke jaringan WiFi yang sama. Saat server dijalankan, layar host akan menampilkan alamat IP jaringan lokal (misalnya http://192.168.1.5:3000) dan QR code yang bisa langsung dipindai oleh kamera siswa.',
    },
    {
      tanya: 'Berapa banyak siswa yang bisa bermain bersamaan dalam satu sesi?',
      jawab:
        'Mode Multiplayer dirancang optimal untuk 1 kelas hingga 40 siswa dalam satu sesi permainan real-time.',
    },
    {
      tanya: 'Apakah kuota AI gratis?',
      jawab:
        'Ya. Setiap akun guru memiliki kuota harian pemanggilan AI (default 30 kali per hari) untuk membuat soal dan menjawab soal papan tulis.',
    },
    {
      tanya: 'Bisakah saya menggunakan template kuis yang sudah dibuat oleh guru lain?',
      jawab:
        'Bisa. Anda dapat membuka tab "Pustaka Resmi" di menu Template untuk menyalin template contoh resmi yang telah disediakan oleh pengelola platform.',
    },
  ];

  return (
    <LayoutPublik>
      <div className="py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-4">
            <Badge variant="biru">Panduan & Dokumentasi</Badge>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white font-['Baloo_2']">
              Panduan Praktis Penggunaan Discere
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Pelajari langkah demi langkah untuk mengoptimalkan pengalaman belajar mengajar di kelas Anda.
            </p>
          </div>

          {/* Langkah demi langkah */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold font-['Baloo_2'] text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#D7262E]" />
              Langkah Penggunaan di Kelas
            </h2>

            <div className="space-y-6">
              {panduan.map((p) => (
                <Card key={p.langkah} padding="lg" className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#D7262E] text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {p.langkah}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-['Baloo_2']">
                      {p.judul}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-11">
                    {p.deskripsi}
                  </p>
                  <div className="ml-11 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-300">
                    <strong>Tips Praktis:</strong> {p.tips}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Tips Mode Jaringan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card padding="md" className="space-y-3 border-l-4 border-l-[#D7262E]">
              <div className="flex items-center gap-2 text-[#D7262E]">
                <Tv className="w-5 h-5" />
                <h3 className="font-bold font-['Baloo_2']">Gunakan Mode Solo Jika:</h3>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                <li>Sekolah melarang siswa membawa ponsel pintar</li>
                <li>Jaringan WiFi tidak tersedia di ruang kelas</li>
                <li>Ingin interaksi fisik murid maju ke depan layar sentuh / proyektor</li>
              </ul>
            </Card>

            <Card padding="md" className="space-y-3 border-l-4 border-l-[#1E2A5A]">
              <div className="flex items-center gap-2 text-[#1E2A5A] dark:text-blue-300">
                <Wifi className="w-5 h-5" />
                <h3 className="font-bold font-['Baloo_2']">Gunakan Mode Multiplayer Jika:</h3>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-4">
                <li>Siswa membawa smartphone atau tablet di kelas</li>
                <li>Laptop guru dan HP siswa terhubung ke WiFi lokal yang sama</li>
                <li>Ingin partisipasi serempak dari seluruh siswa dalam 15 detik</li>
              </ul>
            </Card>
          </div>

          {/* FAQ */}
          <div className="space-y-6 pt-4">
            <h2 className="text-2xl font-bold font-['Baloo_2'] text-slate-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-[#F5B700]" />
              Pertanyaan & Pemecahan Masalah
            </h2>

            <div className="space-y-4">
              {faq.map((item, i) => (
                <Card key={i} padding="md" className="space-y-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {item.tanya}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {item.jawab}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center pt-8 border-t border-slate-200 dark:border-slate-800">
            <Link to="/daftar">
              <Button variant="utama" size="lg" icon={<ArrowRight className="w-5 h-5" />}>
                Mulai Buat Template Pertama Anda
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </LayoutPublik>
  );
}
