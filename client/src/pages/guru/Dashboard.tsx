import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../lib/auth';
import { apiRequest } from '../../lib/api';
import { Button, Card, Badge, Modal } from '../../components';
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
  Trophy,
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
  const [subTabTemplate, setSubTabTemplate] = useState<'saya' | 'pustaka'>('saya');
  const [pencarian, setPencarian] = useState('');

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal State
  const [modalHapusId, setModalHapusId] = useState<string | null>(null);
  const [modalDetailSessionId, setModalDetailSessionId] = useState<string | null>(null);

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

  // Inisialisasi data
  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      await Promise.all([fetchRingkasan(), fetchTemplates(), fetchRiwayat()]);
      setLoading(false);
    }
    loadInitial();
  }, [fetchRingkasan, fetchTemplates, fetchRiwayat]);

  // Handler: Mulai Game Solo dari Template
  const handleMulaiGame = async (templateId: string) => {
    try {
      setActionLoadingId(templateId);
      const res = await apiRequest<{ session: { id: string } }>('/sesi', {
        method: 'POST',
        body: JSON.stringify({ templateId }),
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar Navigasi Guru */}
      <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D7262E] text-white flex items-center justify-center font-black text-xl shadow-sm">
              D
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight">Discere</span>
              <span className="block text-xs font-semibold text-slate-400">
                Portal Guru
              </span>
            </div>
          </div>

          <nav className="space-y-1.5 pt-4">
            <button
              onClick={() => navigate('/guru?tab=ringkasan')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${
                tabAktif === 'ringkasan'
                  ? 'bg-red-50 text-[#D7262E] dark:bg-red-950/40 dark:text-red-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Ringkasan
            </button>

            <button
              onClick={() => navigate('/guru?tab=template')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${
                tabAktif === 'template'
                  ? 'bg-red-50 text-[#D7262E] dark:bg-red-950/40 dark:text-red-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Template Game
            </button>

            <button
              onClick={() => navigate('/guru?tab=riwayat')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${
                tabAktif === 'riwayat'
                  ? 'bg-red-50 text-[#D7262E] dark:bg-red-950/40 dark:text-red-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <History className="w-4 h-4" /> Riwayat Sesi
            </button>

            <button
              onClick={() => navigate('/guru?tab=papan')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left ${
                tabAktif === 'papan'
                  ? 'bg-red-50 text-[#D7262E] dark:bg-red-950/40 dark:text-red-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <PenTool className="w-4 h-4" /> Papan Tulis
            </button>
          </nav>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="text-xs text-slate-500">
            Masuk sebagai:
            <div className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
              {user?.nama}
            </div>
            {user?.sekolah && (
              <div className="text-xs text-slate-400 truncate">{user.sekolah}</div>
            )}
          </div>

          <Button
            variant="hantu"
            size="sm"
            onClick={handleKeluar}
            icon={<LogOut className="w-4 h-4" />}
            className="w-full justify-start text-red-600 dark:text-red-400"
          >
            Keluar
          </Button>
        </div>
      </aside>

      {/* Konten Area Utama */}
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full space-y-8">
        {/* Header Bar */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-3xl font-black">
              {tabAktif === 'ringkasan' && 'Ringkasan Aktivitas'}
              {tabAktif === 'template' && 'Manajemen Template Game'}
              {tabAktif === 'riwayat' && 'Riwayat Pertandingan'}
              {tabAktif === 'papan' && 'Papan Tulis Interaktif'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Selamat mengajar, Bapak/Ibu {user?.nama}.
            </p>
          </div>

          {tabAktif === 'template' && (
            <Button
              variant="utama"
              size="md"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/guru/template/baru')}
            >
              Buat Template Baru
            </Button>
          )}
        </header>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#D7262E] mb-3" />
            <p className="font-medium">Memuat data dashboard...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: RINGKASAN */}
            {tabAktif === 'ringkasan' && ringkasan && (
              <div className="space-y-8">
                {/* Kartu Angka Utama */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <Card padding="md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Template Tersedia
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                          {ringkasan.totalTemplate}
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-[#D7262E] flex items-center justify-center font-bold">
                        <BookOpen className="w-6 h-6" />
                      </div>
                    </div>
                  </Card>

                  <Card padding="md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Sesi Game Selesai
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                          {ringkasan.totalSesi}
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 flex items-center justify-center font-bold">
                        <Trophy className="w-6 h-6" />
                      </div>
                    </div>
                  </Card>

                  <Card padding="md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Papan Tersimpan
                        </div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                          {ringkasan.totalPapan}
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-[#1E2A5A] dark:text-blue-300 flex items-center justify-center font-bold">
                        <PenTool className="w-6 h-6" />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Tombol Aksi Cepat */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => navigate('/guru/template/baru')}
                    className="p-6 rounded-3xl bg-gradient-to-r from-[#D7262E] to-[#B91C23] text-white flex items-center justify-between shadow-md hover:shadow-lg transition-all text-left"
                  >
                    <div>
                      <div className="font-extrabold text-xl mb-1">
                        Buat Template Kuis Baru
                      </div>
                      <div className="text-xs opacity-90 font-medium">
                        Susun soal materi untuk dimainkan bersama kelas.
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                      <Plus className="w-6 h-6" />
                    </div>
                  </button>

                  <button
                    onClick={() => alert('Papan tulis interaktif Fabric.js akan aktif pada Tahap 6.')}
                    className="p-6 rounded-3xl bg-gradient-to-r from-[#1E2A5A] to-[#2B3B7E] text-white flex items-center justify-between shadow-md hover:shadow-lg transition-all text-left"
                  >
                    <div>
                      <div className="font-extrabold text-xl mb-1">
                        Buka Papan Tulis Digital
                      </div>
                      <div className="text-xs opacity-90 font-medium">
                        Kanvas tak terbatas untuk menjelaskan materi.
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                      <PenTool className="w-6 h-6" />
                    </div>
                  </button>
                </div>

                {/* Sesi Terakhir */}
                {ringkasan.sesiTerakhir && (
                  <Card padding="md" className="border-2 border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Pertandingan Terakhir
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                          {ringkasan.sesiTerakhir.templateJudul}
                        </h3>
                        <div className="text-xs text-slate-500 mt-1">
                          Pemenang:{' '}
                          <strong className="uppercase">
                            {ringkasan.sesiTerakhir.timMenang === 'merah'
                              ? '🔴 Tim Merah'
                              : ringkasan.sesiTerakhir.timMenang === 'putih'
                              ? '⚪ Tim Putih'
                              : '🤝 Seri'}
                          </strong>{' '}
                          • Skor: Merah {ringkasan.sesiTerakhir.skorMerah} vs Putih{' '}
                          {ringkasan.sesiTerakhir.skorPutih}
                        </div>
                      </div>
                      <Button
                        variant="sekunder"
                        size="sm"
                        onClick={() => setModalDetailSessionId(ringkasan.sesiTerakhir!.id)}
                      >
                        Lihat Analisis Sesi
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Template Terbaru */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">Template Game Terbaru</h3>
                    <button
                      onClick={() => navigate('/guru?tab=template')}
                      className="text-sm font-semibold text-[#D7262E] hover:underline"
                    >
                      Lihat Semua
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ringkasan.templateTerbaru.map((tmpl) => (
                      <Card key={tmpl.id} padding="md" hoverable className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">
                              {tmpl.judul}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="merah" size="sm">
                                Tarik Tambang
                              </Badge>
                              <Badge variant="slate" size="sm">
                                {tmpl.jumlahSoal} Soal
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="utama"
                            size="sm"
                            icon={<Play className="w-4 h-4 fill-current" />}
                            onClick={() => handleMulaiGame(tmpl.id)}
                            loading={actionLoadingId === tmpl.id}
                          >
                            Mulai
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TEMPLATE GAME */}
            {tabAktif === 'template' && (
              <div className="space-y-6">
                {/* Kontrol Tab Template Saya vs Pustaka */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl w-fit">
                    <button
                      onClick={() => setSubTabTemplate('saya')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        subTabTemplate === 'saya'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Template Saya ({templates.length})
                    </button>
                    <button
                      onClick={() => setSubTabTemplate('pustaka')}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        subTabTemplate === 'pustaka'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Pustaka Resmi ({pustakaResmi.length})
                    </button>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari materi..."
                      value={pencarian}
                      onChange={(e) => setPencarian(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#D7262E]"
                    />
                  </div>
                </div>

                {/* List Template */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(subTabTemplate === 'saya' ? templates : pustakaResmi).map((tmpl) => {
                    const jumlahSoal = tmpl._count?.questions ?? tmpl.jumlahSoal ?? 0;
                    return (
                      <Card key={tmpl.id} padding="md" className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="merah" size="sm">
                                Tarik Tambang
                              </Badge>
                              <Badge variant="biru" size="sm">
                                Mode Solo
                              </Badge>
                            </div>
                            <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">
                              {tmpl.judul}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                              {jumlahSoal} Soal Tersedia
                            </p>
                          </div>
                        </div>

                        {/* Aksi Template */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                          {subTabTemplate === 'saya' ? (
                            <>
                              <Button
                                variant="utama"
                                size="sm"
                                icon={<Play className="w-4 h-4 fill-current" />}
                                onClick={() => handleMulaiGame(tmpl.id)}
                                loading={actionLoadingId === tmpl.id}
                              >
                                Mulai Game Solo
                              </Button>

                              <div className="flex items-center gap-1">
                                <Button
                                  variant="hantu"
                                  size="sm"
                                  icon={<Edit3 className="w-4 h-4" />}
                                  onClick={() => navigate(`/guru/template/${tmpl.id}/ubah`)}
                                  title="Ubah Template"
                                />
                                <Button
                                  variant="hantu"
                                  size="sm"
                                  icon={<Copy className="w-4 h-4" />}
                                  onClick={() => handleDuplikat(tmpl.id)}
                                  loading={actionLoadingId === tmpl.id}
                                  title="Duplikat Template"
                                />
                                <Button
                                  variant="hantu"
                                  size="sm"
                                  icon={<Trash2 className="w-4 h-4 text-red-500" />}
                                  onClick={() => setModalHapusId(tmpl.id)}
                                  title="Hapus Template"
                                />
                              </div>
                            </>
                          ) : (
                            <Button
                              variant="ai"
                              size="sm"
                              icon={<Copy className="w-4 h-4" />}
                              onClick={() => handleDuplikat(tmpl.id)}
                              loading={actionLoadingId === tmpl.id}
                            >
                              Salin ke Template Saya
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {(subTabTemplate === 'saya' ? templates : pustakaResmi).length === 0 && (
                  <div className="py-12 text-center text-slate-500">
                    <p className="font-semibold">Belum ada template yang sesuai.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: RIWAYAT PERTANDINGAN */}
            {tabAktif === 'riwayat' && (
              <div className="space-y-4">
                {riwayatList.length === 0 ? (
                  <Card padding="lg" className="text-center py-12 text-slate-500 space-y-3">
                    <History className="w-10 h-10 mx-auto text-slate-400" />
                    <p className="font-bold text-lg">Belum Ada Riwayat Permainan</p>
                    <p className="text-sm max-w-sm mx-auto">
                      Sesi game solo yang telah selesai dimainkan akan otomatis tersimpan di sini.
                    </p>
                    <Button
                      variant="utama"
                      size="sm"
                      onClick={() => navigate('/guru?tab=template')}
                    >
                      Buka Template Game
                    </Button>
                  </Card>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    {riwayatList.map((r) => (
                      <div
                        key={r.id}
                        className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                              Mode {r.mode}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500">
                              {new Date(r.tanggal).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-lg text-slate-900 dark:text-white">
                            {r.templateJudul}
                          </h4>
                          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            Pemenang:{' '}
                            <span className="font-bold text-slate-900 dark:text-white uppercase">
                              {r.timMenang === 'merah'
                                ? '🔴 Tim Merah'
                                : r.timMenang === 'putih'
                                ? '⚪ Tim Putih'
                                : '🤝 Seri'}
                            </span>{' '}
                            (Skor: {r.skorMerah} vs {r.skorPutih}) • Posisi Tali:{' '}
                            <span className="font-mono font-bold">
                              {r.posisiAkhir > 0 ? `+${r.posisiAkhir}` : r.posisiAkhir}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="sekunder"
                          size="sm"
                          onClick={() => setModalDetailSessionId(r.id)}
                        >
                          Lihat Detail
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PAPAN TULIS (INFO JADWAL) */}
            {tabAktif === 'papan' && (
              <Card padding="lg" className="text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-blue-100 dark:bg-blue-950/60 text-[#1E2A5A] dark:text-blue-300 flex items-center justify-center mx-auto">
                  <PenTool className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black">Papan Tulis Interaktif Discere</h2>
                <p className="text-slate-600 dark:text-slate-300 max-w-md mx-auto text-sm">
                  Kanvas tak terbatas berbasis Fabric.js, alat bantu gambar bebas, bentuk, rumus, dan kolaborasi murid akan hadir pada <strong>Tahap 6</strong>.
                </p>
                <div className="pt-2">
                  <Button variant="sekunder" size="md" onClick={() => navigate('/guru?tab=template')}>
                    Coba Game Solo Sekarang
                  </Button>
                </div>
              </Card>
            )}
          </>
        )}
      </main>

      {/* Modal Konfirmasi Hapus Template */}
      <Modal
        isOpen={Boolean(modalHapusId)}
        onClose={() => setModalHapusId(null)}
        title="Hapus Template Materi?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Apakah Anda yakin ingin menghapus template ini? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button variant="hantu" onClick={() => setModalHapusId(null)}>
              Batal
            </Button>
            <Button
              variant="utama"
              onClick={handleKonfirmasiHapus}
              loading={Boolean(actionLoadingId)}
            >
              Ya, Hapus
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Detail Riwayat */}
      <RiwayatDetailModal
        sessionId={modalDetailSessionId}
        isOpen={Boolean(modalDetailSessionId)}
        onClose={() => setModalDetailSessionId(null)}
      />
    </div>
  );
}
