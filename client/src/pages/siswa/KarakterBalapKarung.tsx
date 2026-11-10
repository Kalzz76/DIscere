import { useId } from 'react';

export type EkspresiBalapKarung = 'netral' | 'bahagia' | 'sedih' | 'terjatuh' | 'puncak';
export type PoseBalapKarung = 'balap' | 'terjatuh' | 'podium';

export interface KarakterBalapKarungProps {
  nama?: string;
  ekspresi?: EkspresiBalapKarung;
  pose?: PoseBalapKarung;
  podiumRank?: 1 | 2 | 3;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  streak?: number;
  perisai?: boolean;
  className?: string;
}

const PALET_KAUS = [
  { utama: '#D7262E', gelap: '#991B1B', aksen: '#FFFFFF' },
  { utama: '#2563EB', gelap: '#1E40AF', aksen: '#FEF08A' },
  { utama: '#059669', gelap: '#047857', aksen: '#FEF3C7' },
  { utama: '#EA580C', gelap: '#9A3412', aksen: '#FFFBEB' },
  { utama: '#7C3AED', gelap: '#5B21B6', aksen: '#FDE68A' },
];

function pilihPaletDariNama(nama?: string, podiumRank?: 1 | 2 | 3) {
  if (podiumRank === 1) {
    return { utama: '#D7262E', gelap: '#991B1B', aksen: '#FDE047' };
  }
  if (!nama) return PALET_KAUS[0];
  let hash = 0;
  for (let i = 0; i < nama.length; i++) {
    hash = (hash * 31 + nama.charCodeAt(i)) >>> 0;
  }
  return PALET_KAUS[hash % PALET_KAUS.length];
}

const UKURAN_MAP: Record<NonNullable<KarakterBalapKarungProps['size']>, number> = {
  xs: 42,
  sm: 56,
  md: 76,
  lg: 96,
};

/**
 * Karakter 2D kartun anak lomba Balap Karung 17 Agustus.
 * Menampilkan karakter mengenakan karung goni dan ikat kepala merah-putih,
 * lengkap dengan ekspresi melompat bahagia, sedih, terjatuh, dan aksesori podium juara.
 */
export default function KarakterBalapKarung({
  nama,
  ekspresi = 'netral',
  pose = 'balap',
  podiumRank,
  size = 'sm',
  streak = 0,
  perisai = false,
  className = '',
}: KarakterBalapKarungProps) {
  const uid = useId().replace(/:/g, '');
  const px = UKURAN_MAP[size];
  const palet = pilihPaletDariNama(nama, podiumRank);

  const isJatuh = pose === 'terjatuh' || ekspresi === 'terjatuh';
  const isBahagia = !isJatuh && (ekspresi === 'bahagia' || ekspresi === 'puncak');
  const isSedih = !isJatuh && ekspresi === 'sedih';

  const gradKulitId = `bk-skin-${uid}`;
  const gradKarungId = `bk-sack-${uid}`;
  const gradEmasId = `bk-gold-${uid}`;
  const gradPerakId = `bk-silver-${uid}`;
  const gradPerungguId = `bk-bronze-${uid}`;

  const labelAkses = [
    nama ? `Karakter Balap Karung ${nama}` : 'Karakter Balap Karung',
    podiumRank === 1
      ? 'Juara 1 bermahkota'
      : podiumRank === 2
      ? 'Juara 2 berkalung medali perak'
      : podiumRank === 3
      ? 'Juara 3 berkalung medali perunggu'
      : null,
    isJatuh ? 'terjatuh' : isBahagia ? 'melompat bahagia' : isSedih ? 'ekspresi sedih' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <svg
      width={px}
      height={Math.round(px * 1.1)}
      viewBox="0 0 120 132"
      role="img"
      aria-label={labelAkses}
      className={`overflow-visible select-none drop-shadow-[0_3px_4px_rgba(0,0,0,0.4)] ${
        isBahagia
          ? 'motion-safe:animate-bounce'
          : isSedih
          ? 'rotate-[-5deg] transition-transform duration-300'
          : 'transition-transform duration-300'
      } ${className}`}
      style={isBahagia ? { animationDuration: '0.95s', animationIterationCount: 2 } : undefined}
    >
      <defs>
        <linearGradient id={gradKulitId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FCD9B6" />
          <stop offset="100%" stopColor="#F1B789" />
        </linearGradient>
        <linearGradient id={gradKarungId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D7A86E" />
          <stop offset="55%" stopColor="#B8834A" />
          <stop offset="100%" stopColor="#8C5D30" />
        </linearGradient>
        <linearGradient id={gradEmasId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
        <linearGradient id={gradPerakId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
        <linearGradient id={gradPerungguId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="55%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#7C2D12" />
        </linearGradient>
      </defs>

      {/* Aura Perisai di sekitar karakter */}
      {perisai && pose !== 'podium' && (
        <ellipse
          cx="60"
          cy="78"
          rx="42"
          ry="48"
          fill="#38BDF8"
          fillOpacity="0.14"
          stroke="#38BDF8"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
      )}

      {/* Bintang semarak saat melompat bahagia / streak / juara 1 */}
      {(isBahagia || streak >= 3 || podiumRank === 1) && (
        <g opacity="0.95">
          <path
            d="M 16 32 L 18 26 L 20 32 L 26 34 L 20 36 L 18 42 L 16 36 L 10 34 Z"
            fill="#FACC15"
          />
          <path
            d="M 102 28 L 104 22 L 106 28 L 112 30 L 106 32 L 104 38 L 102 32 L 96 30 Z"
            fill="#FDE047"
          />
        </g>
      )}

      {/* Kelompok tubuh keseluruhan yang miring/rebah bila terjatuh */}
      <g transform={isJatuh ? 'translate(16, 26) rotate(48 60 85)' : undefined}>
        {/* Bayangan tanah & efek debu lompatan */}
        {!isJatuh && pose === 'balap' && (
          <ellipse
            cx="60"
            cy="125"
            rx={isBahagia ? '19' : '24'}
            ry="4"
            fill="#0F172A"
            opacity="0.35"
          />
        )}

        {/* Bagian Bawah: Karung Goni (untuk pose balap & jatuh) atau Pakaian Podium */}
        {pose === 'podium' ? (
          <g>
            {/* Kaki & Sepatu Podium */}
            <rect x="44" y="102" width="12" height="17" rx="5" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
            <rect x="64" y="102" width="12" height="17" rx="5" fill="#1E293B" stroke="#0F172A" strokeWidth="2" />
            <rect x="40" y="115" width="17" height="8" rx="4" fill="#EF4444" stroke="#7F1D1D" strokeWidth="1.8" />
            <rect x="63" y="115" width="17" height="8" rx="4" fill="#EF4444" stroke="#7F1D1D" strokeWidth="1.8" />

            {/* Kaus Tubuh Podium */}
            <rect
              x="39"
              y="77"
              width="42"
              height="30"
              rx="13"
              fill={palet.utama}
              stroke={palet.gelap}
              strokeWidth="2.2"
            />
            <path d="M 52 78 Q 60 84 68 78" fill="none" stroke={palet.aksen} strokeWidth="3" strokeLinecap="round" />

            {/* Lengan Podium */}
            {podiumRank === 1 ? (
              <g>
                <path
                  d="M 41 85 C 29 76, 22 65, 25 51"
                  fill="none"
                  stroke={palet.utama}
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <path
                  d="M 79 85 C 91 76, 98 65, 95 51"
                  fill="none"
                  stroke={palet.utama}
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <circle cx="25" cy="49" r="6" fill={`url(#${gradKulitId})`} stroke="#9A3412" strokeWidth="1.5" />
                <circle cx="95" cy="49" r="6" fill={`url(#${gradKulitId})`} stroke="#9A3412" strokeWidth="1.5" />
              </g>
            ) : (
              <g>
                <path
                  d="M 41 85 C 32 91, 33 100, 40 102"
                  fill="none"
                  stroke={palet.utama}
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <circle cx="40" cy="103" r="5.5" fill={`url(#${gradKulitId})`} stroke="#9A3412" strokeWidth="1.5" />
                <path
                  d="M 79 85 C 91 77, 97 67, 94 55"
                  fill="none"
                  stroke={palet.utama}
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <circle cx="94" cy="53" r="5.8" fill={`url(#${gradKulitId})`} stroke="#9A3412" strokeWidth="1.5" />
              </g>
            )}

            {/* Kalung Medali Perak (Juara 2) atau Kalung Medali Perunggu (Juara 3) */}
            {podiumRank === 2 && (
              <g>
                <path d="M 48 78 L 60 98 L 72 78" fill="none" stroke="#38BDF8" strokeWidth="3.8" strokeLinejoin="round" />
                <path d="M 50 78 L 60 95 L 70 78" fill="none" stroke="#F8FAFC" strokeWidth="1.2" strokeLinejoin="round" />
                <circle cx="60" cy="102" r="9.5" fill={`url(#${gradPerakId})`} stroke="#475569" strokeWidth="1.8" />
                <circle cx="60" cy="102" r="6.8" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.85" />
                <text x="60" y="105.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#1E293B" fontFamily="sans-serif">
                  2
                </text>
              </g>
            )}

            {podiumRank === 3 && (
              <g>
                <path d="M 48 78 L 60 98 L 72 78" fill="none" stroke="#F87171" strokeWidth="3.8" strokeLinejoin="round" />
                <path d="M 50 78 L 60 95 L 70 78" fill="none" stroke="#FEF3C7" strokeWidth="1.2" strokeLinejoin="round" />
                <circle cx="60" cy="102" r="9.5" fill={`url(#${gradPerungguId})`} stroke="#78350F" strokeWidth="1.8" />
                <circle cx="60" cy="102" r="6.8" fill="none" stroke="#FED7AA" strokeWidth="1" opacity="0.7" />
                <text x="60" y="105.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#FFFBEB" fontFamily="sans-serif">
                  3
                </text>
              </g>
            )}
          </g>
        ) : (
          <g>
            {/* Kaus Tubuh Atas (di atas mulut karung goni) */}
            <rect
              x="41"
              y="74"
              width="38"
              height="20"
              rx="10"
              fill={palet.utama}
              stroke={palet.gelap}
              strokeWidth="2"
            />
            <path d="M 52 75 Q 60 80 68 75" fill="none" stroke={palet.aksen} strokeWidth="2.5" strokeLinecap="round" />

            {/* KARUNG GONI BALAP KARUNG */}
            <path
              d="M 38 89 Q 60 85 82 89 L 86 117 Q 86 125 60 125 Q 34 125 34 117 Z"
              fill={`url(#${gradKarungId})`}
              stroke="#6B421D"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Lipatan Mulut Karung & Tali Pengikat */}
            <path
              d="M 36 89 Q 60 94 84 89 Q 84 85 60 86 Q 36 85 36 89 Z"
              fill="#E4BE8D"
              stroke="#784C23"
              strokeWidth="1.6"
            />
            {/* Pola anyaman goni */}
            <path
              d="M 44 98 H 76 M 42 106 H 78 M 44 114 H 76 M 51 94 V 119 M 69 94 V 119"
              stroke="#784C23"
              strokeWidth="1"
              opacity="0.32"
              strokeLinecap="round"
            />
            {/* Lencana nomor dada / bintang pada karung */}
            <circle cx="60" cy="107" r="6.5" fill="#FEF3C7" fillOpacity="0.85" stroke="#92400E" strokeWidth="1.2" />
            <text x="60" y="109.8" textAnchor="middle" fontSize="8" fontWeight="900" fill="#92400E" fontFamily="sans-serif">
              17
            </text>

            {/* Kedua Lengan Memegang Tepi Karung */}
            <path
              d="M 42 80 C 33 82, 32 88, 39 90"
              fill="none"
              stroke={palet.utama}
              strokeWidth="8.5"
              strokeLinecap="round"
            />
            <path
              d="M 78 80 C 87 82, 88 88, 81 90"
              fill="none"
              stroke={palet.utama}
              strokeWidth="8.5"
              strokeLinecap="round"
            />
            <circle cx="40" cy="90" r="5" fill={`url(#${gradKulitId})`} stroke="#9A3412" strokeWidth="1.4" />
            <circle cx="80" cy="90" r="5" fill={`url(#${gradKulitId})`} stroke="#9A3412" strokeWidth="1.4" />
          </g>
        )}

        {/* Leher */}
        <rect x="54" y="70" width="12" height="8" rx="3" fill={`url(#${gradKulitId})`} />

        {/* Pita Ikat Kepala Berkibar */}
        <path d="M 35 42 L 22 47 L 26 52 L 36 46 Z" fill="#EF4444" stroke="#991B1B" strokeWidth="1.2" />
        <path d="M 35 46 L 23 55 L 28 58 L 37 49 Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.1" />

        {/* Telinga */}
        <circle cx="35.5" cy="56" r="5" fill={`url(#${gradKulitId})`} stroke="#9A3412" strokeWidth="1.5" />
        <circle cx="84.5" cy="56" r="5" fill={`url(#${gradKulitId})`} stroke="#9A3412" strokeWidth="1.5" />

        {/* Kepala */}
        <circle
          cx="60"
          cy="54"
          r="24.5"
          fill={`url(#${gradKulitId})`}
          stroke="#9A3412"
          strokeWidth="2"
        />

        {/* Rambut */}
        <path
          d="M 35.5 49 C 35 30, 50 24, 60 25 C 74 24, 85 31, 84.5 49 C 78 40, 72 37, 62 39 C 54 35, 42 40, 35.5 49 Z"
          fill="#1E1B18"
        />

        {/* Ikat Kepala Merah Putih */}
        <path
          d="M 36.5 42 Q 60 36 83.5 42 L 84 46.5 Q 60 40.5 36 46.5 Z"
          fill="#D7262E"
          stroke="#991B1B"
          strokeWidth="1"
        />
        <path
          d="M 36 46.5 Q 60 40.5 84 46.5 L 83.8 49.8 Q 60 44 36.2 49.8 Z"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="0.9"
        />

        {/* Mahkota Juara 1 di Podium */}
        {podiumRank === 1 && (
          <g transform="translate(0, -1)">
            <path
              d="M 38 30 L 42 12 L 52 21 L 60 6 L 68 21 L 78 12 L 82 30 Z"
              fill={`url(#${gradEmasId})`}
              stroke="#92400E"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="60" cy="6" r="3" fill="#FEF08A" stroke="#92400E" strokeWidth="1.2" />
            <circle cx="60" cy="22" r="3" fill="#EF4444" stroke="#FFFFFF" strokeWidth="0.9" />
          </g>
        )}

        {/* EKPRESI WAJAH */}
        {isJatuh ? (
          <g>
            {/* Mata pusing X_X */}
            <path d="M 46 52 L 54 60 M 54 52 L 46 60" stroke="#1E293B" strokeWidth="2.8" strokeLinecap="round" />
            <path d="M 66 52 L 74 60 M 74 52 L 66 60" stroke="#1E293B" strokeWidth="2.8" strokeLinecap="round" />
            {/* Mulut bergelombang kaget */}
            <path
              d="M 51 69 Q 55 65 60 69 Q 65 73 69 69"
              fill="none"
              stroke="#1E293B"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            {/* Keringat panik */}
            <path d="M 79 44 C 82 47, 82 51, 79 51 C 76.5 51, 77 47, 79 44 Z" fill="#38BDF8" />
          </g>
        ) : isBahagia ? (
          <g>
            <path d="M 44.5 57 Q 50.5 49 56.5 57" fill="none" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
            <path d="M 63.5 57 Q 69.5 49 75.5 57" fill="none" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="44" cy="63" rx="4.5" ry="2.6" fill="#FB7185" opacity="0.6" />
            <ellipse cx="76" cy="63" rx="4.5" ry="2.6" fill="#FB7185" opacity="0.6" />
            <path
              d="M 50 63 Q 60 65.5 70 63 Q 70 74.5 60 74.5 Q 50 74.5 50 63 Z"
              fill="#991B1B"
              stroke="#7F1D1D"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path d="M 54 71 Q 60 67.5 66 71 Q 60 74.5 54 71 Z" fill="#FDA4AF" />
          </g>
        ) : isSedih ? (
          <g>
            <path d="M 43 51 L 55 47.5" fill="none" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M 65 47.5 L 77 51" fill="none" stroke="#1E293B" strokeWidth="2.4" strokeLinecap="round" />
            <ellipse cx="50.5" cy="56" rx="4.2" ry="4.5" fill="#1E293B" />
            <ellipse cx="69.5" cy="56" rx="4.2" ry="4.5" fill="#1E293B" />
            <circle cx="49" cy="54.2" r="1.5" fill="#FFFFFF" />
            <circle cx="68" cy="54.2" r="1.5" fill="#FFFFFF" />
            <path d="M 45.5 58.5 C 43.5 62, 43.5 65.5, 45.8 66 C 48 65.5, 47.5 62, 45.5 58.5 Z" fill="#38BDF8" />
            <path d="M 74.5 58.5 C 76.5 62, 76.5 65.5, 74.2 66 C 72 65.5, 72.5 62, 74.5 58.5 Z" fill="#38BDF8" />
            <path d="M 51.5 72 Q 60 64.5 68.5 72" fill="none" stroke="#1E293B" strokeWidth="2.6" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            <circle cx="50.5" cy="55.5" r="4" fill="#1E293B" />
            <circle cx="69.5" cy="55.5" r="4" fill="#1E293B" />
            <circle cx="49" cy="53.8" r="1.4" fill="#FFFFFF" />
            <circle cx="68" cy="53.8" r="1.4" fill="#FFFFFF" />
            <path d="M 45 48.5 Q 50.5 46 55.5 48.5" fill="none" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 64.5 48.5 Q 69.5 46 75 48.5" fill="none" stroke="#1E293B" strokeWidth="2.2" strokeLinecap="round" />
            <ellipse cx="44.5" cy="62" rx="3.8" ry="2" fill="#FB7185" opacity="0.35" />
            <ellipse cx="75.5" cy="62" rx="3.8" ry="2" fill="#FB7185" opacity="0.35" />
            <path d="M 52.5 65 Q 60 71 67.5 65" fill="none" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
      </g>

      {/* Bintang pusing di atas kepala saat terjatuh */}
      {isJatuh && (
        <g>
          <path d="M 42 15 L 44 10 L 46 15 L 51 17 L 46 19 L 44 24 L 42 19 L 37 17 Z" fill="#FACC15" />
          <path d="M 74 22 L 75.5 18 L 77 22 L 81 23.5 L 77 25 L 75.5 29 L 74 25 L 70 23.5 Z" fill="#FDE047" />
        </g>
      )}
    </svg>
  );
}

