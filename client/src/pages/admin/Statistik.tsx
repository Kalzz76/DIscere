import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { apiRequest } from '../../lib/api';
import { Modal, ModalProfil } from '../../components';
import {
  LogOut,
  BarChart3,
  Users,
  BookOpen,
  Cpu,
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router';

type AdminTab = 'statistik' | 'guru' | 'pustaka' | 'ai' | 'log';

export default function DashboardAdmin() {
  const { user, keluar } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('statistik');
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
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

  // Konfirmasi Keluar Modal
  const [modalKeluarOpen, setModalKeluarOpen] = useState(false);
  const [modalProfilOpen, setModalProfilOpen] = useState(false);

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
    <div className="portal-bg">
      <div className={`portal-shell ${sidebarMinimized ? 'minimized' : ''}`}>
        {/* Sidebar Papan Tulis (Sticky Mengikuti Scroll & Minimizable) */}
        <aside className="portal-side">
          <div className="portal-side-header">
            <div className="portal-brand">
              <svg
                className="w-8 h-8 shrink-0 text-[#f4ecd8]"
                viewBox="0 0 48 48"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinejoin="round"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M5 11c7-3 14-1 19 4v26c-5-5-12-7-19-4zM43 11c-7-3-14-1-19 4v26c5-5 12-7 19-4z" />
                <path d="M10 19h8M10 26h8M30 19h8M30 26h8" />
              </svg>
              <span>Discere Admin</span>
            </div>
            <button
              type="button"
              onClick={() => setSidebarMinimized((prev) => !prev)}
              className="portal-side-toggle"
              title={sidebarMinimized ? 'Perluas Sidebar' : 'Kecilkan Sidebar'}
              aria-label={sidebarMinimized ? 'Perluas Sidebar' : 'Kecilkan Sidebar'}
            >
              {sidebarMinimized ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          <nav className="portal-nav" aria-label="Menu navigasi admin">
            <button
              type="button"
              aria-current={activeTab === 'statistik' ? 'page' : undefined}
              onClick={() => setActiveTab('statistik')}
              title="Statistik Platform"
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Statistik Platform</span>
            </button>

            <button
              type="button"
              aria-current={activeTab === 'guru' ? 'page' : undefined}
              onClick={() => setActiveTab('guru')}
              title="Kelola Akun Guru"
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Kelola Akun Guru</span>
            </button>

            <button
              type="button"
              aria-current={activeTab === 'pustaka' ? 'page' : undefined}
              onClick={() => setActiveTab('pustaka')}
              title="Pustaka Resmi"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Pustaka Resmi</span>
            </button>

            <button
              type="button"
              aria-current={activeTab === 'ai' ? 'page' : undefined}
              onClick={() => setActiveTab('ai')}
              title="Monitoring AI"
            >
              <Cpu className="w-4 h-4 shrink-0" />
              <span>Monitoring AI</span>
            </button>

            <button
              type="button"
              aria-current={activeTab === 'log' ? 'page' : undefined}
              onClick={() => setActiveTab('log')}
              title="Log Audit"
            >
              <History className="w-4 h-4 shrink-0" />
              <span>Log Audit</span>
            </button>
          </nav>

          <div className="portal-who">
            <div className="flex items-center justify-between">
              <span className="portal-who-label">Masuk sebagai:</span>
              <button
                type="button"
                onClick={() => setModalProfilOpen(true)}
                className="text-[11px] font-bold text-[#f2c230] hover:underline cursor-pointer"
                title="Buka Pengaturan Profil Administrator"
              >
                Profil Admin
              </button>
            </div>
            <b
              onClick={() => setModalProfilOpen(true)}
              className="cursor-pointer hover:text-[#f2c230] transition-colors"
              title="Klik untuk membuka profil"
            >
              {user?.nama || 'Administrator'}
            </b>
            <span>{user?.email}</span>
            <button
              type="button"
              onClick={() => setModalKeluarOpen(true)}
              className="portal-out"
              title="Keluar"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Keluar</span>
            </button>
          </div>
        </aside>

        {/* Area Utama Konten */}
        <main className="portal-main">
          {/* Header Papan Tulis */}
          <header className="portal-head">
            <div>
              <h1>
                {activeTab === 'statistik' && 'Statistik Pembelajaran'}
                {activeTab === 'guru' && 'Daftar & Status Guru'}
                {activeTab === 'pustaka' && 'Pustaka Template Resmi'}
                {activeTab === 'ai' && 'Monitoring Pemakaian AI'}
                {activeTab === 'log' && 'Log Audit Administrator'}
              </h1>
              <p>
                Platform Pembelajaran Cerdas & Menyenangkan • Akses Terisolasi Administrator
              </p>
            </div>

            {activeTab === 'pustaka' && (
              <button
                type="button"
                onClick={handleBukaModalTemplateBaru}
                className="portal-btn red"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Template Resmi</span>
              </button>
            )}
          </header>

          {/* Notifikasi Sukses / Error */}
          {suksesPesan && (
            <div className="portal-banner success mb-5">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-[#245039]" />
              <span className="font-bold text-[#1d3b2e]">{suksesPesan}</span>
            </div>
          )}

          {errorPesan && (
            <div className="portal-banner error mb-5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-[#c8362f]" />
              <span className="font-bold text-[#c8362f]">{errorPesan}</span>
            </div>
          )}

          {/* Indikator Memuat Data */}
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center text-[#cfd9c3]">
              <Loader2 className="w-10 h-10 animate-spin text-[#f2c230] mb-3" />
              <p className="portal-cv text-2xl text-[#f4ecd8]">Menyiapkan papan administrasi...</p>
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
                  <div className="portal-banner info">
                    <Shield className="w-6 h-6 text-[#f2c230] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#f4ecd8] text-sm mb-1">
                        Privasi Terisolasi Sesuai UU PDP No. 27 Tahun 2022:
                      </p>
                      <p className="text-xs text-[#cfd9c3] leading-relaxed">
                        Sebagai pengelola platform, administrator hanya memiliki akses ke angka statistik agregat. Isi papan tulis guru, template privat, hasil sesi, serta identitas siswa diisolasi secara permanen dan tidak dapat diakses siapapun.
                      </p>
                    </div>
                  </div>

                  {/* 4 Kartu Ringkasan Metrik (Ala Papan Tulis Kapur) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="portal-over flex flex-col justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#cfd9c3]">
                        Total Akun Guru
                      </span>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="portal-cv text-4xl text-[#f4ecd8]">{statistik.totalGuru}</span>
                        <span className="portal-tag green">{statistik.guruAktif} Aktif</span>
                      </div>
                      <span className="text-xs text-[#cfd9c3] mt-2">Pendidik terdaftar</span>
                    </div>

                    <div className="portal-over flex flex-col justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#cfd9c3]">
                        Sesi Game Berjalan
                      </span>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="portal-cv text-4xl text-[#f2c230]">{statistik.totalSesi}</span>
                        <span className="portal-tag yellow">{statistik.sesiSelesai} Tuntas</span>
                      </div>
                      <span className="text-xs text-[#cfd9c3] mt-2">Kuis interaktif kelas</span>
                    </div>

                    <div className="portal-over flex flex-col justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#cfd9c3]">
                        Template Materi
                      </span>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="portal-cv text-4xl text-[#f4ecd8]">{statistik.totalTemplate}</span>
                        <span className="portal-tag blue">{statistik.totalTemplateResmi} Resmi</span>
                      </div>
                      <span className="text-xs text-[#cfd9c3] mt-2">Bank soal siap main</span>
                    </div>

                    <div className="portal-over flex flex-col justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#cfd9c3]">
                        Papan Tulis Digital
                      </span>
                      <div className="flex items-baseline justify-between mt-2">
                        <span className="portal-cv text-4xl text-[#ffdcd9]">{statistik.totalPapan}</span>
                        <span className="portal-tag red">Cloud Canvas</span>
                      </div>
                      <span className="text-xs text-[#cfd9c3] mt-2">Coretan kanvas tersimpan</span>
                    </div>
                  </div>

                  {/* Grafik 7 Hari Terakhir bergaya Papan Tulis */}
                  <div className="portal-over space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="portal-cv text-2xl text-[#f4ecd8]">
                          Aktivitas Pembelajaran 7 Hari Terakhir
                        </h2>
                        <p className="text-xs text-[#cfd9c3]">
                          Agregat jumlah sesi kuis game yang diselesaikan di kelas per hari
                        </p>
                      </div>
                      <Calendar className="w-5 h-5 text-[#f2c230]" />
                    </div>

                    <div className="grid grid-cols-7 gap-3 pt-6 items-end h-48 border-b-2 border-dashed border-[#f4ecd8]/30 pb-3">
                      {statistik.grafikAktivitas?.map((item: any) => {
                        const maxJumlah = Math.max(
                          ...statistik.grafikAktivitas.map((g: any) => g.jumlah),
                          5
                        );
                        const heightPercent = Math.max(14, Math.round((item.jumlah / maxJumlah) * 100));
                        return (
                          <div key={item.tanggal} className="flex flex-col items-center gap-2 h-full justify-end">
                            <span className="portal-cv text-lg text-[#f4ecd8]">{item.jumlah}</span>
                            <div
                              style={{ height: `${heightPercent}%` }}
                              className="w-full max-w-[44px] rounded-t-lg bg-gradient-to-t from-[#a6783c] via-[#f2c230] to-[#f4ecd8] shadow-sm transition-all"
                            />
                            <span className="text-[11px] font-bold text-[#cfd9c3] truncate max-w-full">
                              {item.tanggal.slice(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* 2. TAB KELOLA AKUN GURU */}
              {/* ========================================================= */}
              {activeTab === 'guru' && (
                <div className="space-y-5">
                  {/* Form Pencarian Bergaya Kapur */}
                  <form onSubmit={handleCariGuru} className="flex items-center gap-3">
                    <div className="portal-srch flex-1">
                      <Search className="w-4 h-4 text-[#6b7d6c]" />
                      <input
                        type="search"
                        value={searchGuru}
                        onChange={(e) => setSearchGuru(e.target.value)}
                        placeholder="Cari guru berdasarkan nama, email, atau asal sekolah..."
                        aria-label="Cari guru"
                      />
                    </div>
                    <button type="submit" className="portal-btn sm">
                      Cari Guru
                    </button>
                  </form>

                  {/* Tabel Guru (Ala Kertas Lembar Nilai) */}
                  <div className="portal-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="portal-table">
                        <thead>
                          <tr>
                            <th>Guru & Sekolah</th>
                            <th>Email</th>
                            <th>Status Akun</th>
                            <th>Konten Dibuat</th>
                            <th style={{ textAlign: 'right' }}>Tindakan Administrator</th>
                          </tr>
                        </thead>
                        <tbody>
                          {daftarGuru.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-[#6b7d6c]">
                                Tidak ada data guru yang ditemukan.
                              </td>
                            </tr>
                          ) : (
                            daftarGuru.map((g) => (
                              <tr key={g.id}>
                                <td>
                                  <div className="font-bold text-[#1d3b2e] text-sm">{g.nama}</div>
                                  <div className="text-xs text-[#6b7d6c]">
                                    {g.sekolah || 'Sekolah belum diisi'}
                                  </div>
                                </td>
                                <td className="font-mono text-xs text-[#1d3b2e]">{g.email}</td>
                                <td>
                                  {g.status === 'aktif' ? (
                                    <span className="portal-tag green">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                                    </span>
                                  ) : (
                                    <span className="portal-tag red">
                                      <XCircle className="w-3.5 h-3.5" /> Nonaktif
                                    </span>
                                  )}
                                </td>
                                <td className="text-xs text-[#1d3b2e]">
                                  <div className="font-semibold">{g._count?.templates || 0} template materi</div>
                                  <div className="text-[11px] text-[#6b7d6c]">
                                    {g._count?.sessions || 0} sesi kuis • {g._count?.boards || 0} papan
                                  </div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatusGuru(g)}
                                      disabled={submittingGuru}
                                      className={`portal-btn sm ${
                                        g.status === 'aktif' ? 'ghost-red' : 'ghost'
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
                                      className="portal-btn ghost sm"
                                      title="Reset Kata Sandi"
                                    >
                                      <KeyRound className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedGuru(g);
                                        setModalHapusGuruOpen(true);
                                      }}
                                      className="portal-btn ghost-red sm"
                                      title="Hapus Akun Guru"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* 3. TAB PUSTAKA TEMPLATE RESMI */}
              {/* ========================================================= */}
              {activeTab === 'pustaka' && (
                <div className="space-y-5">
                  {daftarPustaka.length === 0 ? (
                    <div className="portal-over text-center py-12 px-4 space-y-3">
                      <h2 className="portal-cv text-2xl text-[#f4ecd8]">Belum Ada Template Resmi Tersimpan</h2>
                      <p className="text-xs text-[#cfd9c3]">
                        Susun template materi terverifikasi yang langsung dapat disalin dan dimainkan oleh seluruh guru.
                      </p>
                      <button
                        type="button"
                        onClick={handleBukaModalTemplateBaru}
                        className="portal-btn red sm inline-flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Buat Template Pertama</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {daftarPustaka.map((tmpl) => (
                        <div
                          key={tmpl.id}
                          className="portal-card p-5 flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="portal-tag blue">Resmi Platform</span>
                              <span className="text-xs font-bold text-[#6b7d6c] uppercase">
                                Mode {tmpl.mode}
                              </span>
                            </div>
                            <h3 className="portal-cv text-2xl text-[#1d3b2e] leading-snug">
                              {tmpl.judul}
                            </h3>
                            <div className="text-xs text-[#6b7d6c] flex items-center gap-1.5 pt-1">
                              <Gamepad2 className="w-4 h-4 text-[#c8362f]" />
                              <span className="font-bold">
                                Tarik Tambang • {tmpl.questions?.length || 0} Soal
                              </span>
                            </div>
                          </div>

                          <div className="pt-3 border-t-2 border-dashed border-[#e0d5b8] flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleBukaModalEditTemplate(tmpl)}
                              className="portal-btn ghost sm"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Ubah
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetHapusTemplate(tmpl);
                                setModalHapusTemplateOpen(true);
                              }}
                              className="portal-btn ghost-red sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* 4. TAB MONITORING AI */}
              {/* ========================================================= */}
              {activeTab === 'ai' && aiData && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="portal-over">
                      <span className="text-xs font-bold uppercase text-[#cfd9c3]">
                        Total Panggilan AI
                      </span>
                      <div className="portal-cv text-4xl text-[#f2c230] mt-1">
                        {aiData.totalPanggilanSeluruhnya}
                      </div>
                      <span className="text-xs text-[#cfd9c3] mt-1 block">Akumulasi seluruh request</span>
                    </div>

                    <div className="portal-over">
                      <span className="text-xs font-bold uppercase text-[#cfd9c3]">
                        Cache Jawaban Tersimpan
                      </span>
                      <div className="portal-cv text-4xl text-[#f4ecd8] mt-1">
                        {aiData.totalCacheTersimpan}
                      </div>
                      <span className="text-xs text-[#cfd9c3] mt-1 block">Optimalisasi kuota & response</span>
                    </div>

                    <div className="portal-over">
                      <span className="text-xs font-bold uppercase text-[#cfd9c3]">
                        Batas Harian Guru
                      </span>
                      <div className="portal-cv text-4xl text-[#f2c230] mt-1">30</div>
                      <span className="text-xs text-[#cfd9c3] mt-1 block">Panggilan per guru per hari</span>
                    </div>
                  </div>

                  <div className="portal-card overflow-hidden p-6 space-y-4">
                    <h3 className="portal-cv text-2xl text-[#1d3b2e]">
                      Riwayat Penggunaan AI Harian (Agregat)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="portal-table">
                        <thead>
                          <tr>
                            <th>Tanggal</th>
                            <th>Total Panggilan AI</th>
                            <th>Guru Aktif Menggunakan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiData.rekapHarian?.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="py-8 text-center text-[#6b7d6c]">
                                Belum ada catatan aktivitas penggunaan AI.
                              </td>
                            </tr>
                          ) : (
                            aiData.rekapHarian?.map((r: any) => (
                              <tr key={r.tanggal}>
                                <td className="font-bold text-[#1d3b2e]">{r.tanggal}</td>
                                <td className="font-bold text-[#c8362f]">{r.totalPanggilan} panggilan</td>
                                <td className="text-[#1d3b2e]">{r.jumlahGuru} guru</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* 5. TAB LOG AKTIVITAS ADMIN */}
              {/* ========================================================= */}
              {activeTab === 'log' && (
                <div className="space-y-5">
                  <div className="portal-banner info">
                    <Info className="w-5 h-5 text-[#f2c230] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#cfd9c3] leading-relaxed">
                      <strong className="text-[#f4ecd8]">Audit Akuntabilitas:</strong> Seluruh tindakan administratif (aktivasi, penonaktifan, reset sandi, maupun penghapusan akun) dicatat secara permanen di sini untuk menjaga transparansi platform.
                    </p>
                  </div>

                  <div className="portal-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="portal-table">
                        <thead>
                          <tr>
                            <th>Waktu Eksekusi</th>
                            <th>Admin Pelaksana</th>
                            <th>Aksi / Tindakan</th>
                            <th>Target / Subjek</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminLogs.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-10 text-center text-[#6b7d6c]">
                                Belum ada catatan log tindakan administrator.
                              </td>
                            </tr>
                          ) : (
                            adminLogs.map((log) => (
                              <tr key={log.id}>
                                <td className="text-xs text-[#6b7d6c] whitespace-nowrap">
                                  {new Date(log.createdAt).toLocaleString('id-ID')}
                                </td>
                                <td>
                                  <div className="font-bold text-[#1d3b2e] text-xs">
                                    {log.admin?.nama}
                                  </div>
                                  <div className="text-[11px] text-[#6b7d6c] font-mono">
                                    {log.admin?.email}
                                  </div>
                                </td>
                                <td className="font-bold text-[#1d3b2e] text-xs">{log.aksi}</td>
                                <td className="font-mono text-xs text-[#6b7d6c]">{log.target}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Dudukan Kapur Kayu (Chalk Ledge) Full Width Ujung Kiri-Kanan */}
      <div className="portal-ledge" aria-hidden="true">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0 34C240 6 480 62 720 34S1200 6 1440 34V80H0z" fill="#a6783c" />
          <path d="M0 56C260 34 520 80 760 56S1220 36 1440 58V80H0z" fill="#8d6444" />
        </svg>
        <div className="portal-chalks">
          <i style={{ width: '84px', background: '#7a9c85' }} />
          <i style={{ width: '70px', background: '#7a9c85' }} />
          <i style={{ width: '92px', background: '#7a9c85' }} />
        </div>
      </div>

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
          <p className="text-xs text-[#1d3b2e]">
            Apakah Anda yakin ingin mereset kata sandi akun guru{' '}
            <strong>{selectedGuru?.nama}</strong> ({selectedGuru?.email})?
          </p>

          {resetPassResult && (
            <div className="portal-banner success">
              <div>
                <span className="font-bold text-xs text-[#1d3b2e] block">
                  Kata Sandi Baru Sementara:
                </span>
                <div className="font-mono text-base font-extrabold text-[#c8362f] select-all my-1">
                  {resetPassResult}
                </div>
                <span className="text-[11px] text-[#6b7d6c] block">
                  Berikan kata sandi ini kepada guru untuk masuk kembali.
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e0d5b8]">
            <button
              type="button"
              className="portal-btn ghost sm"
              onClick={() => setModalResetPassOpen(false)}
            >
              Tutup
            </button>
            {!resetPassResult && (
              <button
                type="button"
                className="portal-btn red sm"
                onClick={handleResetPasswordGuru}
                disabled={submittingGuru}
              >
                Reset Sekarang
              </button>
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
          <div className="portal-banner error">
            <AlertTriangle className="w-5 h-5 text-[#c8362f] shrink-0 mt-0.5" />
            <p className="text-xs text-[#c8362f]">
              <strong>Tindakan Permanen:</strong> Menghapus akun guru{' '}
              <strong>{selectedGuru?.nama}</strong> akan menghapus seluruh data template kuis, riwayat sesi, dan papan tulis miliknya.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e0d5b8]">
            <button
              type="button"
              className="portal-btn ghost sm"
              onClick={() => setModalHapusGuruOpen(false)}
              disabled={submittingGuru}
            >
              Batal
            </button>
            <button
              type="button"
              className="portal-btn red sm"
              onClick={handleHapusGuru}
              disabled={submittingGuru}
            >
              Ya, Hapus Permanen
            </button>
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
            <label className="block text-xs font-bold text-[#1d3b2e] uppercase tracking-wider mb-1">
              Judul Template Materi
            </label>
            <input
              type="text"
              required
              value={templateJudul}
              onChange={(e) => setTemplateJudul(e.target.value)}
              placeholder="Contoh: Tata Surya dan Planet Kelas 6 SD"
              className="portal-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1d3b2e] uppercase tracking-wider mb-1">
                Mode Permainan
              </label>
              <select
                value={templateMode}
                onChange={(e) => setTemplateMode(e.target.value as any)}
                className="portal-select"
              >
                <option value="solo">Mode Solo (Satu Layar)</option>
                <option value="multi">Mode Multiplayer (HP Siswa)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1d3b2e] uppercase tracking-wider mb-1">
                Jenis Lomba
              </label>
              <select
                disabled
                value="tarik_tambang"
                className="portal-select opacity-75 cursor-not-allowed"
              >
                <option value="tarik_tambang">Tarik Tambang (Aktif)</option>
              </select>
            </div>
          </div>

          {/* Daftar Soal */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b-2 border-dashed border-[#e0d5b8] pb-2">
              <span className="portal-cv text-xl text-[#1d3b2e]">
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
                className="portal-btn sm"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Soal
              </button>
            </div>

            {templateSoal.map((soal, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-[#f4ecd9] border border-[#e0d5b8] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="portal-cv text-lg text-[#c8362f]">Soal #{idx + 1}</span>
                  {templateSoal.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setTemplateSoal((prev) =>
                          prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, urutan: i + 1 }))
                        )
                      }
                      className="text-[#6b7d6c] hover:text-[#c8362f] p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  required
                  placeholder="Teks pertanyaan kuis..."
                  value={soal.teks}
                  onChange={(e) => {
                    const copy = [...templateSoal];
                    copy[idx].teks = e.target.value;
                    setTemplateSoal(copy);
                  }}
                  className="portal-input"
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
                    className="portal-input text-xs"
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
                    className="portal-input text-xs"
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
                    className="portal-input text-xs"
                  />
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <span className="text-xs font-bold text-[#1d3b2e]">Kunci Jawaban:</span>
                  {(['A', 'B', 'C'] as const).map((opt) => (
                    <label key={opt} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1d3b2e] cursor-pointer">
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

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e0d5b8]">
            <button
              type="button"
              className="portal-btn ghost sm"
              onClick={() => setModalTemplateOpen(false)}
              disabled={submittingTemplate}
            >
              Batal
            </button>
            <button
              type="submit"
              className="portal-btn red sm"
              disabled={submittingTemplate}
            >
              {submittingTemplate ? 'Menyimpan...' : 'Simpan Template Resmi'}
            </button>
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
          <p className="text-xs text-[#1d3b2e]">
            Apakah Anda yakin ingin menghapus template resmi{' '}
            <strong>"{targetHapusTemplate?.judul}"</strong> dari pustaka platform?
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e0d5b8]">
            <button
              type="button"
              className="portal-btn ghost sm"
              onClick={() => setModalHapusTemplateOpen(false)}
              disabled={submittingTemplate}
            >
              Batal
            </button>
            <button
              type="button"
              className="portal-btn red sm"
              onClick={handleHapusTemplateResmi}
              disabled={submittingTemplate}
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Keluar Akun Admin */}
      <Modal
        isOpen={modalKeluarOpen}
        onClose={() => setModalKeluarOpen(false)}
        title="Konfirmasi Keluar"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#1d3b2e] leading-relaxed">
            Apakah Anda yakin ingin keluar dari akun?
          </p>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e0d5b8]">
            <button
              type="button"
              onClick={() => setModalKeluarOpen(false)}
              className="portal-btn ghost sm"
            >
              Tidak
            </button>
            <button
              type="button"
              onClick={handleKeluar}
              className="portal-btn red sm"
            >
              Ya, Keluar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Profil Admin */}
      <ModalProfil
        isOpen={modalProfilOpen}
        onClose={() => setModalProfilOpen(false)}
        stats={{
          totalGuru: statistik?.totalGuru,
          totalTemplateResmi: statistik?.totalTemplateResmi ?? daftarPustaka.length,
          totalSesi: statistik?.totalSesi,
        }}
      />
    </div>
  );
}
