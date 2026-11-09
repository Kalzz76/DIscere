import React from 'react';
import {
  MousePointer2,
  Hand,
  Pencil,
  Eraser,
  Type,
  Minus,
  ArrowUpRight,
  Square,
  Circle,
  Triangle,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';

export type ToolType =
  | 'select'
  | 'pan'
  | 'pen'
  | 'eraser'
  | 'text'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'circle'
  | 'triangle'
  | 'image';

interface PapanToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  disabled?: boolean;
}

export const PapanToolbar: React.FC<PapanToolbarProps> = ({
  activeTool,
  onSelectTool,
  onImageUpload,
  onDeleteSelected,
  hasSelection,
  disabled = false,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (disabled) {
    return null; // Toolbar disembunyikan untuk Viewer (Read-only)
  }

  const tools: Array<{ id: ToolType; label: string; icon: React.ReactNode }> = [
    { id: 'select', label: 'Pilih (V)', icon: <MousePointer2 className="w-4 h-4" /> },
    { id: 'pan', label: 'Geser / Hand (H)', icon: <Hand className="w-4 h-4" /> },
    { id: 'pen', label: 'Pena Gambar (P)', icon: <Pencil className="w-4 h-4" /> },
    { id: 'eraser', label: 'Penghapus (E)', icon: <Eraser className="w-4 h-4" /> },
    { id: 'text', label: 'Teks (T)', icon: <Type className="w-4 h-4" /> },
    { id: 'line', label: 'Garis Lurus (L)', icon: <Minus className="w-4 h-4" /> },
    { id: 'arrow', label: 'Panah (A)', icon: <ArrowUpRight className="w-4 h-4" /> },
    { id: 'rect', label: 'Kotak (R)', icon: <Square className="w-4 h-4" /> },
    { id: 'circle', label: 'Lingkaran (C)', icon: <Circle className="w-4 h-4" /> },
    { id: 'triangle', label: 'Segitiga', icon: <Triangle className="w-4 h-4" /> },
  ];

  return (
    <div className="absolute left-4 top-20 z-20 flex flex-col items-center gap-1.5 p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl select-none">
      {tools.map((t) => {
        const isActive = activeTool === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelectTool(t.id)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={t.label}
          >
            {t.icon}
          </button>
        );
      })}

      <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-1" />

      {/* Upload Gambar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onImageUpload}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Sisipkan Gambar / Slide"
      >
        <ImageIcon className="w-4 h-4" />
      </button>

      {/* Hapus Objek Terpilih */}
      <button
        onClick={onDeleteSelected}
        disabled={!hasSelection}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Hapus Objek Terpilih (Delete / Backspace)"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

