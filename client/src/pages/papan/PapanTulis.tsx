import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import './papan.css';
import { apiRequest } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../lib/auth';
import { Board } from './engine/board';
import { CanvasObj, BoardState, BoardView, TextEditorState, ToolType, PenStyle, UbahEventPayload } from './engine/types';
import { COL, LCOL } from './engine/color';
import { downloadPng, downloadJson, toJson } from './engine/export';
import {
  TopLeftBar,
  ToolRail,
  OptionsBar,
  TopRightBar,
  ZoomBar,
  Flyouts,
  ColorPicker,
  TextEditor,
  MenuPopup,
  Toast,
  ShareModal,
  PesertaItem,
} from './components';

export default function PapanTulis() {
  const { id: boardId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<Board | null>(null);

  // Status & Metadata Papan
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState('Papan Pembelajaran Baru');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'busy' | 'error'>('saved');
  const [loadedObjs, setLoadedObjs] = useState<CanvasObj[] | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Kolaborasi Real-time & Share Modal
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [pesertaList, setPesertaList] = useState<PesertaItem[]>([]);

  // State UI Kanvas
  const [boardState, setBoardState] = useState<BoardState>({
    tool: 'pen',
    color: COL[0],
    size: 4,
    er: 14,
    style: 'pen',
    op: 1,
    ss: 3,
    tab: 'Dasar',
    shape: 'rect',
    fs: 24,
    tsz: 3,
    lc: LCOL[0],
    grid: true,
  });

  const [view, setView] = useState<BoardView>({ x: 0, y: 0, z: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Popups & Overlays
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFlyout, setActiveFlyout] = useState<ToolType | null>(null);
  const [flyoutAnchor, setFlyoutAnchor] = useState<DOMRect | null>(null);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [colorPickerAnchor, setColorPickerAnchor] = useState<DOMRect | null>(null);
  const [textEditor, setTextEditor] = useState<TextEditorState | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);

  // File Inputs Ref
  const fileImgRef = useRef<HTMLInputElement>(null);
  const fileJsonRef = useRef<HTMLInputElement>(null);

  // Autosave Timer Ref
  const saveTimeoutRef = useRef<any>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2200);
  }, []);

  // Simpan Otomatis ke Server dengan Debounce 2 detik
  const triggerAutosave = useCallback(
    (customTitle?: string) => {
      if (!boardId) return;
      setSaveStatus('busy');

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        const board = boardRef.current;
        if (!board) return;

        const currentTitle = customTitle !== undefined ? customTitle : title;
        const jsonString = toJson(board.objs);

        try {
          await apiRequest(`/papan/${boardId}`, {
            method: 'PUT',
            body: JSON.stringify({
              judul: currentTitle,
              data: jsonString,
            }),
          });
          setSaveStatus('saved');
          try {
            localStorage.removeItem(`discere-draft-${boardId}`);
          } catch {
            // Abaikan error localStorage
          }
        } catch (err) {
          console.error('Gagal menyimpan papan ke server:', err);
          setSaveStatus('error');
          try {
            localStorage.setItem(
              `discere-draft-${boardId}`,
              JSON.stringify({ judul: currentTitle, data: jsonString, savedAt: Date.now() })
            );
            showToast('Koneksi terganggu. Draf tersimpan di penyimpanan browser.');
          } catch {
            showToast('Gagal menyimpan papan!');
          }
        }
      }, 2000);
    },
    [boardId, title, showToast]
  );

  // 1. Muat data papan dari server
  useEffect(() => {
    if (!boardId) {
      setLoadError('ID papan tidak valid.');
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadBoardData() {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await apiRequest<{
          board: {
            id: string;
            judul: string;
            data: string;
            ownerId: string;
            updatedAt: string;
          };
        }>(`/papan/${boardId}`);

        if (!isMounted) return;

        const remoteTitle = res.board?.judul || 'Papan Pembelajaran Baru';
        setTitle(remoteTitle);

        let initialObjs: CanvasObj[] = [];
        try {
          const parsed = JSON.parse(res.board?.data || '{}');
          if (parsed && parsed.versi === 1 && Array.isArray(parsed.objs)) {
            initialObjs = parsed.objs;
          }
        } catch {
          try {
            const draft = localStorage.getItem(`discere-draft-${boardId}`);
            if (draft) {
              const parsedDraft = JSON.parse(draft);
              const dataObj = JSON.parse(parsedDraft.data || '{}');
              if (dataObj && Array.isArray(dataObj.objs)) {
                initialObjs = dataObj.objs;
                showToast('Memulihkan draf lokal yang tersimpan');
              }
            }
          } catch {
            initialObjs = [];
          }
        }

        setLoadedObjs(initialObjs);
      } catch (err: any) {
        if (!isMounted) return;
        setLoadError(
          err.message || 'Papan tulis tidak ditemukan atau Anda tidak memiliki hak akses.'
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadBoardData();

    return () => {
      isMounted = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [boardId, showToast]);

  // 2. Hubungkan Socket.IO untuk kolaborasi real-time
  useEffect(() => {
    if (!boardId) return;

    const socket = getSocket();

    function gabungPapan() {
      socket.emit(
        'papan:gabung',
        { boardId, nama: user?.nama || 'Guru' },
        (res: any) => {
          if (res?.success) {
            setIsReconnecting(false);
            if (res.data?.objs && !loadedObjs) {
              setLoadedObjs(res.data.objs);
            }
            if (res.judul) {
              setTitle(res.judul);
            }
          }
        }
      );
    }

    gabungPapan();

    const handleUbah = (ops: UbahEventPayload) => {
      boardRef.current?.terapkanOps(ops);
    };

    const handlePeserta = (list: PesertaItem[]) => {
      setPesertaList(list);
    };

    const handleDisconnect = () => {
      setIsReconnecting(true);
    };

    const handleConnect = () => {
      gabungPapan();
    };

    socket.on('papan:ubah', handleUbah);
    socket.on('papan:peserta', handlePeserta);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect', handleConnect);

    return () => {
      socket.off('papan:ubah', handleUbah);
      socket.off('papan:peserta', handlePeserta);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect', handleConnect);
    };
  }, [boardId, user]);

  // 3. Inisialisasi engine Board ketika canvas siap dan data terambil
  useEffect(() => {
    if (!loadedObjs || !canvasRef.current) return;

    if (boardRef.current) {
      boardRef.current.destroy();
    }

    const board = new Board(canvasRef.current, loadedObjs, {
      onUbah: (payload: UbahEventPayload) => {
        // Kirim perubahan objek kanvas ke server lewat Socket.IO
        const socket = getSocket();
        socket.emit('papan:ubah', {
          boardId,
          tambah: payload.tambah || [],
          ubah: payload.ubah || [],
          hapus: payload.hapus || [],
        });
        setSaveStatus('saved');
      },
      onStateChange: (nextState) => {
        setBoardState({ ...nextState });
      },
      onSelectionChange: (selId) => {
        setSelectedId(selId);
      },
      onViewChange: (nextView) => {
        setView({ ...nextView });
      },
      onOpenTextEditor: (edState) => {
        setTextEditor(edState);
      },
      onCloseTextEditor: () => {
        setTextEditor(null);
      },
      onToast: (m) => {
        showToast(m);
      },
    });

    boardRef.current = board;
    setBoardState({ ...board.state });
    setView({ ...board.view });

    return () => {
      if (boardRef.current) {
        boardRef.current.destroy();
        boardRef.current = null;
      }
    };
  }, [loadedObjs, boardId, showToast]);

  // Handler Perubahan Judul (Disimpan via PUT ke server)
  const handleTitleChange = async (newTitle: string) => {
    setTitle(newTitle);
    if (!boardId) return;
    setSaveStatus('busy');
    try {
      await apiRequest(`/papan/${boardId}`, {
        method: 'PUT',
        body: JSON.stringify({ judul: newTitle }),
      });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  const handleToolSelect = (tool: ToolType, buttonEl: HTMLElement) => {
    if (tool === 'upload') {
      if (fileImgRef.current) {
        fileImgRef.current.click();
      }
      return;
    }

    const wasFlyout = activeFlyout === tool;
    if (boardRef.current) {
      boardRef.current.setTool(tool);
    } else {
      setBoardState((prev) => ({ ...prev, tool }));
    }

    if (['pen', 'shape', 'text', 'table'].includes(tool)) {
      if (wasFlyout) {
        setActiveFlyout(null);
        setFlyoutAnchor(null);
      } else {
        setActiveFlyout(tool);
        setFlyoutAnchor(buttonEl.getBoundingClientRect());
      }
    } else {
      setActiveFlyout(null);
      setFlyoutAnchor(null);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && boardRef.current) {
      for (let i = 0; i < files.length; i++) {
        boardRef.current.addImageFile(files[i]);
      }
    }
    e.target.value = '';
  };

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !boardRef.current) return;

    file.text().then((text) => {
      try {
        const j = JSON.parse(text);
        if (j && j.versi === 1 && Array.isArray(j.objs)) {
          boardRef.current!.objs = j.objs;
          if (j.judul) {
            setTitle(j.judul);
          }
          boardRef.current!.setSelection(null);
          boardRef.current!.rd();
          triggerAutosave(j.judul);
          showToast('Papan berhasil dimuat dari JSON');
        } else if (j && Array.isArray(j.o)) {
          // Kompatibilitas dengan file json referensi
          boardRef.current!.objs = j.o;
          if (j.t) setTitle(j.t);
          boardRef.current!.setSelection(null);
          boardRef.current!.rd();
          triggerAutosave(j.t);
          showToast('Papan berhasil dimuat dari JSON referensi');
        } else {
          showToast('Format berkas JSON tidak sesuai');
        }
      } catch {
        showToast('Gagal membaca berkas JSON');
      }
    });
    e.target.value = '';
  };

  const board = boardRef.current;

  return (
    <div className="papan">
      {/* Kanvas 2D tak terbatas (selalu dirender di DOM agar canvasRef siap) */}
      <canvas id="cv" ref={canvasRef} className="board-canvas" />

      {/* Overlay status memuat data awal */}
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(17, 24, 39, 0.85)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div style={{ textAlign: 'center', color: '#eef1fa' }}>
            <div
              style={{
                width: 38,
                height: 38,
                border: '3px solid rgba(255,255,255,0.2)',
                borderTopColor: '#9b17f5',
                borderRadius: '50%',
                margin: '0 auto 14px',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Memuat papan tulis…</h2>
          </div>
        </div>
      )}

      {/* Overlay error memuat */}
      {loadError && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'grid',
            placeItems: 'center',
            background: '#0b0f19',
          }}
        >
          <div
            style={{
              maxWidth: 420,
              background: '#1b2238',
              padding: 32,
              borderRadius: 20,
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f87171', marginBottom: 8 }}>
              Gagal Membuka Papan
            </h2>
            <p style={{ color: '#8e98b4', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
              {loadError}
            </p>
            <button
              onClick={() => navigate('/papan')}
              style={{
                background: '#9b17f5',
                color: '#fff',
                fontWeight: 700,
                padding: '10px 20px',
                borderRadius: 12,
                fontSize: 14,
              }}
            >
              Kembali ke Daftar Papan
            </button>
          </div>
        </div>
      )}

      {/* Top Left Panel: Menu, Logo, Judul, Ekspor PNG, Status Simpan */}
      <TopLeftBar
        title={title}
        saveStatus={saveStatus}
        isReconnecting={isReconnecting}
        onTitleChange={handleTitleChange}
        onOpenMenu={() => setIsMenuOpen(true)}
        onExportPng={() => {
          if (board) {
            downloadPng(board.objs, title);
            showToast('PNG diunduh');
          }
        }}
      />

      {/* Left Vertical Tool Rail */}
      <ToolRail
        activeTool={boardState.tool}
        onSelectTool={handleToolSelect}
      />

      {/* Contextual Options Bar */}
      <OptionsBar
        state={boardState}
        hasSelection={!!selectedId}
        onUpdateState={(patch) => {
          if (board) board.updateState(patch);
          else setBoardState((prev) => ({ ...prev, ...patch }));
        }}
        onOpenColorPicker={(btnEl) => {
          setColorPickerAnchor(btnEl.getBoundingClientRect());
          setIsColorPickerOpen(true);
        }}
        onDuplicate={() => board?.duplicateSelected()}
        onDelete={() => board?.deleteSelected()}
      />

      {/* Top Right Panel: Undo, Redo, Game, Avatar, Presentasi, Share */}
      <TopRightBar
        canUndo={board ? board.canUndo() : false}
        canRedo={board ? board.canRedo() : false}
        pesertaList={pesertaList}
        onUndo={() => board?.undo()}
        onRedo={() => board?.redo()}
        onPresentation={() => board?.setPresentation(true)}
        onOpenShare={() => setIsShareOpen(true)}
      />

      {/* Share Modal Dialog */}
      <ShareModal
        isOpen={isShareOpen}
        boardId={boardId || ''}
        pesertaList={pesertaList}
        onClose={() => setIsShareOpen(false)}
        onToast={showToast}
      />

      {/* Zoom Bar: Zoom in/out, 100%, Grid, Center */}
      <ZoomBar
        zoom={view.z}
        gridEnabled={boardState.grid}
        onZoomIn={() => board?.zoomIn()}
        onZoomOut={() => board?.zoomOut()}
        onResetZoom={() => board?.resetZoom()}
        onToggleGrid={() => board?.toggleGrid()}
        onCenterView={() => board?.centerView()}
      />

      {/* Flyout Subpanels (Pena, Bentuk, Teks, Tabel) */}
      <Flyouts
        activeFlyout={activeFlyout}
        anchorRect={flyoutAnchor}
        style={boardState.style}
        shape={boardState.shape}
        tab={boardState.tab}
        onSelectStyle={(newStyle: PenStyle) => {
          if (board) board.updateState({ style: newStyle });
          else setBoardState((prev) => ({ ...prev, style: newStyle }));
          setActiveFlyout(null);
        }}
        onSelectShape={(newShape: string) => {
          if (board) {
            board.updateState({ shape: newShape });
            board.setTool('shape');
          } else {
            setBoardState((prev) => ({ ...prev, shape: newShape, tool: 'shape' }));
          }
          setActiveFlyout(null);
        }}
        onSelectTab={(newTab: string) => {
          if (board) board.updateState({ tab: newTab });
          else setBoardState((prev) => ({ ...prev, tab: newTab }));
        }}
        onSelectText={(kind: 'box' | 'h' | 's' | 'b') => {
          board?.setTool('select');
          board?.addText(kind);
          setActiveFlyout(null);
        }}
        onSelectTable={(r: number, c: number) => {
          board?.setTool('select');
          board?.addTable(r, c);
          setActiveFlyout(null);
        }}
        onClose={() => {
          setActiveFlyout(null);
          setFlyoutAnchor(null);
        }}
      />

      {/* Color Picker HSV */}
      <ColorPicker
        isOpen={isColorPickerOpen}
        color={boardState.color}
        anchorRect={colorPickerAnchor}
        onSelectColor={(hex) => {
          if (board) board.updateState({ color: hex });
          else setBoardState((prev) => ({ ...prev, color: hex }));
        }}
        onClose={() => setIsColorPickerOpen(false)}
        onToast={showToast}
      />

      {/* Text Editor Overlay */}
      <TextEditor
        editor={textEditor}
        view={view}
        onCommit={(ed, val) => {
          board?.commitTextEdit(ed, val);
          setTextEditor(null);
        }}
        onCancel={() => setTextEditor(null)}
      />

      {/* Menu Hamburger Popup */}
      <MenuPopup
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onDashboard={() => navigate('/guru')}
        onNewBoard={async () => {
          try {
            const res = await apiRequest<{ board: { id: string } }>('/papan', {
              method: 'POST',
              body: JSON.stringify({ judul: 'Papan Pembelajaran Baru' }),
            });
            if (res.board?.id) {
              navigate(`/papan/${res.board.id}`);
            }
          } catch {
            showToast('Gagal membuat papan baru');
          }
        }}
        onSaveJson={() => {
          if (board) {
            downloadJson(board.objs, title);
            showToast('JSON diunduh');
          }
        }}
        onOpenJson={() => {
          if (fileJsonRef.current) {
            fileJsonRef.current.click();
          }
        }}
        onExportPng={() => {
          if (board) {
            downloadPng(board.objs, title);
            showToast('PNG diunduh');
          }
        }}
        onClearAll={() => setShowClearModal(true)}
      />

      {/* Modal Konfirmasi Hapus Semua Isi Papan */}
      {showClearModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3 className="modal-title">Hapus Semua Isi Papan?</h3>
            <p className="modal-desc">
              Semua coretan, gambar, bentuk, dan tabel yang ada di papan saat ini akan dihapus. Anda dapat menggunakan tombol Undo (Ctrl+Z) jika tidak sengaja.
            </p>
            <div className="modal-actions">
              <button
                className="modal-btn-cancel"
                onClick={() => setShowClearModal(false)}
              >
                Batal
              </button>
              <button
                className="modal-btn-danger"
                onClick={() => {
                  board?.clearAll();
                  setShowClearModal(false);
                  showToast('Semua isi papan telah dibersihkan');
                }}
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tombol Keluar Mode Presentasi */}
      <button
        id="ex"
        className="btn-exit-pres"
        onClick={() => board?.setPresentation(false)}
      >
        Keluar presentasi (Esc)
      </button>

      {/* Toast Notifikasi */}
      <Toast message={toastMsg} />

      {/* Hidden File Inputs */}
      <input
        ref={fileImgRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleImageFileChange}
      />
      <input
        ref={fileJsonRef}
        type="file"
        accept=".json"
        hidden
        onChange={handleJsonFileChange}
      />
    </div>
  );
}
