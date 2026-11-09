import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { apiRequest } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { Button, Card, Modal } from '../../components';
import { soundEffects } from '../../lib/soundEffects';
import { HasilGachaGigitanProps } from '../siswa/KerupukVirtual';
import {
  Trophy,
  Users,
  Play,
  StopCircle,
  Loader2,
  Copy,
  Check,
  Flame,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface PesertaKerupuk {
  id: string;
  nama: string;
  connected?: boolean;
  sisaKerupuk: number;
  skorTotal: number;
  skorPengetahuan?: number;
  skorKeberuntungan?: number;
  totalBenar?: number;
  totalSalah?: number;
  streakBenar: number;
  selesaiKerupuk?: boolean;
  terakhirGigitan?: HasilGachaGigitanProps;
  rataRataWaktuJawabMs?: number;
  jumlahJawab?: number;
}

export default function LayarHostKerupuk() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Status dasar sesi
  const [loading, setLoading] = useState(true);
  const [errorPesan, setErrorPesan] = useState<string | null>(null);
  const [templateJudul, setTemplateJudul] = useState('');
  const [token, setToken] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [joinUrl, setJoinUrl] = useState('');
  const [status, setStatus] = useState<'lobi' | 'jalan' | 'selesai'>('lobi');

  // Peserta & Leaderboard
  const [leaderboard, setLeaderboard] = useState<PesertaKerupuk[]>([]);
  const [totalPeserta, setTotalPeserta] = useState(0);

  // In-Game
  const [answeredCount, setAnsweredCount] = useState(0);
  const [liveFeed, setLiveFeed] = useState<Array<{ id: string; teks: string; tipe: string }>>([]);

  // Hasil Akhir
  const [hasilAkhir, setHasilAkhir] = useState<any>(null);

  // Modal Akhiri
  const [modalAkhiriOpen, setModalAkhiriOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEffects.getMuted());
  const [copied, setCopied] = useState(false);

  // 1. Fetch data awal sesi dari REST API
  const fetchSesi = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiRequest<{ session: any }>(`/sesi/${id}`);
      const s = res.session;

      setTemplateJudul(s.templateJudul);
      setToken(s.token);
      setQrDataUrl(s.qrDataUrl || '');
      setJoinUrl(s.joinUrl || '');
      setStatus(s.status);
      setTotalPeserta(s.totalPeserta ?? 0);
      setLeaderboard(s.leaderboard || s.daftarPeserta || []);

      if (s.status === 'selesai' && s.hasil) {
        setHasilAkhir(s.hasil);
      }
    } catch (err: any) {
      setErrorPesan(err.pesan || 'Gagal memuat sesi permainan.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSesi();
  }, [fetchSesi]);

  // 2. Setup Socket.IO Event Listeners untuk Host
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();

    // Host bergabung ke room sesi
    socket.emit('sesi:host_join', { sessionId: id });

    // Listener 1: Update Lobi
    const handleLobiUpdate = (data: {
      totalPeserta: number;
      daftarPeserta: any[];
    }) => {
      setTotalPeserta(data.totalPeserta);
      if (data.daftarPeserta) {
        setLeaderboard(data.daftarPeserta);
      }
    };

    // Listener 2: Permainan Dimulai
    const handleGameMulai = () => {
      setStatus('jalan');
      soundEffects.playWhistle();
    };

    // Listener 3: Update Kerupuk Real-Time
    const handleKerupukUpdate = (data: {
      leaderboard: PesertaKerupuk[];
      answeredCount: number;
      totalCount: number;
      terakhirJawab?: {
        pesertaId: string;
        nama: string;
        benar: boolean;
        gacha?: HasilGachaGigitanProps | null;
        sisaKerupuk: number;
      };
    }) => {
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
      setAnsweredCount(data.answeredCount);

      // Tambahkan item feed aktivitas
      if (data.terakhirJawab) {
        const item = data.terakhirJawab;
        let pesan = '';
        if (item.benar && item.gacha) {
          pesan = `${item.nama} dapat ${item.gacha.label} (-${item.gacha.berkurangPersen}%)!`;
        } else if (item.benar) {
          pesan = `${item.nama} menjawab benar (+100 pt)!`;
        } else {
          pesan = `${item.nama} belum tepat.`;
        }

        setLiveFeed((prev) => [
          { id: Math.random().toString(), teks: pesan, tipe: item.gacha?.tipe || 'biasa' },
          ...prev.slice(0, 4),
        ]);
      }
    };

    // Listener 4: Seluruh Sesi Selesai
    const handleSesiSelesai = (data: { hasil: any }) => {
      setHasilAkhir(data.hasil);
      setStatus('selesai');
      soundEffects.playVictoryFanfare();
    };

    socket.on('lobi:update', handleLobiUpdate);
    socket.on('game:mulai', handleGameMulai);
    socket.on('kerupuk:update', handleKerupukUpdate);
    socket.on('sesi:selesai', handleSesiSelesai);

    return () => {
      socket.off('lobi:update', handleLobiUpdate);
      socket.off('game:mulai', handleGameMulai);
      socket.off('kerupuk:update', handleKerupukUpdate);
      socket.off('sesi:selesai', handleSesiSelesai);
    };
  }, [id]);

  // Handler: Guru Memulai Lomba Makan Kerupuk
  const handleMulaiLomba = () => {
    if (!id || totalPeserta === 0 || isStarting) return;
    setIsStarting(true);
    const socket = getSocket();
    socket.emit('sesi:mulai', { sessionId: id }, (res: any) => {
      setIsStarting(false);
      if (!res?.success) {
        alert(res?.pesan || 'Gagal memulai permainan.');
      }
    });
  };

  // Handler: Guru Mengakhiri Permainan Manual
  const handleKonfirmasiAkhiri = () => {
    if (!id) return;
    setIsEnding(true);
    const socket = getSocket();
    socket.emit('sesi:akhiri_manual', { sessionId: id }, (res: any) => {
      setIsEnding(false);
      setModalAkhiriOpen(false);
      if (res?.success) {
        setHasilAkhir(res.hasil);
        setStatus('selesai');
        soundEffects.playVictoryFanfare();
      } else {
        alert(res?.pesan || 'Gagal mengakhiri permainan.');
      }
    });
  };

  const handleCopyLink = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSound = () => {
    const muted = soundEffects.toggleMute();
    setIsMuted(muted);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-bold text-slate-300">Menyiapkan Layar Proyektor...</p>
      </div>
    );
  }

  if (errorPesan) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md p-6 bg-slate-800 border-slate-700 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Terjadi Kesalahan</h2>
          <p className="text-slate-400 text-sm mb-6">{errorPesan}</p>
          <Button variant="utama" onClick={() => navigate('/guru')} className="w-full">
            Kembali ke Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // FASE 1: LOBI PROYEKTOR (Menunggu Siswa Bergabung via PIN & QR Code)
  // -------------------------------------------------------------------------
  if (status === 'lobi') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none">
        {/* Top Bar Proyektor */}
        <header className="flex justify-between items-center bg-slate-800/80 backdrop-blur border border-slate-700/80 rounded-2xl p-4 sm:px-6 shadow-md">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-amber-400 block">
              Makan Kerupuk Challenge • Layar Kelas
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white">{templateJudul}</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSound}
              className="p-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
              title={isMuted ? 'Nyalakan Suara' : 'Bisukan Suara'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
            </button>
            <Button
              variant="hantu"
              onClick={() => navigate('/guru')}
              className="text-xs text-slate-300 border border-slate-600 hover:bg-slate-700"
            >
              Dashboard
            </Button>
          </div>
        </header>

        {/* Area Utama Lobi (Dua Kolom: PIN/QR di Kiri, Daftar Siswa di Kanan) */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto py-6 items-center">
          {/* Kolom Kiri: PIN Raksasa & QR Code */}
          <div className="lg:col-span-5 flex flex-col items-center bg-slate-800/90 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Gabung di HP Masing-Masing
              </span>
              <p className="text-sm font-semibold text-amber-300">
                Buka tautan atau pindai kode QR di bawah
              </p>
            </div>

            {/* QR Code */}
            {qrDataUrl && (
              <div className="bg-white p-3 rounded-2xl shadow-inner border-4 border-amber-400">
                <img
                  src={qrDataUrl}
                  alt="QR Code Sesi"
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                />
              </div>
            )}

            {/* PIN 6 Angka Raksasa */}
            <div className="w-full bg-slate-900/90 border border-slate-700 rounded-2xl p-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                KODE PIN GAME
              </span>
              <div className="text-4xl sm:text-5xl font-mono font-black tracking-[0.25em] text-amber-400">
                {token}
              </div>
            </div>

            {/* Tombol Salin Tautan */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 py-2.5 px-4 rounded-xl w-full transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tautan Berhasil Disalin!' : 'Salin Tautan Siswa'}</span>
            </button>
          </div>

          {/* Kolom Kanan: Siswa Tergabung & Tombol Mulai */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-slate-800/80 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-xl min-h-[460px]">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                <div className="flex items-center gap-2.5">
                  <Users className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-bold text-white">Siswa Bergabung di Lobi</h2>
                </div>
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 font-mono font-black text-sm rounded-xl">
                  {totalPeserta} Siswa
                </span>
              </div>

              {/* Grid Bubble Peserta */}
              <div className="mt-5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto text-amber-400 animate-pulse">
                      <Users className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-400">
                      Menunggu siswa memasukkan PIN dan bergabung...
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {leaderboard.map((p, idx) => (
                      <div
                        key={p.id || idx}
                        className="bg-slate-700/70 border border-slate-600 rounded-xl p-3 flex items-center gap-2.5 animate-fade-in shadow-sm"
                      >
                        <span className="text-lg">🍘</span>
                        <div className="overflow-hidden">
                          <p className="font-bold text-xs text-white truncate">{p.nama}</p>
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Terhubung
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tombol Mulai Permainan Raksasa */}
            <div className="pt-6 border-t border-slate-700">
              <Button
                variant="utama"
                onClick={handleMulaiLomba}
                disabled={totalPeserta === 0 || isStarting}
                className="w-full py-4 text-base font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {isStarting
                    ? 'Memulai Sesi...'
                    : totalPeserta === 0
                    ? 'Menunggu Siswa Masuk...'
                    : `Mulai Lomba Makan Kerupuk (${totalPeserta} Siswa)`}
                </span>
              </Button>
            </div>
          </div>
        </main>

        <footer className="text-center text-xs text-slate-500 font-semibold">
          DISCERE • Platform Pembelajaran Interaktif Bertema Lomba Edukasi
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // FASE 2: PERMAINAN BERJALAN (Layar Kelas / Proyektor)
  // -------------------------------------------------------------------------
  if (status === 'jalan') {
    const totalLudes = leaderboard.filter((p) => p.sisaKerupuk === 0).length;

    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 select-none">
        {/* Header Bar: Status Sesi & Kontrol Guru */}
        <header className="flex justify-between items-center bg-slate-800/90 border border-slate-700 rounded-2xl p-4 shadow-md">
          <div className="flex items-center gap-4">
            <span className="px-3.5 py-1.5 bg-amber-500 text-slate-950 text-xs font-black rounded-xl uppercase tracking-wider">
              Lomba Berlangsung
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">{templateJudul}</h2>
              <span className="text-[11px] text-slate-400 font-semibold block">
                Pertanyaan berulang mandiri sampai kerupuk ludes
              </span>
            </div>
          </div>

          {/* Indikator Status Siswa Ludes */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">Kerupuk Ludes:</span>
              <span className="text-sm font-black font-mono text-emerald-400">
                {totalLudes} / {totalPeserta} Siswa
              </span>
            </div>

            {answeredCount > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-400">
                <span>Total Gigitan: {answeredCount}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleToggleSound}
              className="p-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
              title={isMuted ? 'Nyalakan Suara' : 'Bisukan Suara'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <Button
              variant="hantu"
              onClick={() => setModalAkhiriOpen(true)}
              className="text-xs text-red-400 border border-red-500/40 hover:bg-red-500/10 flex items-center gap-1.5"
            >
              <StopCircle className="w-4 h-4" />
              <span>Akhiri Sesi</span>
            </Button>
          </div>
        </header>

        {/* Konten Utama: Arena Balapan Mandiri & Leaderboard 5-Kriteria */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto py-4 items-start">
          {/* Sisi Kiri (7 Kolom): Arena Balapan Makan Kerupuk Seluruh Siswa */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-800/90 border border-slate-700 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Arena Kerupuk Siswa
                  </h3>
                </div>
                <span className="text-[11px] text-amber-400 font-bold">
                  Progres Independen Real-Time
                </span>
              </div>

              {/* Grid Kartu Kerupuk Setiap Siswa */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1.5 custom-scrollbar">
                {leaderboard.map((p) => {
                  const isLudes = p.sisaKerupuk === 0;

                  return (
                    <div
                      key={p.id}
                      className={`p-3.5 rounded-2xl border transition-all text-center flex flex-col justify-between ${
                        isLudes
                          ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                          : 'bg-slate-800 border-slate-700/80 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        {/* Header Kartu: Nama & Badge Ludes */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="text-xs font-black text-white truncate max-w-[110px]" title={p.nama}>
                            {p.nama}
                          </span>
                          {p.streakBenar > 1 && (
                            <span className="text-[10px] text-orange-400 font-bold flex items-center gap-0.5">
                              <Flame className="w-3 h-3 fill-current" />
                              {p.streakBenar}
                            </span>
                          )}
                        </div>

                        {/* Indikator Sisa Kerupuk Persen */}
                        <div className="py-2 flex flex-col items-center">
                          <span
                            className={`text-2xl font-black font-mono ${
                              isLudes
                                ? 'text-emerald-400 animate-bounce'
                                : p.sisaKerupuk <= 25
                                ? 'text-red-400'
                                : p.sisaKerupuk <= 50
                                ? 'text-amber-400'
                                : 'text-slate-100'
                            }`}
                          >
                            {isLudes ? '🎉 0%' : `${p.sisaKerupuk}%`}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">
                            {isLudes ? 'Kerupuk Ludes!' : 'Sisa Kerupuk'}
                          </span>
                        </div>

                        {/* Progress Bar Mini */}
                        <div className="bg-slate-900 h-2 rounded-full overflow-hidden p-0.5 mt-1">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isLudes
                                ? 'bg-emerald-400'
                                : p.sisaKerupuk <= 25
                                ? 'bg-red-400'
                                : p.sisaKerupuk <= 50
                                ? 'bg-amber-400'
                                : 'bg-slate-200'
                            }`}
                            style={{ width: `${p.sisaKerupuk}%` }}
                          />
                        </div>
                      </div>

                      {/* Footer Info Kartu: Skor & Kecepatan */}
                      <div className="pt-3 mt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] font-mono">
                        <span className="text-amber-400 font-black">{p.skorTotal} pt</span>
                        <span className="text-blue-300 font-bold">
                          ⚡ {p.rataRataWaktuJawabMs ? `${(p.rataRataWaktuJawabMs / 1000).toFixed(1)}s` : '-'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Ticker Feed Aktivitas */}
              {liveFeed.length > 0 && (
                <div className="pt-3 border-t border-slate-700 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-black rounded-lg uppercase shrink-0">
                    Aktivitas
                  </span>
                  <p className="text-xs text-slate-200 font-semibold italic animate-fade-in line-clamp-1">
                    {liveFeed[0]?.teks}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sisi Kanan (5 Kolom): Live Kerupuk Leaderboard Kelas (5 Kriteria) */}
          <div className="lg:col-span-5 bg-slate-800/90 border border-slate-700 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Peringkat Kelas
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">
                Skor • Benar • Sisa • Kecepatan
              </span>
            </div>

            {/* List Peserta dengan Progress Bar Kerupuk */}
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1.5 custom-scrollbar">
              {leaderboard.map((p, idx) => {
                const rank = idx + 1;
                const isTop1 = rank === 1;
                const isTop2 = rank === 2;
                const isTop3 = rank === 3;
                const isLudes = p.sisaKerupuk === 0;

                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-2xl border transition-all ${
                      isTop1
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-sm'
                        : isTop2
                        ? 'bg-slate-700/40 border-slate-500/40'
                        : isTop3
                        ? 'bg-amber-900/20 border-amber-700/40'
                        : 'bg-slate-800/60 border-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={`w-6 h-6 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0 ${
                            isTop1
                              ? 'bg-amber-400 text-slate-950 font-black'
                              : isTop2
                              ? 'bg-slate-300 text-slate-900'
                              : isTop3
                              ? 'bg-amber-700 text-amber-100'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {rank}
                        </span>
                        <span className="text-xs font-bold text-white truncate">{p.nama}</span>
                        {p.streakBenar > 1 && (
                          <span className="text-[10px] text-orange-400 font-black flex items-center gap-0.5">
                            <Flame className="w-3 h-3 fill-current" />
                            {p.streakBenar}
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-2 font-mono">
                        <span className="text-xs font-black text-amber-400">
                          {p.skorTotal} pt
                        </span>
                        <span className="text-[11px] text-blue-300 font-bold">
                          ⚡{p.rataRataWaktuJawabMs ? `${(p.rataRataWaktuJawabMs / 1000).toFixed(1)}s` : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Kerupuk Tersisa Siswa */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-900 h-2 rounded-full overflow-hidden p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isLudes
                              ? 'bg-emerald-400'
                              : p.sisaKerupuk <= 25
                              ? 'bg-red-400'
                              : p.sisaKerupuk <= 50
                              ? 'bg-amber-400'
                              : 'bg-slate-200'
                          }`}
                          style={{ width: `${p.sisaKerupuk}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-300 w-14 text-right">
                        {isLudes ? 'LUDES! 🎉' : `${p.sisaKerupuk}%`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>

        {/* Modal Konfirmasi Akhiri Manual */}
        <Modal
          isOpen={modalAkhiriOpen}
          onClose={() => setModalAkhiriOpen(false)}
          title="Akhiri Sesi Permainan?"
        >
          <div className="space-y-4 text-[#1d3b2e]">
            <p className="text-xs">
              Apakah Anda yakin ingin mengakhiri sesi Makan Kerupuk sekarang? Hasil peringkat dan podium akan langsung dikalkulasikan.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-[#e0d5b8]">
              <button
                type="button"
                onClick={() => setModalAkhiriOpen(false)}
                className="px-4 py-2 border border-[#e0d5b8] text-xs font-bold rounded-lg text-[#1d3b2e] hover:bg-[#f7f2e4]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleKonfirmasiAkhiri}
                disabled={isEnding}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700"
              >
                {isEnding ? 'Mengakhiri...' : 'Ya, Akhiri Sekarang'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // FASE 3: PODIUM JUARA & REKAP KELAS LENGKAP (SELESAI)
  // -------------------------------------------------------------------------
  const finalLeaderboard: PesertaKerupuk[] = hasilAkhir?.leaderboard || leaderboard;
  const juara1 = hasilAkhir?.podium?.juara1 || finalLeaderboard[0];
  const juara2 = hasilAkhir?.podium?.juara2 || finalLeaderboard[1];
  const juara3 = hasilAkhir?.podium?.juara3 || finalLeaderboard[2];

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 sm:p-10 flex flex-col justify-between max-w-5xl mx-auto w-full select-none">
      {/* Header Selesai */}
      <header className="text-center space-y-1">
        <span className="px-4 py-1.5 bg-amber-400/20 text-amber-300 text-xs font-black rounded-full uppercase tracking-widest">
          Sesi Kuis Selesai • Podium Juara
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Makan Kerupuk Challenge 🏆</h1>
        <p className="text-xs text-slate-400">{templateJudul}</p>
      </header>

      {/* Podium Raksasa 1, 2, 3 Proyektor */}
      <div className="flex items-end justify-center gap-4 sm:gap-6 my-6 pt-8 pb-4">
        {/* Juara 2 */}
        {juara2 && (
          <div className="flex flex-col items-center w-36 sm:w-44 text-center">
            <span className="text-3xl mb-1">🥈</span>
            <span className="text-sm font-black text-slate-200 truncate w-full">
              {juara2.nama}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400 mb-2">
              {juara2.skorTotal} pt • {juara2.sisaKerupuk === 0 ? 'Ludes!' : `Sisa ${juara2.sisaKerupuk}%`}
            </span>
            <div className="w-full bg-slate-700 h-28 rounded-t-2xl flex flex-col items-center justify-center font-black text-slate-300 text-3xl border-t-4 border-slate-500 shadow-xl">
              <span>2</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Perak</span>
            </div>
          </div>
        )}

        {/* Juara 1 */}
        {juara1 && (
          <div className="flex flex-col items-center w-44 sm:w-56 text-center -mt-6">
            <span className="text-5xl mb-2 animate-bounce">👑</span>
            <span className="text-base sm:text-lg font-black text-amber-300 truncate w-full">
              {juara1.nama}
            </span>
            <span className="text-sm font-mono font-black text-amber-400 mb-2">
              {juara1.skorTotal} pt • {juara1.sisaKerupuk === 0 ? 'Ludes!' : `Sisa ${juara1.sisaKerupuk}%`}
            </span>
            <div className="w-full bg-amber-500 h-40 rounded-t-2xl flex flex-col items-center justify-center font-black text-slate-950 text-4xl border-t-4 border-amber-300 shadow-2xl shadow-amber-500/30">
              <span>1</span>
              <span className="text-xs font-black uppercase tracking-widest text-slate-950">Juara 1</span>
            </div>
          </div>
        )}

        {/* Juara 3 */}
        {juara3 && (
          <div className="flex flex-col items-center w-36 sm:w-44 text-center">
            <span className="text-3xl mb-1">🥉</span>
            <span className="text-sm font-black text-slate-200 truncate w-full">
              {juara3.nama}
            </span>
            <span className="text-xs font-mono font-bold text-slate-400 mb-2">
              {juara3.skorTotal} pt • {juara3.sisaKerupuk === 0 ? 'Ludes!' : `Sisa ${juara3.sisaKerupuk}%`}
            </span>
            <div className="w-full bg-amber-800/90 h-20 rounded-t-2xl flex flex-col items-center justify-center font-black text-amber-200 text-3xl border-t-4 border-amber-600 shadow-xl">
              <span>3</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-300">Perunggu</span>
            </div>
          </div>
        )}
      </div>

      {/* Tabel Rapor Seluruh Siswa */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-3">
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" /> Rekapitulasi Nilai & Peringkat Seluruh Siswa
        </h3>

        <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase font-black text-slate-400 border-b border-slate-700 pb-2">
              <tr>
                <th className="py-2 px-3">Rank</th>
                <th className="py-2 px-3">Nama Siswa</th>
                <th className="py-2 px-3">Skor Total</th>
                <th className="py-2 px-3">Pengetahuan</th>
                <th className="py-2 px-3">Keberuntungan (Gacha)</th>
                <th className="py-2 px-3">Sisa Kerupuk</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 font-medium">
              {finalLeaderboard.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-700/30">
                  <td className="py-2 px-3 font-bold font-mono">#{idx + 1}</td>
                  <td className="py-2 px-3 font-bold text-white">{p.nama}</td>
                  <td className="py-2 px-3 font-mono font-black text-amber-400">{p.skorTotal} pt</td>
                  <td className="py-2 px-3 text-emerald-400">+{p.skorPengetahuan ?? 0} pt</td>
                  <td className="py-2 px-3 text-amber-300">+{p.skorKeberuntungan ?? 0} pt</td>
                  <td className="py-2 px-3 font-mono font-bold">
                    {p.sisaKerupuk === 0 ? '0% (Habis)' : `${p.sisaKerupuk}%`}
                  </td>
                  <td className="py-2 px-3">
                    {p.sisaKerupuk === 0 ? (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold text-[10px]">
                        LUDES 🎉
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Tersisa</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tombol Aksi Guru */}
      <footer className="pt-4 flex justify-between items-center">
        <Button
          variant="hantu"
          onClick={() => navigate('/guru')}
          className="text-xs text-slate-300 border border-slate-600 hover:bg-slate-700"
        >
          Kembali ke Dashboard Guru
        </Button>
      </footer>
    </div>
  );
}
