import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../../lib/socket';
import { Button } from '../../components';
import { soundEffects } from '../../lib/soundEffects';
import KerupukVirtual, { HasilGachaGigitanProps } from './KerupukVirtual';
import {
  Users,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  LogOut,
  Flame,
} from 'lucide-react';

interface SoalData {
  id: string;
  questionId?: string;
  nomorSoal: number;
  totalSoal: number;
  teks: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  endsAt?: number;
  duration?: number;
}

interface PesertaData {
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
  totalWaktuJawabMs?: number;
  jumlahJawab?: number;
}

interface MainKerupukProps {
  token: string;
  nama: string;
  sessionId: string;
  pesertaId: string;
  templateJudul: string;
  initialStatus?: string;
  initialPesertaState?: PesertaData;
  initialLeaderboard?: PesertaData[];
  initialSoalAktif?: SoalData | null;
  onKeluar: () => void;
}

export default function MainKerupuk({
  token,
  nama,
  sessionId,
  pesertaId,
  templateJudul,
  initialStatus = 'lobi',
  initialPesertaState,
  initialLeaderboard = [],
  initialSoalAktif = null,
  onKeluar,
}: MainKerupukProps) {
  // Game stage
  const [stage, setStage] = useState<'LOBBY' | 'PLAYING' | 'SELESAI'>(
    initialStatus === 'jalan' ? 'PLAYING' : initialStatus === 'selesai' ? 'SELESAI' : 'LOBBY'
  );

  // Participant Kerupuk State
  const [myState, setMyState] = useState<PesertaData>(
    initialPesertaState || {
      id: pesertaId,
      nama,
      sisaKerupuk: 100,
      skorTotal: 0,
      skorPengetahuan: 0,
      skorKeberuntungan: 0,
      streakBenar: 0,
      selesaiKerupuk: false,
    }
  );

  // Lobby states
  const [totalPeserta, setTotalPeserta] = useState<number>(initialLeaderboard.length || 1);
  const [leaderboard, setLeaderboard] = useState<PesertaData[]>(initialLeaderboard);

  // In-Game states
  const [soalAktif, setSoalAktif] = useState<SoalData | null>(
    initialSoalAktif
      ? {
          ...initialSoalAktif,
          id: initialSoalAktif.id || (initialSoalAktif as any).questionId || '',
          questionId: (initialSoalAktif as any).questionId || initialSoalAktif.id || '',
        }
      : null
  );
  const [jawabanDipilih, setJawabanDipilih] = useState<'A' | 'B' | 'C' | null>(null);
  const [sudahKirim, setSudahKirim] = useState(false);
  const [sedangAnimasiGigit, setSedangAnimasiGigit] = useState(false);
  const [feedback, setFeedback] = useState<{
    tampil: boolean;
    benar?: boolean;
    jawabanBenar?: string;
    penjelasan?: string | null;
    gacha?: HasilGachaGigitanProps | null;
    poinDidapat?: number;
    bonusStreak?: number;
    bonusPenyelesaian?: number;
  } | null>(null);

  // Final Result state
  const [hasilAkhir, setHasilAkhir] = useState<any>(null);

  // Stopwatch waktu respon per soal (menghitung detik sejak soal tampil)
  const [detikElapsed, setDetikElapsed] = useState<number>(0);
  const stopwatchIntervalRef = useRef<any>(null);

  const startStopwatch = useCallback(() => {
    if (stopwatchIntervalRef.current) {
      clearInterval(stopwatchIntervalRef.current);
    }
    const startTime = Date.now();
    setDetikElapsed(0);
    stopwatchIntervalRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 100) / 10;
      setDetikElapsed(elapsed);
    }, 100);
  }, []);

  const stopStopwatch = useCallback(() => {
    if (stopwatchIntervalRef.current) {
      clearInterval(stopwatchIntervalRef.current);
      stopwatchIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
      }
    };
  }, []);

  // Setup Socket Listeners untuk Makan Kerupuk
  useEffect(() => {
    const socket = getSocket();

    // 1. Pembaruan Lobi
    const handleLobiUpdate = (data: { totalPeserta: number; daftarPeserta: any[] }) => {
      setTotalPeserta(data.totalPeserta);
      if (data.daftarPeserta) {
        setLeaderboard(data.daftarPeserta);
      }
    };

    // 2. Permainan Dimulai
    const handleGameMulai = () => {
      setStage('PLAYING');
      soundEffects.playWhistle();
    };

    // 3. Soal Baru Ditampilkan (Independen untuk Siswa Ini)
    const handleSoalTampil = (data: any) => {
      setStage('PLAYING');
      const resolvedId = data.id || data.questionId || '';
      const resolvedQuestionId = data.questionId || data.id || '';
      setSoalAktif({
        ...data,
        id: resolvedId,
        questionId: resolvedQuestionId,
      });
      setJawabanDipilih(null);
      setSudahKirim(false);
      setFeedback(null);
      setSedangAnimasiGigit(false);
      startStopwatch();
    };

    // 4. Update Kerupuk & Leaderboard Real-Time
    const handleKerupukUpdate = (data: {
      leaderboard: PesertaData[];
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
        const me = data.leaderboard.find((p) => p.id === pesertaId);
        if (me) {
          setMyState(me);
        }
      }
    };

    // 5. Soal Berakhir (Kunci Jawaban & Pembahasan)
    const handleSoalSelesai = (data: {
      questionIndex: number;
      jawabanBenar: string;
      penjelasan?: string | null;
      leaderboard?: PesertaData[];
      isGameFinished: boolean;
    }) => {
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
        const me = data.leaderboard.find((p) => p.id === pesertaId);
        if (me) setMyState(me);
      }

      setFeedback((prev) => {
        const isBenar = prev ? Boolean(prev.benar) : false;
        return {
          tampil: true,
          benar: isBenar,
          jawabanBenar: data.jawabanBenar || prev?.jawabanBenar,
          penjelasan: data.penjelasan || prev?.penjelasan,
          gacha: prev?.gacha,
          poinDidapat: prev?.poinDidapat,
          bonusStreak: prev?.bonusStreak,
          bonusPenyelesaian: prev?.bonusPenyelesaian,
        };
      });
    };

    // 5b. Feedback Langsung Jawaban Personal
    const handleJawabHasil = (res: any) => {
      if (res?.success) {
        stopStopwatch();
        if (res.benar) {
          if (res.gacha && res.gacha.tipe !== 'zonk') {
            soundEffects.playCrunch();
            setSedangAnimasiGigit(true);
          } else {
            soundEffects.playZonk();
          }
        } else {
          soundEffects.playIncorrect();
        }

        if (res.pesertaUpdated) {
          setMyState(res.pesertaUpdated);
        }

        setFeedback({
          tampil: true,
          benar: Boolean(res.benar),
          jawabanBenar: res.jawabanBenar,
          penjelasan: res.penjelasan,
          gacha: res.gacha,
          poinDidapat: res.poinDidapat,
          bonusStreak: res.bonusStreak,
          bonusPenyelesaian: res.bonusPenyelesaian,
        });
      }
    };

    // 5c. Notifikasi Pemain Selesai (Kerupuk 0%)
    const handlePemainSelesai = (data: { peserta?: PesertaData; pesan?: string }) => {
      stopStopwatch();
      if (data?.peserta) {
        setMyState(data.peserta);
      } else {
        setMyState((prev) => ({ ...prev, selesaiKerupuk: true, sisaKerupuk: 0 }));
      }
    };

    // 6. Sesi Selesai (Podium & Hasil Akhir)
    const handleSesiSelesai = (data: { hasil: any }) => {
      stopStopwatch();
      setHasilAkhir(data.hasil);
      setStage('SELESAI');
      soundEffects.playVictoryFanfare();
    };

    socket.on('lobi:update', handleLobiUpdate);
    socket.on('game:mulai', handleGameMulai);
    socket.on('soal:tampil', handleSoalTampil);
    socket.on('kerupuk:update', handleKerupukUpdate);
    socket.on('soal:selesai', handleSoalSelesai);
    socket.on('jawab:hasil', handleJawabHasil);
    socket.on('pemain:selesai', handlePemainSelesai);
    socket.on('sesi:selesai', handleSesiSelesai);

    return () => {
      socket.off('lobi:update', handleLobiUpdate);
      socket.off('game:mulai', handleGameMulai);
      socket.off('soal:tampil', handleSoalTampil);
      socket.off('kerupuk:update', handleKerupukUpdate);
      socket.off('soal:selesai', handleSoalSelesai);
      socket.off('jawab:hasil', handleJawabHasil);
      socket.off('pemain:selesai', handlePemainSelesai);
      socket.off('sesi:selesai', handleSesiSelesai);
    };
  }, [pesertaId, startStopwatch, stopStopwatch]);

  // Handler: Siswa Mengirim Jawaban (A / B / C)
  const handlePilihJawaban = (pilihan: 'A' | 'B' | 'C') => {
    if (sudahKirim || !soalAktif) return;

    setJawabanDipilih(pilihan);
    setSudahKirim(true);
    stopStopwatch();

    const targetId = soalAktif.id || soalAktif.questionId || '';

    const socket = getSocket();
    socket.emit(
      'jawab:kirim',
      {
        sessionId,
        pesertaId,
        questionId: targetId,
        id: targetId,
        jawaban: pilihan,
      },
      (res: any) => {
        if (res?.success) {
          if (res.benar) {
            // Jawaban benar: putar suara crunch gigitan atau chim
            if (res.gacha && res.gacha.tipe !== 'zonk') {
              soundEffects.playCrunch();
              setSedangAnimasiGigit(true);
            } else {
              soundEffects.playZonk();
            }
          } else {
            soundEffects.playIncorrect();
          }

          if (res.pesertaUpdated) {
            setMyState(res.pesertaUpdated);
          }

          setFeedback({
            tampil: true,
            benar: Boolean(res.benar),
            jawabanBenar: res.jawabanBenar,
            penjelasan: res.penjelasan,
            gacha: res.gacha,
            poinDidapat: res.poinDidapat,
            bonusStreak: res.bonusStreak,
            bonusPenyelesaian: res.bonusPenyelesaian,
          });
        }
      }
    );
  };

  const handleLanjutSoalCepat = () => {
    const socket = getSocket();
    socket.emit('soal:lanjut', { sessionId, pesertaId });
  };

  // Posisi ranking siswa saat ini
  const myRank = leaderboard.findIndex((p) => p.id === pesertaId) + 1;

  // -------------------------------------------------------------------------
  // 1. TAHAP LOBI SISWA
  // -------------------------------------------------------------------------
  if (stage === 'LOBBY') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 p-4 flex flex-col justify-between">
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm border border-amber-200">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
              Makan Kerupuk Challenge
            </span>
            <h2 className="text-sm font-bold text-slate-800 line-clamp-1">{templateJudul}</h2>
          </div>
          <button
            type="button"
            onClick={onKeluar}
            className="p-2 text-slate-400 hover:text-red-500 rounded-xl"
            title="Keluar"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Center Card: Kerupuk & Menunggu Guru */}
        <div className="my-auto text-center space-y-5 max-w-sm mx-auto w-full">
          {/* Kerupuk Virtual Menggantung Utuh */}
          <div className="bg-white/90 backdrop-blur p-6 rounded-3xl shadow-lg border border-amber-200">
            <KerupukVirtual sisaKerupuk={100} ukuran="md" />

            <div className="mt-4 space-y-1">
              <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-full uppercase tracking-wider">
                Siap Bertanding!
              </span>
              <h1 className="text-2xl font-black text-slate-900">{nama}</h1>
              <p className="text-xs text-slate-500">
                Kerupukmu sudah tergantung di tali. Bersiaplah menjawab kuis secepat dan setepat mungkin!
              </p>
            </div>
          </div>

          {/* Menunggu Host */}
          <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4 flex items-center justify-center gap-3">
            <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping" />
            <span className="text-xs font-bold text-amber-900">
              Menunggu guru memulai permainan...
            </span>
          </div>

          {/* Total Peserta Tergabung */}
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
            <Users className="w-4 h-4 text-amber-700" />
            <span>{totalPeserta} siswa telah bergabung di lobi</span>
          </div>
        </div>

        {/* Footer PIN Info */}
        <div className="text-center text-xs font-semibold text-slate-500 py-2">
          PIN Sesi: <span className="font-mono font-bold tracking-widest text-slate-800">{token}</span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 2. TAHAP PERMAINAN BERJALAN (PLAYING)
  // -------------------------------------------------------------------------
  if (stage === 'PLAYING') {
    // 2a. Siswa telah menghabiskan kerupuk (0%) -> Tampilkan layar perayaan & tunggu teman
    if (myState.selesaiKerupuk || myState.sisaKerupuk === 0) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 max-w-md mx-auto w-full select-none">
          <header className="flex items-center justify-between bg-slate-800/80 backdrop-blur rounded-2xl p-4 border border-slate-700 shadow-sm">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-400 block tracking-wider">
                Makan Kerupuk Challenge
              </span>
              <h2 className="text-sm font-bold text-slate-100">{templateJudul}</h2>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-xl text-xs font-black">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Rank #{myRank || 1}</span>
            </div>
          </header>

          <div className="my-auto text-center space-y-4 py-4">
            <div className="bg-slate-800/90 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 flex items-center justify-center text-3xl animate-bounce">
                🎉
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block mb-1">
                  Lomba Selesai Untukmu
                </span>
                <h1 className="text-2xl font-black text-white">Kerupukmu Telah Ludes!</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Luar biasa! Kamu berhasil menghabiskan seluruh kerupuk virtual.
                </p>
              </div>

              {/* Statistik Pribadi Siswa */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Skor</span>
                  <span className="text-lg font-black text-amber-400 font-mono">{myState.skorTotal} pt</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Jawaban Benar</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">{myState.totalBenar ?? 0}</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Rata-Rata Kecepatan</span>
                  <span className="text-lg font-black text-blue-400 font-mono">
                    {myState.rataRataWaktuJawabMs ? `${(myState.rataRataWaktuJawabMs / 1000).toFixed(1)}s` : '-'}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Sisa Kerupuk</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">0% (Ludes)</span>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-center gap-2.5 text-xs text-amber-300 font-semibold">
                <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping shrink-0" />
                <span>Menunggu siswa lain selesai atau guru mengakhiri sesi...</span>
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500 font-medium pb-2">
            Peringkat podium resmi akan ditampilkan setelah seluruh sesi berakhir.
          </div>
        </div>
      );
    }

    // 2b. Siswa masih bermain (kerupuk > 0%)
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-3 sm:p-5 select-none">
        {/* Top Bar: Progress Soal, Stopwatch Kecepatan, & Skor */}
        <div className="flex items-center justify-between gap-2 bg-slate-800/80 backdrop-blur rounded-2xl p-3 border border-slate-700 shadow-sm">
          {/* Nomor Soal & Ranking */}
          <div>
            <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">
              Soal {soalAktif?.nomorSoal ? `#${soalAktif.nomorSoal}` : '-'}
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Rank #{myRank || 1}</span>
            </div>
          </div>

          {/* Stopwatch Waktu Respon Real-Time */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-700 text-amber-300 font-mono text-sm font-black border border-slate-600">
              <Clock className="w-3.5 h-3.5" />
              <span>{detikElapsed.toFixed(1)}s</span>
            </div>
            {myState.rataRataWaktuJawabMs && myState.rataRataWaktuJawabMs > 0 ? (
              <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                Rata: {(myState.rataRataWaktuJawabMs / 1000).toFixed(1)}s
              </span>
            ) : null}
          </div>

          {/* Skor & Streak */}
          <div className="text-right">
            <div className="text-xs font-black text-amber-400 font-mono">
              {myState.skorTotal} pt
            </div>
            {myState.streakBenar > 1 && (
              <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-orange-400 animate-bounce">
                <Flame className="w-3 h-3 fill-current" />
                <span>x{myState.streakBenar} Streak</span>
              </div>
            )}
          </div>
        </div>

        {/* Center Stage: Kerupuk Virtual Interaktif Pemain */}
        <div className="my-auto flex flex-col items-center justify-center py-2">
          <KerupukVirtual
            sisaKerupuk={myState.sisaKerupuk}
            terakhirGigitan={feedback?.gacha || myState.terakhirGigitan}
            sedangAnimasiGigit={sedangAnimasiGigit}
            ukuran="md"
            namaPemain={nama}
          />

          {/* Banner Feedback Hasil Jawaban */}
          {feedback?.tampil && (
            <div
              className={`mt-3 px-4 py-2.5 rounded-2xl text-xs font-bold max-w-sm w-full text-center shadow-lg transition-all animate-fade-in ${
                feedback.benar
                  ? 'bg-emerald-900/80 border border-emerald-500 text-emerald-200'
                  : 'bg-red-900/80 border border-red-500 text-red-200'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                {feedback.benar ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-black text-white">Jawaban Benar! (+{feedback.poinDidapat} pt)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="font-black text-white">Jawaban Belum Tepat! (Kunci: {feedback.jawabanBenar})</span>
                  </>
                )}
              </div>

              {feedback.gacha && (
                <p className="text-[11px] text-amber-300 font-semibold italic">
                  {feedback.gacha.pesanLucu}
                </p>
              )}
              {feedback.bonusStreak && feedback.bonusStreak > 0 && (
                <p className="text-[10px] text-orange-400 font-bold">
                  🔥 Bonus Streak 3 Jawaban Benar Berturut-turut (+{feedback.bonusStreak} pt)!
                </p>
              )}
              {feedback.bonusPenyelesaian && feedback.bonusPenyelesaian > 0 && (
                <p className="text-[10px] text-amber-300 font-black">
                  🎉 KERUPUK LUDES! Bonus Penyelesaian Pertama (+100 pt)!
                </p>
              )}

              {/* Tombol Percepat Soal Berikutnya */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLanjutSoalCepat}
                  className="w-full py-1.5 bg-white/10 hover:bg-white/20 active:scale-[0.98] rounded-xl text-[11px] font-black text-white transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Soal Berikutnya</span>
                  <span>➔</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Area: Pertanyaan & Tombol Pilihan A, B, C */}
        <div className="space-y-3 max-w-md mx-auto w-full">
          {/* Teks Soal */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-sm sm:text-base font-bold text-white leading-relaxed">
              {soalAktif?.teks || 'Menyiapkan pertanyaan...'}
            </p>
          </div>

          {/* Tombol Pilihan A, B, C */}
          <div className="grid grid-cols-1 gap-2.5">
            {(['A', 'B', 'C'] as const).map((opsiKey) => {
              const teksOpsi =
                opsiKey === 'A'
                  ? soalAktif?.opsiA
                  : opsiKey === 'B'
                  ? soalAktif?.opsiB
                  : soalAktif?.opsiC;

              const isDipilih = jawabanDipilih === opsiKey;
              const isKunci = feedback?.jawabanBenar === opsiKey;

              let btnClass = 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white';

              if (feedback?.tampil) {
                if (isKunci) {
                  btnClass = 'bg-emerald-600 border-emerald-400 text-white ring-2 ring-emerald-300';
                } else if (isDipilih && !feedback.benar) {
                  btnClass = 'bg-red-600 border-red-400 text-white opacity-70';
                } else {
                  btnClass = 'bg-slate-800/50 border-slate-700/50 text-slate-400 opacity-40';
                }
              } else if (isDipilih) {
                btnClass = 'bg-amber-500 border-amber-300 text-slate-950 font-black ring-2 ring-amber-300';
              }

              return (
                <button
                  key={opsiKey}
                  type="button"
                  disabled={sudahKirim}
                  onClick={() => handlePilihJawaban(opsiKey)}
                  className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all active:scale-[0.98] text-left ${btnClass} ${
                    sudahKirim ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      isDipilih
                        ? 'bg-slate-900 text-amber-400'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {opsiKey}
                  </span>
                  <span className="text-xs sm:text-sm font-bold flex-1 leading-snug">
                    {teksOpsi || `Pilihan ${opsiKey}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 3. TAHAP SELESAI & PODIUM JUARA (SELESAI)
  // -------------------------------------------------------------------------
  const finalLeaderboard: PesertaData[] = hasilAkhir?.leaderboard || leaderboard;
  const juara1 = hasilAkhir?.podium?.juara1 || finalLeaderboard[0];
  const juara2 = hasilAkhir?.podium?.juara2 || finalLeaderboard[1];
  const juara3 = hasilAkhir?.podium?.juara3 || finalLeaderboard[2];

  const myFinalIndex = finalLeaderboard.findIndex((p) => p.id === pesertaId);
  const myFinalData = finalLeaderboard[myFinalIndex] || myState;
  const isJuara1 = myFinalIndex === 0;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 flex flex-col justify-between max-w-md mx-auto w-full">
      {/* Header Selesai */}
      <div className="text-center pt-2 space-y-1">
        <span className="px-3 py-1 bg-amber-400/20 text-amber-300 text-[10px] font-black rounded-full uppercase tracking-wider">
          Makan Kerupuk Challenge Selesai
        </span>
        <h1 className="text-2xl font-black text-white">Podium Pemenang 🏆</h1>
        {isJuara1 && (
          <p className="text-xs font-black text-amber-400 animate-bounce">
            🎉 Selamat! Kamu Meraih Juara 1! 🥇
          </p>
        )}
      </div>

      {/* Podium 1, 2, 3 */}
      <div className="flex items-end justify-center gap-2 pt-6 pb-4">
        {/* Juara 2 */}
        {juara2 && (
          <div className="flex flex-col items-center w-24 text-center">
            <span className="text-xl mb-1">🥈</span>
            <span className="text-xs font-bold text-slate-200 truncate w-full">
              {juara2.nama}
            </span>
            <span className="text-[10px] font-mono text-slate-400 mb-1">
              {juara2.skorTotal} pt
            </span>
            <div className="w-full bg-slate-700 h-20 rounded-t-xl flex items-center justify-center font-black text-slate-300 text-lg border-t-2 border-slate-500">
              2
            </div>
          </div>
        )}

        {/* Juara 1 */}
        {juara1 && (
          <div className="flex flex-col items-center w-28 text-center -mt-4">
            <span className="text-3xl mb-1 animate-bounce">👑</span>
            <span className="text-xs font-black text-amber-300 truncate w-full">
              {juara1.nama}
            </span>
            <span className="text-[11px] font-mono font-bold text-amber-400 mb-1">
              {juara1.skorTotal} pt
            </span>
            <div className="w-full bg-amber-500 h-28 rounded-t-xl flex flex-col items-center justify-center font-black text-slate-950 text-2xl border-t-2 border-amber-300 shadow-lg shadow-amber-500/20">
              <span>1</span>
              <span className="text-[9px] font-bold uppercase tracking-wider">Juara</span>
            </div>
          </div>
        )}

        {/* Juara 3 */}
        {juara3 && (
          <div className="flex flex-col items-center w-24 text-center">
            <span className="text-xl mb-1">🥉</span>
            <span className="text-xs font-bold text-slate-200 truncate w-full">
              {juara3.nama}
            </span>
            <span className="text-[10px] font-mono text-slate-400 mb-1">
              {juara3.skorTotal} pt
            </span>
            <div className="w-full bg-amber-800/80 h-14 rounded-t-xl flex items-center justify-center font-black text-amber-300 text-lg border-t-2 border-amber-600">
              3
            </div>
          </div>
        )}
      </div>

      {/* Rapor & Statistik Pemain Ini */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-700">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Peringkat Anda</span>
            <h3 className="text-base font-black text-white">
              {myFinalIndex >= 0 ? `Peringkat #${myFinalIndex + 1}` : 'Peserta'} dari {finalLeaderboard.length} Siswa
            </h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Skor</span>
            <div className="text-lg font-black text-amber-400 font-mono">
              {myFinalData.skorTotal} pt
            </div>
          </div>
        </div>

        {/* Rincian Poin */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-700/50 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">Skor Pengetahuan</span>
            <span className="font-bold text-emerald-400">
              +{myFinalData.skorPengetahuan ?? 0} pt
            </span>
          </div>
          <div className="bg-slate-700/50 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">Skor Keberuntungan Gacha</span>
            <span className="font-bold text-amber-400">
              +{myFinalData.skorKeberuntungan ?? 0} pt
            </span>
          </div>
          <div className="bg-slate-700/50 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">Sisa Kerupuk</span>
            <span className={`font-bold ${myFinalData.sisaKerupuk === 0 ? 'text-emerald-400' : 'text-slate-200'}`}>
              {myFinalData.sisaKerupuk === 0 ? 'LUDES (0%) 🎉' : `${myFinalData.sisaKerupuk}%`}
            </span>
          </div>
          <div className="bg-slate-700/50 p-2.5 rounded-xl">
            <span className="text-slate-400 text-[10px] block">Status Kerupuk</span>
            <span className="font-bold text-slate-200">
              {myFinalData.sisaKerupuk === 0 ? 'Bonus Selesai +100 pt' : 'Belum Habis'}
            </span>
          </div>
        </div>
      </div>

      {/* Tombol Keluar */}
      <div className="pt-3">
        <Button
          variant="utama"
          onClick={onKeluar}
          className="w-full py-3 text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950"
        >
          Selesai & Keluar
        </Button>
      </div>
    </div>
  );
}
