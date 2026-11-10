import React, { useEffect, useRef, useState, useCallback } from 'react';
import { COL, h2r, r2h, hx } from '../engine/color';

export interface ColorPickerProps {
  isOpen: boolean;
  color: string;
  anchorRect: DOMRect | null;
  onSelectColor: (hex: string) => void;
  onClose: () => void;
  onToast?: (msg: string) => void;
}

export function ColorPicker({
  isOpen,
  color,
  anchorRect,
  onSelectColor,
  onClose,
  onToast,
}: ColorPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>(() => {
    const n = parseInt((color || '#111827').slice(1), 16) || 0;
    return r2h((n >> 16) & 255, (n >> 8) & 255, n & 255);
  });

  const [rgb, setRgb] = useState<[number, number, number]>(() => {
    const n = parseInt((color || '#111827').slice(1), 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  });

  // Sync color prop when opened
  useEffect(() => {
    if (isOpen && color) {
      const n = parseInt(color.slice(1), 16);
      if (!isNaN(n)) {
        const nextHsv = r2h((n >> 16) & 255, (n >> 8) & 255, n & 255);
        setHsv(nextHsv);
        setRgb([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
      }
    }
  }, [isOpen, color]);

  // Redraw canvas saturation/value
  const drawSvCanvas = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const w = cv.width;
    const h = cv.height;

    ctx.fillStyle = `hsl(${hsv.h}, 100%, 50%)`;
    ctx.fillRect(0, 0, w, h);

    let g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0, 0, 0, 0)');
    g.addColorStop(1, '#000000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Marker
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hsv.s * w, (1 - hsv.v) * h, 6, 0, Math.PI * 2);
    ctx.stroke();
  }, [hsv]);

  useEffect(() => {
    if (isOpen) {
      drawSvCanvas();
    }
  }, [isOpen, drawSvCanvas]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePointerSv = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const v = 1 - Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    const nextHsv = { ...hsv, s, v };
    setHsv(nextHsv);
    const nextRgb = h2r(nextHsv.h, nextHsv.s, nextHsv.v);
    setRgb(nextRgb);
    onSelectColor(hx(nextRgb));
  };

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const h = +e.target.value;
    const nextHsv = { ...hsv, h };
    setHsv(nextHsv);
    const nextRgb = h2r(nextHsv.h, nextHsv.s, nextHsv.v);
    setRgb(nextRgb);
    onSelectColor(hx(nextRgb));
  };

  const handleRgbChange = (idx: number, val: number) => {
    const nextRgb: [number, number, number] = [...rgb];
    nextRgb[idx] = Math.max(0, Math.min(255, val || 0));
    setRgb(nextRgb);
    const n = r2h(...nextRgb);
    if (n.s > 0) setHsv(n);
    else setHsv({ ...hsv, s: n.s, v: n.v });
    onSelectColor(hx(nextRgb));
  };

  const handleEyeDropper = () => {
    if (!(window as any).EyeDropper) {
      if (onToast) onToast('Browser belum mendukung pipet layar');
      return;
    }
    new (window as any).EyeDropper()
      .open()
      .then((res: any) => {
        if (res?.sRGBHex) {
          const hex = res.sRGBHex;
          const n = parseInt(hex.slice(1), 16);
          const nextHsv = r2h((n >> 16) & 255, (n >> 8) & 255, n & 255);
          setHsv(nextHsv);
          setRgb([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
          onSelectColor(hex);
        }
      })
      .catch(() => {});
  };

  const handleQuickSwatch = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const nextHsv = r2h((n >> 16) & 255, (n >> 8) & 255, n & 255);
    setHsv(nextHsv);
    setRgb([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
    onSelectColor(hex);
  };

  const currentColor = hx(rgb);
  const left = anchorRect ? Math.min(anchorRect.left, window.innerWidth - 270) : 200;
  const top = anchorRect ? anchorRect.bottom + 10 : 150;

  return (
    <div
      ref={panelRef}
      className="pn color-picker-panel"
      style={{ left: `${left}px`, top: `${top}px`, display: 'block' }}
    >
      <canvas
        ref={canvasRef}
        className="cp-canvas"
        width={232}
        height={150}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          handlePointerSv(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons) handlePointerSv(e);
        }}
      />

      <div className="cr">
        <button
          className="ib"
          title="Pipet layar"
          onClick={handleEyeDropper}
          aria-label="Pipet layar"
        >
          <svg viewBox="0 0 24 24">
            <path d="M15 4l5 5-3 1-7 7-4 1 1-4 7-7zM4 20l3-3" />
          </svg>
        </button>
        <i className="cp-preview" style={{ background: currentColor }} />
        <input
          type="range"
          className="cp-hue-slider"
          min={0}
          max={360}
          value={Math.round(hsv.h)}
          onChange={handleHueChange}
          aria-label="Hue"
        />
      </div>

      <div className="cn">
        <label>
          R
          <input
            type="number"
            min={0}
            max={255}
            value={rgb[0]}
            onChange={(e) => handleRgbChange(0, +e.target.value)}
          />
        </label>
        <label>
          G
          <input
            type="number"
            min={0}
            max={255}
            value={rgb[1]}
            onChange={(e) => handleRgbChange(1, +e.target.value)}
          />
        </label>
        <label>
          B
          <input
            type="number"
            min={0}
            max={255}
            value={rgb[2]}
            onChange={(e) => handleRgbChange(2, +e.target.value)}
          />
        </label>
      </div>

      <div className="qs">
        {COL.map((c) => (
          <button
            key={c}
            className={`sw ${c.toLowerCase() === currentColor.toLowerCase() ? 'on' : ''}`}
            style={{ background: c }}
            aria-label={c}
            onClick={() => handleQuickSwatch(c)}
          />
        ))}
      </div>
    </div>
  );
}

