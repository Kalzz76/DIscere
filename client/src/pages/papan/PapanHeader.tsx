import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Share2,
  Gamepad2,
  Check,
  AlertCircle,
  WifiOff,
  Loader2,
  Users,
  Eye,
  Edit3,
} from 'lucide-react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface PapanHeaderProps {
  judul: string;
  onJudulChange: (newJudul: string) => void;
  autosaveStatus: AutosaveStatus;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenShareModal: () => void;
  onToggleSidebarGame: () => void;
  isSidebarGameOpen: boolean;
  isOwner: boolean;
  peran: 'owner' | 'editor' | 'viewer';
  collaboratorsCount: {
    total: number;
    editors: number;
    viewers: number;
  };
  onRetrySave?: () => void;
}

export const PapanHeader: React.FC<PapanHeaderProps> = ({
  judul,
  onJudulChange,
  autosaveStatus,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenShareModal,
  onToggleSidebarGame,
  isSidebarGameOpen,
  isOwner,
  peran,
  collaboratorsCount,
  onRetrySave,
}) => {
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(judul);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    const clean = titleInput.trim();
    if (clean && clean !== judul) {
      onJudulChange(clean);
    } else {
      setTitleInput(judul);
    }
  };

  return (
    <header className="h-16 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-30 select-none shadow-xs">
      {/* Kiri: Tombol Kembali, Logo & Judul */}
      <div className="flex items-center gap-3">
        {isOwner && (
          <button
            onClick={() => navigate('/guru?tab=papan')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Kembali ke Dashboard Guru"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {/* Logo Discere */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D7262E] to-rose-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
            D
          </div>
          <span className="font-extrabold text-base tracking-tight hidden sm:inline text-slate-900 dark:text-white">
            DISCERE
          </span>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Judul Papan (Editable untuk Guru/Owner) */}
        {isOwner && isEditingTitle ? (
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
              if (e.key === 'Escape') {
                setTitleInput(judul);
                setIsEditingTitle(false);
              }
            }}
            autoFocus
            className="font-bold text-base px-2.5 py-1 rounded-lg border-2 border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none max-w-[200px] sm:max-w-xs"
          />
        ) : (
          <div
            onClick={() => {
              if (isOwner) {
                setTitleInput(judul);
                setIsEditingTitle(true);
              }
            }}
            className={`font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate max-w-[180px] sm:max-w-xs px-2 py-1 rounded-lg ${
              isOwner ? 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer' : ''
            }`}
            title={isOwner ? 'Klik untuk mengganti judul papan' : judul}
          >
            {judul}
          </div>
        )}

        {/* Peran Kolaborator Badge (jika bukan owner) */}
        {!isOwner && (
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
              peran === 'editor'
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
            }`}
          >
            {peran === 'editor' ? (
              <>
                <Edit3 className="w-3 h-3" />
                Kolaborator (Editor)
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                Menyimak (Viewer)
              </>
            )}
          </span>
        )}
      </div>

      {/* Tengah: Status Autosave & Kolaborator Aktif */}
      <div className="flex items-center gap-3">
        {/* Indikator Autosave */}
        {peran !== 'viewer' && (
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80">
            {autosaveStatus === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                <span className="text-slate-500">Menyimpan...</span>
              </>
            )}
            {autosaveStatus === 'saved' && (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Tersimpan</span>
              </>
            )}
            {autosaveStatus === 'error' && (
              <button
                onClick={onRetrySave}
                className="flex items-center gap-1 text-rose-500 hover:text-rose-600 cursor-pointer"
                title="Gagal menyimpan. Klik untuk mencoba kembali."
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Gagal menyimpan (Coba lagi)</span>
              </button>
            )}
            {autosaveStatus === 'offline' && (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-600 dark:text-amber-400">Offline</span>
              </>
            )}
            {autosaveStatus === 'idle' && (
              <span className="text-slate-400">Siap</span>
            )}
          </div>
        )}

        {/* Counter Kolaborator */}
        <div
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80"
          title={`Total ${collaboratorsCount.total} orang aktif: ${collaboratorsCount.editors} Editor, ${collaboratorsCount.viewers} Viewer`}
        >
          <Users className="w-3.5 h-3.5 text-indigo-500" />
          <span>{collaboratorsCount.total}</span>
        </div>
      </div>

      {/* Kanan: Undo, Redo, Bagikan, dan Sidebar Game */}
      <div className="flex items-center gap-2">
        {peran !== 'viewer' && (
          <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2 mr-1">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tombol Bagikan (Khusus Pemilik) */}
        {isOwner && (
          <Button
            variant="sekunder"
            size="sm"
            icon={<Share2 className="w-4 h-4" />}
            onClick={onOpenShareModal}
            className="text-xs font-bold"
          >
            Bagikan
          </Button>
        )}

        {/* Tombol Sidebar Template Game (Khusus Pemilik) */}
        {isOwner && (
          <Button
            variant="utama"
            size="sm"
            icon={<Gamepad2 className="w-4 h-4" />}
            onClick={onToggleSidebarGame}
            className={`text-xs font-bold ${
              isSidebarGameOpen ? 'ring-2 ring-indigo-400 bg-indigo-700' : ''
            }`}
          >
            <span className="hidden sm:inline">Template Game</span>
          </Button>
        )}
      </div>
    </header>
  );
};
