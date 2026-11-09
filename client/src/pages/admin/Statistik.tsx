import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { apiRequest } from '../../lib/api';
import { Button, Card, Modal } from '../../components';
import {
  ShieldCheck,
  LogOut,
  BarChart3,
  Users,
  BookOpen,
  Sparkles,
  History,
  Search,
  CheckCircle2,
  XCircle,
  KeyRound,
  Trash2,
  Plus,
  Edit2,
  AlertTriangle,
  Loader2,
  Shield,
  Calendar,
  Gamepad2,
  Info,
} from 'lucide-react';
import { useNavigate } from 'react-router';

type AdminTab = 'statistik' | 'guru' | 'pustaka' | 'ai' | 'log';

export default function DashboardAdmin() {
  const { user, keluar } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('statistik');
  const [loading, setLoading] = useState(false);
  const [errorPesan, setErrorPesan] = useState<string | null>(null);
  const [suksesPesan, setSuksesPesan] = useState<string | null>(null);

  // 1. Data Statistik
  const [statistik, setStatistik] = useState<any>(null);

  // 2. Data Guru
  const [daftarGuru, setDaftarGuru] = useState<any[]>([]);
  const [searchGuru, setSearchGuru] = useState('');
  const [selectedGuru, setSelectedGuru] = useState<any>(null);
  const [modalResetPassOpen, setModalResetPassOpen] = useState(false);
  const [resetPassResult, setResetPassResult] = useState<string | null>(null);
  const [modalHapusGuruOpen, setModalHapusGuruOpen] = useState(false);
  const [submittingGuru, setSubmittingGuru] = useState(false);

  // 3. Data Pustaka Template Resmi
  const [daftarPustaka, setDaftarPustaka] = useState<any[]>([]);
  const [modalTemplateOpen, setModalTemplateOpen] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [templateJudul, setTemplateJudul] = useState('');
  const [templateGame, setTemplateGame] = useState('tarik_tambang');
  const [templateMode, setTemplateMode] = useState<'solo' | 'multi'>('solo');
  const [templateSoal, setTemplateSoal] = useState<
    Array<{
      urutan: number;
      teks: string;
      opsiA: string;
      opsiB: string;
      opsiC: string;
      jawabanBenar: 'A' | 'B' | 'C';
      penjelasan: string;
    }>
  >([
    {
      urutan: 1,
      teks: '',
      opsiA: '',
      opsiB: '',
      opsiC: '',
      jawabanBenar: 'A',
      penjelasan: '',
    },
  ]);
  const [submittingTemplate, setSubmittingTemplate] = useState(false);
  const [modalHapusTemplateOpen, setModalHapusTemplateOpen] = useState(false);
  const [targetHapusTemplate, setTargetHapusTemplate] = useState<any>(null);

  // 4. Data Monitoring AI
  const [aiData, setAiData] = useState<any>(null);

  // 5. Data Audit Log Admin
  const [adminLogs, setAdminLogs] = useState<any[]>([]);

  const handleKeluar = async () => {
    await keluar();
    navigate('/masuk');
  };

  // Muat data sesuai tab aktif
  useEffect(() => {
    async function loadTabData() {
      setLoading(true);
      setErrorPesan(null);
      try {
        if (activeTab === 'statistik') {
          const res = await apiRequest<{ statistik: any }>('/admin/statistik');
          setStatistik(res.statistik);
        } else if (activeTab === 'guru') {
          const res = await apiRequest<{ guru: any[] }>(`/admin/guru?q=${encodeURIComponent(searchGuru)}`);
          setDaftarGuru(res.guru);
        } else if (activeTab === 'pustaka') {
          const res = await apiRequest<{ templates: any[] }>('/admin/pustaka');
          setDaftarPustaka(res.templates);
        } else if (activeTab === 'ai') {
          const res = await apiRequest<{ aiMonitoring: any }>('/admin/ai');
          setAiData(res.aiMonitoring);
        } else if (activeTab === 'log') {
          const res = await apiRequest<{ logs: any[] }>('/admin/log');
          setAdminLogs(res.logs);
        }
      } catch (err: any) {
        setErrorPesan(err.pesan || 'Gagal memuat data administrator.');
      } finally {
        setLoading(false);
      }
    }

    loadTabData();
  }, [activeTab]);

  // Pencarian guru saat user menekan enter atau submit
  const handleCariGuru = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await apiRequest<{ guru: any[] }>(`/admin/guru?q=${encodeURIComponent(searchGuru)}`);
      setDaftarGuru(res.guru);
    } catch (err: any) {
      setErrorPesan(err.pesan || 'Gagal mencari guru.');
    } finally {
      setLoading(false);
    }
  };

  // Aksi Ubah Status Guru (Aktif / Nonaktif)
  const handleToggleStatusGuru = async (guru: any) => {
    const statusBaru = guru.status === 'aktif' ? 'nonaktif' : 'aktif';
    try {
      setSubmittingGuru(true);
      await apiRequest(`/admin/guru/${guru.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: statusBaru }),
      });
      setDaftarGuru((prev) =>
        prev.map((g) => (g.id === guru.id ? { ...g, status: statusBaru } : g))
      );
      setSuksesPesan(`Status akun ${guru.nama} berhasil diubah menjadi ${statusBaru}.`);
      setTimeout(() => setSuksesPesan(null), 3000);
    } catch (err: any) {
      setErrorPesan(err.pesan || 'Gagal mengubah status akun guru.');
    } finally {
      setSubmittingGuru(false);
    }
  };

  // Aksi Reset Password Guru
  const handleResetPasswordGuru = async () => {
    if (!selectedGuru) return;
    try {
      setSubmittingGuru(true);
      const res = await apiRequest<{ passwordBaru: string }>(`/admin/guru/${selectedGuru.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ resetPassword: true }),
      });
      setResetPassResult(res.passwordBaru);
      setSuksesPesan(`Kata sandi akun ${selectedGuru.nama} berhasil direset.`);
    } catch (err: any) {
      setErrorPesan(err.pesan || 'Gagal mereset kata sandi.');
    } finally {
      setSubmittingGuru(false);
    }
  };

  // Aksi Hapus Guru
  const handleHapusGuru = async () => {
    if (!selectedGuru) return;
    try {
      setSubmittingGuru(true);
      await apiRequest(`/admin/guru/${selectedGuru.id}`, {
        method: 'DELETE',
      });
      setDaftarGuru((prev) => prev.filter((g) => g.id !== selectedGuru.id));
      setModalHapusGuruOpen(false);
      setSelectedGuru(null);
      setSuksesPesan(`Akun guru beserta seluruh datanya berhasil dihapus permanen.`);
      setTimeout(() => setSuksesPesan(null), 3000);
    } catch (err: any) {
      setErrorPesan(err.pesan || 'Gagal menghapus akun guru.');
    } finally {
      setSubmittingGuru(false);
    }
  };

  // Buka Modal Buat Template Resmi
  const handleBukaModalTemplateBaru = () => {
    setEditTemplateId(null);
    setTemplateJudul('');
    setTemplateGame('tarik_tambang');
    setTemplateMode('solo');
    setTemplateSoal([
      {
        urutan: 1,
        teks: '',
        opsiA: '',
        opsiB: '',
        opsiC: '',
        jawabanBenar: 'A',
        penjelasan: '',
      },
    ]);
    setModalTemplateOpen(true);
  };

  // Buka Modal Edit Template Resmi
  const handleBukaModalEditTemplate = (tmpl: any) => {
    setEditTemplateId(tmpl.id);
    setTemplateJudul(tmpl.judul);
    setTemplateGame(tmpl.game || 'tarik_tambang');
    setTemplateMode(tmpl.mode || 'solo');
    if (tmpl.questions && tmpl.questions.length > 0) {
      setTemplateSoal(
        tmpl.questions.map((q: any, idx: number) => ({
          urutan: q.urutan || idx + 1,
          teks: q.teks,
          opsiA: q.opsiA,
          opsiB: q.opsiB,
          opsiC: q.opsiC,
          jawabanBenar: q.jawabanBenar,
          penjelasan: q.penjelasan || '',
        }))
      );
    } else {
      setTemplateSoal([
        {
          urutan: 1,
          teks: '',
          opsiA: '',
          opsiB: '',
          opsiC: '',
          jawabanBenar: 'A',
          penjelasan: '',
        },
      ]);
    }
    setModalTemplateOpen(true);
  };

  // Simpan Template Resmi
  const handleSimpanTemplateResmi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateJudul.trim()) {
      alert('Judul template resmi wajib diisi.');
      return;
    }

    try {
      setSubmittingTemplate(true);
      const payload = {
        judul: templateJudul.trim(),
        game: templateGame,
        mode: templateMode,
        questions: templateSoal.map((q, idx) => ({
          urutan: idx + 1,
          teks: q.teks.trim(),
          opsiA: q.opsiA.trim(),
          opsiB: q.opsiB.trim(),
          opsiC: q.opsiC.trim(),
          jawabanBenar: q.jawabanBenar,
          penjelasan: q.penjelasan.trim() || null,
        })),
      };

      if (editTemplateId) {
        await apiRequest(`/admin/pustaka/${editTemplateId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSuksesPesan('Template resmi berhasil diperbarui.');
      } else {
        await apiRequest('/admin/pustaka', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setSuksesPesan('Template resmi baru berhasil dibuat.');
      }

      setModalTemplateOpen(false);
      // Muat ulang daftar pustaka
      const res = await apiRequest<{ templates: any[] }>('/admin/pustaka');
      setDaftarPustaka(res.templates);
      setTimeout(() => setSuksesPesan(null), 3000);
    } catch (err: any) {
      alert(err.pesan || 'Gagal menyimpan template resmi.');
    } finally {
      setSubmittingTemplate(false);
    }
  };

  // Hapus Template Resmi
  const handleHapusTemplateResmi = async () => {
    if (!targetHapusTemplate) return;
    try {
      setSubmittingTemplate(true);
      await apiRequest(`/admin/pustaka/${targetHapusTemplate.id}`, {
        method: 'DELETE',
      });
      setDaftarPustaka((prev) => prev.filter((t) => t.id !== targetHapusTemplate.id));
      setModalHapusTemplateOpen(false);
      setTargetHapusTemplate(null);
      setSuksesPesan('Template resmi berhasil dihapus.');
      setTimeout(() => setSuksesPesan(null), 3000);
    } catch (err: any) {
      alert(err.pesan || 'Gagal menghapus template resmi.');
    } finally {
      setSubmittingTemplate(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 sm:p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1E2A5A] to-blue-900 text-white flex items-center justify-center font-bold shadow-md shadow-blue-950/20">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  Dashboard Administrator
                </h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Pengelola Platform
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Akses Terproteksi: {user?.nama} ({user?.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="hantu"
              size="sm"
              icon={<LogOut className="w-4 h-4" />}
              onClick={handleKeluar}
            >
              Keluar
            </Button>
          </div>
        </header>

        {/* Notifikasi Sukses / Error */}
        {suksesPesan && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{suksesPesan}</span>
          </div>
        )}

        {errorPesan && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorPesan}</span>
          </div>
        )}

        {/* Tab Navigasi Admin */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('statistik')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'statistik'
                ? 'bg-[#1E2A5A] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Statistik Platform
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guru')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'guru'
                ? 'bg-[#1E2A5A] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Kelola Akun Guru
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pustaka')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'pustaka'
                ? 'bg-[#1E2A5A] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Pustaka Template Resmi
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-[#1E2A5A] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Monitoring AI
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'log'
                ? 'bg-[#1E2A5A] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            Log Aktivitas Admin
          </button>
        </div>

        {/* Konten Tab */}
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#1E2A5A] dark:text-blue-400 mb-2" />
            <p className="text-sm font-medium">Memuat data administrator...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* ========================================================= */}
            {/* 1. TAB STATISTIK PLATFORM */}
            {/* ========================================================= */}
            {activeTab === 'statistik' && statistik && (
              <div className="space-y-6">
                {/* Banner Privasi & Akuntabilitas */}
                <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Privasi Terisolasi Sesuai UU PDP No. 27 Tahun 2022:</p>
                    <p className="leading-relaxed text-blue-800 dark:text-blue-300">
                      Sebagai pengelola platform, administrator hanya memiliki akses ke angka statistik agregat. Isi papan tulis guru, template privat, hasil sesi, serta data nama siswa diisolasi secara permanen dan tidak dapat diakses oleh siapa pun.
                    </p>
                  </div>
                </div>

                {/* Grid Kartu Metrik */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card padding="md" className="space-y-1 border-l-4 border-l-blue-600">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                      Total Akun Guru
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-extrabold text-[#1E2A5A] dark:text-blue-300">
                        {statistik.totalGuru}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                        {statistik.guruAktif} Aktif
                      </span>
                    </div>
                  </Card>

                  <Card padding="md" className="space-y-1 border-l-4 border-l-emerald-600">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                      Sesi Game Berjalan
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                        {statistik.totalSesi}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        {statistik.sesiSelesai} Tuntas
                      </span>
                    </div>
                  </Card>

                  <Card padding="md" className="space-y-1 border-l-4 border-l-amber-500">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                      Template Materi
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                        {statistik.totalTemplate}
                      </span>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                        {statistik.totalTemplateResmi} Resmi
                      </span>
                    </div>
                  </Card>

                  <Card padding="md" className="space-y-1 border-l-4 border-l-[#D7262E]">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                      Papan Tulis Digital
                    </span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-3xl font-extrabold text-[#D7262E]">
                        {statistik.totalPapan}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        Tersimpan di Cloud
                      </span>
                    </div>
                  </Card>
                </div>

                {/* Grafik Visual Sesi 7 Hari Terakhir */}
                <Card padding="lg" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        Aktivitas Pembelajaran 7 Hari Terakhir
                      </h3>
                      <p className="text-xs text-slate-500">
                        Agregat jumlah sesi kuis game yang dijalankan di kelas per hari
                      </p>
                    </div>
                    <Calendar className="w-4 h-4 text-slate-400" />
                  </div>

                  <div className="grid grid-cols-7 gap-2 pt-6 items-end h-48">
                    {statistik.grafikAktivitas?.map((item: any) => {
                      const maxJumlah = Math.max(
                        ...statistik.grafikAktivitas.map((g: any) => g.jumlah),
                        5
                      );
                      const heightPercent = Math.max(12, Math.round((item.jumlah / maxJumlah) * 100));

                      return (
                        <div key={item.tanggal} className="flex flex-col items-center gap-2 h-full justify-end">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            {item.jumlah}
                          </span>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full max-w-[48px] rounded-t-xl bg-gradient-to-t from-[#1E2A5A] to-blue-600 dark:from-blue-900 dark:to-blue-500 transition-all hover:opacity-90"
                          />
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-full">
                            {item.tanggal.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* ========================================================= */}
            {/* 2. TAB KELOLA AKUN GURU */}
            {/* ========================================================= */}
            {activeTab === 'guru' && (
              <div className="space-y-4">
                {/* Bar Pencarian */}
                <form onSubmit={handleCariGuru} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchGuru}
                      onChange={(e) => setSearchGuru(e.target.value)}
                      placeholder="Cari guru berdasarkan nama, email, atau nama sekolah..."
                      className="w-full h-11 pl-10 pr-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E2A5A]"
                    />
                  </div>
                  <Button type="submit" variant="sekunder" size="md">
                    Cari
                  </Button>
                </form>

                {/* Tabel Guru */}
                <Card padding="none" className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-xs font-bold uppercase text-slate-500">
                          <th className="p-4">Guru & Sekolah</th>
                          <th className="p-4">Email</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Statistik Konten</th>
                          <th className="p-4 text-right">Tindakan Admin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {daftarGuru.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500">
                              Tidak ada data guru yang ditemukan.
                            </td>
                          </tr>
                        ) : (
                          daftarGuru.map((g) => (
                            <tr key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                              <td className="p-4">
                                <div className="font-bold text-slate-900 dark:text-slate-100">
                                  {g.nama}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {g.sekolah || 'Sekolah belum diisi'}
                                </div>
                              </td>
                              <td className="p-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                                {g.email}
                              </td>
                              <td className="p-4">
                                {g.status === 'aktif' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                                    <XCircle className="w-3.5 h-3.5" /> Nonaktif
                                  </span>
                                )}
                              </td>
                              <td className="p-4 text-xs text-slate-600 dark:text-slate-300">
                                <div>{g._count?.templates || 0} template materi</div>
                                <div className="text-slate-400">
                                  {g._count?.sessions || 0} sesi kuis • {g._count?.boards || 0} papan
                                </div>
                              </td>
                              <td className="p-4 text-right space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatusGuru(g)}
                                  disabled={submittingGuru}
                                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    g.status === 'aktif'
                                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  }`}
                                >
                                  {g.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedGuru(g);
                                    setResetPassResult(null);
                                    setModalResetPassOpen(true);
                                  }}
                                  className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors inline-flex items-center cursor-pointer"
                                  title="Reset Kata Sandi"
                                >
                                  <KeyRound className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedGuru(g);
                                    setModalHapusGuruOpen(true);
                                  }}
                                  className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors inline-flex items-center cursor-pointer"
                                  title="Hapus Akun Guru"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* ========================================================= */}
            {/* 3. TAB PUSTAKA TEMPLATE RESMI */}
            {/* ========================================================= */}
            {activeTab === 'pustaka' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">Pustaka Template Resmi Discere</h3>
                    <p className="text-xs text-slate-500">
                      Template contoh materi resmi yang dapat langsung disalin oleh seluruh guru di platform
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="utama"
                    size="sm"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={handleBukaModalTemplateBaru}
                  >
                    Buat Template Resmi
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {daftarPustaka.map((tmpl) => (
                    <Card key={tmpl.id} padding="md" className="space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#1E2A5A] dark:bg-blue-950 dark:text-blue-300">
                            Resmi Platform
                          </span>
                          <span className="text-xs font-semibold text-slate-400 capitalize">
                            Mode {tmpl.mode}
                          </span>
                        </div>
                        <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 line-clamp-2">
                          {tmpl.judul}
                        </h4>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <Gamepad2 className="w-3.5 h-3.5" />
                          <span>Tarik Tambang • {tmpl.questions?.length || 0} Soal</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleBukaModalEditTemplate(tmpl)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetHapusTemplate(tmpl);
                            setModalHapusTemplateOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* 4. TAB MONITORING AI */}
            {/* ========================================================= */}
            {activeTab === 'ai' && aiData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card padding="md" className="space-y-1">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                      Total Panggilan AI
                    </span>
                    <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                      {aiData.totalPanggilanSeluruhnya}
                    </div>
                    <span className="text-xs text-slate-400">Akumulasi seluruh request</span>
                  </Card>

                  <Card padding="md" className="space-y-1">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                      Cache Tersimpan
                    </span>
                    <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                      {aiData.totalCacheTersimpan}
                    </div>
                    <span className="text-xs text-slate-400">Menghemat token & kuota</span>
                  </Card>

                  <Card padding="md" className="space-y-1">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                      Batas Harian Guru
                    </span>
                    <div className="text-3xl font-extrabold text-[#1E2A5A] dark:text-blue-300">
                      30
                    </div>
                    <span className="text-xs text-slate-400">Request per akun per hari</span>
                  </Card>
                </div>

                <Card padding="lg" className="space-y-4">
                  <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                    Riwayat Penggunaan AI Harian (Agregat)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-xs font-bold uppercase text-slate-500">
                          <th className="p-3">Tanggal</th>
                          <th className="p-3">Total Panggilan AI</th>
                          <th className="p-3">Jumlah Guru Aktif Menggunakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {aiData.rekapHarian?.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-6 text-center text-slate-500">
                              Belum ada catatan aktivitas penggunaan AI.
                            </td>
                          </tr>
                        ) : (
                          aiData.rekapHarian?.map((r: any) => (
                            <tr key={r.tanggal}>
                              <td className="p-3 font-semibold">{r.tanggal}</td>
                              <td className="p-3 font-bold text-amber-600">{r.totalPanggilan} panggilan</td>
                              <td className="p-3 text-slate-600 dark:text-slate-300">{r.jumlahGuru} guru</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}

            {/* ========================================================= */}
            {/* 5. TAB LOG AKTIVITAS ADMIN */}
            {/* ========================================================= */}
            {activeTab === 'log' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Audit Akuntabilitas:</strong> Seluruh tindakan administratif yang dilakukan (seperti aktivasi, nonaktivasi, reset sandi, maupun penghapusan akun) dicatat secara permanen di sini untuk menjaga transparansi platform.
                  </p>
                </div>

                <Card padding="none" className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-xs font-bold uppercase text-slate-500">
                          <th className="p-3.5">Waktu</th>
                          <th className="p-3.5">Admin Pelaksana</th>
                          <th className="p-3.5">Tindakan / Aksi</th>
                          <th className="p-3.5">Target</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                        {adminLogs.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-500">
                              Belum ada catatan log tindakan administrator.
                            </td>
                          </tr>
                        ) : (
                          adminLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                              <td className="p-3.5 text-slate-500 whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString('id-ID')}
                              </td>
                              <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                                {log.admin?.nama} ({log.admin?.email})
                              </td>
                              <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                                {log.aksi}
                              </td>
                              <td className="p-3.5 font-mono text-slate-500">{log.target}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}

        {/* ========================================================= */}
        {/* MODAL RESET KATA SANDI GURU */}
        {/* ========================================================= */}
        <Modal
          isOpen={modalResetPassOpen}
          onClose={() => setModalResetPassOpen(false)}
          title="Reset Kata Sandi Akun Guru"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin mereset kata sandi akun guru{' '}
              <strong>{selectedGuru?.nama}</strong> ({selectedGuru?.email})?
            </p>

            {resetPassResult && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 text-xs space-y-1">
                <span className="font-bold text-emerald-800 dark:text-emerald-200">
                  Kata Sandi Baru Sementara:
                </span>
                <div className="font-mono text-sm font-extrabold text-[#1E2A5A] dark:text-blue-300 select-all">
                  {resetPassResult}
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block">
                  Berikan kata sandi ini kepada guru untuk masuk kembali.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="hantu"
                size="sm"
                onClick={() => setModalResetPassOpen(false)}
              >
                Tutup
              </Button>
              {!resetPassResult && (
                <Button
                  variant="utama"
                  size="sm"
                  onClick={handleResetPasswordGuru}
                  loading={submittingGuru}
                >
                  Reset Sekarang
                </Button>
              )}
            </div>
          </div>
        </Modal>

        {/* ========================================================= */}
        {/* MODAL HAPUS GURU */}
        {/* ========================================================= */}
        <Modal
          isOpen={modalHapusGuruOpen}
          onClose={() => setModalHapusGuruOpen(false)}
          title="Hapus Akun Guru Permanen"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 text-xs text-red-900 dark:text-red-200">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p>
                <strong>Tindakan Tidak Dapat Dibatalkan:</strong> Menghapus akun guru{' '}
                <strong>{selectedGuru?.nama}</strong> akan secara permanen menghapus seluruh template kuis, riwayat sesi, dan papan tulis miliknya.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="hantu"
                size="sm"
                onClick={() => setModalHapusGuruOpen(false)}
                disabled={submittingGuru}
              >
                Batal
              </Button>
              <Button
                variant="utama"
                size="sm"
                onClick={handleHapusGuru}
                loading={submittingGuru}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Ya, Hapus Permanen
              </Button>
            </div>
          </div>
        </Modal>

        {/* ========================================================= */}
        {/* MODAL BUAT / EDIT TEMPLATE RESMI */}
        {/* ========================================================= */}
        <Modal
          isOpen={modalTemplateOpen}
          onClose={() => !submittingTemplate && setModalTemplateOpen(false)}
          title={editTemplateId ? 'Ubah Template Resmi' : 'Buat Template Resmi Baru'}
          maxWidth="lg"
        >
          <form onSubmit={handleSimpanTemplateResmi} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Judul Template Materi
              </label>
              <input
                type="text"
                required
                value={templateJudul}
                onChange={(e) => setTemplateJudul(e.target.value)}
                placeholder="Contoh: Tata Surya dan Planet Kelas 6 SD"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1E2A5A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Mode Permainan
                </label>
                <select
                  value={templateMode}
                  onChange={(e) => setTemplateMode(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-semibold focus:outline-none"
                >
                  <option value="solo">Mode Solo (Satu Layar)</option>
                  <option value="multi">Mode Multiplayer (HP Siswa)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Jenis Lomba
                </label>
                <select
                  disabled
                  value="tarik_tambang"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-sm font-semibold cursor-not-allowed"
                >
                  <option value="tarik_tambang">Tarik Tambang (Aktif)</option>
                </select>
              </div>
            </div>

            {/* Soal-Soal */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                  Daftar Soal ({templateSoal.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setTemplateSoal((prev) => [
                      ...prev,
                      {
                        urutan: prev.length + 1,
                        teks: '',
                        opsiA: '',
                        opsiB: '',
                        opsiC: '',
                        jawabanBenar: 'A',
                        penjelasan: '',
                      },
                    ])
                  }
                  className="text-xs font-bold text-[#1E2A5A] dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Soal
                </button>
              </div>

              {templateSoal.map((soal, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#D7262E]">Soal #{idx + 1}</span>
                    {templateSoal.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setTemplateSoal((prev) =>
                            prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, urutan: i + 1 }))
                          )
                        }
                        className="text-slate-400 hover:text-red-500 p-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Teks pertanyaan..."
                    value={soal.teks}
                    onChange={(e) => {
                      const copy = [...templateSoal];
                      copy[idx].teks = e.target.value;
                      setTemplateSoal(copy);
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Pilihan A"
                      value={soal.opsiA}
                      onChange={(e) => {
                        const copy = [...templateSoal];
                        copy[idx].opsiA = e.target.value;
                        setTemplateSoal(copy);
                      }}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Pilihan B"
                      value={soal.opsiB}
                      onChange={(e) => {
                        const copy = [...templateSoal];
                        copy[idx].opsiB = e.target.value;
                        setTemplateSoal(copy);
                      }}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Pilihan C"
                      value={soal.opsiC}
                      onChange={(e) => {
                        const copy = [...templateSoal];
                        copy[idx].opsiC = e.target.value;
                        setTemplateSoal(copy);
                      }}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">Kunci Jawaban:</span>
                    {(['A', 'B', 'C'] as const).map((opt) => (
                      <label key={opt} className="inline-flex items-center gap-1 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name={`jawaban-${idx}`}
                          checked={soal.jawabanBenar === opt}
                          onChange={() => {
                            const copy = [...templateSoal];
                            copy[idx].jawabanBenar = opt;
                            setTemplateSoal(copy);
                          }}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="hantu"
                size="sm"
                onClick={() => setModalTemplateOpen(false)}
                disabled={submittingTemplate}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="utama"
                size="sm"
                loading={submittingTemplate}
              >
                Simpan Template Resmi
              </Button>
            </div>
          </form>
        </Modal>

        {/* ========================================================= */}
        {/* MODAL HAPUS TEMPLATE RESMI */}
        {/* ========================================================= */}
        <Modal
          isOpen={modalHapusTemplateOpen}
          onClose={() => setModalHapusTemplateOpen(false)}
          title="Hapus Template Resmi"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Apakah Anda yakin ingin menghapus template resmi{' '}
              <strong>"{targetHapusTemplate?.judul}"</strong> dari pustaka platform?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="hantu"
                size="sm"
                onClick={() => setModalHapusTemplateOpen(false)}
                disabled={submittingTemplate}
              >
                Batal
              </Button>
              <Button
                variant="utama"
                size="sm"
                onClick={handleHapusTemplateResmi}
                loading={submittingTemplate}
                className="bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Ya, Hapus
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
