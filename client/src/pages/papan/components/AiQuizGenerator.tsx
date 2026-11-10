import { useState } from 'react';
import { apiRequest } from '../../../lib/api';
import { GameTemplateItem } from '../mock-template';

export interface AiQuizGeneratorProps {
  boardId: string;
  getBoardPng: () => string | null;
  onCreated: (template: GameTemplateItem) => void;
  onPlayNow: (template: GameTemplateItem) => void;
  onPasteToBoard?: (text: string) => void;
  onToast: (msg: string) => void;
}

// Ikon-ikon SVG Murni (Tanpa Emoji)
const Icons = {
  Sparkles: () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  ),
  Board: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="14" x="3" y="3" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  Play: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  Save: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  Paste: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  ChevronUp: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  ),
  Spinner: () => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" strokeLinecap="round" />
    </svg>
  ),
};

export function AiQuizGenerator({
  boardId: _boardId,
  getBoardPng,
  onCreated,
  onPlayNow,
  onPasteToBoard,
  onToast,
}: AiQuizGeneratorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [topik, setTopik] = useState('');
  const [jumlah, setJumlah] = useState<number>(5);
  const [game, setGame] = useState<'tarik_tambang' | 'balap_karung' | 'panjat_pinang'>('tarik_tambang');
  const [pakaiPapan, setPakaiPapan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [lastGeneratedSoal, setLastGeneratedSoal] = useState<any[] | null>(null);

  const handleGenerate = async (autoPlay: boolean) => {
    if (loading) return;

    if (!topik.trim() && !pakaiPapan) {
      setStatusMsg('Isi topik atau centang "Gunakan isi papan tulis".');
      return;
    }

    setLoading(true);
    setStatusMsg(pakaiPapan ? 'Menganalisis papan tulis & menyusun soal AI…' : 'AI sedang menyusun soal kuis…');

    try {
      let gambarPapan: string | undefined = undefined;
      if (pakaiPapan) {
        const png = getBoardPng();
        if (png) {
          gambarPapan = png;
        } else {
          onToast('Papan masih kosong, membuat kuis berdasarkan topik...');
        }
      }

      const res = await apiRequest<{
        pesan: string;
        soal: Array<{
          teks: string;
          opsiA: string;
          opsiB: string;
          opsiC: string;
          jawabanBenar: 'A' | 'B' | 'C';
          penjelasan?: string;
        }>;
        template?: {
          id: string;
          judul: string;
          game: string;
          mode: string;
        };
      }>('/ai/kuis-papan', {
        method: 'POST',
        body: JSON.stringify({
          topik: topik.trim(),
          gambarPapan,
          jumlah,
          tingkat: 'SD',
          game,
          simpanTemplate: true,
        }),
      });

      if (!res || !Array.isArray(res.soal) || res.soal.length === 0) {
        throw new Error('Gagal mendapatkan soal dari AI.');
      }

      setLastGeneratedSoal(res.soal);
      setStatusMsg(`Berhasil membuat ${res.soal.length} soal kuis!`);
      onToast(`Berhasil membuat ${res.soal.length} soal kuis.`);

      // Objek template kuis
      const templateItem: GameTemplateItem = {
        id: res.template?.id || `ai-quiz-${Date.now()}`,
        judul: res.template?.judul || `Kuis AI: ${(topik || 'Papan Tulis').slice(0, 24)}`,
        game: (res.template?.game as any) || game,
        mode: (res.template?.mode as any) || (game === 'panjat_pinang' || game === 'balap_karung' ? 'multi' : 'solo'),
        questionsCount: res.soal.length,
      };

      onCreated(templateItem);

      if (autoPlay) {
        onPlayNow(templateItem);
      }
    } catch (err: any) {
      setStatusMsg(`Gagal: ${err.message || 'Terjadi kesalahan'}`);
      onToast(`Gagal: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasteQuestionsToBoard = () => {
    if (!lastGeneratedSoal || lastGeneratedSoal.length === 0) return;
    const formattedText = lastGeneratedSoal
      .map((s, i) => {
        return `${i + 1}. ${s.teks}\nA. ${s.opsiA}\nB. ${s.opsiB}\nC. ${s.opsiC}\nJawaban: ${s.jawabanBenar}${s.penjelasan ? ` (${s.penjelasan})` : ''}`;
      })
      .join('\n\n');

    if (onPasteToBoard) {
      onPasteToBoard(`SOAL KUIS AI (${topik || 'Papan Tulis'})\n\n${formattedText}`);
      onToast('Daftar soal AI ditempel ke papan');
    }
  };

  return (
    <div
      style={{
        padding: '6px 4px 16px',
        borderBottom: '1px solid var(--ln)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Header Form Tanpa Kotak Bertumpuk */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          padding: '2px 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c084fc' }}>
          <Icons.Sparkles />
          <span style={{ fontSize: 13.5, fontWeight: 800, color: '#eef1fa', letterSpacing: -0.2 }}>
            Buat Kuis dengan AI
          </span>
        </div>
        <button
          type="button"
          className="ib"
          style={{ width: 24, height: 24, color: 'var(--mu)' }}
          aria-label={isOpen ? 'Sembunyikan form AI' : 'Tampilkan form AI'}
        >
          {isOpen ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
        </button>
      </div>

      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Input Topik */}
          <input
            type="text"
            placeholder="Topik materi, misal: Fotosintesis, Tata Surya"
            value={topik}
            onChange={(e) => setTopik(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.28)',
              border: '1px solid var(--ln)',
              borderRadius: 10,
              padding: '9px 12px',
              color: '#fff',
              fontSize: 13,
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* Baris Opsi: Jumlah Soal, Jenis Game */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--mu)' }}>
              <span>Jumlah:</span>
              <select
                value={jumlah}
                onChange={(e) => setJumlah(Number(e.target.value))}
                disabled={loading}
                style={{
                  background: 'rgba(0, 0, 0, 0.28)',
                  border: '1px solid var(--ln)',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '5px 8px',
                  fontSize: 12,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value={3}>3 soal</option>
                <option value={5}>5 soal</option>
                <option value={8}>8 soal</option>
                <option value={10}>10 soal</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--mu)' }}>
              <span>Game:</span>
              <select
                value={game}
                onChange={(e) => setGame(e.target.value as any)}
                disabled={loading}
                style={{
                  background: 'rgba(0, 0, 0, 0.28)',
                  border: '1px solid var(--ln)',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '5px 8px',
                  fontSize: 12,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="tarik_tambang">Tarik Tambang</option>
                <option value="balap_karung">Balap Karung</option>
                <option value="panjat_pinang">Panjat Pinang</option>
              </select>
            </div>
          </div>

          {/* Checkbox Gunakan Isi Papan */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: '#cbd5e1',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={pakaiPapan}
              onChange={(e) => setPakaiPapan(e.target.checked)}
              disabled={loading}
              style={{ cursor: 'pointer', accentColor: '#9b17f5' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icons.Board />
              <span>Gunakan gambar & coretan di papan saat ini</span>
            </div>
          </label>

          {/* Tombol Aksi */}
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <button
              type="button"
              onClick={() => handleGenerate(true)}
              disabled={loading}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                background: 'var(--pu)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '9px 14px',
                fontSize: 12.5,
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.15s ease',
                boxShadow: '0 4px 14px rgba(155, 23, 245, 0.35)',
              }}
            >
              {loading ? <Icons.Spinner /> : <Icons.Play />}
              <span>{loading ? 'Menyusun…' : 'Buat & Mainkan'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleGenerate(false)}
              disabled={loading}
              title="Buat kuis dan simpan ke daftar Template Saya tanpa langsung memulai sesi"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#e2e8f0',
                border: '1px solid var(--ln)',
                borderRadius: 10,
                padding: '9px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <Icons.Save />
              <span>Simpan</span>
            </button>

            {lastGeneratedSoal && (
              <button
                type="button"
                onClick={handlePasteQuestionsToBoard}
                disabled={loading}
                title="Tempel daftar soal yang baru dibuat ke papan tulis"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  background: 'rgba(155, 23, 245, 0.2)',
                  color: '#c084fc',
                  border: '1px solid #9b17f5',
                  borderRadius: 10,
                  padding: '9px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Icons.Paste />
                <span>Tempel</span>
              </button>
            )}
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div
              style={{
                fontSize: 11.5,
                color: statusMsg.startsWith('Gagal') ? '#f87171' : '#38bdf8',
                lineHeight: 1.4,
              }}
            >
              {statusMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

