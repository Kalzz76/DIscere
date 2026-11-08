import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { z } from 'zod';
import { LayoutPublik } from './LayoutPublik';
import { Button, Card, Input, useToast } from '../../components';
import { useAuth } from '../../lib/auth';
import { ApiError } from '../../lib/api';
import { LogIn, Eye, EyeOff, AlertCircle, KeyRound } from 'lucide-react';

const masukFormSchema = z.object({
  email: z.string().email('Format email tidak valid.'),
  kataSandi: z.string().min(1, 'Kata sandi wajib diisi.'),
});

export default function Masuk() {
  const { masuk, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { tampilToast } = useToast();

  const [email, setEmail] = useState('');
  const [kataSandi, setKataSandi] = useState('');
  const [lihatKataSandi, setLihatKataSandi] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Jika sudah login, langsung arahkan ke tujuannya atau dashboard
  React.useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname;
      const target = from || (user.role === 'admin' ? '/admin' : '/guru');
      navigate(target, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    setErrors({});

    const validasi = masukFormSchema.safeParse({ email, kataSandi });
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
      const loggedUser = await masuk({ email, kataSandi });
      tampilToast(`Selamat datang kembali, ${loggedUser.nama}!`, 'sukses');
      const target = loggedUser.role === 'admin' ? '/admin' : '/guru';
      navigate(target, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.pesan);
      } else {
        setServerError('Gagal masuk. Silakan periksa koneksi Anda dan coba lagi.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isiAkunDemo = (peran: 'guru' | 'admin') => {
    if (peran === 'guru') {
      setEmail('guru@discere.local');
      setKataSandi('GuruDiscere2026!');
    } else {
      setEmail('admin@discere.local');
      setKataSandi('AdminDiscere2026!');
    }
    setErrors({});
    setServerError('');
  };

  return (
    <LayoutPublik>
      <div className="py-12 md:py-20 flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-['Baloo_2']">
              Masuk ke Discere
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Akses materi pelajaran, kuis interaktif, dan papan tulis kelas Anda.
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
                  placeholder="Masukkan kata sandi"
                  value={kataSandi}
                  onChange={(e) => setKataSandi(e.target.value)}
                  error={errors.kataSandi}
                  required
                  autoComplete="current-password"
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

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="utama"
                  size="md"
                  loading={isSubmitting}
                  icon={<LogIn className="w-4 h-4" />}
                  className="w-full font-bold"
                >
                  Masuk Sekarang
                </Button>
              </div>
            </form>

            {/* Bantuan Akun Uji Coba */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                <KeyRound className="w-3.5 h-3.5" />
                Gunakan Akun Uji Coba (Seed):
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => isiAkunDemo('guru')}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 text-left transition-colors"
                >
                  <p className="font-bold text-[#D7262E]">Guru Demo</p>
                  <p className="text-[11px] text-slate-500">guru@discere.local</p>
                </button>
                <button
                  type="button"
                  onClick={() => isiAkunDemo('admin')}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 text-left transition-colors"
                >
                  <p className="font-bold text-[#1E2A5A] dark:text-blue-300">Admin</p>
                  <p className="text-[11px] text-slate-500">admin@discere.local</p>
                </button>
              </div>
            </div>

            <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
              Belum memiliki akun?{' '}
              <Link
                to="/daftar"
                className="font-bold text-[#D7262E] hover:underline transition-colors"
              >
                Daftar gratis di sini
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </LayoutPublik>
  );
}
