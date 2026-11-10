import React, { useEffect, useRef } from 'react';

export interface ContextMenuProps {
  pos: { x: number; y: number } | null;
  onClose: () => void;
  hasSelection: boolean;
  selectedCount: number;
  isLocked: boolean;
  isGrouped: boolean;
  canPaste: boolean;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onZOrder: (action: 'front' | 'back' | 'fwd' | 'bwd') => void;
  onToggleLock: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  pos,
  onClose,
  hasSelection,
  selectedCount,
  isLocked,
  isGrouped,
  canPaste,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
  onDelete,
  onZOrder,
  onToggleLock,
  onGroup,
  onUngroup,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [pos, onClose]);

  if (!pos) return null;

  // Pastikan menu tidak keluar dari tepi layar browser
  const menuWidth = 210;
  const menuHeight = 360;
  const left = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, pos.x));
  const top = Math.max(10, Math.min(window.innerHeight - menuHeight - 10, pos.y));

  return (
    <div
      ref={menuRef}
      className="menu-popup"
      style={{
        left,
        top,
        zIndex: 50,
        position: 'fixed',
        minWidth: 200,
        background: '#1b2238',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: 14,
        padding: 6,
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        userSelect: 'none',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {hasSelection && (
        <>
          <button
            onClick={() => {
              onCopy();
              onClose();
            }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>Salin</span>
            <span style={{ fontSize: 11, color: '#8e98b4' }}>Ctrl+C</span>
          </button>
          <button
            onClick={() => {
              onCut();
              onClose();
            }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>Potong</span>
            <span style={{ fontSize: 11, color: '#8e98b4' }}>Ctrl+X</span>
          </button>
          <button
            onClick={() => {
              onDuplicate();
              onClose();
            }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>Duplikat</span>
            <span style={{ fontSize: 11, color: '#8e98b4' }}>Ctrl+D</span>
          </button>
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#f87171',
            }}
          >
            <span>Hapus</span>
            <span style={{ fontSize: 11, color: '#8e98b4' }}>Del</span>
          </button>

          <hr style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '4px 0' }} />

          <button
            onClick={() => {
              onZOrder('front');
              onClose();
            }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>Bawa ke Depan</span>
            <span style={{ fontSize: 11, color: '#8e98b4' }}>Ctrl+Shift+]</span>
          </button>
          <button
            onClick={() => {
              onZOrder('fwd');
              onClose();
            }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>Naikkan Satu</span>
            <span style={{ fontSize: 11, color: '#8e98b4' }}>Ctrl+]</span>
          </button>
          <button
            onClick={() => {
              onZOrder('bwd');
              onClose();
            }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>Turunkan Satu</span>
            <span style={{ fontSize: 11, color: '#8e98b4' }}>Ctrl+[</span>
          </button>
          <button
            onClick={() => {
              onZOrder('back');
              onClose();
            }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>Kirim ke Belakang</span>
            <span style={{ fontSize: 11, color: '#8e98b4' }}>Ctrl+Shift+[</span>
          </button>

          <hr style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '4px 0' }} />

          <button
            onClick={() => {
              onToggleLock();
              onClose();
            }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>{isLocked ? '🔓 Buka Kunci' : '🔒 Kunci Objek'}</span>
            <span style={{ fontSize: 11, color: '#8e98b4' }}>Ctrl+L</span>
          </button>

          {selectedCount >= 2 && onGroup && !isGrouped && (
            <button
              onClick={() => {
                onGroup();
                onClose();
              }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>Kelompokkan</span>
              <span style={{ fontSize: 11, color: '#8e98b4' }}>Ctrl+G</span>
            </button>
          )}

          {isGrouped && onUngroup && (
            <button
              onClick={() => {
                onUngroup();
                onClose();
              }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>Lepas Grup</span>
              <span style={{ fontSize: 11, color: '#8e98b4' }}>Ctrl+Shift+G</span>
            </button>
          )}
        </>
      )}

      {canPaste && (
        <>
          {hasSelection && (
            <hr style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '4px 0' }} />
          )}
          <button
            onClick={() => {
              onPaste();
              onClose();
            }}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>Tempel</span>
            <span style={{ fontSize: 11, color: '#8e98b4' }}>Ctrl+V</span>
          </button>
        </>
      )}

      {!hasSelection && !canPaste && (
        <div style={{ padding: '8px 12px', fontSize: 13, color: '#8e98b4' }}>
          Tidak ada objek yang dipilih
        </div>
      )}
    </div>
  );
};

