import { useState, useRef, useCallback } from 'react';
import {
  PesanObrolan,
  LampiranObrolan,
  kirimPesanObrolan,
} from './obrol';

export interface UseObrolReturn {
  pesan: PesanObrolan[];
  lampiran: LampiranObrolan[];
  inputTeks: string;
  setInputTeks: (v: string | ((prev: string) => string)) => void;
  busy: boolean;
  isChatOpen: boolean;
  setIsChatOpen: (v: boolean) => void;
  tambahLampiran: (lamp: LampiranObrolan) => boolean;
  hapusLampiran: (id: string) => void;
  kirimPesan: (customText?: string) => Promise<void>;
  batalkan: () => void;
  obrolanBaru: () => void;
}

export function useObrol(onToast?: (msg: string) => void): UseObrolReturn {
  const [pesan, setPesan] = useState<PesanObrolan[]>([]);
  const [lampiran, setLampiran] = useState<LampiranObrolan[]>([]);
  const [inputTeks, setInputTeks] = useState('');
  const [busy, setBusy] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const tambahLampiran = useCallback(
    (lamp: LampiranObrolan): boolean => {
      if (lampiran.length >= 4) {
        if (onToast) onToast('Maksimal 4 lampiran dalam satu pesan.');
        return false;
      }
      setLampiran((prev) => [...prev, lamp]);
      return true;
    },
    [lampiran.length, onToast]
  );

  const hapusLampiran = useCallback((id: string) => {
    setLampiran((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const batalkan = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setBusy(false);
  }, []);

  const obrolanBaru = useCallback(() => {
    batalkan();
    setPesan([]);
    setLampiran([]);
    setInputTeks('');
    setIsChatOpen(false);
  }, [batalkan]);

  const kirimPesan = useCallback(
    async (customText?: string) => {
      if (busy) return;

      const q = (customText !== undefined ? customText : inputTeks).trim();
      const currentLampiran = [...lampiran];

      if (!q && currentLampiran.length === 0) {
        return;
      }

      setIsChatOpen(true);

      const userPesan: PesanObrolan = {
        id: crypto.randomUUID(),
        role: 'user',
        teks: q || '(lampiran)',
        lampiran: currentLampiran.length > 0 ? currentLampiran : undefined,
        fileNames: currentLampiran.map((l) => l.nama),
      };

      // Buat riwayat baru dengan pesan user yang baru
      const riwayatBaru = [...pesan, userPesan];
      setPesan(riwayatBaru);

      // Reset input dan antrean lampiran
      setInputTeks('');
      setLampiran([]);
      setBusy(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const jawaban = await kirimPesanObrolan(riwayatBaru, controller.signal);

        const aiPesan: PesanObrolan = {
          id: crypto.randomUUID(),
          role: 'assistant',
          teks: jawaban,
        };

        setPesan((prev) => [...prev, aiPesan]);
      } catch (err: any) {
        const isAbort =
          err?.name === 'AbortError' ||
          err?.message?.includes('aborted') ||
          err?.message?.includes('batal');

        const errorPesan: PesanObrolan = {
          id: crypto.randomUUID(),
          role: 'assistant',
          teks: isAbort
            ? 'Permintaan obrolan dibatalkan.'
            : (err?.message || 'Gagal menghubungi asisten AI. Silakan coba kembali.'),
          isError: true,
        };

        setPesan((prev) => [...prev, errorPesan]);
      } finally {
        setBusy(false);
        abortControllerRef.current = null;
      }
    },
    [busy, inputTeks, lampiran, pesan]
  );

  return {
    pesan,
    lampiran,
    inputTeks,
    setInputTeks,
    busy,
    isChatOpen,
    setIsChatOpen,
    tambahLampiran,
    hapusLampiran,
    kirimPesan,
    batalkan,
    obrolanBaru,
  };
}

