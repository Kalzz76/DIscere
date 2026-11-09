import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { apiRequest } from '../../lib/api';
import { VisualisasiTali } from './VisualisasiTali';
import { Button, Card, Modal } from '../../components';
import { soundEffects } from '../../lib/soundEffects';
import {
  Play,
  Pause,
  StopCircle,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface SoalAktif {
  id: string;
  urutan: number;
  nomorSoal: number;
  teks: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
}

interface SesiDetail {
  sessionId: string;
  templateId: string;
  templateJudul: string;
  state: 'READY' | 'PLAYING' | 'PAUSED' | 'FINISHED';
  currentQuestionIndex: number;
  totalSoal: number;
  currentTurn: 'merah' | 'putih';
  taliPosition: number;
  skorMerah: number;
  skorPutih: number;
  soalSaatIni: SoalAktif | null;
}

export default function LayarHostSolo() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [sesi, setSesi] = useState<SesiDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorPesan, setErrorPesan] = useState<string | null>(null);

  // State interaksi jawaban
  const [jawabanDipilih, setJawabanDipilih] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    benar: boolean;
    jawabanBenar: string;
    penjelasan?: string | null;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State modal konfirmasi akhiri permainan
  const [modalAkhiriOpen, setModalAkhiriOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEffects.getMuted());

  // Ambil data sesi dari server
  const fetchSesi = useCallback(async () => {
    try {
      const res = await apiRequest<{ session: SesiDetail }>(`/sesi/${id}`);
      if (res.session.state === 'FINISHED') {
        navigate(`/guru/sesi/${id}/hasil`, { replace: true });
        return;
      }
      setSesi(res.session);
    } catch (err: any) {
      setErrorPesan(err.pesan || 'Gagal memuat sesi permainan.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchSesi();
  }, [fetchSesi]);

  // Handler: Mulai Permainan
  const handleMulai = async () => {
    if (!id) return;
    try {
      setIsSubmitting(true);
      const res = await apiRequest<{ session: any }>(`/sesi/${id}/mulai`, {
        method: 'POST',
      });
      setSesi((prev) =>
        prev
          ? {
              ...prev,
              state: res.session.state,
              currentTurn: res.session.currentTurn,
              soalSaatIni: res.session.soalSaatIni,
            }
          : null
      );
      soundEffects.playWhistle();
    } catch (err: any) {
      alert(err.pesan || 'Gagal memulai permainan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Jeda / Lanjutkan
  const handleTogglePause = async () => {
    if (!id || !sesi) return;
    const targetState = sesi.state === 'PLAYING' ? 'PAUSED' : 'PLAYING';
    try {
      setIsSubmitting(true);
      await apiRequest(`/sesi/${id}/state`, {
        method: 'POST',
        body: JSON.stringify({ state: targetState }),
      });
      setSesi((prev) => (prev ? { ...prev, state: targetState } : null));
    } catch (err: any) {
      alert(err.pesan || 'Gagal mengubah status permainan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Jawab Soal
  const handlePilihJawaban = async (opsi: 'A' | 'B' | 'C') => {
    if (isSubmitting || !sesi || !sesi.soalSaatIni || sesi.state !== 'PLAYING') {
      return;
    }

    setJawabanDipilih(opsi);
    setIsSubmitting(true);

    try {
      const res = await apiRequest<{
        benar: boolean;
        jawabanBenar: string;
        penjelasan: string | null;
        taliPosition: number;
        skorMerah: number;
        skorPutih: number;
        nextTurn: 'merah' | 'putih';
        nextQuestionIndex: number;
        isFinished: boolean;
        winner: 'merah' | 'putih' | 'seri' | null;
        soalBerikutnya: SoalAktif | null;
      }>(`/sesi/${id}/jawab`, {
        method: 'POST',
        body: JSON.stringify({
          questionId: sesi.soalSaatIni.id,
          tim: sesi.currentTurn,
          jawabanDipilih: opsi,
        }),
      });

      // Tampilkan feedback jawaban
      setFeedback({
        benar: res.benar,
        jawabanBenar: res.jawabanBenar,
        penjelasan: res.penjelasan,
      });

      if (res.benar) {
        soundEffects.playCorrect();
        soundEffects.playRopeTug();
      } else {
        soundEffects.playIncorrect();
      }

      // Perbarui posisi tali dan skor di layar
      setSesi((prev) =>
        prev
          ? {
              ...prev,
              taliPosition: res.taliPosition,
              skorMerah: res.skorMerah,
              skorPutih: res.skorPutih,
            }
          : null
      );

      // Jeda 1.8 detik untuk visualisasi sebelum berpindah giliran/selesai
      setTimeout(() => {
        if (res.isFinished) {
          soundEffects.playVictoryFanfare();
          navigate(`/guru/sesi/${id}/hasil`, { replace: true });
        } else {
          setSesi((prev) =>
            prev
              ? {
                  ...prev,
                  currentTurn: res.nextTurn,
                  currentQuestionIndex: res.nextQuestionIndex,
                  soalSaatIni: res.soalBerikutnya,
                }
              : null
          );
          setJawabanDipilih(null);
          setFeedback(null);
          setIsSubmitting(false);
        }
      }, 1800);
    } catch (err: any) {
      alert(err.pesan || 'Gagal memproses jawaban.');
      setJawabanDipilih(null);
      setFeedback(null);
      setIsSubmitting(false);
    }
  };

  // Handler: Akhiri Permainan
  const handleAkhiriPermainan = async () => {
    if (!id) return;
    try {
      setIsEnding(true);
      await apiRequest(`/sesi/${id}/selesai`, { method: 'POST' });
      navigate(`/guru/sesi/${id}/hasil`, { replace: true });
    } catch (err: any) {
      alert(err.pesan || 'Gagal mengakhiri permainan.');
      setIsEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <Loader2 className="w-10 h-10 animate-spin text-[#D7262E] mb-4" />
        <p className="font-semibold text-lg">Memuat arena permainan solo...</p>
      </div>
    );
  }

  if (errorPesan || !sesi) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-center">
        <Card padding="lg" className="max-w-md w-full">
          <HelpCircle className="w-12 h-12 text-[#D7262E] mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Terjadi Kesalahan</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-6">{errorPesan}</p>
          <Button variant="utama" onClick={() => navigate('/guru')}>
            Kembali ke Dashboard Guru
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 sm:p-6 md:p-8 flex flex-col justify-between select-none">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header Layar Proyektor */}
        <header className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase font-extrabold tracking-wider px-3 py-1 bg-red-100 dark:bg-red-950/60 text-[#D7262E] rounded-full">
                Mode Solo • Tarik Tambang
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Layar Bersama Kelas
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {sesi.templateJudul}
            </h1>
          </div>

          {/* Status & Kontrol */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-2xl text-center">
              <div className="text-xs text-slate-400 font-semibold">Nomor Soal</div>
              <div className="font-extrabold text-lg text-slate-800 dark:text-slate-100">
                {sesi.soalSaatIni
                  ? `${sesi.soalSaatIni.nomorSoal} / ${sesi.totalSoal}`
                  : `0 / ${sesi.totalSoal}`}
              </div>
            </div>

            {sesi.state !== 'READY' && (
              <Button
                variant={sesi.state === 'PLAYING' ? 'hantu' : 'ai'}
                size="md"
                onClick={handleTogglePause}
                icon={
                  sesi.state === 'PLAYING' ? (
                    <Pause className="w-5 h-5 text-amber-600" />
                  ) : (
                    <Play className="w-5 h-5 text-slate-900" />
                  )
                }
              >
                {sesi.state === 'PLAYING' ? 'Jeda' : 'Lanjutkan'}
              </Button>
            )}

            <Button
              variant="sekunder"
              size="md"
              onClick={() => setModalAkhiriOpen(true)}
              icon={<StopCircle className="w-5 h-5 text-[#D7262E]" />}
            >
              Akhiri
            </Button>

            {/* Tombol Efek Suara Web Audio */}
            <button
              onClick={() => setIsMuted(soundEffects.toggleMute())}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title={isMuted ? 'Nyalakan Efek Suara' : 'Bisukan Efek Suara'}
              aria-label={isMuted ? 'Nyalakan Efek Suara' : 'Bisukan Efek Suara'}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-rose-500" />
              ) : (
                <Volume2 className="w-5 h-5 text-emerald-600" />
              )}
            </button>
          </div>
        </header>

        {/* Visualisasi Tarik Tambang */}
        <VisualisasiTali
          posisi={sesi.taliPosition}
          skorMerah={sesi.skorMerah}
          skorPutih={sesi.skorPutih}
          timAktif={sesi.state === 'PLAYING' ? sesi.currentTurn : undefined}
        />

        {/* Status READY: Layar Persiapan Guru */}
        {sesi.state === 'READY' && (
          <Card padding="lg" className="text-center py-12 space-y-6">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-950/60 text-[#D7262E] rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <Play className="w-10 h-10 ml-1 fill-[#D7262E]" />
            </div>
            <div className="max-w-lg mx-auto space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold">
                Siap Memulai Lomba?
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Bagi siswa menjadi <strong>Tim Merah (kiri)</strong> dan{' '}
                <strong>Tim Putih (kanan)</strong>. Permainan akan dimulai dari giliran
                Tim Merah.
              </p>
            </div>
            <div>
              <Button
                variant="utama"
                size="lg"
                onClick={handleMulai}
                loading={isSubmitting}
                className="text-xl px-10 py-4 h-16 font-bold shadow-lg"
              >
                Mulai Tarik Tambang Sekarang
              </Button>
            </div>
          </Card>
        )}

        {/* Status PAUSED: Layar Dijeda */}
        {sesi.state === 'PAUSED' && (
          <Card padding="lg" className="text-center py-10 bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800">
            <div className="w-16 h-16 bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Pause className="w-8 h-8 fill-current" />
            </div>
            <h2 className="text-2xl font-extrabold text-amber-900 dark:text-amber-200 mb-2">
              Permainan Sedang Dijeda
            </h2>
            <p className="text-amber-800 dark:text-amber-300/80 mb-6 max-w-md mx-auto">
              Penjelasan materi atau istirahat sejenak. Posisi tali dan giliran tetap aman.
            </p>
            <Button variant="ai" size="lg" onClick={handleTogglePause}>
              Lanjutkan Permainan
            </Button>
          </Card>
        )}

        {/* Status PLAYING: Area Soal & Tombol Pilihan Jawaban */}
        {sesi.state === 'PLAYING' && sesi.soalSaatIni && (
          <div className="space-y-6">
            {/* Banner Indikator Giliran Tim */}
            <div
              className={`p-4 rounded-2xl flex items-center justify-between text-white font-bold transition-all shadow-md ${
                sesi.currentTurn === 'merah'
                  ? 'bg-gradient-to-r from-[#D7262E] to-[#B91C23]'
                  : 'bg-gradient-to-r from-[#1E2A5A] to-[#2B3B7E]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {sesi.currentTurn === 'merah' ? '🔴' : '⚪'}
                </span>
                <span className="text-lg sm:text-xl">
                  GILIRAN: TIM {sesi.currentTurn.toUpperCase()}
                </span>
              </div>
              <span className="text-sm opacity-90 font-medium hidden sm:inline">
                Perwakilan tim silakan maju dan sentuh jawaban di bawah
              </span>
            </div>

            {/* Kotak Pertanyaan Utama */}
            <Card padding="lg" className="border-2 border-slate-300 dark:border-slate-700 shadow-md">
              <div className="text-xs font-bold text-slate-400 mb-3 tracking-wider uppercase">
                Pertanyaan Soal #{sesi.soalSaatIni.nomorSoal}
              </div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white leading-snug">
                {sesi.soalSaatIni.teks}
              </p>
            </Card>

            {/* Feedback Jawaban */}
            {feedback && (
              <div
                className={`p-4 rounded-2xl flex items-start gap-4 border animate-in fade-in-50 duration-300 ${
                  feedback.benar
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
                }`}
              >
                {feedback.benar ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-extrabold text-lg sm:text-xl">
                    {feedback.benar
                      ? 'JAWABAN BENAR! Tali ditarik 1 langkah!'
                      : 'JAWABAN SALAH! Tali tidak bergerak.'}
                  </h4>
                  {!feedback.benar && (
                    <p className="text-sm mt-1">
                      Kunci jawaban yang tepat adalah opsi{' '}
                      <strong>{feedback.jawabanBenar}</strong>.
                    </p>
                  )}
                  {feedback.penjelasan && (
                    <p className="text-xs opacity-90 mt-1 italic">
                      Penjelasan: {feedback.penjelasan}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 3 Tombol Pilihan Jawaban Besar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                [
                  { key: 'A', teks: sesi.soalSaatIni.opsiA },
                  { key: 'B', teks: sesi.soalSaatIni.opsiB },
                  { key: 'C', teks: sesi.soalSaatIni.opsiC },
                ] as const
              ).map((opsi) => {
                const isSelected = jawabanDipilih === opsi.key;
                const isCorrect = feedback && feedback.jawabanBenar === opsi.key;
                const isWrongSelected = feedback && isSelected && !feedback.benar;

                let buttonStyles =
                  'bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-red-500 hover:bg-red-50/40 dark:hover:bg-red-950/20';

                if (isCorrect) {
                  buttonStyles =
                    'bg-emerald-500 text-white border-2 border-emerald-600 shadow-lg scale-102';
                } else if (isWrongSelected) {
                  buttonStyles =
                    'bg-[#D7262E] text-white border-2 border-red-700 shadow-md';
                } else if (feedback && !isSelected) {
                  buttonStyles =
                    'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-50';
                }

                return (
                  <button
                    key={opsi.key}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handlePilihJawaban(opsi.key)}
                    className={`min-h-[90px] p-5 rounded-3xl text-left transition-all duration-200 flex items-start gap-4 cursor-pointer focus:outline-none focus:ring-4 focus:ring-red-400 disabled:pointer-events-none ${buttonStyles}`}
                  >
                    <span
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-lg shrink-0 ${
                        isCorrect || isWrongSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {opsi.key}
                    </span>
                    <span className="font-bold text-lg sm:text-xl leading-snug self-center">
                      {opsi.teks}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Akhiri Permainan */}
      <Modal
        isOpen={modalAkhiriOpen}
        onClose={() => setModalAkhiriOpen(false)}
        title="Akhiri Permainan Sekarang?"
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300">
            Apakah Anda yakin ingin mengakhiri sesi permainan ini sekarang? Pemenang
            akan ditentukan berdasarkan posisi tali saat ini dan hasilnya akan disimpan
            ke riwayat.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="hantu"
              onClick={() => setModalAkhiriOpen(false)}
              disabled={isEnding}
            >
              Batal
            </Button>
            <Button
              variant="utama"
              onClick={handleAkhiriPermainan}
              loading={isEnding}
            >
              Ya, Akhiri Permainan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
