import { useEffect, useRef } from 'react';

export interface MenuPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onDashboard: () => void;
  onNewBoard: () => void;
  onSaveJson: () => void;
  onOpenJson: () => void;
  onExportPng: () => void;
  onClearAll: () => void;
}

export function MenuPopup({
  isOpen,
  onClose,
  onDashboard,
  onNewBoard,
  onSaveJson,
  onOpenJson,
  onExportPng,
  onClearAll,
}: MenuPopupProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('#mn, [title="Menu"], [aria-label="Menu"]')) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    window.addEventListener('pointerdown', handleClickOutside, true);
    return () => {
      window.removeEventListener('pointerdown', handleClickOutside, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="menu-popup"
      style={{ left: 20, top: 84 }}
      role="menu"
    >
      <button
        onClick={() => {
          onClose();
          onDashboard();
        }}
      >
        Kembali ke Dashboard
      </button>
      <button
        onClick={() => {
          onClose();
          onNewBoard();
        }}
      >
        Papan baru
      </button>
      <button
        onClick={() => {
          onClose();
          onOpenJson();
        }}
      >
        Buka dari JSON…
      </button>
      <button
        onClick={() => {
          onClose();
          onSaveJson();
        }}
      >
        Simpan sebagai JSON
      </button>
      <button
        onClick={() => {
          onClose();
          onExportPng();
        }}
      >
        Ekspor PNG
      </button>
      <hr />
      <button
        style={{ color: '#f87171' }}
        onClick={() => {
          onClose();
          onClearAll();
        }}
      >
        Hapus semua isi papan
      </button>
    </div>
  );
}

