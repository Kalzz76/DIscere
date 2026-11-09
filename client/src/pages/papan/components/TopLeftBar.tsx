import React from 'react';

export interface TopLeftBarProps {
  title: string;
  saveStatus: 'saved' | 'busy' | 'error';
  onTitleChange: (newTitle: string) => void;
  onOpenMenu: (btnEl: HTMLElement) => void;
  onExportPng: () => void;
}

export function TopLeftBar({
  title,
  saveStatus,
  onTitleChange,
  onOpenMenu,
  onExportPng,
}: TopLeftBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <header className="pn top-left-panel">
      <button
        className="ib"
        title="Menu"
        aria-label="Menu"
        onClick={(e) => onOpenMenu(e.currentTarget)}
      >
        <svg viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <span className="logo">discere</span>

      <input
        className="board-title-input"
        value={title}
        maxLength={60}
        aria-label="Judul papan"
        onChange={(e) => onTitleChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <button
        className="ib"
        title="Ekspor PNG"
        aria-label="Ekspor PNG"
        onClick={onExportPng}
      >
        <svg viewBox="0 0 24 24">
          <path d="M12 15V4M8 8l4-4 4 4M5 14v5h14v-5" />
        </svg>
      </button>

      <span className={`save-status-badge ${saveStatus === 'busy' ? 'busy' : saveStatus === 'error' ? 'error' : ''}`}>
        {saveStatus === 'busy' ? (
          <>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" strokeDasharray="16" />
            </svg>
            <b>Menyimpan…</b>
          </>
        ) : saveStatus === 'error' ? (
          <>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <b>Gagal simpan</b>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" />
            </svg>
            <b>Saved</b>
          </>
        )}
      </span>
    </header>
  );
}

