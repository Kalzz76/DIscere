import React from 'react';
import { ToolType } from './PapanToolbar';
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';

export interface CanvasSettings {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  textAlign: 'left' | 'center' | 'right';
}

interface PapanSettingsBarProps {
  activeTool: ToolType;
  settings: CanvasSettings;
  onUpdateSettings: (newSettings: Partial<CanvasSettings>) => void;
  disabled?: boolean;
}

const PALETTE = [
  { label: 'Hitam', color: '#1e293b' },
  { label: 'Merah', color: '#D7262E' },
  { label: 'Biru', color: '#1E2A5A' },
  { label: 'Kuning', color: '#F5B700' },
  { label: 'Hijau', color: '#10B981' },
  { label: 'Ungu', color: '#8b5cf6' },
  { label: 'Putih', color: '#ffffff' },
];

export const PapanSettingsBar: React.FC<PapanSettingsBarProps> = ({
  activeTool,
  settings,
  onUpdateSettings,
  disabled = false,
}) => {
  if (disabled || activeTool === 'pan') {
    return null;
  }

  const isShape = ['rect', 'circle', 'triangle'].includes(activeTool);
  const isLineOrPen = ['pen', 'line', 'arrow'].includes(activeTool);
  const isText = activeTool === 'text';

  return (
    <div className="absolute left-20 top-20 z-20 flex flex-wrap items-center gap-3 px-3.5 py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl select-none text-xs">
      {/* 1. Pemilih Warna Garis / Teks */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
          {isText ? 'Teks' : 'Warna'}
        </span>
        {PALETTE.map((p) => {
          const isSelected = settings.strokeColor === p.color;
          return (
            <button
              key={p.color}
              onClick={() => onUpdateSettings({ strokeColor: p.color })}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                isSelected ? 'scale-125 border-indigo-600 ring-2 ring-indigo-400' : 'border-slate-300 dark:border-slate-700'
              }`}
              style={{ backgroundColor: p.color }}
              title={p.label}
            />
          );
        })}
      </div>

      <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

      {/* 2. Ketebalan Garis (Untuk Pen, Line, Shape) */}
      {(isLineOrPen || isShape) && (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Tebal
          </span>
          {[2, 4, 8, 14].map((w) => {
            const isSelected = settings.strokeWidth === w;
            return (
              <button
                key={w}
                onClick={() => onUpdateSettings({ strokeWidth: w })}
                className={`px-2 py-1 rounded-lg font-bold ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {w}px
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Isi Warna Shape (Transparan atau Warna) */}
      {isShape && (
        <>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Isi
            </span>
            <button
              onClick={() => onUpdateSettings({ fillColor: 'transparent' })}
              className={`px-2 py-1 rounded-lg font-bold ${
                settings.fillColor === 'transparent'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Polos
            </button>
            <button
              onClick={() => onUpdateSettings({ fillColor: settings.strokeColor })}
              className={`px-2 py-1 rounded-lg font-bold ${
                settings.fillColor !== 'transparent'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Solid
            </button>
          </div>
        </>
      )}

      {/* 4. Format Teks (Bold, Italic, Ukuran, Align) */}
      {isText && (
        <>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => onUpdateSettings({ isBold: !settings.isBold })}
              className={`p-1.5 rounded-lg ${
                settings.isBold
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Tebal (Bold)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onUpdateSettings({ isItalic: !settings.isItalic })}
              className={`p-1.5 rounded-lg ${
                settings.isItalic
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Miring (Italic)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

            <button
              onClick={() => onUpdateSettings({ textAlign: 'left' })}
              className={`p-1.5 rounded-lg ${
                settings.textAlign === 'left'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Rata Kiri"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onUpdateSettings({ textAlign: 'center' })}
              className={`p-1.5 rounded-lg ${
                settings.textAlign === 'center'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Rata Tengah"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onUpdateSettings({ textAlign: 'right' })}
              className={`p-1.5 rounded-lg ${
                settings.textAlign === 'right'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Rata Kanan"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

            {/* Ukuran Font */}
            <select
              value={settings.fontSize}
              onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-white focus:outline-none"
            >
              <option value={16}>16px</option>
              <option value={24}>24px</option>
              <option value={32}>32px</option>
              <option value={48}>48px</option>
              <option value={64}>64px</option>
            </select>
          </div>
        </>
      )}

      {/* 5. Opacity Slider */}
      <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Transparansi
        </span>
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.1}
          value={settings.opacity}
          onChange={(e) => onUpdateSettings({ opacity: parseFloat(e.target.value) })}
          className="w-16 accent-indigo-600 cursor-pointer"
        />
        <span className="font-mono text-[10px] text-slate-500 w-6">
          {Math.round(settings.opacity * 100)}%
        </span>
      </div>
    </div>
  );
};
