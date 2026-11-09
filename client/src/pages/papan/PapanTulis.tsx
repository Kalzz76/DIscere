import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { apiRequest } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { useAuth } from '../../lib/auth';
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
import { PapanSidebarGame } from './PapanSidebarGame';
import { PapanShareModal } from './PapanShareModal';
import { KalkulatorMelayang } from './KalkulatorMelayang';
import { KontrolZoom } from './KontrolZoom';
import { Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import { Button, Card } from '../../components';

export default function PapanTulis() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Canvas DOM & Fabric Instance ref
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);

  // States dasar papan
  const [loading, setLoading] = useState(true);
  const [errorPesan, setErrorPesan] = useState<string | null>(null);
  const [judul, setJudul] = useState('Papan Pembelajaran Baru');
  const [shares, setShares] = useState<any[]>([]);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('saved');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Tool & Settings
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

  // Modals & Sidebars
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSidebarGameOpen, setIsSidebarGameOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Kolaborator state
  const [collaboratorsCount, setCollaboratorsCount] = useState({
    total: 1,
    editors: 1,
    viewers: 0,
  });

  // Undo / Redo History Stacks
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isHistoryActionRef = useRef(false);
  const isSilentActionRef = useRef(false);

  // Autosave Debounce Ref
  const autosaveTimeoutRef = useRef<any>(null);

  // Pan / Drag State Ref
  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef<{ x: number; y: number } | null>(null);

  // Shape drawing state
  const isDrawingShapeRef = useRef(false);
  const shapeOriginRef = useRef<{ x: number; y: number } | null>(null);
  const currentShapeRef = useRef<any>(null);

  // Tanya AI State & Ref
  const isDrawingAiBoxRef = useRef(false);
  const aiOriginRef = useRef<{ x: number; y: number } | null>(null);
  const currentAiSelectionRef = useRef<Rect | null>(null);
  const [aiPopoverOpen, setAiPopoverOpen] = useState(false);
  const [aiPopoverPos, setAiPopoverPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [aiCropBounds, setAiCropBounds] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [aiPertanyaan, setAiPertanyaan] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // 1. Simpan Snapshot ke History Stack
  const pushHistorySnapshot = useCallback(() => {
    if (isHistoryActionRef.current || isSilentActionRef.current || !fabricCanvasRef.current) {
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
  }, []);

  // 2. Autosave ke Backend via Debounce 1.5 Detik
  const triggerAutosave = useCallback(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    setAutosaveStatus('saving');

    autosaveTimeoutRef.current = setTimeout(async () => {
      if (!id || !fabricCanvasRef.current) return;
      try {
        const jsonData = JSON.stringify(fabricCanvasRef.current.toJSON());
        await apiRequest(`/papan/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ data: jsonData }),
        });
        setAutosaveStatus('saved');
      } catch (err) {
        console.error('Gagal autosave papan:', err);
        setAutosaveStatus('error');
      }
    }, 1500);
  }, [id]);

  // Siarkan perubahan objek ke kolaborator lain via Socket.IO
  const emitBoardChange = useCallback(
    (aksi: 'tambah' | 'ubah' | 'hapus' | 'batch' | 'full', objekData: any) => {
      if (isSilentActionRef.current || !id) return;
      const socket = getSocket();
      socket.emit('papan:ubah', {
        boardId: id,
        aksi,
        objekData,
      });
    },
    [id]
  );

  // 3. Konfigurasi Mode Gambar & Interaksi Fabric Sesuai Tool Aktif
  const applyToolConfig = useCallback((tool: ToolType) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Reset mode
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = 'default';

    if (tool === 'select') {
      canvas.selection = true;
      canvas.defaultCursor = 'default';
    } else if (tool === 'ai') {
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
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

  // 4. Inisialisasi Canvas Fabric.js & Muat Data Awal
  useEffect(() => {
    if (!canvasElRef.current || !id) return;

    let isSubscribed = true;

    async function initBoard() {
      try {
        const res = await apiRequest<{ board: any }>(`/papan/${id}`);
        if (!isSubscribed) return;

        const b = res.board;
        setJudul(b.judul);
        setShares(b.shares || []);

        // Dimensi Kanvas
        const width = window.innerWidth;
        const height = window.innerHeight - 64; // Kurangi tinggi header

        const canvas = new Canvas(canvasElRef.current!, {
          width,
          height,
          backgroundColor: '#ffffff',
          preserveObjectStacking: true,
          selection: false,
        });

        fabricCanvasRef.current = canvas;

        // Muat objek kanvas yang tersimpan
        if (b.data && b.data !== '{}') {
          isSilentActionRef.current = true;
          try {
            const parsed = JSON.parse(b.data);
            await canvas.loadFromJSON(parsed);
            canvas.renderAll();
          } catch (e) {
            console.error('Error parsing board data JSON:', e);
          } finally {
            isSilentActionRef.current = false;
          }
        }

        // Snapshot awal untuk undo
        undoStackRef.current = [JSON.stringify(canvas.toJSON())];
        setCanUndo(false);
        setCanRedo(false);

        // Terapkan tool awal
        applyToolConfig(activeToolRef.current);

        // ==========================================
        // EVENT LISTENER CANVAS
        // ==========================================

        // Seleksi objek aktif
        canvas.on('selection:created', () => setHasSelection(true));
        canvas.on('selection:updated', () => setHasSelection(true));
        canvas.on('selection:cleared', () => setHasSelection(false));

        // Object Added
        canvas.on('object:added', (e) => {
          if (isHistoryActionRef.current || isSilentActionRef.current) return;
          pushHistorySnapshot();
          triggerAutosave();
          if (e.target) {
            emitBoardChange('tambah', e.target.toJSON());
          }
        });

        // Object Modified (Pindah, Ubah Ukuran, Putar)
        canvas.on('object:modified', (e) => {
          if (isHistoryActionRef.current || isSilentActionRef.current) return;
          pushHistorySnapshot();
          triggerAutosave();
          if (e.target) {
            emitBoardChange('ubah', e.target.toJSON());
          }
        });

        // Object Removed
        canvas.on('object:removed', (e) => {
          if (isHistoryActionRef.current || isSilentActionRef.current) return;
          pushHistorySnapshot();
          triggerAutosave();
          if (e.target) {
            emitBoardChange('hapus', e.target.toJSON());
          }
        });

        // Free Drawing Path Created
        canvas.on('path:created', (e) => {
          if (isHistoryActionRef.current || isSilentActionRef.current) return;
          pushHistorySnapshot();
          triggerAutosave();
          if (e.path) {
            emitBoardChange('tambah', e.path.toJSON());
          }
        });

        // Mouse Down (Untuk Hand Pan, Eraser Click, Text, & Shape creation)
        canvas.on('mouse:down', (opt) => {
          const currentTool = activeToolRef.current;
          const pointer = canvas.getScenePoint(opt.e);

          // Tanya AI: Mulai buat seleksi area kotak kuning
          if (currentTool === 'ai') {
            isDrawingAiBoxRef.current = true;
            aiOriginRef.current = { x: pointer.x, y: pointer.y };
            if (currentAiSelectionRef.current) {
              canvas.remove(currentAiSelectionRef.current);
            }
            const selectionBox = new Rect({
              left: pointer.x,
              top: pointer.y,
              width: 0,
              height: 0,
              fill: 'rgba(245, 183, 0, 0.15)',
              stroke: '#F5B700',
              strokeWidth: 2,
              strokeDashArray: [6, 4],
              selectable: false,
              evented: false,
            });
            currentAiSelectionRef.current = selectionBox;
            canvas.add(selectionBox);
            canvas.renderAll();
            return;
          }

          // A. Hand Tool (Pan Kanvas)
          if (currentTool === 'pan') {
            isPanningRef.current = true;
            const mouseEvt = opt.e as MouseEvent;
            lastPanPosRef.current = { x: mouseEvt.clientX, y: mouseEvt.clientY };
            canvas.defaultCursor = 'grabbing';
            return;
          }

          // B. Eraser (Hapus objek yang diklik)
          if (currentTool === 'eraser' && opt.target) {
            canvas.remove(opt.target);
            canvas.renderAll();
            return;
          }

          // C. Text Tool
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

          // D. Shape Creation (Mulai drag shape)
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

        // Mouse Move (Untuk Drag Pan & Drag Shape Size)
        canvas.on('mouse:move', (opt) => {
          // Ubah ukuran seleksi Tanya AI
          if (isDrawingAiBoxRef.current && currentAiSelectionRef.current && aiOriginRef.current) {
            const pointer = canvas.getScenePoint(opt.e);
            const origX = aiOriginRef.current.x;
            const origY = aiOriginRef.current.y;
            currentAiSelectionRef.current.set({
              left: Math.min(origX, pointer.x),
              top: Math.min(origY, pointer.y),
              width: Math.abs(pointer.x - origX),
              height: Math.abs(pointer.y - origY),
            });
            canvas.renderAll();
            return;
          }

          // Pan kanvas
          if (isPanningRef.current && lastPanPosRef.current) {
            const mouseEvt = opt.e as MouseEvent;
            const deltaX = mouseEvt.clientX - lastPanPosRef.current.x;
            const deltaY = mouseEvt.clientY - lastPanPosRef.current.y;
            canvas.relativePan(new Point(deltaX, deltaY));
            lastPanPosRef.current = { x: mouseEvt.clientX, y: mouseEvt.clientY };
            return;
          }

          // Ubah ukuran shape saat drag
          if (isDrawingShapeRef.current && currentShapeRef.current && shapeOriginRef.current) {
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
              shape.set({
                x2: pointer.x,
                y2: pointer.y,
              });
            }
            canvas.renderAll();
          }
        });

        // Mouse Up (Selesai Drag Shape atau Pan)
        canvas.on('mouse:up', (opt) => {
          if (isDrawingAiBoxRef.current) {
            isDrawingAiBoxRef.current = false;
            aiOriginRef.current = null;
            const box = currentAiSelectionRef.current;
            if (box && box.width && box.height && box.width > 20 && box.height > 20) {
              const mouseEvt = opt.e as MouseEvent;
              setAiPopoverPos({
                x: Math.min(window.innerWidth - 340, Math.max(20, (mouseEvt?.clientX || 100) + 10)),
                y: Math.min(window.innerHeight - 280, Math.max(80, (mouseEvt?.clientY || 100) + 10)),
              });
              setAiCropBounds({
                left: box.left || 0,
                top: box.top || 0,
                width: box.width || 0,
                height: box.height || 0,
              });
              setAiPertanyaan('');
              setAiError(null);
              setAiPopoverOpen(true);
            } else if (box) {
              canvas.remove(box);
              currentAiSelectionRef.current = null;
              canvas.renderAll();
              setActiveTool('select');
            }
          }

          if (isPanningRef.current) {
            isPanningRef.current = false;
            lastPanPosRef.current = null;
            canvas.defaultCursor = 'grab';
          }

          if (isDrawingShapeRef.current) {
            isDrawingShapeRef.current = false;
            const shape = currentShapeRef.current;
            const origin = shapeOriginRef.current;

            // Jika arrow, gantikan line sederhana dengan panah lengkap
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

              const arrowGroup = new Group([linePart, headPart], {
                selectable: true,
              });

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

        // Mouse Wheel Zoom
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

        // Resize Listener
        const handleResize = () => {
          if (!fabricCanvasRef.current) return;
          fabricCanvasRef.current.setDimensions({
            width: window.innerWidth,
            height: window.innerHeight - 64,
          });
        };
        window.addEventListener('resize', handleResize);

        // ==========================================
        // REAL-TIME COLLABORATION VIA SOCKET.IO
        // ==========================================
        const socket = getSocket();
        socket.emit(
          'papan:gabung',
          { boardId: id, userId: user?.id, nama: user?.nama || 'Guru' },
          (res: any) => {
            if (!res?.success) {
              console.warn('Gagal mendaftar ke realtime board:', res?.pesan);
            }
          }
        );

        // Listener Kolaborator Peserta
        const handlePesertaUpdate = (data: any) => {
          setCollaboratorsCount({
            total: data.total,
            editors: data.editors,
            viewers: data.viewers,
          });
        };

        // Listener Perubahan Kanvas dari Orang Lain
        const handlePerubahanPapan = async (data: {
          aksi: string;
          objekData: any;
          pengirim: any;
        }) => {
          if (!fabricCanvasRef.current) return;
          isSilentActionRef.current = true;
          try {
            if (data.aksi === 'tambah' || data.aksi === 'ubah') {
              // Jika objek tunggal
              const objects = await fabricCanvasRef.current.loadFromJSON({
                objects: [data.objekData],
              });
              if (objects) {
                fabricCanvasRef.current.renderAll();
              }
            } else if (data.aksi === 'hapus') {
              // Hapus objek yang cocok
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
            console.error('Error applying remote board change:', err);
          } finally {
            isSilentActionRef.current = false;
          }
        };

        socket.on('papan:peserta', handlePesertaUpdate);
        socket.on('papan:ubah', handlePerubahanPapan);

        setLoading(false);
      } catch (err: any) {
        if (!isSubscribed) return;
        setErrorPesan(err.pesan || 'Gagal memuat papan tulis.');
        setLoading(false);
      }
    }

    initBoard();

    return () => {
      isSubscribed = false;
      const socket = getSocket();
      socket.off('papan:peserta');
      socket.off('papan:ubah');
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [id, user, applyToolConfig, pushHistorySnapshot, triggerAutosave, emitBoardChange]);

  // Efek ganti tool
  useEffect(() => {
    applyToolConfig(activeTool);
  }, [activeTool, applyToolConfig]);

  // Efek ganti settings (warna, stroke width, opacity)
  const handleUpdateSettings = (newSettings: Partial<CanvasSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        // Terapkan ke brush pena
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = updated.strokeColor;
          canvas.freeDrawingBrush.width = updated.strokeWidth;
        }

        // Terapkan ke objek aktif yang sedang dipilih (jika ada)
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
          if (newSettings.strokeColor) {
            if (activeObject instanceof IText) {
              activeObject.set('fill', newSettings.strokeColor);
            } else {
              activeObject.set('stroke', newSettings.strokeColor);
            }
          }
          if (newSettings.fillColor) {
            activeObject.set('fill', newSettings.fillColor);
          }
          if (newSettings.strokeWidth !== undefined) {
            activeObject.set('strokeWidth', newSettings.strokeWidth);
          }
          if (newSettings.opacity !== undefined) {
            activeObject.set('opacity', newSettings.opacity);
          }
          if (newSettings.fontSize !== undefined && activeObject instanceof IText) {
            activeObject.set('fontSize', newSettings.fontSize);
          }
          if (newSettings.isBold !== undefined && activeObject instanceof IText) {
            activeObject.set('fontWeight', newSettings.isBold ? 'bold' : 'normal');
          }
          if (newSettings.isItalic !== undefined && activeObject instanceof IText) {
            activeObject.set('fontStyle', newSettings.isItalic ? 'italic' : 'normal');
          }
          if (newSettings.textAlign && activeObject instanceof IText) {
            activeObject.set('textAlign', newSettings.textAlign);
          }
          canvas.renderAll();
          pushHistorySnapshot();
          triggerAutosave();
          emitBoardChange('ubah', activeObject.toJSON());
        }
      }
      return updated;
    });
  };

  // Handler: Hapus Objek Terpilih
  const handleDeleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
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

  // Handler: Upload Gambar
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fabricCanvasRef.current) return;

    const reader = new FileReader();
    reader.onload = async (f) => {
      const dataUrl = f.target?.result as string;
      if (!dataUrl) return;

      const img = await FabricImage.fromURL(dataUrl);
      // Skalakan gambar jika terlalu besar
      const maxWidth = 500;
      if (img.width && img.width > maxWidth) {
        img.scaleToWidth(maxWidth);
      }
      img.set({
        left: 200,
        top: 150,
      });

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

  // Handler: Batal Tanya AI
  const handleBatalTanyaAi = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas && currentAiSelectionRef.current) {
      canvas.remove(currentAiSelectionRef.current);
      currentAiSelectionRef.current = null;
      canvas.renderAll();
    }
    setAiPopoverOpen(false);
    setAiCropBounds(null);
    setAiPertanyaan('');
    setAiError(null);
    setActiveTool('select');
  };

  // Handler: Kirim Tanya AI ke Server
  const handleKirimTanyaAi = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !aiCropBounds) return;

    try {
      setAiLoading(true);
      setAiError(null);

      // Sembunyikan seleksi box sementara saat crop agar gambar bersih
      if (currentAiSelectionRef.current) {
        currentAiSelectionRef.current.set('visible', false);
        canvas.renderAll();
      }

      // Potong kanvas sesuai koordinat area soal
      const dataUrl = canvas.toDataURL({
        format: 'png',
        left: aiCropBounds.left,
        top: aiCropBounds.top,
        width: aiCropBounds.width,
        height: aiCropBounds.height,
        multiplier: 1,
      });

      // Bersihkan selection box dari kanvas
      if (currentAiSelectionRef.current) {
        canvas.remove(currentAiSelectionRef.current);
        currentAiSelectionRef.current = null;
      }

      const res = await apiRequest<{
        hasil: { jawaban: string; rumus: string; langkah: string; dibuatAi: boolean };
      }>('/ai/jawab', {
        method: 'POST',
        body: JSON.stringify({
          imageBase64: dataUrl,
          pertanyaan: aiPertanyaan.trim() || undefined,
        }),
      });

      // Render Solusi AI sebagai Kartu Elegan di Samping Soal pada Kanvas
      const cardLeft = aiCropBounds.left + aiCropBounds.width + 24;
      const cardTop = aiCropBounds.top;

      // Card Background
      const bg = new Rect({
        width: 380,
        height: 280,
        fill: '#FFFFFF',
        stroke: '#F5B700',
        strokeWidth: 2,
        rx: 16,
        ry: 16,
      });

      // Header Tag
      const headerText = new IText('✨ Solusi Tanya AI (Dibuat AI)', {
        left: 18,
        top: 16,
        fontSize: 14,
        fontWeight: 'bold',
        fill: '#B45309',
        fontFamily: 'Inter',
      });

      // Jawaban Text
      const jawabanText = new IText(`Jawaban:\n${res.hasil.jawaban}`, {
        left: 18,
        top: 46,
        width: 344,
        fontSize: 14,
        fontWeight: 'bold',
        fill: '#1E2A5A',
        fontFamily: 'Inter',
      });

      // Rumus Text
      const rumusText = new IText(`Rumus: ${res.hasil.rumus}`, {
        left: 18,
        top: 106,
        width: 344,
        fontSize: 12,
        fill: '#475569',
        fontFamily: 'Inter',
      });

      // Langkah Text
      const langkahText = new IText(`Langkah:\n${res.hasil.langkah}`, {
        left: 18,
        top: 140,
        width: 344,
        fontSize: 12,
        fill: '#334155',
        fontFamily: 'Inter',
      });

      // Sesuaikan tinggi kartu secara proporsional
      const contentHeight = 160 + (langkahText.height || 80);
      bg.set('height', Math.max(240, contentHeight));

      const cardGroup = new Group([bg, headerText, jawabanText, rumusText, langkahText], {
        left: cardLeft,
        top: cardTop,
        selectable: true,
      });

      canvas.add(cardGroup);
      canvas.setActiveObject(cardGroup);
      canvas.renderAll();
      pushHistorySnapshot();
      triggerAutosave();
      emitBoardChange('tambah', cardGroup.toJSON());

      setAiPopoverOpen(false);
      setAiCropBounds(null);
      setAiPertanyaan('');
      setActiveTool('select');
    } catch (err: any) {
      setAiError(err.pesan || 'Gagal memproses Tanya AI dari kanvas.');
      if (currentAiSelectionRef.current) {
        currentAiSelectionRef.current.set('visible', true);
        canvas.renderAll();
      }
    } finally {
      setAiLoading(false);
    }
  };

  // Handler: Undo
  const handleUndo = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || undoStackRef.current.length <= 1) return;

    const currentState = undoStackRef.current.pop()!;
    redoStackRef.current.push(currentState);

    const previousState = undoStackRef.current[undoStackRef.current.length - 1];

    isHistoryActionRef.current = true;
    try {
      await canvas.loadFromJSON(JSON.parse(previousState));
      canvas.renderAll();
      setCanUndo(undoStackRef.current.length > 1);
      setCanRedo(true);
      triggerAutosave();
      emitBoardChange('full', canvas.toJSON());
    } finally {
      isHistoryActionRef.current = false;
    }
  };

  // Handler: Redo
  const handleRedo = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || redoStackRef.current.length === 0) return;

    const nextState = redoStackRef.current.pop()!;
    undoStackRef.current.push(nextState);

    isHistoryActionRef.current = true;
    try {
      await canvas.loadFromJSON(JSON.parse(nextState));
      canvas.renderAll();
      setCanUndo(true);
      setCanRedo(redoStackRef.current.length > 0);
      triggerAutosave();
      emitBoardChange('full', canvas.toJSON());
    } finally {
      isHistoryActionRef.current = false;
    }
  };

  // Handler: Ganti Judul Papan
  const handleJudulChange = async (newJudul: string) => {
    setJudul(newJudul);
    if (!id) return;
    try {
      await apiRequest(`/papan/${id}/judul`, {
        method: 'PATCH',
        body: JSON.stringify({ judul: newJudul }),
      });
    } catch (err) {
      console.error('Gagal memperbarui judul papan:', err);
    }
  };

  // Handler: Jalankan Game dari Sidebar tanpa Merusak Papan
  const handleLaunchGame = async (templateId: string, mode: string) => {
    try {
      const res = await apiRequest<{ session: { id: string } }>('/sesi', {
        method: 'POST',
        body: JSON.stringify({ templateId, mode }),
      });
      // Buka host game di tab baru atau window baru agar papan tulis tetap aktif
      window.open(`/guru/sesi/${res.session.id}`, '_blank');
    } catch (err: any) {
      alert(err.pesan || 'Gagal memulai sesi permainan.');
    }
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
    link.download = `${judul.replace(/[^a-zA-Z0-9_-]/g, '_')}_discere.png`;
    link.href = dataUrl;
    link.click();
  };

  // Handler: Refresh Share Links
  const fetchShares = async () => {
    if (!id) return;
    try {
      const res = await apiRequest<{ board: any }>(`/papan/${id}`);
      setShares(res.board.shares || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Pencabutan Share Token
  const handleRevokeShareToken = (token: string) => {
    const socket = getSocket();
    socket.emit('papan:cabut_akses', { boardId: id, token });
  };

  // Shortcuts Keyboard (Undo, Redo, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika sedang mengetik teks di input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObject = fabricCanvasRef.current?.getActiveObject();
        if (activeObject && !(activeObject instanceof IText && activeObject.isEditing)) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (errorPesan) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-md p-6 bg-slate-800 border-slate-700 text-center text-white">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Papan Tulis Tidak Ditemukan</h2>
          <p className="text-slate-400 text-sm mb-6">{errorPesan}</p>
          <Button variant="utama" onClick={() => navigate('/guru?tab=papan')} className="w-full">
            Kembali ke Dashboard Guru
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-100 dark:bg-slate-950 relative select-none">
      {/* 1. Top Header */}
      <PapanHeader
        judul={judul}
        onJudulChange={handleJudulChange}
        autosaveStatus={autosaveStatus}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onToggleSidebarGame={() => setIsSidebarGameOpen(!isSidebarGameOpen)}
        isSidebarGameOpen={isSidebarGameOpen}
        isOwner={true}
        peran="owner"
        collaboratorsCount={collaboratorsCount}
        onRetrySave={triggerAutosave}
        onExportImage={handleExportImage}
      />

      {/* 2. Floating Toolbar di Kiri */}
      <PapanToolbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        onImageUpload={handleImageUpload}
        onDeleteSelected={handleDeleteSelected}
        hasSelection={hasSelection}
        onToggleCalculator={() => setIsCalculatorOpen(!isCalculatorOpen)}
        isCalculatorOpen={isCalculatorOpen}
      />

      {/* 3. Floating Contextual Settings Bar di Atas */}
      <PapanSettingsBar
        activeTool={activeTool}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* 4. Area Kanvas Utama */}
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

      {/* 5. Collapsible Right Sidebar Game */}
      <PapanSidebarGame
        isOpen={isSidebarGameOpen}
        onClose={() => setIsSidebarGameOpen(false)}
        onLaunchGame={handleLaunchGame}
      />

      {/* 6. Modal Bagikan Tautan Kolaborasi */}
      <PapanShareModal
        boardId={id!}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shares={shares}
        onRefreshShares={fetchShares}
        onRevokeShareToken={handleRevokeShareToken}
      />

      {/* 7. Floating Popover Dialog Tanya AI di dekat Area Seleksi */}
      {aiPopoverOpen && (
        <div
          style={{ left: aiPopoverPos.x, top: aiPopoverPos.y }}
          className="fixed z-50 w-80 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-amber-400 dark:border-amber-600 shadow-2xl space-y-3"
        >
          <div className="flex items-center justify-between pb-2 border-b border-amber-100 dark:border-amber-950">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Tanya AI Soal Ini</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
              Dibuat AI
            </span>
          </div>

          {aiError && (
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
              {aiError}
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Butuh apa? (Opsional)
            </label>
            <input
              type="text"
              disabled={aiLoading}
              value={aiPertanyaan}
              onChange={(e) => setAiPertanyaan(e.target.value)}
              placeholder="Misal: Jelaskan rumus dan langkah..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleKirimTanyaAi();
                }
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={aiLoading}
              onClick={handleBatalTanyaAi}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={aiLoading}
              onClick={handleKirimTanyaAi}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menganalisis...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Dapatkan Jawaban
                </>
              )}
            </button>
          </div>
        </div>
      )}
      {/* 8. Kalkulator Melayang Interaktif (P1) */}
      <KalkulatorMelayang
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </div>
  );
}
