import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface KontrolZoomProps {
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export const KontrolZoom: React.FC<KontrolZoomProps> = ({
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  return (
    <div className="absolute right-4 bottom-4 z-20 flex items-center gap-1 p-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl select-none text-xs font-bold text-slate-700 dark:text-slate-200">
      <button
        type="button"
        onClick={onZoomOut}
        className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Perkecil Kanvas (Zoom Out)"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={onResetZoom}
        className="px-2 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer font-mono text-[11px]"
        title="Klik untuk Reset Zoom ke 100%"
      >
        {Math.round(zoomPercent)}%
      </button>

      <button
        type="button"
        onClick={onZoomIn}
        className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        title="Perbesar Kanvas (Zoom In)"
      >
        <ZoomIn className="w-4 h-4" />
      </button>

      <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />

      <button
        type="button"
        onClick={onResetZoom}
        className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-slate-500 hover:text-slate-900 dark:hover:text-white"
        title="Reset Posisi & Zoom"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
