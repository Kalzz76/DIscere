import { Link } from 'react-router';
import { LayoutPublik } from './LayoutPublik';
import { Button, Card, Badge } from '../../components';
import {
  Sparkles,
  ArrowRight,
  Presentation,
  Trophy,
  Users,
  Smartphone,
  ShieldCheck,
  Zap,
  HelpCircle,
  CheckCircle,
  Lightbulb,
  Compass,
} from 'lucide-react';

export default function Landing() {
  return (
    <LayoutPublik>
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <Badge variant="merah" size="md">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#D7262E]" />
                Smart & Fun Education untuk Kelas Indonesia
              </span>
            </Badge>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight font-['Baloo_2']">
              Belajar Seru, Tarik Kemenangan Bersama!
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed">
              Satu tempat untuk menjelaskan materi lewat <strong>papan tulis digital tak terbatas</strong>, lalu menguji pemahaman kelas lewat <strong>game lomba tarik tambang</strong> yang seru dan mendebarkan.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Link to="/daftar" className="w-full sm:w-auto">
                <Button variant="utama" size="lg" className="w-full text-base sm:text-lg shadow-lg">
                  Daftar Gratis Sekarang <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
              <Link to="/masuk" className="w-full sm:w-auto">
                <Button variant="sekunder" size="lg" className="w-full text-base sm:text-lg">
                  Masuk ke Akun Guru
                </Button>
              </Link>
            </div>
          </div>

          {/* Ilustrasi Animasi Tarik Tambang Asli (SVG buatan sendiri) */}
          <div className="mt-14 max-w-4xl mx-auto">
            <div className="bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-slate-900/60 p-6 sm:p-10 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl relative overflow-hidden">
              <div className="text-center mb-6">
                <span className="text-xs uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500">
                  Simulasi Lomba Tarik Tambang Kelas
                </span>
              </div>

              {/* Lapangan Lomba */}
              <div className="relative py-8 flex flex-col items-center">
                {/* Garis Tengah Lapangan */}
                <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 border-r-2 border-dashed border-slate-300 dark:border-slate-700 pointer-events-none" />

                <div className="w-full flex items-center justify-between z-10 px-2 sm:px-6">
                  {/* Tim Merah */}
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#D7262E] text-white flex flex-col items-center justify-center shadow-md">
                      <span className="text-xs font-semibold">TIM</span>
                      <span className="font-extrabold text-base sm:text-lg">MERAH</span>
                    </div>
                    <div className="hidden sm:block text-left">
                      <span className="text-xs font-bold text-[#D7262E] uppercase">Grup Kiri</span>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">5 Jawaban Benar</p>
                    </div>
                  </div>

                  {/* Tali & Bendera */}
                  <div className="flex-1 mx-3 sm:mx-8 relative flex items-center justify-center">
                    {/* Tali Tambang */}
                    <div className="w-full h-3.5 bg-amber-700 rounded-full shadow-inner border border-amber-900/40 relative">
                      {/* Pola Tali */}
                      <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(45deg,#000_0px,#000_2px,transparent_2px,transparent_6px)]" />
                      
                      {/* Bendera Merah Putih di Tengah Tali */}
                      <div className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center animate-bounce">
                        <div className="w-5 h-4 shadow-sm border border-slate-300 overflow-hidden rounded-xs flex flex-col">
                          <div className="h-2 w-full bg-[#D7262E]" />
                          <div className="h-2 w-full bg-white" />
                        </div>
                        <div className="w-0.5 h-3 bg-slate-600" />
                      </div>
                    </div>
                  </div>

                  {/* Tim Putih */}
                  <div className="flex items-center gap-3 flex-row-reverse text-right">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#1E2A5A] text-white flex flex-col items-center justify-center shadow-md">
                      <span className="text-xs font-semibold">TIM</span>
                      <span className="font-extrabold text-base sm:text-lg">PUTIH</span>
                    </div>
                    <div className="hidden sm:block text-right">
                      <span className="text-xs font-bold text-[#1E2A5A] dark:text-blue-300 uppercase">Grup Kanan</span>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">4 Jawaban Benar</p>
                    </div>
                  </div>
                </div>

                {/* Indikator Skor */}
                <div className="mt-8 flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#D7262E]" />
                    Setiap jawaban benar menarik 1 langkah
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400" />
                    Menang saat mencapai batas akhir
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. MASALAH SECTION */}
      <section className="py-16 md:py-24 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-['Baloo_2']">
              Tantangan Nyata di Kelas Kita
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Guru sering kesulitan menjaga antusiasme siswa karena keterbatasan alat dan situasi sekolah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card padding="lg" hoverable className="border-t-4 border-t-[#D7262E]">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-[#D7262E] flex items-center justify-center mb-5">
                <Presentation className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 font-['Baloo_2']">Kelas Menjemukan</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                Ceramah panjang satu arah membuat perhatian siswa SD dan SMP mudah buyar setelah 15 menit pertama.
              </p>
            </Card>

            <Card padding="lg" hoverable className="border-t-4 border-t-[#F5B700]">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 flex items-center justify-center mb-5">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 font-['Baloo_2']">Keterbatasan HP Siswa</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                Banyak sekolah melarang membawa gawai, sinyal internet tidak merata, atau tidak semua murid memiliki perangkat pribadi.
              </p>
            </Card>

            <Card padding="lg" hoverable className="border-t-4 border-t-[#1E2A5A]">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-[#1E2A5A] dark:text-blue-300 flex items-center justify-center mb-5">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2 font-['Baloo_2']">Aplikasi Terpisah-pisah</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                Guru harus repot berganti aplikasi antara software papan tulis, slide presentasi, dan platform kuis online yang rumit.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. CARA KERJA (3 LANGKAH) */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <Badge variant="biru">Alur Praktis</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-['Baloo_2']">
              Tiga Langkah Mudah Mengajar Interaktif
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Cukup dalam hitungan menit dari persiapan materi hingga lomba kelas dimulai.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Langkah 1 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#D7262E] text-white flex items-center justify-center text-2xl font-black shadow-lg">
                1
              </div>
              <h3 className="text-xl font-bold font-['Baloo_2']">Siapkan Template Soal</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs">
                Ketik soal sendiri atau salin materi pelajaran agar <strong>AI menyusun soal pilihan ganda</strong> lengkap dengan pembahasannya.
              </p>
            </div>

            {/* Langkah 2 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#F5B700] text-slate-900 flex items-center justify-center text-2xl font-black shadow-lg">
                2
              </div>
              <h3 className="text-xl font-bold font-['Baloo_2']">Jelaskan di Papan Tulis</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs">
                Buka kanvas digital tanpa batas untuk menulis rumus, menggambar diagram, dan melingkari soal dengan bantuan AI.
              </p>
            </div>

            {/* Langkah 3 */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[#1E2A5A] text-white flex items-center justify-center text-2xl font-black shadow-lg">
                3
              </div>
              <h3 className="text-xl font-bold font-['Baloo_2']">Mulai Lomba Tarik Tambang</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs">
                Pilih Mode Solo (1 layar guru tanpa HP) atau Multiplayer (HP masing-masing). Jawaban benar menarik tali menuju kemenangan!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FITUR UTAMA */}
      <section className="py-16 md:py-24 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-['Baloo_2']">
              Fitur Lengkap yang Dirancang untuk Guru
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Teknologi canggih namun tetap sederhana dan ramah bagi perangkat sekolah.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card padding="md" hoverable className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-[#D7262E] flex items-center justify-center">
                <Presentation className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-['Baloo_2']">Papan Tulis Tak Terbatas</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Kanvas bebas dengan pan & zoom, gambar 3 pena, bentuk geometri, teks, laser pointer, dan simpan otomatis.
              </p>
            </Card>

            <Card padding="md" hoverable className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-['Baloo_2']">Asisten AI Guru</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Buat soal otomatis dari tempelan teks materi dan fitur Tanya AI untuk menjawab soal yang dilingkari langsung di papan.
              </p>
            </Card>

            <Card padding="md" hoverable className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-[#1E2A5A] dark:text-blue-300 flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-['Baloo_2']">Game Lomba 17-an</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Lomba tarik tambang interaktif bernuansa perayaan kemerdekaan yang membangkitkan kekompakan tim kelas.
              </p>
            </Card>

            <Card padding="md" hoverable className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-['Baloo_2']">Dua Mode Main Fleksibel</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Pilihan Mode Solo jika sekolah tidak mengizinkan HP, atau Mode Multiplayer realtime jika siswa membawa HP.
              </p>
            </Card>

            <Card padding="md" hoverable className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-['Baloo_2']">Kolaborasi Tautan Papan</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Bagikan papan tulis kepada murid dengan izin Viewer atau Editor hanya melalui satu klik tautan.
              </p>
            </Card>

            <Card padding="md" hoverable className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-['Baloo_2']">Analisis Soal Tersulit</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Riwayat sesi mencatat soal mana yang paling banyak dijawab salah agar guru dapat mengulang materi tersebut.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 5. KELEBIHAN PLATFORM */}
      <section className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge variant="hijau">Solusi Cerdas</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-['Baloo_2']">
                Mengapa Memilih Discere untuk Kelas Anda?
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Dirancang khusus untuk realitas pendidikan Indonesia dengan prioritas kemudahan dan tanpa hambatan teknis.
              </p>

              <div className="space-y-4">
                {[
                  {
                    judul: 'Siswa Bergabung Tanpa Akun',
                    desk: 'Tidak perlu email atau password rumit bagi anak. Cukup masukkan 6 digit token dan nama panggilan.',
                  },
                  {
                    judul: 'Bisa Berjalan di Kelas Tanpa HP',
                    desk: 'Mode Solo menampilkan soal di layar proyektor atau TV pintar, perwakilan murid maju menyentuh jawaban.',
                  },
                  {
                    judul: 'Ringan & Jalan di Localhost',
                    desk: 'Tidak membutuhkan server mahal. Seluruh aplikasi dapat dijalankan langsung di laptop guru lewat jaringan WiFi lokal.',
                  },
                  {
                    judul: 'Privasi Data Anak Terjamin',
                    desk: 'Nama panggilan siswa hanya berada di memori sesi aktif dan tidak disimpan permanen ke database.',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{item.judul}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{item.desk}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-100 dark:bg-slate-800/60 p-8 sm:p-10 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-[#D7262E]" />
                <h3 className="text-2xl font-bold font-['Baloo_2']">Standar Keamanan Ketat</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Discere mematuhi prinsip minimisasi data pribadi (UU PDP No. 27 Tahun 2022). Admin platform tidak memiliki akses membuka materi atau isi papan tulis pribadi milik bapak/ibu guru.
              </p>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <Link to="/kelebihan">
                  <Button variant="sekunder" size="md" className="w-full">
                    Pelajari Seluruh Keunggulan <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. DOKUMENTASI RINGKAS & FAQ */}
      <section className="py-16 md:py-24 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-['Baloo_2']">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Jawaban cepat untuk pertanyaan seputar penggunaan Discere di ruang kelas.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'Apakah Discere membutuhkan koneksi internet yang kencang?',
                a: 'Tidak. Discere dirancang agar seluruh aset berjalan secara lokal. Mode Solo dan lomba multiplayer di jaringan WiFi lokal dapat berjalan tanpa kuota internet kencang. Hanya pembuatan soal berbasis AI yang memerlukan akses internet.',
              },
              {
                q: 'Bagaimana jika murid di kelas saya tidak membawa smartphone?',
                a: 'Gunakan Mode Solo. Dalam mode ini, layar soal ditampilkan di laptop guru yang tersambung ke proyektor. Murid perwakilan tim cukup maju bergantian untuk menyentuh pilihan jawaban.',
              },
              {
                q: 'Apakah saya bisa membuat soal matematika dengan rumus?',
                a: 'Tentu. Anda dapat mengetik soal secara manual lengkap dengan 3 opsi jawaban dan pembahasan, atau menuliskan materi dasar di papan tulis lalu meminta bantuan AI untuk merumuskan soal kuis.',
              },
              {
                q: 'Apakah akun guru dipungut biaya langganan?',
                a: 'Discere merupakan karya open source untuk kompetisi LOGICODIX 2026 dan gratis digunakan oleh seluruh guru di Indonesia.',
              },
            ].map((faq, i) => (
              <Card key={i} padding="md" className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-[#D7262E] shrink-0" />
                  {faq.q}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 pl-7 leading-relaxed">{faq.a}</p>
              </Card>
            ))}
          </div>

          <div className="text-center pt-4">
            <Link to="/dokumentasi">
              <Button variant="hantu" size="md">
                Buka Panduan Lengkap Guru <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. CALL TO ACTION (CTA) */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-red-600 to-[#D7262E] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-sm mb-2">
            <Lightbulb className="w-7 h-7 text-[#F5B700]" />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-['Baloo_2']">
            Jadikan Kelas Anda Lebih Hidup Hari Ini!
          </h2>
          <p className="text-lg text-red-100 max-w-2xl mx-auto">
            Bergabunglah dengan Discere dan rasakan keceriaan belajar interaktif bersama siswa Anda.
          </p>
          <div className="pt-2">
            <Link to="/daftar">
              <Button
                variant="ai"
                size="lg"
                className="text-slate-900 shadow-xl font-bold text-lg px-8 hover:scale-105"
              >
                Mulai Mengajar Gratis Sekarang
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </LayoutPublik>
  );
}
