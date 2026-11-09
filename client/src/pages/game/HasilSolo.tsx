import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { apiRequest } from '../../lib/api';
import { VisualisasiTali } from './VisualisasiTali';
import { Button, Card } from '../../components';
import {
  Trophy,
  RotateCcw,
  Home,
  Check,
  X,
  Loader2,
  HelpCircle,
} from 'lucide-react';

interface LogItem {
  questionId: string;
  nomorSoal: number;
  teksSoal: string;
  tim: 'merah' | 'putih';
  jawabanDipilih: string;
  jawabanBenar: string;
  benar: boolean;
  posisiSetelah: number;
}

interface HasilData {
  sessionId: string;
  templateJudul: string;
  templateId: string;
  timMenang: 'merah' | 'putih' | 'seri';
  posisiAkhir: number;
  skorMerah: number;
  skorPutih: number;
  totalSoal: number;
  totalBenar: number;
  totalSalah: number;
  logJawaban?: LogItem[];
  questionStats?: Array<{
    nomorSoal: number;
    teksSoal: string;
    benar: boolean;
  }>;
}

export default function HasilSolo() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [hasil, setHasil] = useState<HasilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorPesan, setErrorPesan] = useState<string | null>(null);
  const [isMainLagiLoading, setIsMainLagiLoading] = useState(false);

  useEffect(() => {
    async function loadHasil() {
      try {
        const res = await apiRequest<{ hasil: HasilData }>(`/sesi/${id}/hasil`);
        setHasil(res.hasil);
      } catch (err: any) {
        setErrorPesan(err.pesan || 'Gagal memuat hasil permainan.');
      } finally {
        setLoading(false);
      }
    }
    loadHasil();
  }, [id]);

  const handleMainLagi = async () => {
    if (!id) return;
    try {
      setIsMainLagiLoading(true);
      const res = await apiRequest<{ sessionId: string }>(`/sesi/${id}/main-lagi`, {
        method: 'POST',
      });
      navigate(`/guru/sesi/${res.sessionId}`);
    } catch (err: any) {
      alert(err.pesan || 'Gagal membuat sesi main lagi.');
      setIsMainLagiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <Loader2 className="w-10 h-10 animate-spin text-[#D7262E] mb-4" />
        <p className="font-semibold text-lg">Menghitung hasil pertandingan...</p>
      </div>
    );
  }

  if (errorPesan || !hasil) {
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

  const isMerahMenang = hasil.timMenang === 'merah';
  const isPutihMenang = hasil.timMenang === 'putih';
  const isSeri = hasil.timMenang === 'seri';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 sm:p-6 md:p-10 select-none">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Banner Pemenang */}
        <div
          className={`p-8 sm:p-12 rounded-3xl text-center shadow-lg transition-all ${
            isMerahMenang
              ? 'bg-gradient-to-b from-[#D7262E] to-[#9B1319] text-white'
              : isPutihMenang
              ? 'bg-gradient-to-b from-[#1E2A5A] to-[#111836] text-white'
              : 'bg-gradient-to-b from-amber-500 to-amber-700 text-white'
          }`}
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border-2 border-white/40 shadow-inner">
            <Trophy className="w-12 h-12 sm:w-14 sm:h-14 text-yellow-300 drop-shadow" />
          </div>

          <div className="text-sm font-bold uppercase tracking-widest opacity-90 mb-2">
            Hasil Akhir Pertandingan
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-3 tracking-tight">
            {isMerahMenang && 'TIM MERAH MENANG! 🏆'}
            {isPutihMenang && 'TIM PUTIH MENANG! 🏆'}
            {isSeri && 'PERTANDINGAN SERI! 🤝'}
          </h1>

          <p className="text-lg sm:text-xl font-medium max-w-xl mx-auto opacity-95">
            {isMerahMenang &&
              `Tim Merah berhasil menarik tali ke posisi ${hasil.posisiAkhir} dan memenangkan lomba!`}
            {isPutihMenang &&
              `Tim Putih berhasil menarik tali ke posisi +${hasil.posisiAkhir} dan memenangkan lomba!`}
            {isSeri &&
              'Kedua tim bertarung seimbang hingga tali bertahan tepat di titik netral (0)!'}
          </p>
        </div>

        {/* Visualisasi Posisi Akhir Tali */}
        <VisualisasiTali
          posisi={hasil.posisiAkhir}
          skorMerah={hasil.skorMerah}
          skorPutih={hasil.skorPutih}
        />

        {/* Statistik Ringkasan */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card padding="sm" className="text-center">
            <div className="text-xs font-semibold text-slate-400 mb-1">Skor Tim Merah</div>
            <div className="text-3xl font-extrabold text-[#D7262E]">
              {hasil.skorMerah}
            </div>
          </Card>

          <Card padding="sm" className="text-center">
            <div className="text-xs font-semibold text-slate-400 mb-1">Skor Tim Putih</div>
            <div className="text-3xl font-extrabold text-[#1E2A5A] dark:text-blue-300">
              {hasil.skorPutih}
            </div>
          </Card>

          <Card padding="sm" className="text-center">
            <div className="text-xs font-semibold text-slate-400 mb-1">Total Jawaban Benar</div>
            <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {hasil.totalBenar}
            </div>
          </Card>

          <Card padding="sm" className="text-center">
            <div className="text-xs font-semibold text-slate-400 mb-1">Total Jawaban Salah</div>
            <div className="text-3xl font-extrabold text-red-500">
              {hasil.totalSalah}
            </div>
          </Card>
        </div>

        {/* Detail Riwayat Pertanyaan yang Dimainkan */}
        {hasil.logJawaban && hasil.logJawaban.length > 0 && (
          <Card padding="md">
            <h3 className="text-xl font-bold mb-4">Catatan Perjalanan Soal</h3>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {hasil.logJawaban.map((log, idx) => (
                <div key={idx} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 text-white ${
                        log.tim === 'merah' ? 'bg-[#D7262E]' : 'bg-[#1E2A5A]'
                      }`}
                    >
                      {log.tim === 'merah' ? 'M' : 'P'}
                    </span>
                    <div>
                      <div className="font-semibold text-base">
                        #{log.nomorSoal}: {log.teksSoal}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Dijawab Tim {log.tim === 'merah' ? 'Merah' : 'Putih'}:{' '}
                        <strong className="text-slate-700 dark:text-slate-200">
                          Opsi {log.jawabanDipilih}
                        </strong>{' '}
                        (Kunci: {log.jawabanBenar})
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {log.benar ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <Check className="w-3.5 h-3.5" /> Benar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-[#D7262E] dark:bg-red-950/60 dark:text-red-300">
                        <X className="w-3.5 h-3.5" /> Salah
                      </span>
                    )}
                    <span className="text-xs font-mono font-bold text-slate-400 w-12 text-right">
                      {log.posisiSetelah > 0 ? `+${log.posisiSetelah}` : log.posisiSetelah}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tombol Aksi: Main Lagi & Selesai */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button
            variant="ai"
            size="lg"
            onClick={handleMainLagi}
            loading={isMainLagiLoading}
            icon={<RotateCcw className="w-5 h-5" />}
            className="w-full sm:w-auto px-8"
          >
            Main Lagi (Template Sama)
          </Button>

          <Button
            variant="utama"
            size="lg"
            onClick={() => navigate('/guru')}
            icon={<Home className="w-5 h-5" />}
            className="w-full sm:w-auto px-8"
          >
            Selesai (Kembali ke Dashboard)
          </Button>
        </div>
      </div>
    </div>
  );
}
