export interface TopRightBarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPresentation: () => void;
}

export function TopRightBar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPresentation,
}: TopRightBarProps) {
  return (
    <div className="pn top-right-bar">
      <button
        className="ib"
        title="Urungkan (Ctrl+Z)"
        aria-label="Urungkan"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <svg viewBox="0 0 24 24">
          <path d="M9 14L4 9l5-5" />
          <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
        </svg>
      </button>

      <button
        className="ib"
        title="Ulangi (Ctrl+Y)"
        aria-label="Ulangi"
        disabled={!canRedo}
        onClick={onRedo}
      >
        <svg viewBox="0 0 24 24">
          <path d="M15 14l5-5-5-5" />
          <path d="M20 9H10a6 6 0 0 0 0 12h3" />
        </svg>
      </button>

      {/* Tombol Game (Segera) */}
      <button
        className="ib"
        id="gm"
        title="Template Game (Segera)"
        aria-label="Template Game"
        disabled
        style={{ opacity: 0.5, cursor: 'not-allowed' }}
      >
        {/* Gamepad SVG icon, no emojis */}
        <svg viewBox="0 0 24 24">
          <rect x="2" y="6" width="20" height="12" rx="4" />
          <path d="M6 12h4M8 10v4M15 11h.01M18 13h.01" />
        </svg>
      </button>

      {/* Kolaborator / Akun */}
      <div id="av" title="Kolaborator" style={{ opacity: 0.8, cursor: 'default' }}>
        <span id="avs">
          <span className="me">G</span>
        </span>
        <b id="cn" style={{ fontSize: 14, marginLeft: 2 }}>
          1
        </b>
      </div>

      {/* Mode Presentasi */}
      <button
        className="ib"
        title="Mode presentasi"
        aria-label="Mode presentasi"
        onClick={onPresentation}
      >
        <svg viewBox="0 0 24 24" style={{ fill: 'currentColor' }}>
          <path d="M7 5l12 7-12 7z" />
        </svg>
      </button>

      {/* Tombol Share (Segera) */}
      <button
        id="share"
        className="share-btn"
        title="Bagikan (Segera)"
        aria-label="Bagikan"
        disabled
        style={{ opacity: 0.5, cursor: 'not-allowed' }}
      >
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
        </svg>
        <span>Share</span>
      </button>
    </div>
  );
}

