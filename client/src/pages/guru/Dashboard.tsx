import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../lib/auth';
import { apiRequest } from '../../lib/api';
import { Modal } from '../../components';
import { RiwayatDetailModal } from './RiwayatDetailModal';
import {
  LogOut,
  LayoutDashboard,
  BookOpen,
  History,
  PenTool,
  Plus,
  Play,
  Edit3,
  Copy,
  Trash2,
  Search,
  Loader2,
} from 'lucide-react';

interface TemplateItem {
  id: string;
  judul: string;
  game: string;
  mode: string;
  resmi?: boolean;
  _count?: { questions: number };
  jumlahSoal?: number;
  updatedAt?: string;
}

interface SesiRiwayatItem {
  id: string;
  templateId: string;
  templateJudul: string;
  game: string;
  mode: string;
  tanggal: string;
  timMenang: 'merah' | 'putih' | 'seri';
  posisiAkhir: number;
  skorMerah: number;
  skorPutih: number;
  totalSoal: number;
}

interface BoardItem {
  id: string;
  judul: string;
  createdAt: string;
  updatedAt: string;
  _count?: { shares: number };
}

interface RingkasanData {
  totalTemplate: number;
  totalSesi: number;
  totalPapan: number;
  templateTerbaru: Array<{
    id: string;
    judul: string;
    game: string;
    mode: string;
    jumlahSoal: number;
    updatedAt: string;
  }>;
  sesiTerakhir: {
    id: string;
    templateJudul: string;
    tanggal: string;
    timMenang: 'merah' | 'putih' | 'seri';
    posisiAkhir: number;
    skorMerah: number;
    skorPutih: number;
  } | null;
}

export default function DashboardGuru() {
  const { user, keluar } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Tab aktif
  const queryParams = new URLSearchParams(location.search);
  const tabFromUrl = queryParams.get('tab') || 'ringkasan';
  const [tabAktif, setTabAktif] = useState<string>(tabFromUrl);

  // Sync tab state dengan url
  useEffect(() => {
    const tab = queryParams.get('tab') || 'ringkasan';
    setTabAktif(tab);
  }, [location.search]);

  // Data states
  const [ringkasan, setRingkasan] = useState<RingkasanData | null>(null);
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [pustakaResmi, setPustakaResmi] = useState<TemplateItem[]>([]);
  const [riwayatList, setRiwayatList] = useState<SesiRiwayatItem[]>([]);
  const [boards, setBoards] = useState<BoardItem[]>([]);
  const [subTabTemplate, setSubTabTemplate] = useState<'saya' | 'pustaka'>('saya');
  const [pencarian, setPencarian] = useState('');

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal State
  const [modalHapusId, setModalHapusId] = useState<string | null>(null);
  const [modalDetailSessionId, setModalDetailSessionId] = useState<string | null>(null);
  const [modalHapusPapanId, setModalHapusPapanId] = useState<string | null>(null);
  const [modalGantiNamaPapan, setModalGantiNamaPapan] = useState<{ id: string; judul: string } | null>(null);
  const [inputGantiNama, setInputGantiNama] = useState('');

  const fetchRingkasan = useCallback(async () => {
    try {
      const res = await apiRequest<{ ringkasan: RingkasanData }>('/guru/ringkasan');
      setRingkasan(res.ringkasan);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const [resSaya, resPustaka] = await Promise.all([
        apiRequest<{ templates: TemplateItem[] }>(`/template?q=${encodeURIComponent(pencarian)}`),
        apiRequest<{ templates: TemplateItem[] }>('/template/pustaka'),
      ]);
      setTemplates(resSaya.templates);
      setPustakaResmi(resPustaka.templates);
    } catch (err) {
      console.error(err);
    }
  }, [pencarian]);

  const fetchRiwayat = useCallback(async () => {
    try {
      const res = await apiRequest<{ riwayat: SesiRiwayatItem[] }>('/sesi/riwayat');
      setRiwayatList(res.riwayat);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchBoards = useCallback(async () => {
    try {
      const res = await apiRequest<{ boards: BoardItem[] }>('/papan');
      setBoards(res.boards);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Inisialisasi data
  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      await Promise.all([fetchRingkasan(), fetchTemplates(), fetchRiwayat(), fetchBoards()]);
      setLoading(false);
    }
    loadInitial();
  }, [fetchRingkasan, fetchTemplates, fetchRiwayat, fetchBoards]);

  // Handler: Buat Papan Tulis Baru
  const handleBuatPapanBaru = async () => {
    try {
      setActionLoadingId('buat_papan');
      const res = await apiRequest<{ board: { id: string } }>('/papan', {
        method: 'POST',
        body: JSON.stringify({ judul: 'Papan Pembelajaran Baru' }),
      });
      navigate(`/papan/${res.board.id}`);
    } catch (err: any) {
      alert(err.pesan || 'Gagal membuat papan baru.');
      setActionLoadingId(null);
    }
  };

  // Handler: Ganti Nama Papan
  const handleKonfirmasiGantiNamaPapan = async () => {
    if (!modalGantiNamaPapan || !inputGantiNama.trim()) return;
    try {
      setActionLoadingId(modalGantiNamaPapan.id);
      await apiRequest(`/papan/${modalGantiNamaPapan.id}/judul`, {
        method: 'PATCH',
        body: JSON.stringify({ judul: inputGantiNama.trim() }),
      });
      setModalGantiNamaPapan(null);
      await fetchBoards();
    } catch (err: any) {
      alert(err.pesan || 'Gagal mengubah judul papan.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handler: Hapus Papan
  const handleKonfirmasiHapusPapan = async () => {
    if (!modalHapusPapanId) return;
    try {
      setActionLoadingId(modalHapusPapanId);
      await apiRequest(`/papan/${modalHapusPapanId}`, { method: 'DELETE' });
      setModalHapusPapanId(null);
      await fetchBoards();
    } catch (err: any) {
      alert(err.pesan || 'Gagal menghapus papan.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handler: Mulai Game dari Template
  const handleMulaiGame = async (templateId: string, mode?: string) => {
    try {
      setActionLoadingId(templateId);
      const res = await apiRequest<{ session: { id: string } }>('/sesi', {
        method: 'POST',
        body: JSON.stringify({ templateId, mode }),
      });
      navigate(`/guru/sesi/${res.session.id}`);
    } catch (err: any) {
      alert(err.pesan || 'Gagal memulai sesi game.');
      setActionLoadingId(null);
    }
  };

  // Handler: Duplikat Template
  const handleDuplikat = async (templateId: string) => {
    try {
      setActionLoadingId(templateId);
      await apiRequest(`/template/${templateId}/duplikat`, { method: 'POST' });
      await Promise.all([fetchTemplates(), fetchRingkasan()]);
      if (subTabTemplate === 'pustaka') {
        setSubTabTemplate('saya');
      }
    } catch (err: any) {
      alert(err.pesan || 'Gagal menyalin template.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handler: Hapus Template
  const handleKonfirmasiHapus = async () => {
    if (!modalHapusId) return;
    try {
      setActionLoadingId(modalHapusId);
      await apiRequest(`/template/${modalHapusId}`, { method: 'DELETE' });
      setModalHapusId(null);
      await Promise.all([fetchTemplates(), fetchRingkasan()]);
    } catch (err: any) {
      alert(err.pesan || 'Gagal menghapus template.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleKeluar = async () => {
    await keluar();
    navigate('/masuk');
  };

  return (
    <div className="portal-bg">
      <div className="portal-shell">
        {/* Sidebar Papan Tulis */}
        <aside className="portal-side">
          <div className="portal-brand">
            <BookOpen className="w-8 h-8 text-[#f2c230]" />
            <span>Discere</span>
          </div>

          <nav className="portal-nav" aria-label="Menu navigasi guru">
            <button
              type="button"
              aria-current={tabAktif === 'ringkasan' ? 'page' : undefined}
              onClick={() => navigate('/guru?tab=ringkasan')}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Ringkasan</span>
            </button>

            <button
              type="button"
              aria-current={tabAktif === 'template' ? 'page' : undefined}
              onClick={() => navigate('/guru?tab=template')}
            >
              <BookOpen className="w-4 h-4" />
              <span>Template Game</span>
            </button>

            <button
              type="button"
              aria-current={tabAktif === 'riwayat' ? 'page' : undefined}
              onClick={() => navigate('/guru?tab=riwayat')}
            >
              <History className="w-4 h-4" />
              <span>Riwayat Sesi</span>
            </button>

            <button
              type="button"
              aria-current={tabAktif === 'papan' ? 'page' : undefined}
              onClick={() => navigate('/guru?tab=papan')}
            >
              <PenTool className="w-4 h-4" />
              <span>Papan Tulis</span>
            </button>
          </nav>

          <div className="portal-who">
            Masuk sebagai:
            <b>{user?.nama || 'Guru'}</b>
            <span>{user?.sekolah || user?.email}</span>
            <button type="button" onClick={handleKeluar} className="portal-out">
              <LogOut className="w-4 h-4" />
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
                {tabAktif === 'ringkasan' && 'Ringkasan Kelas'}
                {tabAktif === 'template' && 'Manajemen Soal & Template'}
                {tabAktif === 'riwayat' && 'Riwayat Sesi Game'}
                {tabAktif === 'papan' && 'Papan Tulis Digital'}
              </h1>
              <p>Selamat mengajar, Bapak/Ibu {user?.nama}.</p>
            </div>

            {tabAktif === 'template' && (
              <button
                type="button"
                onClick={() => navigate('/guru/template/baru')}
                className="portal-btn red"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Template Baru</span>
              </button>
            )}

            {tabAktif === 'papan' && (
              <button
                type="button"
                onClick={handleBuatPapanBaru}
                disabled={actionLoadingId === 'buat_papan'}
                className="portal-btn red"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Papan Baru</span>
              </button>
            )}
          </header>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-[#cfd9c3]">
              <Loader2 className="w-10 h-10 animate-spin text-[#f2c230] mb-3" />
              <p className="portal-cv text-2xl text-[#f4ecd8]">Membuka papan kelas...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: RINGKASAN */}
              {tabAktif === 'ringkasan' && ringkasan && (
                <div className="space-y-6">
                  {/* Grid 2 Kolom: Kiri Metrik + Aksi, Kanan Panel Sesi & Papan */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Kolom Kiri: 2 Span */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Kartu Ringkasan Metrik Ala Kapur */}
                      <div className="portal-over space-y-4">
                        <div className="flex items-center justify-between">
                          <h2 className="portal-cv text-2xl text-[#f4ecd8]">Sesi Game Selesai</h2>
                          <span className="portal-tag yellow font-bold">Ringkasan Aktivitas</span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 pt-2 text-center border-t-2 border-dashed border-[#f4ecd8]/30">
                          <div>
                            <span className="text-xs text-[#cfd9c3] block">Template tersedia</span>
                            <b className="portal-cv text-3xl text-[#f4ecd8] block my-1">
                              {ringkasan.totalTemplate}
                            </b>
                            <span className="text-[11px] text-[#cfd9c3]">Materi siap</span>
                          </div>

                          <div className="bg-[#f4ecd8]/10 rounded-2xl py-2 px-1 -my-2 border border-[#f2c230]/40">
                            <span className="text-xs text-[#f2c230] font-bold block">
                              Sesi selesai
                            </span>
                            <b className="portal-cv text-4xl text-[#f2c230] block my-1">
                              {ringkasan.totalSesi}
                            </b>
                            <span className="text-[11px] text-[#f4ecd8]">Total tuntas</span>
                          </div>

                          <div>
                            <span className="text-xs text-[#cfd9c3] block">Papan tersimpan</span>
                            <b className="portal-cv text-3xl text-[#f4ecd8] block my-1">
                              {ringkasan.totalPapan}
                            </b>
                            <span className="text-[11px] text-[#cfd9c3]">Kanvas cloud</span>
                          </div>
                        </div>
                      </div>

                      {/* Tombol Aksi Cepat */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => navigate('/guru/template/baru')}
                          className="p-5 rounded-2xl bg-gradient-to-br from-[#c8362f] to-[#d9544c] text-[#f4ecd8] flex items-center justify-between shadow-md hover:opacity-95 transition-all text-left cursor-pointer border border-[#f4ecd8]/20"
                        >
                          <div>
                            <div className="portal-cv text-2xl leading-none mb-1">
                              Buat Template Kuis Baru
                            </div>
                            <div className="text-xs text-[#ffdcd9]">
                              Susun materi tarik tambang untuk dimainkan bersama kelas.
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-full border-2 border-[#f4ecd8] flex items-center justify-center shrink-0">
                            <Plus className="w-5 h-5 text-[#f4ecd8]" />
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={handleBuatPapanBaru}
                          disabled={actionLoadingId === 'buat_papan'}
                          className="p-5 rounded-2xl bg-[#2e503a] text-[#f4ecd8] flex items-center justify-between shadow-md hover:opacity-95 transition-all text-left cursor-pointer border-2 border-dashed border-[#f4ecd8]/40"
                        >
                          <div>
                            <div className="portal-cv text-2xl leading-none mb-1">
                              Buka Papan Tulis Digital
                            </div>
                            <div className="text-xs text-[#cfd9c3]">
                              Kanvas tak terbatas untuk menjelaskan materi.
                            </div>
                          </div>
                          <div className="w-10 h-10 rounded-full border-2 border-[#f4ecd8] flex items-center justify-center shrink-0">
                            <PenTool className="w-5 h-5 text-[#f4ecd8]" />
                          </div>
                        </button>
                      </div>

                      {/* Template Game Terbaru */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="portal-cv text-2xl text-[#f4ecd8]">
                            Template Game Terbaru
                          </h3>
                          <button
                            type="button"
                            onClick={() => navigate('/guru?tab=template')}
                            className="text-xs font-bold text-[#f2c230] hover:underline cursor-pointer"
                          >
                            Lihat Semua ▾
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {ringkasan.templateTerbaru.map((tmpl) => (
                            <div
                              key={tmpl.id}
                              className="portal-card p-5 flex flex-col justify-between gap-3"
                            >
                              <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="portal-tag red">Tarik Tambang</span>
                                  <span className="portal-tag yellow">{tmpl.jumlahSoal} Soal</span>
                                </div>
                                <h4 className="portal-cv text-2xl text-[#1d3b2e] leading-snug">
                                  {tmpl.judul}
                                </h4>
                              </div>

                              <div className="pt-2 border-t-2 border-dashed border-[#e0d5b8] flex items-center justify-between">
                                <span className="text-xs font-bold text-[#6b7d6c] uppercase">
                                  Mode {tmpl.mode}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleMulaiGame(tmpl.id, tmpl.mode)}
                                  className="portal-btn red sm"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>Mulai</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Kolom Kanan: 1 Span (Panel Sesi & Papan) */}
                    <div className="portal-card p-5 space-y-5 self-start">
                      <div className="flex items-center justify-between border-b-2 border-dashed border-[#e0d5b8] pb-3">
                        <h3 className="portal-cv text-2xl text-[#1d3b2e]">Sesi Terakhir</h3>
                        <button
                          type="button"
                          onClick={() => navigate('/guru?tab=riwayat')}
                          className="text-xs font-bold text-[#c8362f] hover:underline cursor-pointer"
                        >
                          Riwayat
                        </button>
                      </div>

                      {ringkasan.sesiTerakhir ? (
                        <div className="space-y-3">
                          <h4 className="font-bold text-[#1d3b2e] text-sm">
                            {ringkasan.sesiTerakhir.templateJudul}
                          </h4>
                          <div className="p-3 rounded-xl bg-[#f4ecd9] border border-[#e0d5b8] text-xs space-y-1">
                            <div className="font-bold text-[#1d3b2e]">
                              Hasil:{' '}
                              {ringkasan.sesiTerakhir.timMenang === 'merah'
                                ? '🔴 Tim Merah Menang'
                                : ringkasan.sesiTerakhir.timMenang === 'putih'
                                ? '⚪ Tim Putih Menang'
                                : '🤝 Seri'}
                            </div>
                            <div className="text-[#6b7d6c]">
                              Skor: {ringkasan.sesiTerakhir.skorMerah} vs{' '}
                              {ringkasan.sesiTerakhir.skorPutih}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setModalDetailSessionId(ringkasan.sesiTerakhir!.id)}
                            className="portal-btn ghost-red sm w-full justify-center"
                          >
                            Lihat Analisis Sesi
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-[#6b7d6c]">Belum ada sesi yang diselesaikan.</p>
                      )}

                      <div className="pt-2 border-t-2 border-dashed border-[#e0d5b8] space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="portal-cv text-2xl text-[#1d3b2e]">Papan Tulis</h3>
                          <button
                            type="button"
                            onClick={() => navigate('/guru?tab=papan')}
                            className="text-xs font-bold text-[#1d3b2e] hover:underline cursor-pointer"
                          >
                            Semua
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleBuatPapanBaru}
                          className="portal-btn red sm w-full justify-center"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Buat Papan Baru</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TEMPLATE GAME */}
              {tabAktif === 'template' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div className="portal-seg">
                      <button
                        type="button"
                        className={subTabTemplate === 'saya' ? 'on' : ''}
                        onClick={() => setSubTabTemplate('saya')}
                      >
                        Template Saya ({templates.length})
                      </button>
                      <button
                        type="button"
                        className={subTabTemplate === 'pustaka' ? 'on' : ''}
                        onClick={() => setSubTabTemplate('pustaka')}
                      >
                        Pustaka Resmi ({pustakaResmi.length})
                      </button>
                    </div>

                    <div className="portal-srch">
                      <Search className="w-4 h-4 text-[#6b7d6c]" />
                      <input
                        type="search"
                        placeholder="Cari materi kuis..."
                        value={pencarian}
                        onChange={(e) => setPencarian(e.target.value)}
                        aria-label="Cari materi"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {(subTabTemplate === 'saya' ? templates : pustakaResmi).map((tmpl) => {
                      const jumlahSoal = tmpl._count?.questions ?? tmpl.jumlahSoal ?? 0;
                      return (
                        <div
                          key={tmpl.id}
                          className="portal-card p-5 flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="portal-tag red">Tarik Tambang</span>
                              <span className="portal-tag yellow">
                                {tmpl.mode === 'multi' ? 'Mode Multiplayer' : 'Mode Solo'}
                              </span>
                            </div>
                            <h3 className="portal-cv text-2xl text-[#1d3b2e] leading-snug">
                              {tmpl.judul}
                            </h3>
                            <p className="text-xs text-[#6b7d6c] font-bold">
                              {jumlahSoal} Soal Tersedia
                            </p>
                          </div>

                          <div className="pt-3 border-t-2 border-dashed border-[#e0d5b8] flex flex-wrap items-center justify-between gap-2">
                            {subTabTemplate === 'saya' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleMulaiGame(tmpl.id, tmpl.mode)}
                                  className="portal-btn red sm"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>{tmpl.mode === 'multi' ? 'Mulai Lomba' : 'Mulai Solo'}</span>
                                </button>

                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/guru/template/${tmpl.id}/ubah`)}
                                    className="portal-btn ghost sm"
                                    title="Ubah Template"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDuplikat(tmpl.id)}
                                    className="portal-btn ghost sm"
                                    title="Duplikat Template"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setModalHapusId(tmpl.id)}
                                    className="portal-btn ghost-red sm"
                                    title="Hapus Template"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDuplikat(tmpl.id)}
                                className="portal-btn red sm"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Salin ke Template Saya</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {(subTabTemplate === 'saya' ? templates : pustakaResmi).length === 0 && (
                    <div className="portal-over text-center py-12">
                      <p className="portal-cv text-2xl text-[#f4ecd8]">
                        Belum ada template materi yang sesuai.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: RIWAYAT SESI */}
              {tabAktif === 'riwayat' && (
                <div className="space-y-4">
                  {riwayatList.length === 0 ? (
                    <div className="portal-over text-center py-14 space-y-3">
                      <History className="w-10 h-10 mx-auto text-[#f2c230]" />
                      <h3 className="portal-cv text-2xl text-[#f4ecd8]">
                        Belum Ada Riwayat Permainan
                      </h3>
                      <p className="text-xs text-[#cfd9c3] max-w-sm mx-auto">
                        Sesi kuis game yang selesai dimainkan akan otomatis tercatat di sini.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate('/guru?tab=template')}
                        className="portal-btn sm"
                      >
                        Buka Template Game
                      </button>
                    </div>
                  ) : (
                    <div className="portal-card overflow-hidden">
                      <div className="divide-y-2 divide-dashed divide-[#e0d5b8]">
                        {riwayatList.map((r) => (
                          <div
                            key={r.id}
                            className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="portal-tag yellow font-bold">
                                  Mode {r.mode}
                                </span>
                                <span className="text-xs text-[#6b7d6c]">
                                  {new Date(r.tanggal).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <h4 className="portal-cv text-2xl text-[#1d3b2e]">
                                {r.templateJudul}
                              </h4>
                              <div className="text-xs font-semibold text-[#1d3b2e]">
                                Pemenang:{' '}
                                <strong>
                                  {r.timMenang === 'merah'
                                    ? '🔴 Tim Merah'
                                    : r.timMenang === 'putih'
                                    ? '⚪ Tim Putih'
                                    : '🤝 Seri'}
                                </strong>{' '}
                                (Skor: {r.skorMerah} vs {r.skorPutih}) • Posisi Tali:{' '}
                                <span className="font-mono font-bold">
                                  {r.posisiAkhir > 0 ? `+${r.posisiAkhir}` : r.posisiAkhir}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setModalDetailSessionId(r.id)}
                              className="portal-btn ghost-red sm"
                            >
                              Lihat Detail
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PAPAN TULIS */}
              {tabAktif === 'papan' && (
                <div className="space-y-5">
                  <div className="portal-over flex items-center justify-between">
                    <div>
                      <h2 className="portal-cv text-2xl text-[#f4ecd8]">Kanvas Digital Terbuka</h2>
                      <p className="text-xs text-[#cfd9c3]">
                        Kanvas bebas untuk menulis materi, coretan rumus, dan gambar kelas
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleBuatPapanBaru}
                      className="portal-btn red sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Buat Papan Baru</span>
                    </button>
                  </div>

                  {boards.length === 0 ? (
                    <div className="portal-over text-center py-16 space-y-3">
                      <PenTool className="w-10 h-10 mx-auto text-[#f2c230]" />
                      <h3 className="portal-cv text-2xl text-[#f4ecd8]">
                        Belum Ada Papan Tulis Tersimpan
                      </h3>
                      <p className="text-xs text-[#cfd9c3] max-w-sm mx-auto">
                        Mulai jelaskan materi pelajaran dengan kanvas interaktif tak terbatas.
                      </p>
                      <button
                        type="button"
                        onClick={handleBuatPapanBaru}
                        className="portal-btn sm"
                      >
                        Buka Papan Pertama Anda
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {boards.map((b) => (
                        <div
                          key={b.id}
                          className="portal-card overflow-hidden flex flex-col justify-between"
                        >
                          {/* Mini Board Header Frame */}
                          <div className="h-28 bg-[#1f4a37] border-b-4 border-[#a6783c] flex items-center justify-center p-3 text-center">
                            <span className="portal-cv text-xl text-[#f4ecd8] line-clamp-2">
                              {b.judul}
                            </span>
                          </div>

                          <div className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-[11px] text-[#6b7d6c]">
                              <span>
                                Diubah:{' '}
                                {new Date(b.updatedAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {Boolean(b._count?.shares) && (
                                <span className="portal-tag blue">
                                  {b._count?.shares} Berbagi
                                </span>
                              )}
                            </div>

                            <div className="pt-2 border-t-2 border-dashed border-[#e0d5b8] flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/papan/${b.id}`)}
                                className="portal-btn red sm"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Buka Papan</span>
                              </button>

                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalGantiNamaPapan({ id: b.id, judul: b.judul });
                                    setInputGantiNama(b.judul);
                                  }}
                                  className="portal-btn ghost sm"
                                  title="Ganti Judul Papan"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setModalHapusPapanId(b.id)}
                                  className="portal-btn ghost-red sm"
                                  title="Hapus Papan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Dudukan Kapur Kayu (Chalk Ledge) */}
          <div className="portal-ledge" aria-hidden="true">
            <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
              <path d="M0 34C240 6 480 62 720 34S1200 6 1440 34V80H0z" fill="#a6783c" />
              <path d="M0 56C260 34 520 80 760 56S1220 36 1440 58V80H0z" fill="#8d6444" />
            </svg>
            <div className="portal-chalks">
              <i style={{ width: '84px', background: '#f4ecd8' }} />
              <i style={{ width: '70px', background: '#f2c230' }} />
              <i style={{ width: '92px', background: '#7a9c85' }} />
            </div>
          </div>
        </main>
      </div>

      {/* Modal Konfirmasi Hapus Template */}
      <Modal
        isOpen={Boolean(modalHapusId)}
        onClose={() => setModalHapusId(null)}
        title="Hapus Template Materi?"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#1d3b2e]">
            Apakah Anda yakin ingin menghapus template ini? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#e0d5b8]">
            <button
              type="button"
              className="portal-btn ghost sm"
              onClick={() => setModalHapusId(null)}
            >
              Batal
            </button>
            <button
              type="button"
              className="portal-btn red sm"
              onClick={handleKonfirmasiHapus}
              disabled={Boolean(actionLoadingId)}
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Detail Riwayat */}
      <RiwayatDetailModal
        sessionId={modalDetailSessionId}
        isOpen={Boolean(modalDetailSessionId)}
        onClose={() => setModalDetailSessionId(null)}
      />

      {/* Modal Ganti Nama Papan */}
      <Modal
        isOpen={Boolean(modalGantiNamaPapan)}
        onClose={() => setModalGantiNamaPapan(null)}
        title="Ganti Judul Papan Tulis"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleKonfirmasiGantiNamaPapan();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-[#1d3b2e] uppercase tracking-wider mb-2">
              Judul Papan Tulis
            </label>
            <input
              type="text"
              value={inputGantiNama}
              onChange={(e) => setInputGantiNama(e.target.value)}
              placeholder="Contoh: Matematika Pecahan Kelas 5"
              className="portal-input"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#e0d5b8]">
            <button
              type="button"
              className="portal-btn ghost sm"
              onClick={() => setModalGantiNamaPapan(null)}
            >
              Batal
            </button>
            <button
              type="submit"
              className="portal-btn red sm"
              disabled={actionLoadingId === modalGantiNamaPapan?.id}
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Hapus Papan */}
      <Modal
        isOpen={Boolean(modalHapusPapanId)}
        onClose={() => setModalHapusPapanId(null)}
        title="Hapus Papan Tulis?"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#1d3b2e]">
            Apakah Anda yakin ingin menghapus papan tulis ini? Seluruh catatan materi dan tautan berbagi akan terhapus permanen.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#e0d5b8]">
            <button
              type="button"
              className="portal-btn ghost sm"
              onClick={() => setModalHapusPapanId(null)}
            >
              Batal
            </button>
            <button
              type="button"
              className="portal-btn red sm"
              onClick={handleKonfirmasiHapusPapan}
              disabled={actionLoadingId === modalHapusPapanId}
            >
              Ya, Hapus Papan
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
