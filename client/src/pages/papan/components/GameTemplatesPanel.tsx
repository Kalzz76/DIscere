import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { apiRequest } from '../../../lib/api';
import {
  GameTemplateItem,
  MOCK_TEMPLATES_SAYA,
  MOCK_TEMPLATES_PUSTAKA,
  USE_MOCK_TEMPLATE_FALLBACK,
} from '../mock-template';

export interface GameTemplatesPanelProps {
  isOpen: boolean;
  boardId: string;
  onClose: () => void;
  onBeforeStartGame: () => Promise<void>;
  onPasteLastGameResult?: () => void;
  onToast: (msg: string) => void;
}

// Ikon Game SVG murni (bukan emoji)
function GameIcon({ game }: { game: string }) {
  if (game === 'balap_karung') {
    return (
      <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, stroke: '#eab308' }}>
        <path d="M8 10h8l1 10H7l1-10Z" />
        <circle cx="12" cy="6" r="2.5" />
        <path d="M9 10c1-1.5 5-1.5 6 0" />
      </svg>
    );
  }
  if (game === 'panjat_pinang') {
    return (
      <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, stroke: '#10b981' }}>
        <path d="M12 21V3" />
        <path d="M12 3l6 3-6 3" />
        <circle cx="9" cy="14" r="2" />
        <path d="M7 19l5-3 5 3" />
      </svg>
    );
  }
  if (game === 'makan_kerupuk') {
    return (
      <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, stroke: '#f59e0b' }}>
        <circle cx="12" cy="12" r="8" strokeDasharray="4 2" />
        <path d="M12 4v-2M10 2h4" />
        <path d="M9 11c1-1 3-1 4 0M10 15c.5.5 1.5.5 2 0" />
      </svg>
    );
  }
  // Default: Tarik Tambang
  return (
    <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, stroke: '#ef4444' }}>
      <path d="M4 14l4-4 4 4 4-4 4 4" />
      <path d="M12 3v7" />
      <path d="M9 7l3 3 3-3" />
      <circle cx="6" cy="17" r="2" />
      <circle cx="18" cy="17" r="2" />
    </svg>
  );
}

export function GameTemplatesPanel({
  isOpen,
  boardId,
  onClose,
  onBeforeStartGame,
  onPasteLastGameResult,
  onToast,
}: GameTemplatesPanelProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'saya' | 'pustaka'>('saya');
  const [searchQuery, setSearchQuery] = useState('');
  const [templatesSaya, setTemplatesSaya] = useState<GameTemplateItem[]>([]);
  const [templatesPustaka, setTemplatesPustaka] = useState<GameTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  // Ambil daftar template dari server saat panel dibuka
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        // 1. Template Saya
        const resSaya = await apiRequest<{ templates: any[] }>('/template');
        if (mounted && resSaya && Array.isArray(resSaya.templates)) {
          setTemplatesSaya(
            resSaya.templates.map((t) => ({
              id: t.id,
              judul: t.judul,
              game: t.game || 'tarik_tambang',
              mode: t.mode === 'multi' ? 'multi' : 'solo',
              questionsCount: t._count?.questions ?? (t.questions?.length || 0),
            }))
          );
        }
      } catch {
        if (USE_MOCK_TEMPLATE_FALLBACK && mounted) {
          setTemplatesSaya(MOCK_TEMPLATES_SAYA);
        }
      }

      try {
        // 2. Pustaka Resmi Admin
        const resPustaka = await apiRequest<{ templates: any[] }>('/template/pustaka');
        if (mounted && resPustaka && Array.isArray(resPustaka.templates)) {
          setTemplatesPustaka(
            resPustaka.templates.map((t) => ({
              id: t.id,
              judul: t.judul,
              game: t.game || 'tarik_tambang',
              mode: t.mode === 'multi' ? 'multi' : 'solo',
              questionsCount: t._count?.questions ?? (t.questions?.length || 0),
            }))
          );
        }
      } catch {
        if (USE_MOCK_TEMPLATE_FALLBACK && mounted) {
          setTemplatesPustaka(MOCK_TEMPLATES_PUSTAKA);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTemplates();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const activeList = activeTab === 'saya' ? templatesSaya : templatesPustaka;
  const filteredList = activeList.filter((item) =>
    item.judul.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handler Tombol Main: Simpan Papan -> POST /api/sesi -> Pindah ke /guru/sesi/:id?kembali=/papan/:boardId
  const handleStartGame = async (template: GameTemplateItem) => {
    if (startingId) return;
    setStartingId(template.id);
    onToast('Menyiapkan sesi game…');

    try {
      // 1. Flush simpan otomatis kanvas terlebih dahulu
      await onBeforeStartGame();

      // 2. Buat sesi di server
      const res = await apiRequest<{ session: { id: string } }>('/sesi', {
        method: 'POST',
        body: JSON.stringify({
          templateId: template.id,
          mode: template.mode,
          game: template.game,
        }),
      });

      const sessionId = res?.session?.id;
      if (sessionId) {
        onToast('Sesi game berhasil dimulai!');
        navigate(`/guru/sesi/${sessionId}?kembali=/papan/${boardId}`);
      } else {
        throw new Error('Sesi gagal dibuat.');
      }
    } catch (err: any) {
      // Jika mode mock atau offline dan API sesi 404, navigasikan dengan fallback ramah
      if (USE_MOCK_TEMPLATE_FALLBACK && (err.status === 404 || err.message?.includes('404'))) {
        const mockSesiId = 'sesi-demo-' + Date.now();
        onToast('(Mode Simulasi) Berpindah ke arena game…');
        navigate(`/guru/sesi/${mockSesiId}?kembali=/papan/${boardId}`);
      } else {
        onToast(`Gagal memulai sesi: ${err.message || 'Terjadi kesalahan'}`);
      }
    } finally {
      setStartingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <aside
      id="qz"
      className={`pn game-template-panel ${isOpen ? 'open' : ''}`}
      aria-label="Template Game Interaktif"
      role="complementary"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {/* Header Panel */}
      <div className="qth">
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, stroke: 'var(--pu)' }}>
            <rect x="2" y="6" width="20" height="12" rx="4" />
            <path d="M6 12h4M8 10v4M15 11h.01M18 13h.01" />
          </svg>
          <span>Template Game</span>
        </span>
        <button
          className="ib"
          id="qzx"
          aria-label="Tutup Panel (Esc)"
          title="Tutup Panel (Esc)"
          onClick={onClose}
          style={{ width: 32, height: 32 }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tombol Tempel Hasil Sesi Game Terakhir */}
      {onPasteLastGameResult && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--ln)' }}>
          <button
            type="button"
            className="game-paste-result-btn"
            onClick={onPasteLastGameResult}
            title="Tempel kartu ringkasan hasil sesi game terakhir ke kanvas papan tulis"
          >
            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: '#fbbf24' }}>
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" />
            </svg>
            <span>Tempel Hasil Game ke Papan</span>
          </button>
        </div>
      )}

      {/* Navigasi Tab */}
      <div className="game-tabs" role="tablist" aria-label="Kategori Template">
        <button
          role="tab"
          aria-selected={activeTab === 'saya'}
          className={`game-tab-btn ${activeTab === 'saya' ? 'active' : ''}`}
          onClick={() => setActiveTab('saya')}
        >
          Template Saya ({templatesSaya.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'pustaka'}
          className={`game-tab-btn ${activeTab === 'pustaka' ? 'active' : ''}`}
          onClick={() => setActiveTab('pustaka')}
        >
          Pustaka Resmi ({templatesPustaka.length})
        </button>
      </div>

      {/* Input Pencarian */}
      <div className="game-search-box">
        <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'var(--mu)' }}>
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="search"
          placeholder="Cari materi atau kuis…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Cari template game"
        />
        {searchQuery && (
          <button
            type="button"
            className="ib"
            aria-label="Hapus pencarian"
            onClick={() => setSearchQuery('')}
            style={{ width: 20, height: 20 }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Konten Daftar Kartu Template */}
      <div id="qzb" className="game-template-list">
        {loading && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--mu)' }}>
            <span>Memuat template…</span>
          </div>
        )}

        {!loading && filteredList.length === 0 && (
          <div className="game-empty-state">
            <svg
              viewBox="0 0 24 24"
              style={{ width: 44, height: 44, stroke: 'var(--mu)', margin: '0 auto 12px' }}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 12h6M12 9v6" />
            </svg>
            <p style={{ fontWeight: 700, marginBottom: 6 }}>
              {searchQuery ? 'Tidak ada template yang cocok.' : 'Belum ada template kuis.'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--mu)', marginBottom: 16 }}>
              {activeTab === 'saya'
                ? 'Buat template soal baru untuk dimainkan bersama siswa di kelas.'
                : 'Pustaka resmi akan segera diperbarui dengan template materi kurikulum.'}
            </p>
            {activeTab === 'saya' && (
              <a
                href="/guru/template/baru"
                className="game-create-btn"
                target="_blank"
                rel="noreferrer"
              >
                + Buat Template Baru
              </a>
            )}
          </div>
        )}

        {!loading &&
          filteredList.map((item) => (
            <div key={item.id} className="qc" role="article" aria-label={item.judul}>
              <i
                title={
                  item.game === 'makan_kerupuk'
                    ? 'Makan Kerupuk'
                    : item.game === 'panjat_pinang'
                    ? 'Panjat Pinang'
                    : item.game === 'balap_karung'
                    ? 'Balap Karung'
                    : 'Tarik Tambang'
                }
              >
                <GameIcon game={item.game} />
              </i>
              <div className="qc-info">
                <b title={item.judul}>{item.judul}</b>
                <small>
                  {item.questionsCount} soal ·{' '}
                  <span
                    style={{
                      textTransform: 'capitalize',
                      color: item.mode === 'multi' ? '#60a5fa' : '#34d399',
                    }}
                  >
                    {item.mode === 'multi' ? 'Multiplayer' : 'Solo'}
                  </span>
                </small>
              </div>
              <button
                type="button"
                className="qc-play-btn"
                disabled={startingId === item.id}
                onClick={() => handleStartGame(item)}
                aria-label={`Mulai mainkan template ${item.judul}`}
              >
                {startingId === item.id ? 'Memuat…' : 'Main'}
              </button>
            </div>
          ))}
      </div>
    </aside>
  );
}
