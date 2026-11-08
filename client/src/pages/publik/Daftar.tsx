import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';
import { LayoutPublik } from './LayoutPublik';
import { Button, Card, Input, useToast } from '../../components';
import { useAuth } from '../../lib/auth';
import { ApiError } from '../../lib/api';
import { UserPlus, Eye, EyeOff, AlertCircle } from 'lucide-react';

const daftarFormSchema = z.object({
  nama: z.string().min(2, 'Nama lengkap minimal 2 karakter.'),
  email: z.string().email('Format email tidak valid.'),
  kataSandi: z.string().min(8, 'Kata sandi minimal 8 karakter.'),
  sekolah: z.string().optional(),
});

export default function Daftar() {
  const { daftar, user } = useAuth();
  const navigate = useNavigate();
  const { tampilToast } = useToast();

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [kataSandi, setKataSandi] = useState('');
  const [sekolah, setSekolah] = useState('');
  const [lihatKataSandi, setLihatKataSandi] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Jika sudah login, langsung arahkan
  React.useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/guru', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    setErrors({});

    const validasi = daftarFormSchema.safeParse({ nama, email, kataSandi, sekolah });
    if (!validasi.success) {
      const fieldErrors: Record<string, string> = {};
      validasi.error.issues.forEach((err) => {
        const path = err.path[0] as string;
        if (!fieldErrors[path]) {
          fieldErrors[path] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await daftar({
        nama,
        email,
        kataSandi,
        sekolah: sekolah.trim() || undefined,
      });
      tampilToast('Pendaftaran berhasil! Selamat datang di Discere.', 'sukses');
      navigate('/guru', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.pesan);
      } else {
        setServerError('Gagal mendaftar. Silakan periksa koneksi Anda dan coba lagi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LayoutPublik>
      <div className="py-12 md:py-20 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-['Baloo_2']">
              Daftar Akun Guru
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Buat template kuis cerdas dan mulai lomba interaktif di kelas Anda.
            </p>
          </div>

          <Card padding="lg" className="border-t-4 border-t-[#D7262E]">
            {serverError && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-800 dark:text-red-200 font-medium"
              >
                <AlertCircle className="w-4 h-4 text-[#D7262E] shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Input
                label="Nama Lengkap"
                id="nama"
                type="text"
                placeholder="Contoh: Ibu Siti Rahmawati, S.Pd."
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                error={errors.nama}
                required
                autoComplete="name"
              />

              <Input
                label="Alamat Email"
                id="email"
                type="email"
                placeholder="nama@sekolah.sch.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                required
                autoComplete="email"
              />

              <div className="relative">
                <Input
                  label="Kata Sandi"
                  id="kataSandi"
                  type={lihatKataSandi ? 'text' : 'password'}
                  placeholder="Minimal 8 karakter"
                  value={kataSandi}
                  onChange={(e) => setKataSandi(e.target.value)}
                  error={errors.kataSandi}
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  aria-label={lihatKataSandi ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  onClick={() => setLihatKataSandi(!lihatKataSandi)}
                  className="absolute right-3.5 top-[38px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
                >
                  {lihatKataSandi ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              <Input
                label="Nama Sekolah (Opsional)"
                id="sekolah"
                type="text"
                placeholder="Contoh: SDN Merdeka 01"
                value={sekolah}
                onChange={(e) => setSekolah(e.target.value)}
                error={errors.sekolah}
                autoComplete="organization"
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="utama"
                  size="md"
                  loading={isSubmitting}
                  icon={<UserPlus className="w-4 h-4" />}
                  className="w-full font-bold"
                >
                  Daftar Sekarang
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
              Sudah memiliki akun?{' '}
              <Link
                to="/masuk"
                className="font-bold text-[#D7262E] hover:underline transition-colors"
              >
                Masuk di sini
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </LayoutPublik>
  );
}
