import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'sukses' | 'error' | 'info';

export interface ToastItem {
  id: string;
  pesan: string;
  tipe: ToastType;
}

interface ToastContextValue {
  tampilToast: (pesan: string, tipe?: ToastType) => void;
  hapusToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [daftarToast, setDaftarToast] = useState<ToastItem[]>([]);

  const hapusToast = useCallback((id: string) => {
    setDaftarToast((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const tampilToast = useCallback((pesan: string, tipe: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setDaftarToast((prev) => [...prev, { id, pesan, tipe }]);

    setTimeout(() => {
      hapusToast(id);
    }, 4000);
  }, [hapusToast]);

  return (
    <ToastContext.Provider value={{ tampilToast, hapusToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {daftarToast.map((t) => {
          const config = {
            sukses: {
              bg: 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100',
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
            },
            error: {
              bg: 'bg-red-50 dark:bg-red-950/90 border-red-300 dark:border-red-800 text-red-900 dark:text-red-100',
              icon: <AlertCircle className="w-5 h-5 text-[#D7262E] shrink-0" />,
            },
            info: {
              bg: 'bg-blue-50 dark:bg-blue-950/90 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-100',
              icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />,
            },
          }[t.tipe];

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg transition-all ${config.bg}`}
            >
              {config.icon}
              <p className="text-sm font-medium flex-1 pt-0.5">{t.pesan}</p>
              <button
                type="button"
                onClick={() => hapusToast(t.id)}
                aria-label="Tutup notifikasi"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 -mr-1 -mt-1 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast harus digunakan di dalam ToastProvider');
  }
  return context;
}

