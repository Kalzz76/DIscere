import { LayoutPublik } from './LayoutPublik';
import { Card, Badge } from '../../components';
import { ShieldCheck, UserX, Lock, EyeOff, Trash2 } from 'lucide-react';

export default function Privasi() {
  return (
    <LayoutPublik>
      <div className="py-12 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4">
            <Badge variant="hijau">Kebijakan Privasi & Perlindungan Data</Badge>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white font-['Baloo_2']">
              Transparansi dan Perlindungan Privasi Anda
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Discere menjunjung tinggi asas minimisasi data dan kepatuhan terhadap Undang-Undang Perlindungan Data Pribadi (UU PDP No. 27 Tahun 2022).
            </p>
          </div>

          <div className="space-y-6">
            {/* Bagian 1: Data yang Dicatat */}
            <Card padding="lg" className="space-y-3">
              <div className="flex items-center gap-3 text-[#D7262E]">
                <ShieldCheck className="w-6 h-6" />
                <h2 className="text-xl font-bold font-['Baloo_2'] text-slate-900 dark:text-white">
                  1. Informasi Apa yang Kami Catat?
                </h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Kami hanya mencatat data yang mutlak diperlukan untuk berjalannya fungsi aplikasi:
              </p>
              <ul className="text-sm text-slate-600 dark:text-slate-300 list-disc pl-5 space-y-1">
                <li>
                  <strong>Akun Guru:</strong> Nama lengkap, alamat email, kata sandi yang telah di-hash secara satu arah (bcrypt), serta nama sekolah (opsional).
                </li>
                <li>
                  <strong>Template & Soal:</strong> Judul materi pelajaran, teks pertanyaan, pilihan opsi, dan pembahasan yang dibuat oleh guru.
                </li>
                <li>
                  <strong>Papan Tulis:</strong> Data vektor goresan, bentuk, dan teks yang disimpan oleh guru di kanvas.
                </li>
                <li>
                  <strong>Hasil Sesi:</strong> Skor agregat akhir tim dan jumlah benar/salah pada masing-masing butir soal untuk keperluan refleksi pengajaran.
                </li>
              </ul>
            </Card>

            {/* Bagian 2: Siswa Tanpa Akun */}
            <Card padding="lg" className="space-y-3">
              <div className="flex items-center gap-3 text-[#F5B700]">
                <UserX className="w-6 h-6" />
                <h2 className="text-xl font-bold font-['Baloo_2'] text-slate-900 dark:text-white">
                  2. Siswa Bermain Tanpa Akun & Tanpa Jejak Pribadi
                </h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Siswa tidak pernah diminta untuk membuat akun, mengisi email, nomor telepon, atau data identitas pribadi lainnya.
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Nama panggilan yang dimasukkan siswa saat bergabung ke lobi permainan <strong>hanya disimpan sementara di memori kerja server</strong> selama sesi lomba berlangsung. Setelah sesi selesai atau ditutup, nama panggilan tersebut akan dihapus secara otomatis dan <strong>tidak pernah disimpan ke database</strong>.
              </p>
            </Card>

            {/* Bagian 3: Siapa yang Bisa Melihat? */}
            <Card padding="lg" className="space-y-3">
              <div className="flex items-center gap-3 text-[#1E2A5A] dark:text-blue-300">
                <EyeOff className="w-6 h-6" />
                <h2 className="text-xl font-bold font-['Baloo_2'] text-slate-900 dark:text-white">
                  3. Siapa yang Bisa Melihat Konten Anda?
                </h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Konten guru bersifat <strong>privat secara bawaan</strong>. Guru hanya dapat melihat data dan template miliknya sendiri.
              </p>
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <p className="font-semibold text-slate-900 dark:text-white">
                  Batasan Tegas Hak Akses Administrator:
                </p>
                <p>
                  Administrator platform bertugas mengelola kesehatan server dan akun, serta <strong>dilarang dan tidak memiliki akses</strong> untuk melihat isi papan tulis guru, template soal privat, maupun hasil evaluasi kelas milik guru.
                </p>
              </div>
            </Card>

            {/* Bagian 4: Keamanan & Enkripsi */}
            <Card padding="lg" className="space-y-3">
              <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                <Lock className="w-6 h-6" />
                <h2 className="text-xl font-bold font-['Baloo_2'] text-slate-900 dark:text-white">
                  4. Keamanan Sesi & Kunci Akses
                </h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Sesi autentikasi guru dikelola dengan token JWT yang disimpan di dalam cookie peramban dengan atribut <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs">httpOnly</code> dan <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs">SameSite=Lax</code> untuk mencegah serangan Cross-Site Scripting (XSS).
              </p>
            </Card>

            {/* Bagian 5: Hak Menghapus Akun */}
            <Card padding="lg" className="space-y-3">
              <div className="flex items-center gap-3 text-red-600">
                <Trash2 className="w-6 h-6" />
                <h2 className="text-xl font-bold font-['Baloo_2'] text-slate-900 dark:text-white">
                  5. Hak Pengguna & Penghapusan Akun
                </h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Bapak/Ibu guru berhak secara penuh atas data pribadinya. Anda dapat memperbarui profil atau meminta penghapusan akun kapan saja melalui menu Pengaturan di Dashboard Guru.
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Saat akun guru dihapus, sistem akan menghapus seluruh data yang terkait secara berantai (cascade delete), mencakup seluruh template, pertanyaan, papan tulis tersimpan, dan riwayat sesi tanpa menyisakan salinan di server.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </LayoutPublik>
  );
}
