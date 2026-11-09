import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { apiRequest } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import {
  Canvas,
  Rect,
  Circle,
  Triangle,
  Line,
  IText,
  FabricImage,
  PencilBrush,
  Point,
  Group,
} from 'fabric';

import { PapanHeader, AutosaveStatus } from './PapanHeader';
import { PapanToolbar, ToolType } from './PapanToolbar';
import { PapanSettingsBar, CanvasSettings } from './PapanSettingsBar';
import { KalkulatorMelayang } from './KalkulatorMelayang';
import { KontrolZoom } from './KontrolZoom';
import { Button, Card } from '../../components';
import {
  Loader2,
  ShieldAlert,
  ArrowRight,
  Eye,
  Edit3,
} from 'lucide-react';

interface ShareInfo {
  id: string;
  token: string;
  peran: 'viewer' | 'editor';
  boardId: string;
  judul: string;
  data: string;
  pemilik: string;
  updatedAt: string;
}

export default function KolaborasiPublik() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // Canvas DOM & Fabric Instance ref
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);

  // Status dasar
  const [loading, setLoading] = useState(true);
  const [errorPesan, setErrorPesan] = useState<string | null>(null);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);

  // Form Nama Panggilan (jika belum masuk)
  const [namaInput, setNamaInput] = useState(
    sessionStorage.getItem('discere_collab_nama') || ''
  );
  const [hasJoined, setHasJoined] = useState(false);

  // Autosave status (hanya untuk Editor)
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('saved');

  // Tool & Settings (untuk Editor)
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const activeToolRef = useRef<ToolType>('pen');
  activeToolRef.current = activeTool;

  const [settings, setSettings] = useState<CanvasSettings>({
    strokeColor: '#1e293b',
    fillColor: 'transparent',
    strokeWidth: 4,
    opacity: 1,
    fontSize: 24,
    isBold: false,
    isItalic: false,
    textAlign: 'left',
  });
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const [hasSelection, setHasSelection] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Kolaborator Counter
  const [collaboratorsCount, setCollaboratorsCount] = useState({
    total: 1,
    editors: 1,
    viewers: 0,
  });

  // Undo / Redo Stacks (untuk Editor)
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isHistoryActionRef = useRef(false);
  const isSilentActionRef = useRef(false);

  // Debounced Autosave ref (untuk Editor)
  const autosaveTimeoutRef = useRef<any>(null);

  // Pan state ref
  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef<{ x: number; y: number } | null>(null);

  // Shape drawing state (untuk Editor)
  const isDrawingShapeRef = useRef(false);
  const shapeOriginRef = useRef<{ x: number; y: number } | null>(null);
  const currentShapeRef = useRef<any>(null);

  // 1. Validasi Token Berbagi dari Server
  useEffect(() => {
    if (!token) return;

    async function validateShare() {
      try {
        const res = await apiRequest<{ share: ShareInfo }>(`/papan/share/${token}`);
        setShareInfo(res.share);

        // Jika nama panggilan sudah tersimpan di session, langsung masuk
        const savedNama = sessionStorage.getItem('discere_collab_nama');
        if (savedNama) {
          setHasJoined(true);
        }
      } catch (err: any) {
        setErrorPesan(err.pesan || 'Tautan berbagi tidak valid atau akses telah dicabut.');
      } finally {
        setLoading(false);
      }
    }

    validateShare();
  }, [token]);

  // 2. Simpan Snapshot ke History Stack
  const pushHistorySnapshot = useCallback(() => {
    if (
      isHistoryActionRef.current ||
      isSilentActionRef.current ||
      !fabricCanvasRef.current ||
      shareInfo?.peran !== 'editor'
    ) {
      return;
    }
    const json = JSON.stringify(fabricCanvasRef.current.toJSON());
    undoStackRef.current.push(json);
    if (undoStackRef.current.length > 40) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setCanUndo(undoStackRef.current.length > 1);
    setCanRedo(false);
  }, [shareInfo?.peran]);

  // 3. Autosave ke Backend untuk Editor via PUT /api/papan/share/:token
  const triggerAutosave = useCallback(() => {
    if (shareInfo?.peran !== 'editor' || !token) return;

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    setAutosaveStatus('saving');

    autosaveTimeoutRef.current = setTimeout(async () => {
      if (!fabricCanvasRef.current) return;
      try {
        const jsonData = JSON.stringify(fabricCanvasRef.current.toJSON());
        await apiRequest(`/papan/share/${token}`, {
          method: 'PUT',
          body: JSON.stringify({ data: jsonData }),
        });
        setAutosaveStatus('saved');
      } catch (err) {
        console.error('Gagal autosave papan kolaborator:', err);
        setAutosaveStatus('error');
      }
    }, 1500);
  }, [shareInfo?.peran, token]);

  // Siarkan perubahan objek ke kolaborator lain via Socket.IO
  const emitBoardChange = useCallback(
    (aksi: 'tambah' | 'ubah' | 'hapus' | 'batch' | 'full', objekData: any) => {
      if (isSilentActionRef.current || !shareInfo || shareInfo.peran !== 'editor') return;
      const socket = getSocket();
      socket.emit('papan:ubah', {
        boardId: shareInfo.boardId,
        aksi,
        objekData,
      });
    },
    [shareInfo]
  );

  // 4. Konfigurasi Tool untuk Editor vs Viewer
  const applyToolConfig = useCallback((tool: ToolType, isViewer: boolean) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = 'default';

    if (isViewer) {
      // Viewer selalu dalam mode pan / view
      canvas.defaultCursor = 'grab';
      return;
    }

    if (tool === 'select') {
      canvas.selection = true;
      canvas.defaultCursor = 'default';
    } else if (tool === 'pan') {
      canvas.defaultCursor = 'grab';
    } else if (tool === 'pen') {
      canvas.isDrawingMode = true;
      const brush = new PencilBrush(canvas);
      brush.color = settingsRef.current.strokeColor;
      brush.width = settingsRef.current.strokeWidth;
      canvas.freeDrawingBrush = brush;
    } else if (tool === 'eraser') {
      canvas.defaultCursor = 'crosshair';
    } else if (['rect', 'circle', 'triangle', 'line', 'arrow', 'text'].includes(tool)) {
      canvas.defaultCursor = 'crosshair';
    }
  }, []);

  // 5. Inisialisasi Canvas setelah Siswa Menekan Tombol Masuk
  useEffect(() => {
    if (!hasJoined || !canvasElRef.current || !shareInfo) return;

    const isViewer = shareInfo.peran === 'viewer';
    const width = window.innerWidth;
    const height = window.innerHeight - 64;

    const canvas = new Canvas(canvasElRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: !isViewer,
    });

    fabricCanvasRef.current = canvas;

    // Muat objek kanvas
    if (shareInfo.data && shareInfo.data !== '{}') {
      isSilentActionRef.current = true;
      try {
        const parsed = JSON.parse(shareInfo.data);
        canvas.loadFromJSON(parsed).then(() => {
          canvas.renderAll();
          isSilentActionRef.current = false;
        });
      } catch (e) {
        console.error('Error loading board data:', e);
        isSilentActionRef.current = false;
      }
    }

    undoStackRef.current = [JSON.stringify(canvas.toJSON())];
    applyToolConfig(activeToolRef.current, isViewer);

    // Seleksi
    canvas.on('selection:created', () => setHasSelection(true));
    canvas.on('selection:updated', () => setHasSelection(true));
    canvas.on('selection:cleared', () => setHasSelection(false));

    // Event perubahan objek (hanya aktif jika Editor)
    if (!isViewer) {
      canvas.on('object:added', (e) => {
        if (isHistoryActionRef.current || isSilentActionRef.current) return;
        pushHistorySnapshot();
        triggerAutosave();
        if (e.target) emitBoardChange('tambah', e.target.toJSON());
      });

      canvas.on('object:modified', (e) => {
        if (isHistoryActionRef.current || isSilentActionRef.current) return;
        pushHistorySnapshot();
        triggerAutosave();
        if (e.target) emitBoardChange('ubah', e.target.toJSON());
      });

      canvas.on('object:removed', (e) => {
        if (isHistoryActionRef.current || isSilentActionRef.current) return;
        pushHistorySnapshot();
        triggerAutosave();
        if (e.target) emitBoardChange('hapus', e.target.toJSON());
      });

      canvas.on('path:created', (e) => {
        if (isHistoryActionRef.current || isSilentActionRef.current) return;
        pushHistorySnapshot();
        triggerAutosave();
        if (e.path) emitBoardChange('tambah', e.path.toJSON());
      });
    }

    // Mouse Down (Pan untuk Viewer & Editor; Shapes/Text/Eraser untuk Editor)
    canvas.on('mouse:down', (opt) => {
      const currentTool = activeToolRef.current;
      const pointer = canvas.getScenePoint(opt.e);

      // Pan Kanvas (Viewer atau Editor dengan tool pan)
      if (isViewer || currentTool === 'pan') {
        isPanningRef.current = true;
        const mouseEvt = opt.e as MouseEvent;
        lastPanPosRef.current = { x: mouseEvt.clientX, y: mouseEvt.clientY };
        canvas.defaultCursor = 'grabbing';
        return;
      }

      // Khusus Editor: Eraser
      if (currentTool === 'eraser' && opt.target) {
        canvas.remove(opt.target);
        canvas.renderAll();
        return;
      }

      // Khusus Editor: Text
      if (currentTool === 'text') {
        const currentSettings = settingsRef.current;
        const text = new IText('Ketik di sini...', {
          left: pointer.x,
          top: pointer.y,
          fill: currentSettings.strokeColor,
          fontSize: currentSettings.fontSize,
          fontWeight: currentSettings.isBold ? 'bold' : 'normal',
          fontStyle: currentSettings.isItalic ? 'italic' : 'normal',
          textAlign: currentSettings.textAlign,
          fontFamily: 'Inter',
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        canvas.renderAll();
        setActiveTool('select');
        return;
      }

      // Khusus Editor: Shapes
      if (['rect', 'circle', 'triangle', 'line', 'arrow'].includes(currentTool)) {
        isDrawingShapeRef.current = true;
        shapeOriginRef.current = { x: pointer.x, y: pointer.y };
        const currentSettings = settingsRef.current;

        if (currentTool === 'rect') {
          const rect = new Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: currentSettings.fillColor,
            stroke: currentSettings.strokeColor,
            strokeWidth: currentSettings.strokeWidth,
            opacity: currentSettings.opacity,
          });
          currentShapeRef.current = rect;
          canvas.add(rect);
        } else if (currentTool === 'circle') {
          const circle = new Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 0,
            fill: currentSettings.fillColor,
            stroke: currentSettings.strokeColor,
            strokeWidth: currentSettings.strokeWidth,
            opacity: currentSettings.opacity,
          });
          currentShapeRef.current = circle;
          canvas.add(circle);
        } else if (currentTool === 'triangle') {
          const triangle = new Triangle({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: currentSettings.fillColor,
            stroke: currentSettings.strokeColor,
            strokeWidth: currentSettings.strokeWidth,
            opacity: currentSettings.opacity,
          });
          currentShapeRef.current = triangle;
          canvas.add(triangle);
        } else if (currentTool === 'line' || currentTool === 'arrow') {
          const line = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: currentSettings.strokeColor,
            strokeWidth: currentSettings.strokeWidth,
            opacity: currentSettings.opacity,
          });
          currentShapeRef.current = line;
          canvas.add(line);
        }
      }
    });

    // Mouse Move (Pan & Shape drag)
    canvas.on('mouse:move', (opt) => {
      if (isPanningRef.current && lastPanPosRef.current) {
        const mouseEvt = opt.e as MouseEvent;
        const deltaX = mouseEvt.clientX - lastPanPosRef.current.x;
        const deltaY = mouseEvt.clientY - lastPanPosRef.current.y;
        canvas.relativePan(new Point(deltaX, deltaY));
        lastPanPosRef.current = { x: mouseEvt.clientX, y: mouseEvt.clientY };
        return;
      }

      if (!isViewer && isDrawingShapeRef.current && currentShapeRef.current && shapeOriginRef.current) {
        const pointer = canvas.getScenePoint(opt.e);
        const origX = shapeOriginRef.current.x;
        const origY = shapeOriginRef.current.y;
        const shape = currentShapeRef.current;

        if (shape instanceof Rect || shape instanceof Triangle) {
          shape.set({
            left: Math.min(origX, pointer.x),
            top: Math.min(origY, pointer.y),
            width: Math.abs(pointer.x - origX),
            height: Math.abs(pointer.y - origY),
          });
        } else if (shape instanceof Circle) {
          const radius = Math.sqrt(Math.pow(pointer.x - origX, 2) + Math.pow(pointer.y - origY, 2)) / 2;
          shape.set({
            left: Math.min(origX, pointer.x),
            top: Math.min(origY, pointer.y),
            radius,
          });
        } else if (shape instanceof Line) {
          shape.set({ x2: pointer.x, y2: pointer.y });
        }
        canvas.renderAll();
      }
    });

    // Mouse Up
    canvas.on('mouse:up', (opt) => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        lastPanPosRef.current = null;
        canvas.defaultCursor = isViewer ? 'grab' : 'default';
      }

      if (!isViewer && isDrawingShapeRef.current) {
        isDrawingShapeRef.current = false;
        const shape = currentShapeRef.current;
        const origin = shapeOriginRef.current;

        if (activeToolRef.current === 'arrow' && origin && shape instanceof Line) {
          const pointer = canvas.getScenePoint(opt.e);
          canvas.remove(shape);

          const currentSettings = settingsRef.current;
          const angle = Math.atan2(pointer.y - origin.y, pointer.x - origin.x);
          const headLength = 14 + currentSettings.strokeWidth * 1.5;

          const linePart = new Line([origin.x, origin.y, pointer.x, pointer.y], {
            stroke: currentSettings.strokeColor,
            strokeWidth: currentSettings.strokeWidth,
            opacity: currentSettings.opacity,
          });

          const headPart = new Triangle({
            left: pointer.x,
            top: pointer.y,
            originX: 'center',
            originY: 'center',
            angle: (angle * 180) / Math.PI + 90,
            width: headLength,
            height: headLength,
            fill: currentSettings.strokeColor,
          });

          const arrowGroup = new Group([linePart, headPart], { selectable: true });
          canvas.add(arrowGroup);
          canvas.setActiveObject(arrowGroup);
        } else if (shape) {
          canvas.setActiveObject(shape);
        }

        currentShapeRef.current = null;
        shapeOriginRef.current = null;
        canvas.renderAll();
        setActiveTool('select');
      }
    });

    // Zoom Mouse Wheel
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 5) zoom = 5;
      if (zoom < 0.2) zoom = 0.2;
      canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), zoom);
      setZoomLevel(zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Resize
    const handleResize = () => {
      if (!fabricCanvasRef.current) return;
      fabricCanvasRef.current.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 64,
      });
    };
    window.addEventListener('resize', handleResize);

    // ==========================================
    // SOCKET.IO REAL-TIME LISTENER
    // ==========================================
    const socket = getSocket();
    socket.emit(
      'papan:gabung',
      {
        boardId: shareInfo.boardId,
        token,
        nama: sessionStorage.getItem('discere_collab_nama') || 'Siswa',
      },
      (res: any) => {
        if (!res?.success) {
          alert(res?.pesan || 'Gagal terhubung ke papan real-time.');
        }
      }
    );

    // Listener Peserta
    const handlePesertaUpdate = (data: any) => {
      setCollaboratorsCount({
        total: data.total,
        editors: data.editors,
        viewers: data.viewers,
      });
    };

    // Listener Perubahan Kanvas dari Orang Lain (Guru / Editor Lain)
    const handlePerubahanPapan = async (data: {
      aksi: string;
      objekData: any;
    }) => {
      if (!fabricCanvasRef.current) return;
      isSilentActionRef.current = true;
      try {
        if (data.aksi === 'tambah' || data.aksi === 'ubah') {
          await fabricCanvasRef.current.loadFromJSON({ objects: [data.objekData] });
          fabricCanvasRef.current.renderAll();
        } else if (data.aksi === 'hapus') {
          const canvasObjects = fabricCanvasRef.current.getObjects();
          const target = canvasObjects.find(
            (o: any) => o.left === data.objekData.left && o.top === data.objekData.top
          );
          if (target) {
            fabricCanvasRef.current.remove(target);
            fabricCanvasRef.current.renderAll();
          }
        } else if (data.aksi === 'full') {
          await fabricCanvasRef.current.loadFromJSON(data.objekData);
          fabricCanvasRef.current.renderAll();
        }
      } catch (err) {
        console.error('Error applying remote board change in client:', err);
      } finally {
        isSilentActionRef.current = false;
      }
    };

    // Listener Pencabutan Akses
    const handleAksesDicabut = (data: { token: string }) => {
      if (data.token === token) {
        alert('Akses ke papan tulis ini telah dicabut oleh pemilik.');
        navigate('/');
      }
    };

    socket.on('papan:peserta', handlePesertaUpdate);
    socket.on('papan:ubah', handlePerubahanPapan);
    socket.on('papan:akses_dicabut', handleAksesDicabut);

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.off('papan:peserta');
      socket.off('papan:ubah');
      socket.off('papan:akses_dicabut');
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [hasJoined, shareInfo, token, applyToolConfig, pushHistorySnapshot, triggerAutosave, emitBoardChange, navigate]);

  // Efek ganti tool
  useEffect(() => {
    if (shareInfo) {
      applyToolConfig(activeTool, shareInfo.peran === 'viewer');
    }
  }, [activeTool, shareInfo, applyToolConfig]);

  // Handler: Update Settings (untuk Editor)
  const handleUpdateSettings = (newSettings: Partial<CanvasSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = updated.strokeColor;
          canvas.freeDrawingBrush.width = updated.strokeWidth;
        }

        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          if (newSettings.strokeColor) {
            if (activeObject instanceof IText) {
              activeObject.set('fill', newSettings.strokeColor);
            } else {
              activeObject.set('stroke', newSettings.strokeColor);
            }
          }
          if (newSettings.fillColor) activeObject.set('fill', newSettings.fillColor);
          if (newSettings.strokeWidth !== undefined) activeObject.set('strokeWidth', newSettings.strokeWidth);
          if (newSettings.opacity !== undefined) activeObject.set('opacity', newSettings.opacity);
          canvas.renderAll();
          pushHistorySnapshot();
          triggerAutosave();
          emitBoardChange('ubah', activeObject.toJSON());
        }
      }
      return updated;
    });
  };

  // Zoom Controls
  const handleZoomIn = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    let nextZoom = canvas.getZoom() * 1.25;
    if (nextZoom > 5) nextZoom = 5;
    const center = new Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
    canvas.zoomToPoint(center, nextZoom);
    setZoomLevel(nextZoom);
  };

  const handleZoomOut = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    let nextZoom = canvas.getZoom() / 1.25;
    if (nextZoom < 0.2) nextZoom = 0.2;
    const center = new Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
    canvas.zoomToPoint(center, nextZoom);
    setZoomLevel(nextZoom);
  };

  const handleResetZoom = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoomLevel(1);
    canvas.renderAll();
  };

  // Ekspor Kanvas ke Gambar PNG
  const handleExportImage = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.renderAll();
    const dataUrl = canvas.toDataURL({
      format: 'png',
      multiplier: 2,
    });
    const link = document.createElement('a');
    link.download = `${(shareInfo?.judul || 'Papan_Bersama').replace(/[^a-zA-Z0-9_-]/g, '_')}_discere.png`;
    link.href = dataUrl;
    link.click();
  };

  // Handler: Hapus Objek Terpilih (untuk Editor)
  const handleDeleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || shareInfo?.peran !== 'editor') return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => {
        canvas.remove(obj);
        emitBoardChange('hapus', obj.toJSON());
      });
      canvas.discardActiveObject();
      canvas.renderAll();
      setHasSelection(false);
      pushHistorySnapshot();
      triggerAutosave();
    }
  };

  // Handler: Upload Gambar (untuk Editor)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvasRef.current || shareInfo?.peran !== 'editor') return;

    const reader = new FileReader();
    reader.onload = async (f) => {
      const dataUrl = f.target?.result as string;
      if (!dataUrl) return;

      const img = await FabricImage.fromURL(dataUrl);
      if (img.width && img.width > 500) {
        img.scaleToWidth(500);
      }
      img.set({ left: 200, top: 150 });

      fabricCanvasRef.current?.add(img);
      fabricCanvasRef.current?.setActiveObject(img);
      fabricCanvasRef.current?.renderAll();
      pushHistorySnapshot();
      triggerAutosave();
      emitBoardChange('tambah', img.toJSON());
      setActiveTool('select');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handler: Masuk Papan dengan Nama Panggilan
  const handleMasukPapan = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = namaInput.trim();
    if (!clean) return;
    sessionStorage.setItem('discere_collab_nama', clean);
    setHasJoined(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (errorPesan || !shareInfo) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md p-6 bg-slate-800 border-slate-700 text-center text-white">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Tautan Tidak Dapat Diakses</h2>
          <p className="text-slate-400 text-sm mb-6">{errorPesan}</p>
          <Button variant="utama" onClick={() => navigate('/')} className="w-full">
            Kembali ke Beranda
          </Button>
        </Card>
      </div>
    );
  }

  // Jika belum memasukkan nama panggilan
  if (!hasJoined) {
    const isEditor = shareInfo.peran === 'editor';

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 sm:p-8 bg-slate-800 border-slate-700 text-white shadow-2xl">
          <div className="text-center mb-6">
            <div
              className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg ${
                isEditor
                  ? 'bg-blue-600 text-white ring-4 ring-blue-500/20'
                  : 'bg-amber-600 text-white ring-4 ring-amber-500/20'
              }`}
            >
              {isEditor ? <Edit3 className="w-7 h-7" /> : <Eye className="w-7 h-7" />}
            </div>

            <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-slate-700 text-slate-300">
              {isEditor ? 'Akses Kolaborator (Editor)' : 'Akses Menyimak (Viewer)'}
            </div>

            <h2 className="text-2xl font-black">{shareInfo.judul}</h2>
            <p className="text-slate-400 text-xs mt-1">
              Papan Pembelajaran oleh <strong>{shareInfo.pemilik}</strong>
            </p>
          </div>

          <form onSubmit={handleMasukPapan} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Nama Panggilan Kamu
              </label>
              <input
                type="text"
                maxLength={25}
                placeholder="Contoh: Budi, Reza, Siti"
                value={namaInput}
                onChange={(e) => setNamaInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base font-semibold"
                required
              />
            </div>

            <Button
              type="submit"
              variant="utama"
              className="w-full py-3.5 text-base font-bold bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center justify-center gap-2"
            >
              Masuk ke Papan Tulis
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const isEditor = shareInfo.peran === 'editor';

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-950 relative select-none">
      {/* 1. Header */}
      <PapanHeader
        judul={shareInfo.judul}
        onJudulChange={() => {}}
        autosaveStatus={autosaveStatus}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => {}}
        onRedo={() => {}}
        onOpenShareModal={() => {}}
        onToggleSidebarGame={() => {}}
        isSidebarGameOpen={false}
        isOwner={false}
        peran={shareInfo.peran}
        collaboratorsCount={collaboratorsCount}
        onRetrySave={triggerAutosave}
        onExportImage={handleExportImage}
      />

      {/* 2. Toolbar & Settings (Hanya untuk Editor) */}
      {isEditor && (
        <>
          <PapanToolbar
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            onImageUpload={handleImageUpload}
            onDeleteSelected={handleDeleteSelected}
            hasSelection={hasSelection}
            onToggleCalculator={() => setIsCalculatorOpen(!isCalculatorOpen)}
            isCalculatorOpen={isCalculatorOpen}
          />
          <PapanSettingsBar
            activeTool={activeTool}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
          <KalkulatorMelayang
            isOpen={isCalculatorOpen}
            onClose={() => setIsCalculatorOpen(false)}
          />
        </>
      )}

      {/* Banner Khusus Viewer */}
      {!isEditor && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-slate-900/90 backdrop-blur-md text-slate-200 border border-slate-700 text-xs font-semibold shadow-xl flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-400" />
          <span>Anda dalam mode menyimak langsung dari Guru. Anda dapat menggeser & memperbesar layar.</span>
        </div>
      )}

      {/* 3. Area Kanvas Utama */}
      <main className="flex-1 relative overflow-hidden bg-white dark:bg-slate-950">
        <canvas ref={canvasElRef} className="block w-full h-full" />
      </main>

      {/* Kontrol Zoom dan Persentase Pojok Kanan Bawah */}
      <KontrolZoom
        zoomPercent={zoomLevel * 100}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
      />
    </div>
  );
}
