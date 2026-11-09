import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { getSocket } from '../../lib/socket';
import { Button, Card } from '../../components';
import { soundEffects } from '../../lib/soundEffects';
import {
  Users,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  LogOut,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

interface SoalData {
  id: string;
  nomorSoal: number;
  totalSoal: number;
  teks: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  endsAt?: number;
}

interface SelesaiResult {
  timMenang: 'merah' | 'putih' | 'seri';
  posisiAkhir: number;
  skorMerah: number;
  skorPutih: number;
}

export default function MainSiswa() {
  const [searchParams] = useSearchParams();

  // Form states
  const [tokenInput, setTokenInput] = useState(searchParams.get('token') || '');
  const [namaInput, setNamaInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Session states
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pesertaId, setPesertaId] = useState<string | null>(null);
  const [namaPeserta, setNamaPeserta] = useState<string>('');
  const [templateJudul, setTemplateJudul] = useState<string>('');
  const [tim, setTim] = useState<'merah' | 'putih' | null>(null);
  const [stage, setStage] = useState<'GABUNG' | 'LOBBY' | 'PLAYING' | 'SELESAI'>('GABUNG');

  // Lobby states
  const [totalPeserta, setTotalPeserta] = useState<number>(0);
  const [daftarPeserta, setDaftarPeserta] = useState<Array<{ id: string; nama: string; tim: 'merah' | 'putih' | null }>>([]);

  // In-Game states
  const [soalAktif, setSoalAktif] = useState<SoalData | null>(null);
  const [sisaDetik, setSisaDetik] = useState<number>(15);
  const [jawabanDipilih, setJawabanDipilih] = useState<'A' | 'B' | 'C' | null>(null);
  const [sudahKirim, setSudahKirim] = useState(false);
  const [feedback, setFeedback] = useState<{
    tampil: boolean;
    benar?: boolean;
    jawabanBenar?: string;
    penjelasan?: string | null;
  } | null>(null);

  // Score & Rope states
  const [taliPosition, setTaliPosition] = useState<number>(0);
  const [skorMerah, setSkorMerah] = useState<number>(0);
  const [skorPutih, setSkorPutih] = useState<number>(0);

  // Final Result state
  const [hasilAkhir, setHasilAkhir] = useState<SelesaiResult | null>(null);

  // Timer reference
  const countdownIntervalRef = useRef<any>(null);

  // Sinkronisasi countdown timer lokal terhadap endsAt dari server
  const startCountdown = useCallback((endsAtTimestamp?: number) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (!endsAtTimestamp) {
      setSisaDetik(15);
      return;
    }

    const hitungSisa = () => {
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

    hitungSisa();
    countdownIntervalRef.current = setInterval(hitungSisa, 200);
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Otomatis Reconnect jika ada session tersimpan di sessionStorage
  useEffect(() => {
    const savedToken = sessionStorage.getItem('discere_multi_token');
    const savedPesertaId = sessionStorage.getItem('discere_multi_peserta_id');
    const savedNama = sessionStorage.getItem('discere_multi_nama');

    if (savedToken && savedPesertaId && savedNama) {
      const socket = getSocket();
      socket.emit(
        'sesi:gabung',
        { token: savedToken, nama: savedNama, pesertaId: savedPesertaId },
        (res: any) => {
          if (res?.success) {
            setSessionId(res.sessionId);
            setPesertaId(res.pesertaId);
            setNamaPeserta(savedNama);
            setTokenInput(savedToken);
            setTemplateJudul(res.templateJudul || '');
            if (res.tim) setTim(res.tim);
            setTaliPosition(res.taliPosition ?? 0);
            setSkorMerah(res.skorMerah ?? 0);
            setSkorPutih(res.skorPutih ?? 0);

            if (res.status === 'jalan') {
              setStage('PLAYING');
              if (res.soalAktif) {
                setSoalAktif(res.soalAktif);
                startCountdown(res.soalAktif.endsAt);
                if (res.sudahJawabSoalAktif) {
                  setSudahKirim(true);
                }
              }
            } else if (res.status === 'selesai') {
              setStage('SELESAI');
            } else {
              setStage('LOBBY');
            }
          }
        }
      );
    }
  }, [startCountdown]);

  // Setup Socket listeners
  useEffect(() => {
    const socket = getSocket();

    // 1. Pembaruan Peserta di Lobi
    const handleLobiUpdate = (data: { totalPeserta: number; daftarPeserta: any[] }) => {
      setTotalPeserta(data.totalPeserta);
      setDaftarPeserta(data.daftarPeserta);
    };

    // 2. Pembagian Tim dari Server
    const handleTeamsAssigned = (data: { daftarPeserta: any[] }) => {
      setDaftarPeserta(data.daftarPeserta);
      const current = data.daftarPeserta.find((p) => p.id === pesertaId);
      if (current?.tim) {
        setTim(current.tim);
      }
    };

    // 3. Soal Baru Ditampilkan
    const handleSoalTampil = (data: SoalData & { endsAt: number; duration: number }) => {
      setStage('PLAYING');
      setSoalAktif(data);
      setJawabanDipilih(null);
      setSudahKirim(false);
      setFeedback(null);
      startCountdown(data.endsAt);
    };

    // 4. Update Posisi Tali & Skor Real-Time
    const handleTaliUpdate = (data: {
      taliPosition: number;
      skorMerah: number;
      skorPutih: number;
    }) => {
      setTaliPosition(data.taliPosition);
      setSkorMerah(data.skorMerah);
      setSkorPutih(data.skorPutih);
    };

    // 5. Soal Berakhir (Penjelasan & Jawaban Benar)
    const handleSoalSelesai = (data: {
      questionIndex: number;
      jawabanBenar: string;
      penjelasan?: string | null;
      taliPosition: number;
      skorMerah: number;
      skorPutih: number;
      isGameFinished: boolean;
    }) => {
      setTaliPosition(data.taliPosition);
      setSkorMerah(data.skorMerah);
      setSkorPutih(data.skorPutih);

      // Tampilkan feedback apakah jawaban pemain benar/salah
      setFeedback((prev) => {
        if (prev?.benar) {
          soundEffects.playCorrect();
        } else if (prev?.benar === false) {
          soundEffects.playIncorrect();
        }
        return {
          tampil: true,
          benar: prev?.benar,
          jawabanBenar: data.jawabanBenar,
          penjelasan: data.penjelasan,
        };
      });
    };

    // 6. Seluruh Permainan Selesai
    const handleSesiSelesai = (data: { hasil: SelesaiResult }) => {
      setHasilAkhir(data.hasil);
      setStage('SELESAI');
      soundEffects.playVictoryFanfare();
      // Hapus data session agar siswa bisa join game baru berikutnya jika diinginkan
      sessionStorage.removeItem('discere_multi_token');
      sessionStorage.removeItem('discere_multi_peserta_id');
      sessionStorage.removeItem('discere_multi_nama');
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
  }, [pesertaId, startCountdown]);

  // Handler: Siswa Submit Form Gabung
  const handleGabung = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanToken = tokenInput.trim().toUpperCase();
    const cleanNama = namaInput.trim();

    if (!cleanToken || cleanToken.length !== 6) {
      setFormError('Kode PIN harus terdiri dari 6 angka.');
      return;
    }

    if (!cleanNama) {
      setFormError('Nama panggilan wajib diisi.');
      return;
    }

    setIsJoining(true);
    const socket = getSocket();

    socket.emit(
      'sesi:gabung',
      { token: cleanToken, nama: cleanNama },
      (res: {
        success: boolean;
        pesan?: string;
        pesertaId?: string;
        sessionId?: string;
        templateJudul?: string;
        status?: string;
        tim?: 'merah' | 'putih' | null;
        taliPosition?: number;
        skorMerah?: number;
        skorPutih?: number;
        soalAktif?: SoalData & { endsAt?: number };
      }) => {
        setIsJoining(false);
        if (!res?.success) {
          setFormError(res?.pesan || 'Gagal bergabung ke sesi.');
          return;
        }

        // Simpan sesi ke sessionStorage
        sessionStorage.setItem('discere_multi_token', cleanToken);
        sessionStorage.setItem('discere_multi_peserta_id', res.pesertaId!);
        sessionStorage.setItem('discere_multi_nama', cleanNama);

        setSessionId(res.sessionId!);
        setPesertaId(res.pesertaId!);
        setNamaPeserta(cleanNama);
        setTemplateJudul(res.templateJudul || '');
        if (res.tim) setTim(res.tim);
        setTaliPosition(res.taliPosition ?? 0);
        setSkorMerah(res.skorMerah ?? 0);
        setSkorPutih(res.skorPutih ?? 0);

        if (res.status === 'jalan') {
          setStage('PLAYING');
          if (res.soalAktif) {
            setSoalAktif(res.soalAktif);
            startCountdown(res.soalAktif.endsAt);
          }
        } else {
          setStage('LOBBY');
        }
      }
    );
  };

  // Handler: Siswa Mengirim Jawaban (A / B / C)
  const handlePilihJawaban = (opsi: 'A' | 'B' | 'C') => {
    if (sudahKirim || !sessionId || !pesertaId || !soalAktif) return;

    setJawabanDipilih(opsi);
    setSudahKirim(true);

    const socket = getSocket();
    socket.emit(
      'jawab:kirim',
      {
        sessionId,
        pesertaId,
        questionId: soalAktif.id,
        jawaban: opsi,
      },
      (res: { success: boolean; benar?: boolean; jawabanBenar?: string; penjelasan?: string }) => {
        if (res?.success) {
          setFeedback({
            tampil: true,
            benar: res.benar,
            jawabanBenar: res.jawabanBenar,
            penjelasan: res.penjelasan,
          });
        }
      }
    );
  };

  // Handler: Siswa Keluar dari Sesi
  const handleKeluar = () => {
    sessionStorage.removeItem('discere_multi_token');
    sessionStorage.removeItem('discere_multi_peserta_id');
    sessionStorage.removeItem('discere_multi_nama');
    setStage('GABUNG');
    setSessionId(null);
    setPesertaId(null);
    setTim(null);
    setSoalAktif(null);
    setFeedback(null);
    setHasilAkhir(null);
  };

  // ==========================================
  // RENDER STAGE 1: FORM GABUNG
  // ==========================================
  if (stage === 'GABUNG') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md">
          {/* Logo Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-500/25 mb-4">
              <Trophy className="w-8 h-8 text-amber-300" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">DISCERE</h1>
            <p className="text-slate-400 text-sm mt-1">Lomba Tarik Tambang Edukatif</p>
          </div>

          <Card className="p-6 sm:p-8 bg-slate-800 border-slate-700 shadow-2xl">
            <h2 className="text-xl font-bold text-white text-center mb-6">
              Gabung Permainan
            </h2>

            {formError && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-sm">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleGabung} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Kode PIN 6 Angka
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Contoh: 849201"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3.5 text-center text-2xl font-black tracking-widest text-white bg-slate-900 border-2 border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Nama Panggilan Kamu
                </label>
                <input
                  type="text"
                  maxLength={20}
                  placeholder="Contoh: Budi, Siti, Reza"
                  value={namaInput}
                  onChange={(e) => setNamaInput(e.target.value)}
                  className="w-full px-4 py-3 text-base text-white bg-slate-900 border-2 border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="utama"
                disabled={isJoining}
                className="w-full py-4 text-base font-bold bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 flex justify-center items-center gap-2"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menghubungkan...
                  </>
                ) : (
                  <>
                    Gabung Lomba
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER STAGE 2: LOBI MENUNGGU GURU
  // ==========================================
  if (stage === 'LOBBY') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6">
        {/* Header */}
        <header className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div>
            <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase">
              PIN SESI: {tokenInput}
            </span>
            <h2 className="text-lg font-bold text-white truncate max-w-[220px] sm:max-w-md">
              {templateJudul || 'Tarik Tambang Discere'}
            </h2>
          </div>
          <button
            onClick={handleKeluar}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Keluar"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Content Lobi */}
        <main className="my-auto py-8 text-center max-w-md mx-auto w-full">
          {/* Avatar / Icon Animasi */}
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-xl shadow-indigo-500/20 mx-auto animate-pulse">
              <Users className="w-12 h-12 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-4 border-slate-900 rounded-full"></span>
          </div>

          <h3 className="text-2xl font-black text-white mb-2">
            Halo, {namaPeserta}! 👋
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            Kamu sudah masuk ke ruang permainan. Tunggu Bapak/Ibu Guru memulai lomba di layar utama kelas.
          </p>

          {/* Status Pemain Terhubung */}
          <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl mb-6">
            <div className="flex items-center justify-center gap-2 text-indigo-400 font-semibold mb-3">
              <Sparkles className="w-5 h-5" />
              <span>{totalPeserta} Siswa Sudah Bergabung</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-h-36 overflow-y-auto p-1">
              {daftarPeserta.map((p) => (
                <span
                  key={p.id}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    p.id === pesertaId
                      ? 'bg-indigo-600 text-white font-bold ring-2 ring-indigo-400'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {p.nama} {p.id === pesertaId && '(Kamu)'}
                </span>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Tim akan ditentukan secara otomatis dan adil saat lomba dimulai.
          </div>
        </main>

        <footer className="text-center text-xs text-slate-600 py-2">
          Discere • Belajar Sambil Berlomba
        </footer>
      </div>
    );
  }

  // ==========================================
  // RENDER STAGE 3: IN-GAME (MENJAWAB SOAL)
  // ==========================================
  if (stage === 'PLAYING') {
    const isMerah = tim === 'merah';
    const timColor = isMerah ? 'bg-red-600' : 'bg-blue-600';
    const timTextColor = isMerah ? 'text-red-400' : 'text-blue-400';

    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6">
        {/* Top Bar: Tim Badge, Soal Number, Timer */}
        <header className="space-y-3">
          <div className="flex justify-between items-center">
            {/* Tim Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`w-3.5 h-3.5 rounded-full ${
                  isMerah ? 'bg-red-500 ring-4 ring-red-500/20' : 'bg-blue-500 ring-4 ring-blue-500/20'
                }`}
              />
              <span className={`text-sm font-black uppercase tracking-wider ${timTextColor}`}>
                TIM {tim?.toUpperCase()}
              </span>
            </div>

            {/* Soal Progress */}
            <div className="text-xs font-semibold text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
              Soal {soalAktif ? soalAktif.nomorSoal : '-'} / {soalAktif ? soalAktif.totalSoal : '-'}
            </div>

            {/* Timer 15s */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-sm ${
                sisaDetik <= 5
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-bounce'
                  : 'bg-slate-800 text-indigo-400 border border-slate-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{sisaDetik}s</span>
            </div>
          </div>

          {/* Timer Progress Bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-linear ${
                sisaDetik <= 5 ? 'bg-rose-500' : isMerah ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, (sisaDetik / 15) * 100)}%` }}
            />
          </div>
        </header>

        {/* Question Area */}
        <main className="my-auto py-4 max-w-lg mx-auto w-full space-y-5">
          {/* Teks Pertanyaan */}
          <Card className="p-5 sm:p-6 bg-slate-800/90 border-slate-700 rounded-2xl shadow-xl">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Pertanyaan:
            </div>
            <p className="text-lg sm:text-xl font-bold text-white leading-snug">
              {soalAktif?.teks}
            </p>
          </Card>

          {/* Opsi Jawaban (A, B, C) */}
          <div className="space-y-3">
            {(['A', 'B', 'C'] as const).map((opsiKey) => {
              const teksOpsi =
                opsiKey === 'A'
                  ? soalAktif?.opsiA
                  : opsiKey === 'B'
                  ? soalAktif?.opsiB
                  : soalAktif?.opsiC;

              const isSelected = jawabanDipilih === opsiKey;
              const isLocked = sudahKirim;

              return (
                <button
                  key={opsiKey}
                  disabled={isLocked}
                  onClick={() => handlePilihJawaban(opsiKey)}
                  className={`w-full text-left p-4 rounded-xl border-2 font-medium transition-all duration-150 flex items-center justify-between ${
                    isSelected
                      ? `${timColor} border-white text-white shadow-lg scale-[1.01]`
                      : isLocked
                      ? 'bg-slate-800/50 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                      : 'bg-slate-800 border-slate-700 text-white hover:border-indigo-500 hover:bg-slate-750 active:scale-[0.99]'
                  }`}
                >
                  <div className="flex items-center gap-3 pr-2">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                        isSelected
                          ? 'bg-white text-slate-900'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {opsiKey}
                    </span>
                    <span className="text-base sm:text-lg">{teksOpsi}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-6 h-6 shrink-0 text-white" />}
                </button>
              );
            })}
          </div>

          {/* Status Setelah Mengirim Jawaban */}
          {sudahKirim && !feedback?.tampil && (
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-center text-indigo-300 text-sm animate-pulse">
              Jawabanmu telah tersimpan! Menunggu waktu soal berakhir...
            </div>
          )}

          {/* Feedback Hasil Jawaban Setelah Waktu Habis */}
          {feedback?.tampil && (
            <div
              className={`p-4 rounded-2xl border text-sm space-y-1.5 transition-all ${
                feedback.benar
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-base">
                {feedback.benar ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Hebat! Jawabanmu Tepat! (+1 Poin Tim)
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-400" />
                    Jawabanmu Belum Tepat
                  </>
                )}
              </div>

              {!feedback.benar && feedback.jawabanBenar && (
                <div className="text-xs text-slate-300">
                  Jawaban benar:{' '}
                  <span className="font-bold text-white uppercase">
                    Opsi {feedback.jawabanBenar}
                  </span>
                </div>
              )}

              {feedback.penjelasan && (
                <div className="text-xs text-slate-400 pt-1 border-t border-slate-700/50">
                  💡 {feedback.penjelasan}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Footer Scoreboard */}
        <footer className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="font-semibold text-slate-300">
              Merah: <strong className="text-white">{skorMerah}</strong>
            </span>
          </div>

          <div className="text-slate-500 font-medium">
            Tali: {taliPosition < 0 ? `Merah +${Math.abs(taliPosition)}` : taliPosition > 0 ? `Putih +${taliPosition}` : 'Imbang'}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">
              Putih: <strong className="text-white">{skorPutih}</strong>
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          </div>
        </footer>
      </div>
    );
  }

  // ==========================================
  // RENDER STAGE 4: PERMAINAN SELESAI
  // ==========================================
  if (stage === 'SELESAI') {
    const isMerah = tim === 'merah';
    const isMenang =
      (hasilAkhir?.timMenang === 'merah' && isMerah) ||
      (hasilAkhir?.timMenang === 'putih' && !isMerah);
    const isSeri = hasilAkhir?.timMenang === 'seri';

    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md text-center">
          {/* Trophy Icon */}
          <div
            className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center shadow-2xl ${
              isMenang
                ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-900 ring-8 ring-amber-500/20 animate-bounce'
                : isSeri
                ? 'bg-slate-700 text-amber-300'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            <Trophy className="w-12 h-12" />
          </div>

          <h2 className="text-3xl font-black mb-2">
            {isMenang
              ? '🎉 TIM KAMU MENANG! 🎉'
              : isSeri
              ? '🤝 HASIL PERTANDINGAN SERI!'
              : '💪 TETAP SEMANGAT!'}
          </h2>

          <p className="text-slate-400 text-sm mb-6">
            {isMenang
              ? 'Luar biasa! Kerja sama dan kecepatan timmu berhasil menarik tali kemenangan!'
              : isSeri
              ? 'Kedua tim sama-sama kuat dan seimbang sampai akhir pertandingan!'
              : 'Perjuangan yang hebat! Terus belajar dan raih kemenangan di lomba berikutnya!'}
          </p>

          {/* Detail Hasil Skor */}
          <Card className="p-6 bg-slate-800 border-slate-700 rounded-2xl mb-6 space-y-4">
            <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Hasil Akhir Lomba
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="text-xs font-bold text-red-400 uppercase">TIM MERAH</div>
                <div className="text-3xl font-black text-white mt-1">
                  {hasilAkhir?.skorMerah ?? skorMerah}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <div className="text-xs font-bold text-blue-400 uppercase">TIM PUTIH</div>
                <div className="text-3xl font-black text-white mt-1">
                  {hasilAkhir?.skorPutih ?? skorPutih}
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400 pt-2 border-t border-slate-700">
              Posisi Akhir Tali:{' '}
              <strong className="text-white">
                {hasilAkhir?.posisiAkhir !== undefined
                  ? hasilAkhir.posisiAkhir < 0
                    ? `Tim Merah (${hasilAkhir.posisiAkhir})`
                    : hasilAkhir.posisiAkhir > 0
                    ? `Tim Putih (+${hasilAkhir.posisiAkhir})`
                    : 'Tepat di Tengah (0)'
                  : '-'}
              </strong>
            </div>
          </Card>

          <Button
            variant="sekunder"
            onClick={handleKeluar}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 font-semibold"
          >
            Kembali ke Halaman Awal
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
