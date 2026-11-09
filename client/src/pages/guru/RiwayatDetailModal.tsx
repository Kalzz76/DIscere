import { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { Modal, Button, Badge } from '../../components';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

interface RiwayatDetailModalProps {
  sessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface SoalStat {
  questionId: string;
  urutan: number;
  teks: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  jawabanBenar: string;
  penjelasan: string | null;
  jumlahBenar: number;
  jumlahSalah: number;
}

interface DetailData {
  sessionId: string;
  templateJudul: string;
  mode: string;
  tanggal: string;
  timMenang: 'merah' | 'putih' | 'seri';
  posisiAkhir: number;
  skorMerah: number;
  skorPutih: number;
  totalBenar: number;
  totalSalah: number;
  totalSoalDimainkan: number;
  statsPerSoal: SoalStat[];
  soalPalingSeringSalah: {
    questionId: string;
    urutan: number;
    teks: string;
    jumlahSalah: number;
    jumlahBenar: number;
    penjelasan: string | null;
  } | null;
}

export function RiwayatDetailModal({
  sessionId,
  isOpen,
  onClose,
}: RiwayatDetailModalProps) {
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorPesan, setErrorPesan] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !isOpen) {
      setDetail(null);
      return;
    }

    async function fetchDetail() {
      setLoading(true);
      setErrorPesan(null);
      try {
        const res = await apiRequest<{ detail: DetailData }>(
          `/sesi/riwayat/${sessionId}`
        );
        setDetail(res.detail);
      } catch (err: any) {
        setErrorPesan(err.pesan || 'Gagal memuat detail riwayat.');
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [sessionId, isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detail Hasil Pertandingan Sesi"
      maxWidth="lg"
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#D7262E] mb-3" />
          <p className="text-sm font-medium">Memuat rincian statistik sesi...</p>
        </div>
      ) : errorPesan || !detail ? (
        <div className="py-6 text-center text-slate-600 dark:text-slate-300">
          <p>{errorPesan || 'Data tidak tersedia.'}</p>
        </div>
      ) : (
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* Header Ringkasan */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Materi Permainan
              </span>
              <Badge variant="slate" size="sm">
                Mode {detail.mode}
              </Badge>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {detail.templateJudul}
            </h3>
            <div className="text-xs text-slate-500">
              Dimainkan pada:{' '}
              {new Date(detail.tanggal).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          {/* Kartu Pemenang & Posisi Akhir */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl">
              <div className="text-xs font-semibold text-slate-500">Skor Merah</div>
              <div className="text-2xl font-black text-[#D7262E]">
                {detail.skorMerah}
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 rounded-xl">
              <div className="text-xs font-semibold text-slate-500">Skor Putih</div>
              <div className="text-2xl font-black text-[#1E2A5A] dark:text-blue-300">
                {detail.skorPutih}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="text-xs font-semibold text-slate-500">Pemenang</div>
              <div className="text-base font-extrabold uppercase text-slate-800 dark:text-slate-100">
                {detail.timMenang === 'merah'
                  ? '🔴 Merah'
                  : detail.timMenang === 'putih'
                  ? '⚪ Putih'
                  : '🤝 Seri'}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              <div className="text-xs font-semibold text-slate-500">Posisi Akhir Tali</div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
                {detail.posisiAkhir > 0 ? `+${detail.posisiAkhir}` : detail.posisiAkhir}
              </div>
            </div>
          </div>

          {/* Evaluasi Materi Guru: Soal Paling Sering Salah */}
          {detail.soalPalingSeringSalah && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 font-bold mb-1 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Materi yang Perlu Evaluasi (Paling Banyak Salah)</span>
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-2">
                Soal #{detail.soalPalingSeringSalah.urutan}:{' '}
                {detail.soalPalingSeringSalah.teks}
              </p>
              <div className="text-xs mt-2 flex gap-4">
                <span className="text-red-600 font-semibold">
                  Dijawab Salah: {detail.soalPalingSeringSalah.jumlahSalah}x
                </span>
                <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                  Dijawab Benar: {detail.soalPalingSeringSalah.jumlahBenar}x
                </span>
              </div>
              {detail.soalPalingSeringSalah.penjelasan && (
                <p className="text-xs mt-2 italic text-slate-600 dark:text-slate-400">
                  Penjelasan: {detail.soalPalingSeringSalah.penjelasan}
                </p>
              )}
            </div>
          )}

          {/* Rincian Jawaban Per Soal */}
          <div className="space-y-3">
            <h4 className="font-bold text-base">Rincian Hasil Seluruh Soal:</h4>
            <div className="space-y-2">
              {detail.statsPerSoal.map((soal) => (
                <div
                  key={soal.questionId}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-sm">
                      #{soal.urutan}: {soal.teks}
                    </div>
                    <div className="text-xs text-slate-500">
                      Kunci: <strong>Opsi {soal.jawabanBenar}</strong>
                      {soal.penjelasan && ` • ${soal.penjelasan}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {soal.jumlahBenar}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                      <XCircle className="w-3.5 h-3.5" /> {soal.jumlahSalah}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="hantu" onClick={onClose}>
              Tutup
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
