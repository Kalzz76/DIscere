import React from 'react';
import { Flag, Users } from 'lucide-react';

interface VisualisasiTaliProps {
  posisi: number; // -8 hingga +8
  skorMerah?: number;
  skorPutih?: number;
  timAktif?: 'merah' | 'putih';
  ukuran?: 'normal' | 'besar';
  theme?: 'dark' | 'chalk';
}

export const VisualisasiTali: React.FC<VisualisasiTaliProps> = ({
  posisi,
  skorMerah = 0,
  skorPutih = 0,
  timAktif,
  theme = 'dark',
}) => {
  const isChalk = theme === 'chalk';
  // Batasi posisi dalam rentang [-8, 8]
  const clampedPosisi = Math.max(-8, Math.min(8, posisi));

  // Hitung persentase posisi bendera (0% = -8, 50% = 0, 100% = +8)
  const persentase = ((clampedPosisi + 8) / 16) * 100;

  const skala = [-8, -6, -4, -2, 0, 2, 4, 6, 8];

  return (
    <div
      className={`w-full rounded-3xl p-6 sm:p-8 transition-all ${
        isChalk
          ? 'bg-[#fbf6e9] text-[#1d3b2e] border-2 border-[#e0d5b8] shadow-[0_6px_0_rgba(0,0,0,0.18)]'
          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm'
      }`}
    >
      {/* Header Tim & Skor */}
      <div className="flex items-center justify-between mb-8">
        {/* Tim Merah */}
        <div
          className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
            isChalk
              ? 'bg-[#fbf0ee] border-2 border-[#d9544c]'
              : timAktif === 'merah'
              ? 'bg-red-50 dark:bg-red-950/40 border-2 border-[#D7262E] shadow-md scale-105'
              : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-[#D7262E] text-white flex items-center justify-center font-bold shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-[#D7262E]">Tim Merah</span>
              {timAktif === 'merah' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900 text-[#D7262E] font-semibold animate-pulse">
                  Giliran Menjawab
                </span>
              )}
            </div>
            <div className={`text-xs ${isChalk ? 'text-[#6b7d6c]' : 'text-slate-500 dark:text-slate-400'}`}>
              Skor: <span className={`font-bold ${isChalk ? 'text-[#1d3b2e]' : 'text-slate-800 dark:text-slate-100'}`}>{skorMerah} Benar</span>
            </div>
          </div>
        </div>

        {/* Indikator Posisi Tengah */}
        <div className="text-center">
          <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isChalk ? 'text-[#6b7d6c]' : 'text-slate-400'}`}>
            Posisi Tali
          </div>
          <div className={`text-2xl sm:text-3xl font-extrabold ${isChalk ? 'text-[#1d3b2e]' : 'text-slate-800 dark:text-slate-100'}`}>
            {clampedPosisi === 0 ? (
              <span className={isChalk ? 'text-[#d97706]' : 'text-amber-500'}>Netral (0)</span>
            ) : clampedPosisi < 0 ? (
              <span className="text-[#D7262E]">
                Merah {Math.abs(clampedPosisi)} langkah
              </span>
            ) : (
              <span className={isChalk ? 'text-[#1e40af]' : 'text-[#1E2A5A] dark:text-blue-300'}>
                Putih +{clampedPosisi} langkah
              </span>
            )}
          </div>
        </div>

        {/* Tim Putih */}
        <div
          className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
            isChalk
              ? 'bg-[#edf4fb] border-2 border-[#2b6cb0]'
              : timAktif === 'putih'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-2 border-[#1E2A5A] shadow-md scale-105'
              : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              {timAktif === 'putih' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-[#1E2A5A] dark:text-blue-200 font-semibold animate-pulse">
                  Giliran Menjawab
                </span>
              )}
              <span className={`font-bold text-lg ${isChalk ? 'text-[#1e40af]' : 'text-[#1E2A5A] dark:text-blue-300'}`}>
                Tim Putih
              </span>
            </div>
            <div className={`text-xs ${isChalk ? 'text-[#6b7d6c]' : 'text-slate-500 dark:text-slate-400'}`}>
              Skor: <span className={`font-bold ${isChalk ? 'text-[#1d3b2e]' : 'text-slate-800 dark:text-slate-100'}`}>{skorPutih} Benar</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#1E2A5A] text-white flex items-center justify-center font-bold shadow-sm">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Arena Tali Tarik Tambang */}
      <div className="relative pt-6 pb-4 px-2">
        {/* Zona Garis Batas Kemenangan */}
        <div className={`flex justify-between text-xs font-semibold mb-2 px-1 ${isChalk ? 'text-[#6b7d6c]' : 'text-slate-400'}`}>
          <span className="text-[#D7262E] font-bold">🏁 Wilayah Merah (-8)</span>
          <span className={isChalk ? 'text-[#6b7d6c]' : 'text-slate-400'}>Tengah (0)</span>
          <span className={`${isChalk ? 'text-[#1e40af]' : 'text-[#1E2A5A] dark:text-blue-400'} font-bold`}>Wilayah Putih (+8) 🏁</span>
        </div>

        {/* Track Tali Utama */}
        <div className="relative h-10 flex items-center">
          {/* Latar Tali Tebal */}
          <div className="w-full h-4 rounded-full bg-amber-700/30 dark:bg-amber-800/40 border border-amber-800/20 relative overflow-hidden shadow-inner flex items-center">
            {/* Garis ulir tekstur tali */}
            <div className="w-full h-full opacity-40 bg-[repeating-linear-gradient(45deg,#b45309,#b45309_10px,#78350f_10px,#78350f_20px)]" />
          </div>

          {/* Garis batas tengah netral */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-400 dark:bg-slate-500 z-10 -translate-x-1/2" />

          {/* Bendera / Marker Tali Bergerak */}
          <div
            className="absolute top-1/2 -translate-y-1/2 z-20 transition-all duration-700 ease-out flex flex-col items-center pointer-events-none -translate-x-1/2"
            style={{ left: `${persentase}%` }}
          >
            {/* Pita Bendera Merah Putih */}
            <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border-2 border-red-500 shadow-lg flex items-center justify-center transform -translate-y-1">
              <Flag className="w-5 h-5 text-[#D7262E] fill-[#D7262E]" />
            </div>
            <div className="w-1 h-5 bg-[#D7262E] -mt-1 shadow-sm" />
          </div>
        </div>

        {/* Skala Angka -8 sampai +8 */}
        <div className={`relative w-full flex justify-between mt-3 text-xs font-semibold px-1 ${isChalk ? 'text-[#6b7d6c]' : 'text-slate-400'}`}>
          {skala.map((val) => {
            const isZero = val === 0;
            const isMerah = val < 0;
            const isCurrent = val === clampedPosisi;
            return (
              <div key={val} className="flex flex-col items-center">
                <div
                  className={`w-0.5 h-2 mb-1 ${
                    isZero
                      ? (isChalk ? 'bg-[#d97706] h-3 w-1' : 'bg-amber-500 h-3 w-1')
                      : isCurrent
                      ? 'bg-red-500 h-3 w-1'
                      : (isChalk ? 'bg-[#e0d5b8]' : 'bg-slate-300 dark:bg-slate-700')
                  }`}
                />
                <span
                  className={`${
                    isCurrent
                      ? 'font-extrabold text-sm ' + (isMerah ? 'text-[#D7262E]' : isZero ? (isChalk ? 'text-[#d97706]' : 'text-amber-500') : (isChalk ? 'text-[#1e40af]' : 'text-[#1E2A5A] dark:text-blue-300'))
                      : isZero
                      ? (isChalk ? 'text-[#1d3b2e] font-bold' : 'text-slate-600 dark:text-slate-300 font-bold')
                      : (isChalk ? 'text-[#6b7d6c]' : '')
                  }`}
                >
                  {val > 0 ? `+${val}` : val}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
