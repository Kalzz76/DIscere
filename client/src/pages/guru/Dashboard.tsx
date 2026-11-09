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
  ChevronRight,
  ArrowRight,
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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
  const [subTabAside, setSubTabAside] = useState<'hist' | 'tpl'>('hist');
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

  const currentMonthIdx = new Date().getMonth();

  return (
    <div className="portal-bg">
      <div className="portal-shell">
        {/* Sidebar Papan Tulis */}
        <aside className="portal-side">
          <div className="portal-brand">
            <BookOpen className="w-8 h-8 text-[#f2c230]" />
            <span>Discere</span>
          </div>

          <nav className="portal-nav" aria-label="Menu utama">
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
            <b>{user?.nama || 'Guru Demo'}</b>
            <span>{user?.sekolah || 'SD Negeri Merdeka 01'}</span>
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
                {tabAktif === 'ringkasan' && 'Ringkasan'}
                {tabAktif === 'template' && 'Template Game'}
                {tabAktif === 'riwayat' && 'Riwayat Sesi'}
                {tabAktif === 'papan' && 'Papan Tulis'}
              </h1>
              <p>Selamat mengajar, Bapak/Ibu {user?.nama || 'Guru Demo'}.</p>
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
              {/* TAB 1: RINGKASAN (100% PERSIS SEPERTI REFERENSI HTML & GAMBAR 1) */}
              {tabAktif === 'ringkasan' && ringkasan && (
                <div className="portal-rg-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: '22px' }}>
                  {/* Kolom Kiri: Chart, Big Card, & 3 Template Cards */}
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '22px' }}>
                    {/* Top Grid: Over Chart + Big Action Buttons */}
                    <div className="portal-top-grid" style={{ display: 'grid', gridTemplateColumns: '1.9fr 1fr', gap: '20px' }}>
                      {/* Kartu Grafik Sesi Game Selesai (.over) */}
                      <article className="portal-over">
                        <div className="hd">
                          <h2>Sesi Game Selesai</h2>
                          <button type="button" className="portal-sel">
                            Bulanan ▾
                          </button>
                        </div>

                        <div className="portal-chart-box">
                          {/* Tooltip Angka Sesi */}
                          <div
                            style={{
                              position: 'absolute',
                              top: '2px',
                              left: '90%',
                              transform: 'translateX(-50%)',
                              background: '#f4ecd8',
                              color: '#1d3b2e',
                              borderRadius: '9px',
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                            }}
                          >
                            <b style={{ display: 'block', fontSize: '15px' }}>{ringkasan.totalSesi} Sesi</b>
                            Bulan Ini
                          </div>

                          <svg viewBox="0 0 400 130" preserveAspectRatio="none" role="img" aria-label="Grafik sesi game selesai">
                            <defs>
                              <linearGradient id="portal-g" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0" stopColor="#f4ecd8" stopOpacity=".3" />
                                <stop offset="1" stopColor="#f4ecd8" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            {/* Area fill */}
                            <path
                              d="M 0 110 Q 50 100, 100 85 T 200 70 T 300 45 T 360 22 L 360 130 L 0 130 Z"
                              fill="url(#portal-g)"
                            />
                            {/* Band vertical marker */}
                            <line
                              x1="360"
                              x2="360"
                              y1="0"
                              y2="130"
                              stroke="#f4ecd8"
                              strokeOpacity=".25"
                              strokeWidth="14"
                            />
                            {/* Yellow chalk curve */}
                            <path
                              d="M 0 110 Q 50 100, 100 85 T 200 70 T 300 45 T 360 22"
                              fill="none"
                              stroke="#f2c230"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                            {/* Yellow dot with white stroke */}
                            <circle cx="360" cy="22" r="6" fill="#f2c230" stroke="#f4ecd8" strokeWidth="2" />
                          </svg>
                        </div>

                        {/* Barisan Bulan */}
                        <div className="portal-months">
                          {MONTHS.map((m, idx) => (
                            <span
                              key={m}
                              className={idx === currentMonthIdx ? 'cur' : undefined}
                            >
                              {m}
                            </span>
                          ))}
                        </div>

                        {/* Barisan 3 Angka Statistik */}
                        <div className="portal-stats-row">
                          <div>
                            <small>Template tersedia</small>
                            <b>{ringkasan.totalTemplate}</b>
                            <small>Template</small>
                          </div>
                          <div className="mid">
                            <small>Sesi game selesai</small>
                            <b>{ringkasan.totalSesi}</b>
                            <small>Total sesi</small>
                          </div>
                          <div>
                            <small>Papan tersimpan</small>
                            <b>{ringkasan.totalPapan}</b>
                            <small>Papan</small>
                          </div>
                        </div>
                      </article>

                      {/* Right Action Buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Tombol Merah: Buat Template Kuis Baru */}
                        <button
                          type="button"
                          onClick={() => navigate('/guru/template/baru')}
                          className="portal-big k"
                        >
                          <div className="portal-ico">
                            <Plus className="w-6 h-6 text-[#f4ecd8]" />
                          </div>
                          <div>
                            <h3>Buat Template Kuis Baru</h3>
                            <p>Susun soal materi untuk dimainkan bersama kelas.</p>
                          </div>
                          <span className="portal-go">
                            <ArrowRight className="w-4 h-4 text-[#f4ecd8]" />
                          </span>
                        </button>

                        {/* Tombol Papan Tulis Digital */}
                        <button
                          type="button"
                          onClick={handleBuatPapanBaru}
                          disabled={actionLoadingId === 'buat_papan'}
                          className="portal-big p"
                        >
                          <div className="portal-ico">
                            <PenTool className="w-6 h-6 text-[#f4ecd8]" />
                          </div>
                          <div>
                            <h3>Buka Papan Tulis Digital</h3>
                            <p>Kanvas tak terbatas untuk menjelaskan materi.</p>
                          </div>
                          <span className="portal-go">
                            <ArrowRight className="w-4 h-4 text-[#f4ecd8]" />
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Section: Template Game Terbaru */}
                    <div className="portal-sec" style={{ margin: '4px 0 -6px' }}>
                      <span>Template Game Terbaru</span>
                      <button
                        type="button"
                        onClick={() => navigate('/guru?tab=template')}
                        style={{ color: '#f2c230' }}
                      >
                        Lihat Semua
                      </button>
                    </div>

                    {/* 3 Template Cards Sesuai Gambar 1 (.pc .card) */}
                    <div className="portal-cards-grid">
                      {ringkasan.templateTerbaru.slice(0, 3).map((tmpl, idx) => {
                        const totalSesi = Math.max(1, ringkasan.totalSesi);
                        const playedCount = idx === 0 ? Math.min(totalSesi, 2) : 1;
                        const percentage = Math.round((playedCount / totalSesi) * 100);

                        return (
                          <div key={tmpl.id} className="portal-card portal-pc">
                            {/* Floating Badge di atas kartu */}
                            <div className="badge">
                              {tmpl.mode === 'multi' ? (
                                <BookOpen className="w-6 h-6" />
                              ) : (
                                <BookOpen className="w-6 h-6" />
                              )}
                            </div>

                            <div>
                              <h4>{tmpl.judul}</h4>
                              <div style={{ fontSize: '12px', color: '#6b7d6c', marginTop: '4px' }}>
                                {tmpl.jumlahSoal} Soal Tersedia • Tarik Tambang
                              </div>

                              {/* Progress bar porsi sesi */}
                              <div className="portal-prow">
                                <span>Porsi sesi</span>
                                <b>{percentage}%</b>
                              </div>
                              <div className="portal-bar">
                                <i style={{ width: `${percentage}%` }} />
                              </div>
                            </div>

                            {/* Footer: X dari Y sesi & tombol Mulai */}
                            <div className="portal-foot">
                              <span>{playedCount} dari {totalSesi} sesi</span>
                              <button
                                type="button"
                                onClick={() => handleMulaiGame(tmpl.id, tmpl.mode)}
                                className="portal-chip"
                              >
                                {tmpl.mode === 'multi' ? 'Mulai Lomba' : 'Mulai Game Solo'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Aside Panel Kanan (.card .panel) Sesuai Gambar 1 */}
                  <aside className="portal-card portal-panel">
                    <div className="portal-sec">
                      <span>Riwayat Sesi</span>
                      <button
                        type="button"
                        onClick={() => navigate('/guru?tab=riwayat')}
                      >
                        Lihat semua
                      </button>
                    </div>

                    {/* Tab Riwayat vs Template */}
                    <div className="portal-tabs">
                      <button
                        type="button"
                        className={subTabAside === 'hist' ? 'on' : ''}
                        onClick={() => setSubTabAside('hist')}
                      >
                        Riwayat
                      </button>
                      <button
                        type="button"
                        className={subTabAside === 'tpl' ? 'on' : ''}
                        onClick={() => setSubTabAside('tpl')}
                      >
                        Template
                      </button>
                    </div>

                    {/* Daftar Riwayat Sesi */}
                    <div className="portal-fl">
                      {subTabAside === 'hist' ? (
                        riwayatList.slice(0, 4).map((r) => {
                          const dateObj = new Date(r.tanggal);
                          const dateStr = `${dateObj.getDate()} ${MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()}, ${String(dateObj.getHours()).padStart(2, '0')}.${String(dateObj.getMinutes()).padStart(2, '0')}`;
                          const isRedWin = r.timMenang === 'merah';
                          const isWhiteWin = r.timMenang === 'putih';

                          return (
                            <div key={r.id} className="portal-fr">
                              <div className={`portal-av ${isRedWin ? 'r' : isWhiteWin ? 'b' : ''}`}>
                                {isRedWin ? '🔴' : isWhiteWin ? '⚪' : '🤝'}
                              </div>
                              <div className="t">
                                <b>{r.templateJudul}</b>
                                <small>
                                  Pemenang: {isRedWin ? 'TIM MERAH' : isWhiteWin ? 'TIM PUTIH' : 'SERI'}
                                  <br />
                                  {dateStr}
                                </small>
                              </div>
                              <button
                                type="button"
                                onClick={() => setModalDetailSessionId(r.id)}
                                className="portal-msg"
                                title="Lihat detail sesi"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        templates.slice(0, 4).map((t) => (
                          <div key={t.id} className="portal-fr">
                            <div className="portal-av b">
                              <BookOpen className="w-4 h-4 text-[#f4ecd8]" />
                            </div>
                            <div className="t">
                              <b>{t.judul}</b>
                              <small>{t.jumlahSoal || t._count?.questions || 0} Soal • {t.mode}</small>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleMulaiGame(t.id, t.mode)}
                              className="portal-msg"
                              title="Mainkan template"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Section: Papan Tulis Preview */}
                    <div className="portal-sec" style={{ marginTop: '4px' }}>
                      <span>Papan Tulis</span>
                      <button
                        type="button"
                        onClick={() => navigate('/guru?tab=papan')}
                      >
                        Lihat
                      </button>
                    </div>

                    {/* Mini Board Preview */}
                    <div className="portal-board-prev">
                      <svg viewBox="0 0 250 112" preserveAspectRatio="none" aria-hidden="true">
                        <path
                          d="M20 70 Q 70 30, 130 65 T 230 45"
                          stroke="#f4ecd8"
                          strokeWidth="2.5"
                          fill="none"
                          opacity=".8"
                        />
                        <circle cx="210" cy="35" r="14" stroke="#f2c230" strokeWidth="2.5" fill="none" opacity=".85" />
                      </svg>
                      <span>{boards[0]?.judul || 'Papan tanpa judul 1'}</span>
                    </div>

                    {/* Tombol Buat Papan Baru */}
                    <button
                      type="button"
                      onClick={handleBuatPapanBaru}
                      className="portal-btn red sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <Plus className="w-4 h-4" />
                      <span>Buat Papan Baru</span>
                    </button>
                  </aside>
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
        </main>
      </div>

      {/* DUDUKAN PAPAN TULIS COKLAT DI PALING BAWAH (MEMANJANG FULL DARI UJUNG KANAN KE KIRI) */}
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
