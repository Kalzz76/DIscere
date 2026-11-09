import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api';
import { Button, Badge } from '../../components';
import {
  X,
  Play,
  Gamepad2,
  Trophy,
  Loader2,
  Plus,
} from 'lucide-react';

interface TemplateItem {
  id: string;
  judul: string;
  game: string;
  mode: string;
  jumlahSoal?: number;
  _count?: { questions: number };
}

interface PapanSidebarGameProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchGame: (templateId: string, mode: string) => void;
}

export const PapanSidebarGame: React.FC<PapanSidebarGameProps> = ({
  isOpen,
  onClose,
  onLaunchGame,
}) => {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      async function loadTemplates() {
        setLoading(true);
        try {
          const res = await apiRequest<{ templates: TemplateItem[] }>('/template');
          setTemplates(res.templates || []);
        } catch (err) {
          console.error('Gagal memuat template game:', err);
        } finally {
          setLoading(false);
        }
      }
      loadTemplates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStart = async (template: TemplateItem) => {
    try {
      setActionLoadingId(template.id);
      await onLaunchGame(template.id, template.mode);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <aside className="absolute right-0 top-16 bottom-0 w-80 sm:w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 shadow-2xl z-30 flex flex-col justify-between select-none animate-slideLeft">
      {/* Header Sidebar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
              Template Game
            </h3>
            <p className="text-[11px] text-slate-500">Mulai lomba langsung dari papan tulis</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Tutup Sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Konten Daftar Template */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-500" />
            <p className="text-xs">Memuat template materi...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <Trophy className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Belum Ada Template Soal
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Buat template soal terlebih dahulu di dashboard guru.
            </p>
            <div className="pt-4">
              <Button
                variant="utama"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => window.open('/guru/template/baru', '_blank')}
              >
                Buat Template Baru
              </Button>
            </div>
          </div>
        ) : (
          templates.map((tmpl) => {
            const jumlahSoal = tmpl._count?.questions ?? tmpl.jumlahSoal ?? 0;
            const isMulti = tmpl.mode === 'multi';

            return (
              <div
                key={tmpl.id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:shadow-md transition-shadow space-y-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="merah" size="sm">
                      Tarik Tambang
                    </Badge>
                    <Badge variant={isMulti ? 'kuning' : 'biru'} size="sm">
                      {isMulti ? 'Multiplayer' : 'Solo'}
                    </Badge>
                  </div>

                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-1 pt-1">
                    {tmpl.judul}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {jumlahSoal} Soal Tersedia
                  </p>
                </div>

                <Button
                  variant="utama"
                  size="sm"
                  icon={<Play className="w-4 h-4 fill-current" />}
                  onClick={() => handleStart(tmpl)}
                  loading={actionLoadingId === tmpl.id}
                  className="w-full text-xs font-bold"
                >
                  {isMulti ? 'Mulai Lomba Multi' : 'Mulai Game Solo'}
                </Button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 text-center">
        Catatan di papan tulis tetap tersimpan otomatis saat Anda menjalankan game.
      </div>
    </aside>
  );
};

