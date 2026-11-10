import React, { useState, useRef, useEffect } from 'react';
import { readFileForAttachment, LampiranObrolan } from '../lib/obrol';

interface PromptBarProps {
  inputTeks: string;
  onChangeInput: (v: string) => void;
  onSend: () => void;
  onCancel: () => void;
  busy: boolean;
  onAddAttachment: (lamp: LampiranObrolan) => void;
  onSnapCanvas: () => void;
  onToast: (msg: string) => void;
}

export const PromptBar: React.FC<PromptBarProps> = ({
  inputTeks,
  onChangeInput,
  onSend,
  onCancel,
  busy,
  onAddAttachment,
  onSnapCanvas,
  onToast,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const plusBtnRef = useRef<HTMLButtonElement>(null);
  const fileImgRef = useRef<HTMLInputElement>(null);
  const fileAnyRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Tutup menu popover jika klik di luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        plusBtnRef.current &&
        !plusBtnRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  // Handler Dikte Suara Web Speech API
  const handleToggleMic = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onToast('Browser ini belum mendukung dikte suara');
      return;
    }

    if (isRecording && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsRecording(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'id-ID';
      rec.continuous = false;
      rec.interimResults = true;

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((res: any) => res[0]?.transcript || '')
          .join(' ');
        if (transcript) {
          onChangeInput(transcript);
        }
      };

      rec.onerror = (event: any) => {
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          onToast('Izin akses mikrofon ditolak.');
        } else {
          onToast('Mikrofon tidak bisa diakses.');
        }
      };

      rec.onend = () => {
        setIsRecording(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsRecording(false);
      onToast('Gagal memulai perekaman suara.');
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const lamp = await readFileForAttachment(file);
        onAddAttachment(lamp);
      } catch (err: any) {
        onToast(err.message || 'Gagal memuat lampiran.');
      }
    }
  };

  // Tempel (paste) gambar ke kolom input menjadi lampiran
  const handlePasteInput = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          readFileForAttachment(file)
            .then((lamp) => {
              onAddAttachment(lamp);
              onToast(`Gambar "${file.name || 'Pasted image'}" dilampirkan.`);
            })
            .catch((err) => onToast(err.message));
        }
      }
    }
  };

  return (
    <>
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileImgRef}
        accept="image/png,image/jpeg,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFilesSelected(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        type="file"
        ref={fileAnyRef}
        accept=".pdf,.txt,.md,.csv,.json,.js,.ts,.py,.html,.css,.xml,.yml,.yaml,.sql,.log,image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFilesSelected(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Prompt Bar Melayang (#pr) */}
      <div className="pn prompt-bar" id="pr" role="region" aria-label="Bar masukan asisten AI">
        {/* Tombol Plus & Popover Menu Lampiran */}
        <div className="prompt-plus-wrapper">
          <button
            className="ib"
            id="plus"
            ref={plusBtnRef}
            type="button"
            title="Tambah lampiran materi"
            aria-label="Tambah lampiran materi"
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Popover Menu Lampiran (Muncul ke atas tombol Plus) */}
          {isMenuOpen && (
            <div className="prompt-menu-popover" ref={menuRef} role="menu">
              <button
                type="button"
                className="prompt-menu-item"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  fileImgRef.current?.click();
                }}
              >
                <svg viewBox="0 0 24 24" className="prompt-menu-icon">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Gambar…</span>
              </button>
              <button
                type="button"
                className="prompt-menu-item"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  fileAnyRef.current?.click();
                }}
              >
                <svg viewBox="0 0 24 24" className="prompt-menu-icon">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>File (PDF, teks)…</span>
              </button>
              <div className="prompt-menu-divider" />
              <button
                type="button"
                className="prompt-menu-item"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  onSnapCanvas();
                }}
              >
                <svg viewBox="0 0 24 24" className="prompt-menu-icon">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>Papan saat ini</span>
              </button>
            </div>
          )}
        </div>

        {/* Input Text */}
        <input
          id="pi"
          type="text"
          value={inputTeks}
          placeholder="Tanya AI tentang materi ini…"
          autoComplete="off"
          aria-label="Tanya asisten AI"
          onChange={(e) => onChangeInput(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          onPaste={handlePasteInput}
        />

        {/* Tombol Kirim atau Tombol Batalkan saat sibuk */}
        {busy ? (
          <button
            className="ib cancel-btn"
            type="button"
            title="Batalkan proses AI"
            aria-label="Batalkan proses AI"
            onClick={onCancel}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
            </svg>
          </button>
        ) : (
          <button
            className="ib"
            id="snd"
            type="button"
            title="Kirim pertanyaan ke AI"
            aria-label="Kirim pertanyaan ke AI"
            onClick={onSend}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                d="M12 19V5M5 12l7-7 7 7"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </button>
        )}

        {/* Tombol Dikte Suara (#mic) */}
        <button
          className={`ib ${isRecording ? 'rec' : ''}`}
          id="mic"
          type="button"
          title={isRecording ? 'Sedang mendengarkan… (Klik untuk berhenti)' : 'Dikte suara'}
          aria-label={isRecording ? 'Berhenti merekam suara' : 'Mulai dikte suara'}
          onClick={handleToggleMic}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <rect
              x="9"
              y="3"
              width="6"
              height="11"
              rx="3"
              stroke="currentColor"
              strokeWidth="2"
              fill={isRecording ? 'currentColor' : 'none'}
            />
            <path
              d="M5 10a7 7 0 0 0 14 0M12 17v4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </button>
      </div>
    </>
  );
};

