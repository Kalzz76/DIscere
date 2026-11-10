import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { apiRequest } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { VisualisasiTali } from './VisualisasiTali';
import { Button, Card, Modal } from '../../components';
import { soundEffects } from '../../lib/soundEffects';
import {
  Trophy,
  Users,
  Play,
  StopCircle,
  Clock,
  RotateCcw,
  Loader2,
  ShieldAlert,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface PesertaItem {
  id: string;
  nama: string;
  tim: 'merah' | 'putih' | null;
  connected: boolean;
}

interface SoalItem {
  id: string;
  nomorSoal: number;
  totalSoal: number;
  teks: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  endsAt?: number;
}

interface HasilPermainan {
  timMenang: 'merah' | 'putih' | 'seri';
  posisiAkhir: number;
  skorMerah: number;
  skorPutih: number;
}

export default function LayarHostMulti() {
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

  // Peserta
  const [daftarPeserta, setDaftarPeserta] = useState<PesertaItem[]>([]);
  const [totalPeserta, setTotalPeserta] = useState(0);

  // In-Game
  const [soalAktif, setSoalAktif] = useState<SoalItem | null>(null);
  const [sisaDetik, setSisaDetik] = useState(15);
  const [taliPosition, setTaliPosition] = useState(0);
  const [skorMerah, setSkorMerah] = useState(0);
  const [skorPutih, setSkorPutih] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  // Intermission (Penjelasan & Jawaban Benar per Soal)
  const [rekapSoal, setRekapSoal] = useState<{
    tampil: boolean;
    jawabanBenar?: string;
    penjelasan?: string | null;
    benarCount?: number;
    salahCount?: number;
  } | null>(null);

  // Hasil Akhir
  const [hasilAkhir, setHasilAkhir] = useState<HasilPermainan | null>(null);

  // Modal Akhiri
  const [modalAkhiriOpen, setModalAkhiriOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEffects.getMuted());
  const [isMainLagiLoading, setIsMainLagiLoading] = useState(false);

  // Timer interval ref
  const countdownIntervalRef = useRef<any>(null);

  // Fungsi sinkronisasi timer lokal dengan endsAt dari server
  const startCountdown = useCallback((endsAtTimestamp?: number) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (!endsAtTimestamp) {
      setSisaDetik(15);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diffMs = endsAtTimestamp - now;
      const detik = Math.max(0, Math.ceil(diffMs / 1000));
      setSisaDetik(detik);
      if (detik <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }
    };

    updateTimer();
    countdownIntervalRef.current = setInterval(updateTimer, 200);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

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
      setTaliPosition(s.taliPosition ?? 0);
      setSkorMerah(s.skorMerah ?? 0);
      setSkorPutih(s.skorPutih ?? 0);
      setTotalPeserta(s.totalPeserta ?? 0);
      setDaftarPeserta(s.daftarPeserta || []);

      if (s.status === 'jalan' && s.soalSaatIni) {
        setSoalAktif(s.soalSaatIni);
        startCountdown(s.soalSaatIni.endsAt);
      } else if (s.status === 'selesai') {
        setStatus('selesai');
      }
    } catch (err: any) {
      setErrorPesan(err.pesan || 'Gagal memuat sesi permainan.');
    } finally {
      setLoading(false);
    }
  }, [id, startCountdown]);

  useEffect(() => {
    fetchSesi();
  }, [fetchSesi]);

  // 2. Setup Socket.IO Event Listener untuk Host
  useEffect(() => {
    if (!id) return;

    const socket = getSocket();

    // Gabungkan Host ke Room Sesi
    socket.emit('sesi:host_join', { sessionId: id });

    // Listener Pembaruan Lobi
    const handleLobiUpdate = (data: { totalPeserta: number; daftarPeserta: PesertaItem[] }) => {
      setTotalPeserta(data.totalPeserta);
      setDaftarPeserta(data.daftarPeserta);
    };

    // Listener Pembagian Tim
    const handleTeamsAssigned = (data: { daftarPeserta: PesertaItem[] }) => {
      setDaftarPeserta(data.daftarPeserta);
    };

    // Listener Soal Baru Ditampilkan
    const handleSoalTampil = (data: any) => {
      setStatus('jalan');
      setSoalAktif({
        id: data.questionId,
        nomorSoal: data.nomorSoal,
        totalSoal: data.totalSoal,
        teks: data.teks,
        opsiA: data.opsiA,
        opsiB: data.opsiB,
        opsiC: data.opsiC,
        endsAt: data.endsAt,
      });
      setAnsweredCount(0);
      setRekapSoal(null);
      startCountdown(data.endsAt);
      soundEffects.playWhistle();
    };

    // Listener Pergerakan Tali & Progress Jawaban
    const handleTaliUpdate = (data: {
      taliPosition: number;
      skorMerah: number;
      skorPutih: number;
      answeredCount?: number;
    }) => {
      setTaliPosition(data.taliPosition);
      setSkorMerah(data.skorMerah);
      setSkorPutih(data.skorPutih);
      if (data.answeredCount !== undefined) {
        setAnsweredCount(data.answeredCount);
      }
      soundEffects.playRopeTug();
    };

    // Listener Penutupan Soal (Intermission)
    const handleSoalSelesai = (data: {
      questionIndex: number;
      jawabanBenar: string;
      penjelasan?: string | null;
      taliPosition: number;
      skorMerah: number;
      skorPutih: number;
      isGameFinished: boolean;
      stats?: { benar: number; salah: number; tidakJawab: number };
    }) => {
      setTaliPosition(data.taliPosition);
      setSkorMerah(data.skorMerah);
      setSkorPutih(data.skorPutih);

      setRekapSoal({
        tampil: true,
        jawabanBenar: data.jawabanBenar,
        penjelasan: data.penjelasan,
        benarCount: data.stats?.benar,
        salahCount: data.stats?.salah,
      });

      if (data.stats && data.stats.benar > 0) {
        soundEffects.playCorrect();
      }
    };

    // Listener Sesi Selesai
    const handleSesiSelesai = (data: { hasil: HasilPermainan }) => {
      setHasilAkhir(data.hasil);
      setStatus('selesai');
      soundEffects.playVictoryFanfare();
    };

    socket.on('lobi:update', handleLobiUpdate);
    socket.on('teams_assigned', handleTeamsAssigned);
    socket.on('soal:tampil', handleSoalTampil);
    socket.on('tali:update', handleTaliUpdate);
    socket.on('soal:selesai', handleSoalSelesai);
    socket.on('sesi:selesai', handleSesiSelesai);

    return () => {
      socket.off('lobi:update', handleLobiUpdate);
      socket.off('teams_assigned', handleTeamsAssigned);
      socket.off('soal:tampil', handleSoalTampil);
      socket.off('tali:update', handleTaliUpdate);
      socket.off('soal:selesai', handleSoalSelesai);
      socket.off('sesi:selesai', handleSesiSelesai);
    };
  }, [id, startCountdown]);

  // Handler: Guru Memulai Lomba
  const handleMulaiLomba = () => {
    if (!id) return;
    const socket = getSocket();
    socket.emit('sesi:mulai', { sessionId: id, hostId: 'current-host' }, (res: any) => {
      if (!res?.success) {
        alert(res?.pesan || 'Gagal memulai permainan.');
      }
    });
  };

  // Handler: Guru Mengakhiri Permainan Secara Manual
  const handleAkhiriPermainan = () => {
    if (!id) return;
    setIsEnding(true);
    const socket = getSocket();
    socket.emit('sesi:akhiri_manual', { sessionId: id }, (res: any) => {
      setIsEnding(false);
      setModalAkhiriOpen(false);
      if (res?.success && res.hasil) {
        setHasilAkhir(res.hasil);
        setStatus('selesai');
      } else {
        alert(res?.pesan || 'Gagal mengakhiri permainan.');
      }
    });
  };

  // Handler: Main Lagi dengan Template yang Sama
  const handleMainLagi = async () => {
    if (!id) return;
    try {
      setIsMainLagiLoading(true);
      const res = await apiRequest<{ sessionId: string }>(`/sesi/${id}/main-lagi`, {
        method: 'POST',
      });
      navigate(`/guru/sesi/${res.sessionId}`);
      window.location.reload();
    } catch (err: any) {
      alert(err.pesan || 'Gagal membuat sesi baru.');
      setIsMainLagiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (errorPesan) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md p-6 bg-slate-800 border-slate-700 text-center">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Terjadi Kesalahan</h2>
          <p className="text-slate-400 text-sm mb-6">{errorPesan}</p>
          <Button variant="utama" onClick={() => navigate('/guru')} className="w-full">
            Kembali ke Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: LOBI MULTIPLAYER (Sebelum Mulai Lomba)
  // =========================================================================
  if (status === 'lobi') {
    const formattedToken = token.split('').join(' ');

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10">
        {/* Header Layar Proyektor */}
        <header className="flex flex-wrap justify-between items-center pb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                Mode Multiplayer
              </span>
              <span className="text-xs font-semibold text-slate-400">Tarik Tambang Edukasi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              {templateJudul}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMuted(soundEffects.toggleMute())}
              className="p-2.5 rounded-2xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
              title={isMuted ? 'Nyalakan Efek Suara' : 'Bisukan Efek Suara'}
              aria-label={isMuted ? 'Nyalakan Efek Suara' : 'Bisukan Efek Suara'}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-rose-500" />
              ) : (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              )}
            </button>
            <Button
              variant="sekunder"
              onClick={() => navigate('/guru')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
            >
              Kembali ke Dashboard
            </Button>
          </div>
        </header>

        {/* Konten Lobi: Kode PIN, QR Code & Daftar Peserta */}
        <main className="my-auto py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-7xl mx-auto w-full">
          {/* Kolom Kiri: PIN & QR Code */}
          <div className="lg:col-span-6 flex flex-col items-center text-center p-8 bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl">
            <div className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-2">
              KODE PIN PERMAINAN
            </div>

            {/* Display PIN Raksasa untuk Proyektor */}
            <div className="w-full py-4 px-6 bg-slate-950 border-2 border-indigo-500/50 rounded-2xl shadow-inner mb-6">
              <span className="text-5xl sm:text-6xl font-black tracking-widest text-indigo-400 font-mono select-all">
                {formattedToken}
              </span>
            </div>

            {/* QR Code */}
            {qrDataUrl && (
              <div className="p-3 bg-white rounded-2xl shadow-xl mb-4">
                <img
                  src={qrDataUrl}
                  alt="QR Code Gabung"
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-lg"
                />
              </div>
            )}

            <div className="space-y-1 text-slate-400 text-sm">
              <p className="font-semibold text-white">
                Buka browser di HP kamu atau scan QR di atas
              </p>
              <p className="text-xs text-indigo-300 font-mono break-all">{joinUrl}</p>
            </div>
          </div>

          {/* Kolom Kanan: Daftar Siswa & Tombol Mulai */}
          <div className="lg:col-span-6 flex flex-col justify-between h-full bg-slate-900 border-2 border-slate-800 rounded-3xl p-8 shadow-2xl">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-6 h-6 text-indigo-400" />
                  <h2 className="text-xl font-bold text-white">
                    Siswa Bergabung ({totalPeserta})
                  </h2>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {totalPeserta >= 2 ? 'Siap Dimulai' : 'Menunggu Siswa'}
                </span>
              </div>

              {/* Grid Avatar Nama Siswa */}
              {daftarPeserta.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
                  <p className="text-slate-400 font-medium">Belum ada siswa yang bergabung</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Minta siswa mengetik PIN atau scan QR code
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5 max-h-72 overflow-y-auto p-2 bg-slate-950/60 rounded-2xl border border-slate-800">
                  {daftarPeserta.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium text-sm shadow-sm"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{p.nama}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tombol Mulai Lomba */}
            <div className="mt-8 pt-6 border-t border-slate-800">
              <Button
                variant="utama"
                onClick={handleMulaiLomba}
                disabled={totalPeserta < 2}
                className="w-full py-4 text-lg font-black bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-2xl shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-3"
              >
                <Play className="w-6 h-6 fill-current" />
                Mulai Lomba Sekarang
              </Button>
              {totalPeserta < 2 && (
                <p className="text-center text-xs text-amber-400/80 mt-2">
                  Minimal dibutuhkan 2 siswa untuk memulai permainan tarik tambang.
                </p>
              )}
            </div>
          </div>
        </main>

        <footer className="text-center text-xs text-slate-600 py-2">
          Discere • Platform Pembelajaran Interaktif
        </footer>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ARENA PERTANDINGAN (Status 'jalan')
  // =========================================================================
  if (status === 'jalan') {
    const timMerahPeserta = daftarPeserta.filter((p) => p.tim === 'merah');
    const timPutihPeserta = daftarPeserta.filter((p) => p.tim === 'putih');

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-8">
        {/* Top Header */}
        <header className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                Multiplayer
              </span>
              <h2 className="text-lg font-bold text-white">{templateJudul}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMuted(soundEffects.toggleMute())}
              className="p-2.5 rounded-2xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
              title={isMuted ? 'Nyalakan Efek Suara' : 'Bisukan Efek Suara'}
              aria-label={isMuted ? 'Nyalakan Efek Suara' : 'Bisukan Efek Suara'}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-rose-500" />
              ) : (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              )}
            </button>
            <Button
              variant="sekunder"
              onClick={() => setModalAkhiriOpen(true)}
              className="bg-slate-800 hover:bg-rose-950 hover:text-rose-400 border-slate-700 text-xs py-2"
            >
              <StopCircle className="w-4 h-4 mr-1.5" />
              Akhiri Permainan
            </Button>
          </div>
        </header>

        {/* Area Arena Utama */}
        <main className="my-auto py-4 space-y-6 max-w-6xl mx-auto w-full">
          {/* 1. Visualisasi Tali Tarik Tambang */}
          <VisualisasiTali
            posisi={taliPosition}
            skorMerah={skorMerah}
            skorPutih={skorPutih}
          />

          {/* 2. Soal & Indikator Waktu */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Header Soal: Nomor, Progress Jawaban, Timer */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                  Soal {soalAktif?.nomorSoal} dari {soalAktif?.totalSoal}
                </span>

                {/* Indikator Siswa yang Sudah Menjawab */}
                <span className="text-xs text-slate-400 font-medium">
                  {answeredCount} dari {totalPeserta} siswa telah menjawab
                </span>
              </div>

              {/* Countdown Timer Server */}
              <div
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-black text-base shadow-sm ${
                  sisaDetik <= 5
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                    : 'bg-slate-800 text-indigo-400 border border-slate-700'
                }`}
              >
                <Clock className="w-5 h-5" />
                <span>{sisaDetik} Detik</span>
              </div>
            </div>

            {/* Timer Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-6">
              <div
                className={`h-full transition-all duration-300 ease-linear ${
                  sisaDetik <= 5 ? 'bg-rose-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min(100, (sisaDetik / 15) * 100)}%` }}
              />
            </div>

            {/* Teks Pertanyaan Besar untuk Proyektor */}
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white text-center leading-relaxed mb-8 px-4">
              {soalAktif?.teks}
            </h3>

            {/* 3 Opsi Jawaban (A, B, C) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['A', 'B', 'C'] as const).map((opsiKey) => {
                const teksOpsi =
                  opsiKey === 'A'
                    ? soalAktif?.opsiA
                    : opsiKey === 'B'
                    ? soalAktif?.opsiB
                    : soalAktif?.opsiC;

                const isBenar = rekapSoal?.tampil && rekapSoal.jawabanBenar === opsiKey;

                return (
                  <div
                    key={opsiKey}
                    className={`p-5 rounded-2xl border-2 transition-all flex items-start gap-4 ${
                      isBenar
                        ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-xl scale-[1.02]'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                        isBenar
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {opsiKey}
                    </span>
                    <span className="text-lg font-semibold leading-snug">{teksOpsi}</span>
                  </div>
                );
              })}
            </div>

            {/* Rekap Intermission Jawaban Soal */}
            {rekapSoal?.tampil && (
              <div className="mt-6 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm space-y-2 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-white text-base">
                    Pembahasan Soal • Kunci Jawaban: Opsi {rekapSoal.jawabanBenar}
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-400 font-semibold">
                      ✓ {rekapSoal.benarCount ?? 0} Benar
                    </span>
                    <span className="text-rose-400 font-semibold">
                      ✗ {rekapSoal.salahCount ?? 0} Salah
                    </span>
                  </div>
                </div>
                {rekapSoal.penjelasan && (
                  <p className="text-slate-300 text-xs">💡 {rekapSoal.penjelasan}</p>
                )}
                <div className="text-xs text-indigo-400 font-medium">
                  Soal berikutnya akan segera dimulai...
                </div>
              </div>
            )}
          </div>

          {/* 3. Daftar Anggota Tim Merah vs Tim Putih */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tim Merah */}
            <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm text-red-400 uppercase tracking-wider">
                  Tim Merah ({timMerahPeserta.length} Siswa)
                </span>
                <span className="text-xs font-bold text-white bg-red-600 px-2 py-0.5 rounded-full">
                  {skorMerah} Poin
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {timMerahPeserta.map((p) => (
                  <span
                    key={p.id}
                    className="text-xs px-2.5 py-1 rounded-lg bg-red-900/30 border border-red-700/40 text-red-200"
                  >
                    {p.nama}
                  </span>
                ))}
              </div>
            </div>

            {/* Tim Putih */}
            <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm text-blue-400 uppercase tracking-wider">
                  Tim Putih ({timPutihPeserta.length} Siswa)
                </span>
                <span className="text-xs font-bold text-white bg-blue-600 px-2 py-0.5 rounded-full">
                  {skorPutih} Poin
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {timPutihPeserta.map((p) => (
                  <span
                    key={p.id}
                    className="text-xs px-2.5 py-1 rounded-lg bg-blue-900/30 border border-blue-700/40 text-blue-200"
                  >
                    {p.nama}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Modal Konfirmasi Akhiri Permainan */}
        <Modal
          isOpen={modalAkhiriOpen}
          onClose={() => setModalAkhiriOpen(false)}
          title="Akhiri Permainan?"
        >
          <div className="space-y-4">
            <p className="text-[#1d3b2e] dark:!text-[#1d3b2e] text-base font-medium leading-relaxed">
              Apakah Anda yakin ingin mengakhiri sesi permainan ini sekarang? Skor dan posisi tali saat ini akan disimpan sebagai hasil akhir.
            </p>
            <div className="flex justify-end items-center gap-3 pt-4 border-t-2 border-dashed border-[#e0d5b8]">
              <button
                type="button"
                className="px-4 py-2 text-sm font-bold text-[#1d3b2e] dark:!text-[#1d3b2e] hover:bg-[#e8dfc8] rounded-xl transition-colors cursor-pointer"
                onClick={() => setModalAkhiriOpen(false)}
                disabled={isEnding}
              >
                Batal
              </button>
              <Button
                variant="utama"
                onClick={handleAkhiriPermainan}
                disabled={isEnding}
                className="bg-[#c8362f] hover:bg-[#b52a23] text-white"
              >
                {isEnding ? 'Mengakhiri...' : 'Ya, Akhiri Sekarang'}
              </Button>
            </div>
          </div>
        </Modal>

        <footer className="text-center text-xs text-slate-600 py-1">
          Discere • Mode Multiplayer Kelas
        </footer>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: HASIL AKHIR PERMAINAN (Status 'selesai')
  // =========================================================================
  if (status === 'selesai') {
    const pemenang = hasilAkhir?.timMenang || 'seri';
    const isMerah = pemenang === 'merah';
    const isPutih = pemenang === 'putih';

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10">
        <header className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              Hasil Akhir Lomba Tarik Tambang
            </span>
            <h1 className="text-2xl font-bold text-white">{templateJudul}</h1>
          </div>

          <Button
            variant="sekunder"
            onClick={() => navigate('/guru')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
          >
            Kembali ke Dashboard Guru
          </Button>
        </header>

        <main className="my-auto py-8 max-w-4xl mx-auto w-full space-y-8 text-center">
          {/* Trophy & Pengumuman Pemenang */}
          <div>
            <div
              className={`w-28 h-28 rounded-full mx-auto mb-6 flex items-center justify-center shadow-2xl ${
                isMerah
                  ? 'bg-gradient-to-tr from-red-600 to-red-400 text-white ring-8 ring-red-500/20'
                  : isPutih
                  ? 'bg-gradient-to-tr from-blue-600 to-blue-400 text-white ring-8 ring-blue-500/20'
                  : 'bg-slate-800 text-amber-400'
              }`}
            >
              <Trophy className="w-14 h-14" />
            </div>

            <h2 className="text-4xl sm:text-5xl font-black mb-3">
              {isMerah
                ? '🏆 TIM MERAH MENANG! 🏆'
                : isPutih
                ? '🏆 TIM PUTIH MENANG! 🏆'
                : '🤝 PERTANDINGAN SERI!'}
            </h2>

            <p className="text-slate-400 text-base max-w-lg mx-auto">
              {isMerah
                ? 'Selamat untuk Tim Merah! Kekompakan dan kecepatan dalam menjawab soal membuahkan kemenangan!'
                : isPutih
                ? 'Selamat untuk Tim Putih! Kekompakan dan ketepatan menjawab soal berhasil merebut tali kemenangan!'
                : 'Kedua tim tampil sangat tangguh dengan skor dan kekuatan seimbang sampai akhir!'}
            </p>
          </div>

          {/* Visualisasi Tali Hasil Akhir */}
          <VisualisasiTali
            posisi={hasilAkhir?.posisiAkhir ?? taliPosition}
            skorMerah={hasilAkhir?.skorMerah ?? skorMerah}
            skorPutih={hasilAkhir?.skorPutih ?? skorPutih}
          />

          {/* Card Statistik Skor Akhir */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <Card className="p-6 bg-red-950/20 border-red-500/30 rounded-2xl">
              <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
                Kinerja Tim Merah
              </div>
              <div className="text-3xl font-black text-white">
                {hasilAkhir?.skorMerah ?? skorMerah} Jawaban Benar
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {daftarPeserta.filter((p) => p.tim === 'merah').length} Siswa di tim ini
              </p>
            </Card>

            <Card className="p-6 bg-blue-950/20 border-blue-500/30 rounded-2xl">
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">
                Kinerja Tim Putih
              </div>
              <div className="text-3xl font-black text-white">
                {hasilAkhir?.skorPutih ?? skorPutih} Jawaban Benar
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {daftarPeserta.filter((p) => p.tim === 'putih').length} Siswa di tim ini
              </p>
            </Card>
          </div>

          {/* Tombol Aksi Akhir */}
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button
              variant="utama"
              onClick={handleMainLagi}
              disabled={isMainLagiLoading}
              className="py-3.5 px-8 font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              {isMainLagiLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Menyiapkan...
                </>
              ) : (
                <>
                  <RotateCcw className="w-5 h-5" />
                  Main Lagi dengan Template Ini
                </>
              )}
            </Button>

            <Button
              variant="sekunder"
              onClick={() => navigate('/guru')}
              className="py-3.5 px-8 font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700"
            >
              Kembali ke Dashboard Guru
            </Button>
          </div>
        </main>

        <footer className="text-center text-xs text-slate-600 py-2">
          Discere • Belajar Sambil Bermain
        </footer>
      </div>
    );
  }

  return null;
}
