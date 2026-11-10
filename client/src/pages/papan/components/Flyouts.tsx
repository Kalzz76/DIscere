import { useEffect, useRef, useState } from 'react';
import { PenStyle, ToolType } from '../engine/types';
import { SHP, STY, shIcon } from '../engine/shapes';

export interface FlyoutsProps {
  activeFlyout: ToolType | null;
  anchorRect: DOMRect | null;
  style: PenStyle;
  shape: string;
  tab: string;
  onSelectStyle: (style: PenStyle) => void;
  onSelectShape: (shape: string) => void;
  onSelectTab: (tab: string) => void;
  onSelectText: (kind: 'box' | 'h' | 's' | 'b') => void;
  onSelectTable: (rows: number, cols: number) => void;
  onClose: () => void;
}

export function Flyouts({
  activeFlyout,
  anchorRect,
  style,
  shape,
  tab,
  onSelectStyle,
  onSelectShape,
  onSelectTab,
  onSelectText,
  onSelectTable,
  onClose,
}: FlyoutsProps) {
  const flyRef = useRef<HTMLDivElement>(null);
  const [tableHover, setTableHover] = useState<{ r: number; c: number }>({ r: 3, c: 3 });

  // Close when clicking outside
  useEffect(() => {
    if (!activeFlyout) return;
    function handlePointerDown(e: MouseEvent) {
      if (flyRef.current && !flyRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [activeFlyout, onClose]);

  if (!activeFlyout || !['pen', 'shape', 'text', 'table'].includes(activeFlyout)) {
    return null;
  }

  const top = anchorRect
    ? Math.max(92, Math.min(anchorRect.top - 8, window.innerHeight - 380))
    : 92;

  const closeButton = (
    <button className="ib" onClick={onClose} aria-label="Tutup" style={{ width: 28, height: 28 }}>
      <svg viewBox="0 0 24 24">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  );

  return (
    <div
      ref={flyRef}
      className="pn flyout-panel"
      style={{
        left: 116,
        top,
        display: activeFlyout === 'pen' ? 'flex' : 'block',
        width: activeFlyout === 'pen' ? 'auto' : 300,
        padding: activeFlyout === 'pen' ? 8 : 14,
        gap: 4,
        borderRadius: activeFlyout === 'pen' ? 18 : 20,
      }}
    >
      {/* 1. PEN FLYOUT */}
      {activeFlyout === 'pen' && (
        <>
          {(Object.entries(STY) as [PenStyle, [string, string]][]).map(([k, [n, iconSvg]]) => (
            <button
              key={k}
              className={`fb ${style === k ? 'on' : ''}`}
              onClick={() => {
                onSelectStyle(k);
                onClose();
              }}
            >
              <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: iconSvg }} />
              {n}
            </button>
          ))}
        </>
      )}

      {/* 2. SHAPE FLYOUT */}
      {activeFlyout === 'shape' && (
        <>
          <h4>
            Bentuk
            {closeButton}
          </h4>
          <div className="tabs">
            {Object.keys(SHP).map((t) => (
              <button
                key={t}
                className={`chip ${tab === t ? 'on' : ''}`}
                onClick={() => onSelectTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="sg">
            {(SHP[tab] || SHP.Dasar).map((k) => (
              <button
                key={k}
                className={shape === k ? 'on' : ''}
                aria-label={k}
                onClick={() => {
                  onSelectShape(k);
                  onClose();
                }}
              >
                <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: shIcon(k) }} />
              </button>
            ))}
          </div>
        </>
      )}

      {/* 3. TEXT FLYOUT */}
      {activeFlyout === 'text' && (
        <>
          <h4>
            Teks
            {closeButton}
          </h4>
          <button
            className="tb1"
            onClick={() => {
              onSelectText('box');
              onClose();
            }}
          >
            <b>T</b> Tambah kotak teks
          </button>
          <div className="sl">GAYA TEKS BAWAAN</div>
          <button
            className="ts"
            style={{ fontSize: 22, fontWeight: 800 }}
            onClick={() => {
              onSelectText('h');
              onClose();
            }}
          >
            Tambah judul
          </button>
          <button
            className="ts"
            style={{ fontSize: 17, fontWeight: 700 }}
            onClick={() => {
              onSelectText('s');
              onClose();
            }}
          >
            Tambah subjudul
          </button>
          <button
            className="ts"
            style={{ fontSize: 14 }}
            onClick={() => {
              onSelectText('b');
              onClose();
            }}
          >
            Tambah sedikit teks isi
          </button>
        </>
      )}

      {/* 4. TABLE FLYOUT */}
      {activeFlyout === 'table' && (
        <>
          <h4>
            Sisipkan Tabel
            {closeButton}
          </h4>
          <div className="sl" style={{ textAlign: 'center' }}>
            Pilih ukuran ({tableHover.r} × {tableHover.c})
          </div>
          <div className="tg">
            {Array.from({ length: 64 }, (_, i) => {
              const r = Math.floor(i / 8) + 1;
              const c = (i % 8) + 1;
              const isHl = r <= tableHover.r && c <= tableHover.c;
              return (
                <button
                  key={`${r},${c}`}
                  className={isHl ? 'hl' : ''}
                  aria-label={`Tabel ${r}x${c}`}
                  onMouseEnter={() => setTableHover({ r, c })}
                  onClick={() => {
                    onSelectTable(r, c);
                    onClose();
                  }}
                />
              );
            })}
          </div>
          <div className="sl">TEMPLAT CEPAT</div>
          <div className="qg">
            {[
              [3, 3],
              [4, 4],
              [5, 5],
              [2, 4],
              [3, 5],
              [6, 3],
            ].map(([r, c]) => (
              <button
                key={`${r}x${c}`}
                onClick={() => {
                  onSelectTable(r, c);
                  onClose();
                }}
              >
                <i
                  className="mg"
                  style={{
                    gridTemplate: `repeat(${r}, 1fr) / repeat(${c}, 1fr)`,
                  }}
                >
                  {Array.from({ length: r * c }, (_, idx) => (
                    <u key={idx} />
                  ))}
                </i>
                {r}×{c}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

