export interface ZoomBarProps {
  zoom: number;
  gridEnabled: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleGrid: () => void;
  onCenterView: () => void;
}

export function ZoomBar({
  zoom,
  gridEnabled,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleGrid,
  onCenterView,
}: ZoomBarProps) {
  return (
    <div className="pn zoom-bar">
      <button
        className="ib"
        title="Perkecil"
        aria-label="Perkecil"
        onClick={onZoomOut}
      >
        <svg viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4M8 11h6" />
        </svg>
      </button>

      <button
        id="pct"
        className="zoom-pct-btn"
        title="Reset ke 100%"
        aria-label="Reset ke 100%"
        onClick={onResetZoom}
      >
        {Math.round(zoom * 100)}%
      </button>

      <button
        className="ib"
        title="Perbesar"
        aria-label="Perbesar"
        onClick={onZoomIn}
      >
        <svg viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4M11 8v6M8 11h6" />
        </svg>
      </button>

      <button
        className={`ib ${gridEnabled ? 'on' : ''}`}
        title="Tampilkan / sembunyikan grid"
        aria-label="Toggle grid"
        onClick={onToggleGrid}
      >
        <svg viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
        </svg>
      </button>

      <button
        className="ib"
        title="Pusatkan"
        aria-label="Pusatkan"
        onClick={onCenterView}
      >
        <svg viewBox="0 0 24 24">
          <path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" />
        </svg>
      </button>
    </div>
  );
}

