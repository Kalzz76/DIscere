import React, { useState, useEffect } from 'react';
import { useAuth, User } from '../lib/auth';
import { apiRequest } from '../lib/api';
import { Modal } from './Modal';
import {
  User as UserIcon,
  Shield,
  School,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  Trophy,
  PenTool,
  Cpu,
} from 'lucide-react';

interface ModalProfilProps {
  isOpen: boolean;
  onClose: () => void;
  stats?: {
    totalTemplate?: number;
    totalSesi?: number;
    totalPapan?: number;
    kuotaAiSisa?: number;
    totalGuru?: number;
    totalTemplateResmi?: number;
  };
}

export function ModalProfil({ isOpen, onClose, stats }: ModalProfilProps) {
  const { user, refreshUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'keamanan'>('info');

  // Form Profil state
  const [nama, setNama] = useState('');
  const [sekolah, setSekolah] = useState('');
  const [savingProfil, setSavingProfil] = useState(false);
  const [pesanProfil, setPesanProfil] = useState<{ tipe: 'sukses' | 'error'; teks: string } | null>(null);

  // Form Ganti Kata Sandi state
  const [sandiLama, setSandiLama] = useState('');
  const [sandiBaru, setSandiBaru] = useState('');
  const [konfirmasiSandi, setKonfirmasiSandi] = useState('');
  const [savingSandi, setSavingSandi] = useState(false);
  const [pesanSandi, setPesanSandi] = useState<{ tipe: 'sukses' | 'error'; teks: string } | null>(null);

  // Sinkronisasi data user saat modal terbuka
  useEffect(() => {
    if (user && isOpen) {
      setNama(user.nama || '');
      setSekolah(user.sekolah || '');
      setPesanProfil(null);
      setPesanSandi(null);
      setSandiLama('');
      setSandiBaru('');
      setKonfirmasiSandi('');
    }
  }, [user, isOpen]);

  const isAdmin = user?.role === 'admin';

  // Dapatkan inisial nama
  const getInitials = (name?: string) => {
    if (!name) return 'D';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Simpan perubahan profil
  const handleSimpanProfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesanProfil(null);

    if (nama.trim().length < 2) {
      setPesanProfil({ tipe: 'error', teks: 'Nama minimal terdiri dari 2 karakter.' });
      return;
    }

    setSavingProfil(true);
    try {
      await apiRequest<{ pesan: string; user: User }>('/auth/profil', {
        method: 'PUT',
        body: JSON.stringify({
          nama: nama.trim(),
          sekolah: isAdmin ? undefined : sekolah.trim(),
        }),
      });

      await refreshUser();
      setPesanProfil({ tipe: 'sukses', teks: 'Profil berhasil diperbarui.' });
    } catch (err: unknown) {
      const error = err as { pesan?: string };
      setPesanProfil({ tipe: 'error', teks: error.pesan || 'Gagal memperbarui profil.' });
    } finally {
      setSavingProfil(false);
    }
  };

  // Simpan perubahan kata sandi
  const handleSimpanKataSandi = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesanSandi(null);

    if (!sandiLama) {
      setPesanSandi({ tipe: 'error', teks: 'Kata sandi saat ini wajib diisi.' });
      return;
    }
    if (sandiBaru.length < 8) {
      setPesanSandi({ tipe: 'error', teks: 'Kata sandi baru minimal 8 karakter.' });
      return;
    }
    if (sandiBaru !== konfirmasiSandi) {
      setPesanSandi({ tipe: 'error', teks: 'Konfirmasi kata sandi baru tidak cocok.' });
      return;
    }

    setSavingSandi(true);
    try {
      const res = await apiRequest<{ pesan: string }>('/auth/kata-sandi', {
        method: 'PUT',
        body: JSON.stringify({
          kataSandiLama: sandiLama,
          kataSandiBaru: sandiBaru,
        }),
      });

      setPesanSandi({ tipe: 'sukses', teks: res.pesan || 'Kata sandi berhasil diperbarui.' });
      setSandiLama('');
      setSandiBaru('');
      setKonfirmasiSandi('');
    } catch (err: unknown) {
      const error = err as { pesan?: string };
      setPesanSandi({ tipe: 'error', teks: error.pesan || 'Gagal memperbarui kata sandi.' });
    } finally {
      setSavingSandi(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdmin ? 'Profil Administrator' : 'Profil Pengajar'}
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Header Profil (Avatar & Identitas Ringkas) */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#f2ebd9] border border-[#e5dcc7]">
          <div className="w-14 h-14 rounded-2xl bg-[#1f4a37] text-[#f4ecd8] flex items-center justify-center font-bold text-xl shadow-inner border border-[#163a2b] shrink-0">
            {isAdmin ? <Shield className="w-7 h-7 text-[#f2c230]" /> : getInitials(user?.nama)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-[#1d3b2e] text-lg truncate">
                {user?.nama || (isAdmin ? 'Administrator' : 'Guru Pengajar')}
              </h4>
              <span className={`portal-tag ${isAdmin ? 'blue' : 'yellow'} font-bold`}>
                {isAdmin ? 'Admin Platform' : 'Guru Aktif'}
              </span>
            </div>
            <p className="text-xs text-[#6b7d6c] truncate flex items-center gap-1 mt-0.5">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span>{user?.email}</span>
            </p>
            {!isAdmin && user?.sekolah && (
              <p className="text-xs text-[#6b7d6c] truncate flex items-center gap-1 mt-0.5">
                <School className="w-3.5 h-3.5 shrink-0" />
                <span>{user.sekolah}</span>
              </p>
            )}
          </div>
        </div>

        {/* Tab Switcher: Profil & Keamanan */}
        <div className="portal-seg w-full flex">
          <button
            type="button"
            className={`flex-1 text-center py-2 ${activeSubTab === 'info' ? 'on' : ''}`}
            onClick={() => setActiveSubTab('info')}
          >
            Informasi Akun
          </button>
          <button
            type="button"
            className={`flex-1 text-center py-2 ${activeSubTab === 'keamanan' ? 'on' : ''}`}
            onClick={() => setActiveSubTab('keamanan')}
          >
            Keamanan Sandi
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: INFORMASI AKUN & STATISTIK                         */}
        {/* ========================================================= */}
        {activeSubTab === 'info' && (
          <div className="space-y-4">
            {/* Form Ubah Profil */}
            <form onSubmit={handleSimpanProfil} className="space-y-3">
              {pesanProfil && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    pesanProfil.tipe === 'sukses'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {pesanProfil.tipe === 'sukses' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  )}
                  <span>{pesanProfil.teks}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#1d3b2e] uppercase tracking-wider mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#6b7d6c] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="portal-input pl-10"
                    placeholder="Nama lengkap Anda"
                    required
                  />
                </div>
              </div>

              {!isAdmin && (
                <div>
                  <label className="block text-xs font-bold text-[#1d3b2e] uppercase tracking-wider mb-1">
                    Sekolah / Instansi
                  </label>
                  <div className="relative">
                    <School className="w-4 h-4 text-[#6b7d6c] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={sekolah}
                      onChange={(e) => setSekolah(e.target.value)}
                      className="portal-input pl-10"
                      placeholder="Contoh: SD Negeri Merdeka 01"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#1d3b2e] uppercase tracking-wider mb-1">
                  Alamat Email (Identitas Login)
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="portal-input opacity-75 cursor-not-allowed bg-[#efe6d0]"
                  title="Alamat email tidak dapat diubah demi keamanan akun."
                />
                <span className="text-[11px] text-[#6b7d6c] mt-0.5 block">
                  Email digunakan sebagai identitas masuk permanen.
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfil}
                  className="portal-btn red sm"
                >
                  {savingProfil ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan</span>
                  )}
                </button>
              </div>
            </form>

            {/* Ringkasan Statistik / Tanggung Jawab */}
            <div className="pt-3 border-t border-[#e0d5b8]">
              <span className="text-xs font-bold text-[#1d3b2e] uppercase tracking-wider block mb-2">
                {isAdmin ? 'Ringkasan Tanggung Jawab Platform' : 'Ringkasan Aktivitas Mengajar'}
              </span>

              {isAdmin ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl bg-[#f2ebd9] border border-[#e5dcc7] text-center">
                    <BookOpen className="w-4 h-4 mx-auto text-[#1d3b2e] mb-1" />
                    <b className="block text-lg text-[#1d3b2e]">{stats?.totalTemplateResmi ?? '-'}</b>
                    <span className="text-[10px] text-[#6b7d6c] font-bold">Pustaka Resmi</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f2ebd9] border border-[#e5dcc7] text-center">
                    <UserIcon className="w-4 h-4 mx-auto text-[#1d3b2e] mb-1" />
                    <b className="block text-lg text-[#1d3b2e]">{stats?.totalGuru ?? '-'}</b>
                    <span className="text-[10px] text-[#6b7d6c] font-bold">Guru Dikelola</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#f2ebd9] border border-[#e5dcc7] text-center">
                    <Shield className="w-4 h-4 mx-auto text-[#1d3b2e] mb-1" />
                    <b className="block text-lg text-emerald-700">Terisolasi</b>
                    <span className="text-[10px] text-[#6b7d6c] font-bold">Privasi Dijamin</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-[#f2ebd9] border border-[#e5dcc7] text-center">
                    <BookOpen className="w-4 h-4 mx-auto text-[#1d3b2e] mb-1" />
                    <b className="block text-base text-[#1d3b2e]">{stats?.totalTemplate ?? 0}</b>
                    <span className="text-[10px] text-[#6b7d6c] font-bold">Kuis</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#f2ebd9] border border-[#e5dcc7] text-center">
                    <Trophy className="w-4 h-4 mx-auto text-[#1d3b2e] mb-1" />
                    <b className="block text-base text-[#1d3b2e]">{stats?.totalSesi ?? 0}</b>
                    <span className="text-[10px] text-[#6b7d6c] font-bold">Sesi Game</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#f2ebd9] border border-[#e5dcc7] text-center">
                    <PenTool className="w-4 h-4 mx-auto text-[#1d3b2e] mb-1" />
                    <b className="block text-base text-[#1d3b2e]">{stats?.totalPapan ?? 0}</b>
                    <span className="text-[10px] text-[#6b7d6c] font-bold">Papan</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#f2ebd9] border border-[#e5dcc7] text-center">
                    <Cpu className="w-4 h-4 mx-auto text-[#1d3b2e] mb-1" />
                    <b className="block text-base text-[#c8362f]">{stats?.kuotaAiSisa ?? 30}/30</b>
                    <span className="text-[10px] text-[#6b7d6c] font-bold">Sisa AI</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: KEAMANAN KATA SANDI                                */}
        {/* ========================================================= */}
        {activeSubTab === 'keamanan' && (
          <form onSubmit={handleSimpanKataSandi} className="space-y-3">
            {pesanSandi && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  pesanSandi.tipe === 'sukses'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {pesanSandi.tipe === 'sukses' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span>{pesanSandi.teks}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#1d3b2e] uppercase tracking-wider mb-1">
                Kata Sandi Saat Ini
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#6b7d6c] absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={sandiLama}
                  onChange={(e) => setSandiLama(e.target.value)}
                  className="portal-input pl-10"
                  placeholder="Masukkan kata sandi saat ini"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1d3b2e] uppercase tracking-wider mb-1">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#6b7d6c] absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={sandiBaru}
                  onChange={(e) => setSandiBaru(e.target.value)}
                  className="portal-input pl-10"
                  placeholder="Minimal 8 karakter"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1d3b2e] uppercase tracking-wider mb-1">
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#6b7d6c] absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={konfirmasiSandi}
                  onChange={(e) => setKonfirmasiSandi(e.target.value)}
                  className="portal-input pl-10"
                  placeholder="Ulangi kata sandi baru"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingSandi}
                className="portal-btn red sm"
              >
                {savingSandi ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Perbarui Kata Sandi</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
