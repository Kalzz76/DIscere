import { Shield, HandMetal, Droplets, Flag, Trophy, ArrowUp, ArrowDown } from 'lucide-react';
import KarakterPanjatPinang, { EkspresiKarakterPanjat } from './KarakterPanjatPinang';

export interface EfekAktifVisual {
  tiangLicin?: boolean;
  perisaiKulitPisang?: boolean;
  peganganKuat?: boolean;
  menungguBonusKulitPisang?: boolean;
}

interface TiangPinangVisualProps {
  posisi: number; // 0..100 dari backend
  namaPemain?: string;
  efekAktif?: EfekAktifVisual;
  lastDelta?: number | null;
  ekspresi?: EkspresiKarakterPanjat;
  streak?: number;
  status?: 'bermain' | 'selesai';
  compact?: boolean;
}

export default function TiangPinangVisual({
  posisi,
  namaPemain,
  efekAktif,
  lastDelta,
  ekspresi = 'netral',
  streak = 0,
  status = 'bermain',
  compact = false,
}: TiangPinangVisualProps) {
  const safePosisi = Math.max(0, Math.min(100, Math.round(posisi)));
  const isPuncak = safePosisi >= 100 || status === 'selesai';

  // Peta 0..100% ke area panjat di dalam tiang agar karakter 2D muat utuh dari dasar rumput ke puncak
  const bottomPercent = compact ? 16 + safePosisi * 0.62 : 14 + safePosisi * 0.68;

  const hasLicin = Boolean(efekAktif?.tiangLicin);
  const hasPerisai = Boolean(efekAktif?.perisaiKulitPisang);
  const hasPegangan = Boolean(efekAktif?.peganganKuat);

  const resolvedEkspresi: EkspresiKarakterPanjat = isPuncak
    ? 'puncak'
    : ekspresi && ekspresi !== 'netral'
    ? ekspresi
    : lastDelta !== undefined && lastDelta !== null && lastDelta > 0
    ? 'bahagia'
    : lastDelta !== undefined && lastDelta !== null && lastDelta < 0
    ? 'sedih'
    : 'netral';

  const heightClass = compact ? 'h-44 w-26' : 'h-64 sm:h-76 w-48 sm:w-56';

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* Arena Tiang Pinang */}
      <div
        className={`relative ${heightClass} rounded-2xl bg-gradient-to-b from-sky-900/60 via-slate-800/80 to-emerald-950/70 border border-slate-700/80 overflow-hidden shadow-inner flex flex-col justify-between p-2`}
      >
        {/* Garis Ketinggian 25%, 50%, 75%, 100% */}
        <div className="absolute inset-x-3 top-6 bottom-4 pointer-events-none">
          {[100, 75, 50, 25, 0].map((mark) => {
            const topPos = `${82 - mark * 0.74}%`;
            return (
              <div
                key={mark}
                style={{ top: topPos }}
                className="absolute inset-x-0 flex items-center gap-1"
              >
                <span className="text-[9px] font-mono font-bold text-slate-400/80 w-7 text-right">
                  {mark}%
                </span>
                <div className="flex-1 border-t border-dashed border-slate-600/50" />
              </div>
            );
          })}
        </div>

        {/* Roda Hadiah Puncak 100% + Bendera Merah Putih */}
        <div className="relative z-10 flex flex-col items-center mt-0.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50">
            <Flag className="w-3 h-3 text-red-400 fill-red-500" />
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
          </div>
          {/* Roda bambu puncak */}
          <div className="w-16 sm:w-20 h-2 rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 border border-amber-300 shadow mt-0.5 flex items-center justify-around">
            <span className="w-1.5 h-2.5 bg-red-500 rounded-b-sm translate-y-1.5" />
            <span className="w-1.5 h-2.5 bg-amber-300 rounded-b-sm translate-y-1.5" />
            <span className="w-1.5 h-2.5 bg-white rounded-b-sm translate-y-1.5" />
          </div>
        </div>

        {/* Batang Tiang Pinang Vertikal di Tengah */}
        <div className="absolute top-8 bottom-3 left-1/2 -translate-x-1/2 w-3.5 sm:w-4 rounded-t-md shadow-md overflow-hidden border border-amber-900/60 bg-gradient-to-r from-amber-800 via-amber-500 to-amber-700">
          {/* Ruas bambu/batang pinang */}
          <div className="h-full w-full flex flex-col justify-evenly opacity-40">
            <div className="h-[1px] bg-amber-950" />
            <div className="h-[1px] bg-amber-950" />
            <div className="h-[1px] bg-amber-950" />
            <div className="h-[1px] bg-amber-950" />
            <div className="h-[1px] bg-amber-950" />
          </div>
          {/* Kilau minyak saat Tiang Licin aktif */}
          {hasLicin && (
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-300/60 via-sky-200/40 to-cyan-400/60 animate-pulse motion-reduce:animate-none" />
          )}
        </div>

        {/* Karakter Pemanjat (bergerak vertikal persis mengikuti posisi backend) */}
        <div
          style={{ bottom: `${bottomPercent}%` }}
          className="absolute left-1/2 -translate-x-1/2 translate-y-1/2 z-20 transition-all duration-500 ease-out motion-reduce:transition-none flex flex-col items-center"
        >
          {/* Delta badge saat naik / turun */}
          {lastDelta !== undefined && lastDelta !== null && lastDelta !== 0 && (
            <span
              className={`mb-1 px-1.5 py-0.5 rounded-full text-[10px] font-black font-mono flex items-center gap-0.5 shadow ${
                lastDelta > 0
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {lastDelta > 0 ? (
                <ArrowUp className="w-2.5 h-2.5" />
              ) : (
                <ArrowDown className="w-2.5 h-2.5" />
              )}
              {lastDelta > 0 ? `+${lastDelta}%` : `${lastDelta}%`}
            </span>
          )}

          {/* Karakter 2D Pemanjat Panjat Pinang dengan aura efek */}
          <div
            className={`relative flex items-center justify-center rounded-2xl transition-transform ${
              isPuncak
                ? 'ring-2 ring-amber-300/70 bg-amber-400/15 scale-105'
                : hasPerisai
                ? 'ring-2 ring-emerald-400/60 bg-emerald-500/15'
                : hasPegangan
                ? 'ring-2 ring-amber-400/50 bg-amber-500/15'
                : hasLicin
                ? 'ring-2 ring-cyan-300/60 bg-sky-500/15'
                : ''
            }`}
          >
            <KarakterPanjatPinang
              nama={namaPemain}
              ekspresi={resolvedEkspresi}
              pose="panjat"
              size={compact ? 'xs' : 'sm'}
              streak={streak}
            />

            {/* Ikon Perisai / Pegangan aktif */}
            {hasPerisai && (
              <span
                className="absolute -right-1 -top-1 bg-emerald-400 text-slate-950 rounded-full p-0.5 shadow"
                title="Perisai Kulit Pisang Aktif"
              >
                <Shield className="w-2.5 h-2.5" />
              </span>
            )}
            {hasPegangan && (
              <span
                className="absolute -left-1 -top-1 bg-amber-400 text-slate-950 rounded-full p-0.5 shadow"
                title="Pegangan Kuat Aktif"
              >
                <HandMetal className="w-2.5 h-2.5" />
              </span>
            )}
            {hasLicin && (
              <span
                className="absolute -right-1 -bottom-0.5 bg-cyan-400 text-slate-950 rounded-full p-0.5 shadow"
                title="Awas Tiang Licin"
              >
                <Droplets className="w-2.5 h-2.5" />
              </span>
            )}
          </div>
        </div>

        {/* Alas Tanah Rumput di Bawah Tiang */}
        <div className="relative z-10 h-2.5 w-full rounded-b-lg bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 border-t border-emerald-400/40" />
      </div>

      {/* Progress Bar & Persentase Ketinggian (sinkron ketat dengan data backend) */}
      <div className="w-full max-w-[200px] space-y-1">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-300 truncate max-w-[120px]">
            {namaPemain || 'Ketinggian'}
          </span>
          <span
            className={`font-mono font-black ${
              isPuncak ? 'text-amber-400' : 'text-white'
            }`}
          >
            {safePosisi}%
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
          <div
            style={{ width: `${safePosisi}%` }}
            className={`h-full rounded-full transition-all duration-500 motion-reduce:transition-none ${
              isPuncak
                ? 'bg-gradient-to-r from-amber-400 to-yellow-300'
                : 'bg-gradient-to-r from-[#D7262E] via-amber-400 to-emerald-400'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
