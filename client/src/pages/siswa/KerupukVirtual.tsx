import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export interface HasilGachaGigitanProps {
  tipe: 'besar' | 'sedang' | 'kecil' | 'sangat_kecil' | 'zonk';
  label: string;
  berkurangPersen: number;
  poinGigitan: number;
  pesanLucu: string;
}

interface KerupukVirtualProps {
  sisaKerupuk: number; // 0 sampai 100
  terakhirGigitan?: HasilGachaGigitanProps | null;
  sedangAnimasiGigit?: boolean;
  ukuran?: 'sm' | 'md' | 'lg';
  namaPemain?: string;
}

export default function KerupukVirtual({
  sisaKerupuk,
  terakhirGigitan,
  sedangAnimasiGigit = false,
  ukuran = 'md',
  namaPemain,
}: KerupukVirtualProps) {
  const [animasiChomp, setAnimasiChomp] = useState(false);
  const [tampilEfekGigit, setTampilEfekGigit] = useState(false);

  // Trigger animasi chomp saat terakhirGigitan diperbarui atau sedangAnimasiGigit true
  useEffect(() => {
    if (terakhirGigitan || sedangAnimasiGigit) {
      setAnimasiChomp(true);
      setTampilEfekGigit(true);
      const timer = setTimeout(() => {
        setAnimasiChomp(false);
      }, 700);
      const timerLabel = setTimeout(() => {
        setTampilEfekGigit(false);
      }, 2500);
      return () => {
        clearTimeout(timer);
        clearTimeout(timerLabel);
      };
    }
  }, [terakhirGigitan, sedangAnimasiGigit, sisaKerupuk]);

  // Dimensi SVG berdasarkan ukuran prop
  const dimensi = {
    sm: { w: 120, h: 140, r: 35 },
    md: { w: 200, h: 230, r: 55 },
    lg: { w: 280, h: 320, r: 80 },
  }[ukuran];

  // Menghitung clip-path atau bentuk visual kerupuk berdasarkan sisa persentase
  // 100% -> penuh
  // 60-90% -> gigitan di sisi kanan
  // 35-59% -> setengah bagian bawah/kanan hilang
  // 1-34% -> hanya tersisa ujung atas dekat tali
  // 0% -> kosong (hanya tali)
  const renderKerupukBody = () => {
    if (sisaKerupuk <= 0) {
      // Kerupuk sudah habis total: sisa sedikit remahan di ujung simpul tali
      return (
        <g className="animate-fade-in">
          {/* Remahan kecil pada simpul */}
          <circle cx="100" cy="115" r="3" fill="#ecd9b6" />
          <circle cx="97" cy="118" r="2.5" fill="#fdfaf3" />
          <circle cx="103" cy="117" r="2" fill="#ecd9b6" />
        </g>
      );
    }

    // Path bentuk kerupuk berdasarkan rentang sisa
    let kerupukPath = '';

    if (sisaKerupuk >= 95) {
      // Utuh 100%
      kerupukPath = `
        M 100 65
        C 130 63, 155 88, 155 120
        C 155 152, 130 175, 100 175
        C 70 175, 45 152, 45 120
        C 45 88, 70 63, 100 65 Z
      `;
    } else if (sisaKerupuk >= 70) {
      // Gigitan kecil/sedang di kanan bawah
      kerupukPath = `
        M 100 65
        C 130 63, 155 85, 152 110
        C 142 112, 138 125, 145 135
        C 132 140, 125 155, 130 165
        C 115 172, 105 175, 100 175
        C 70 175, 45 152, 45 120
        C 45 88, 70 63, 100 65 Z
      `;
    } else if (sisaKerupuk >= 40) {
      // Tersisa sekitar 40-69% (separuh bagian samping & bawah terpangkas)
      kerupukPath = `
        M 100 65
        C 125 65, 142 80, 135 105
        C 120 108, 115 125, 120 135
        C 105 142, 98 155, 88 152
        C 75 158, 65 148, 55 138
        C 45 125, 48 100, 65 80
        C 75 70, 88 65, 100 65 Z
      `;
    } else if (sisaKerupuk >= 15) {
      // Tersisa sekitar 15-39% (bongkahan kecil dekat tali)
      kerupukPath = `
        M 100 65
        C 115 65, 125 75, 122 92
        C 110 95, 105 108, 110 115
        C 98 122, 85 115, 78 105
        C 72 98, 75 80, 85 70
        C 90 65, 95 65, 100 65 Z
      `;
    } else {
      // Tersisa sangat sedikit (< 15%)
      kerupukPath = `
        M 100 68
        C 108 68, 115 75, 112 85
        C 105 88, 100 95, 95 90
        C 88 88, 88 78, 92 72
        C 95 68, 98 68, 100 68 Z
      `;
    }

    return (
      <g>
        {/* Lapisan Bayangan Kerupuk */}
        <path
          d={kerupukPath}
          fill="#d8c5a2"
          transform="translate(2, 4)"
          opacity="0.35"
        />

        {/* Badan Kerupuk Putih Gurih */}
        <path
          d={kerupukPath}
          fill="#fffdf7"
          stroke="#e2cfb0"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Pola Ulir Khas Kerupuk Kaleng Putih (Concentric Wavy Ridges) */}
        {sisaKerupuk >= 30 && (
          <path
            d="M 90 85 Q 100 80, 110 85 Q 120 95, 115 105 Q 100 115, 85 105 Q 80 95, 90 85"
            fill="none"
            stroke="#ebd9be"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
        {sisaKerupuk >= 60 && (
          <path
            d="M 75 100 Q 85 75, 115 75 Q 135 90, 130 120 Q 115 145, 85 140 Q 65 125, 75 100"
            fill="none"
            stroke="#ebd9be"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        {/* Titik Pori Renyah Kerupuk */}
        <circle cx="95" cy="95" r="2" fill="#ebd9be" />
        <circle cx="108" cy="112" r="2.5" fill="#e2cfb0" />
        {sisaKerupuk >= 50 && (
          <>
            <circle cx="82" cy="118" r="2" fill="#ebd9be" />
            <circle cx="118" cy="98" r="1.5" fill="#ebd9be" />
          </>
        )}
        {sisaKerupuk >= 80 && (
          <>
            <circle cx="128" cy="130" r="2" fill="#ebd9be" />
            <circle cx="70" cy="110" r="2.5" fill="#ebd9be" />
          </>
        )}
      </g>
    );
  };

  return (
    <div className="flex flex-col items-center select-none relative">
      {/* Wadah Visual Kerupuk dengan Efek Goyang Tali */}
      <div
        className={`relative transition-transform duration-300 ${
          animasiChomp ? 'scale-110 rotate-3' : 'hover:rotate-1'
        }`}
        style={{
          width: dimensi.w,
          height: dimensi.h,
        }}
      >
        <svg
          viewBox="0 0 200 220"
          className="w-full h-full drop-shadow-md overflow-visible"
        >
          <defs>
            {/* Filter Bayangan */}
            <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* 1. Tali Rafia Gantungan (Berayun dari atas langit-langit) */}
          <line
            x1="100"
            y1="0"
            x2="100"
            y2="75"
            stroke="#c8362f"
            strokeWidth="3"
            strokeDasharray="4 2"
          />

          {/* Simpul Ikatan Tali Pada Kerupuk */}
          <ellipse cx="100" cy="74" rx="5" ry="3.5" fill="#a8231c" />
          <path
            d="M 97 73 Q 100 80, 103 73"
            fill="none"
            stroke="#a8231c"
            strokeWidth="2.5"
          />

          {/* 2. Badan Kerupuk Virtual */}
          {renderKerupukBody()}

          {/* 3. Efek Partikel Remahan Saat Menggigit (Chomp) */}
          {animasiChomp && sisaKerupuk > 0 && (
            <g className="animate-ping" opacity="0.8">
              <circle cx="130" cy="110" r="3" fill="#f7ecd5" />
              <circle cx="140" cy="125" r="2.5" fill="#dfcaa5" />
              <circle cx="125" cy="140" r="3" fill="#f7ecd5" />
              <circle cx="135" cy="150" r="2" fill="#dfcaa5" />
            </g>
          )}
        </svg>

        {/* Floating Bubble Hasil Gacha Gigitan */}
        {tampilEfekGigit && terakhirGigitan && (
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full text-xs font-black shadow-lg animate-bounce pointer-events-none whitespace-nowrap z-20 flex items-center gap-1.5 ${
              terakhirGigitan.tipe === 'zonk'
                ? 'bg-red-500 text-white'
                : terakhirGigitan.tipe === 'besar'
                ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300'
                : 'bg-emerald-600 text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{terakhirGigitan.label}</span>
            <span className="font-mono">
              {terakhirGigitan.berkurangPersen > 0
                ? `(-${terakhirGigitan.berkurangPersen}%)`
                : '(0%)'}
            </span>
          </div>
        )}
      </div>

      {/* Indikator Status & Persentase Kerupuk */}
      <div className="mt-2 text-center w-full max-w-[200px]">
        {namaPemain && (
          <p className="font-bold text-xs text-[#1d3b2e] truncate mb-1">
            {namaPemain}
          </p>
        )}

        {/* Progress Bar Kerupuk Tersisa */}
        <div className="bg-[#e0d5b8] h-2.5 rounded-full overflow-hidden p-0.5 border border-[#d2c4a3]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              sisaKerupuk === 0
                ? 'bg-emerald-500'
                : sisaKerupuk <= 25
                ? 'bg-red-500'
                : sisaKerupuk <= 50
                ? 'bg-amber-500'
                : 'bg-[#1d3b2e]'
            }`}
            style={{ width: `${sisaKerupuk}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[11px] font-bold mt-1 text-[#1d3b2e]">
          <span>Kerupuk</span>
          <span
            className={`font-mono ${
              sisaKerupuk === 0
                ? 'text-emerald-700 font-black'
                : sisaKerupuk <= 25
                ? 'text-red-600'
                : 'text-[#1d3b2e]'
            }`}
          >
            {sisaKerupuk === 0 ? 'LUDES! 🎉 (+100)' : `${sisaKerupuk}%`}
          </span>
        </div>
      </div>
    </div>
  );
}
