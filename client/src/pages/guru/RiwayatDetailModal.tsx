import { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { Modal } from '../../components';
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

  // Posisi visual tali (-5 sampai +5) dipetakan ke persentase 10% - 90%
  const ropePos = detail ? Math.max(-5, Math.min(5, detail.posisiAkhir)) : 0;
  const ropeLeftPercent = 50 + ropePos * 8;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detail Analisis Pertandingan Sesi"
      maxWidth="lg"
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-[#6b7d6c]">
          <Loader2 className="w-8 h-8 animate-spin text-[#c8362f] mb-3" />
          <p className="portal-cv text-xl text-[#1d3b2e]">Menyiapkan rekapitulasi nilai...</p>
        </div>
      ) : errorPesan || !detail ? (
        <div className="py-6 text-center text-[#6b7d6c]">
          <p>{errorPesan || 'Data tidak tersedia.'}</p>
        </div>
      ) : (
        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* Header Ringkasan */}
          <div className="bg-[#f4ecd9] p-4 rounded-2xl border border-[#e0d5b8] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6b7d6c]">
                Materi Kuis Tarik Tambang
              </span>
              <span className="portal-tag yellow font-bold">
                Mode {detail.mode === 'multi' ? 'Multiplayer' : 'Solo'}
              </span>
            </div>
            <h3 className="portal-cv text-2xl text-[#1d3b2e] leading-snug">
              {detail.templateJudul}
            </h3>
            <div className="text-xs text-[#6b7d6c]">
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

          {/* Indikator Visual Tali Tarik Tambang */}
          <div className="bg-[#fbf6e9] p-4 rounded-2xl border border-[#e0d5b8] space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#1d3b2e]">
              <span>Visualisasi Tali Pertandingan</span>
              <span className="font-mono">
                Posisi Akhir: {detail.posisiAkhir > 0 ? `+${detail.posisiAkhir}` : detail.posisiAkhir}
              </span>
            </div>
            <div className="portal-rope">
              <i style={{ left: `${ropeLeftPercent}%` }} />
            </div>
            <div className="portal-rl">
              <span className="text-[#c8362f]">Tim Merah (Kiri)</span>
              <span className="text-[#1d3b2e]">Tim Putih (Kanan)</span>
            </div>
          </div>

          {/* Kartu Skor & Pemenang */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-[#f6d9d3] border border-[#d9544c]/30 rounded-xl">
              <div className="text-xs font-bold text-[#c8362f]">Skor Merah</div>
              <div className="portal-cv text-3xl text-[#c8362f]">
                {detail.skorMerah}
              </div>
            </div>

            <div className="p-3 bg-[#dbeafe] border border-blue-200 rounded-xl">
              <div className="text-xs font-bold text-[#1e40af]">Skor Putih</div>
              <div className="portal-cv text-3xl text-[#1e40af]">
                {detail.skorPutih}
              </div>
            </div>

            <div className="p-3 bg-[#f4ecd9] border border-[#e0d5b8] rounded-xl">
              <div className="text-xs font-bold text-[#6b7d6c]">Pemenang</div>
              <div className="text-sm font-extrabold uppercase text-[#1d3b2e] mt-1">
                {detail.timMenang === 'merah'
                  ? '🔴 Merah'
                  : detail.timMenang === 'putih'
                  ? '⚪ Putih'
                  : '🤝 Seri'}
              </div>
            </div>

            <div className="p-3 bg-[#f4ecd9] border border-[#e0d5b8] rounded-xl">
              <div className="text-xs font-bold text-[#6b7d6c]">Akurasi Soal</div>
              <div className="portal-cv text-3xl text-[#1d3b2e]">
                {Math.round(
                  (detail.totalBenar /
                    Math.max(1, detail.totalBenar + detail.totalSalah)) *
                    100
                )}%
              </div>
            </div>
          </div>

          {/* Evaluasi Materi Guru: Soal Paling Sering Salah */}
          {detail.soalPalingSeringSalah && (
            <div className="p-4 rounded-2xl bg-[#f8e7b0] border-2 border-[#f2c230] text-[#1d3b2e]">
              <div className="flex items-center gap-2 font-bold mb-1 text-sm text-[#8a6a00]">
                <AlertTriangle className="w-4 h-4 text-[#8a6a00] shrink-0" />
                <span>Materi yang Perlu Evaluasi (Paling Banyak Dijawab Keliru)</span>
              </div>
              <p className="portal-cv text-xl text-[#1d3b2e] mt-2">
                Soal #{detail.soalPalingSeringSalah.urutan}:{' '}
                {detail.soalPalingSeringSalah.teks}
              </p>
              <div className="text-xs mt-2 flex gap-4 font-bold">
                <span className="text-[#c8362f]">
                  Dijawab Salah: {detail.soalPalingSeringSalah.jumlahSalah}x
                </span>
                <span className="text-[#1f4a37]">
                  Dijawab Benar: {detail.soalPalingSeringSalah.jumlahBenar}x
                </span>
              </div>
              {detail.soalPalingSeringSalah.penjelasan && (
                <p className="text-xs mt-2 italic text-[#6b7d6c]">
                  Penjelasan Kunci: {detail.soalPalingSeringSalah.penjelasan}
                </p>
              )}
            </div>
          )}

          {/* Rincian Jawaban Per Soal */}
          <div className="space-y-3">
            <h4 className="portal-cv text-xl text-[#1d3b2e]">Rincian Hasil Seluruh Soal:</h4>
            <div className="space-y-2">
              {detail.statsPerSoal.map((soal) => (
                <div
                  key={soal.questionId}
                  className="p-3.5 rounded-xl border border-[#e0d5b8] bg-[#fbf6e9] flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-sm text-[#1d3b2e]">
                      #{soal.urutan}: {soal.teks}
                    </div>
                    <div className="text-xs text-[#6b7d6c]">
                      Kunci Jawaban: <strong className="text-[#1d3b2e]">Opsi {soal.jawabanBenar}</strong>
                      {soal.penjelasan && ` • ${soal.penjelasan}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="portal-tag green">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {soal.jumlahBenar}
                    </span>
                    <span className="portal-tag red">
                      <XCircle className="w-3.5 h-3.5" /> {soal.jumlahSalah}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button type="button" className="portal-btn ghost sm" onClick={onClose}>
              Tutup
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
