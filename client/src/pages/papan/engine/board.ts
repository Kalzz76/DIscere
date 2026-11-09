import {
  CanvasObj,
  BoardView,
  BoardState,
  Pt,
  LaserPoint,
  TextEditorState,
  ToolType,
  UbahEventPayload,
  TextObj,
  TableObj,
} from './types';
import { COL, LCOL } from './color';
import { move, topAt, bounds, ResizeCorner, hitResizeCorner, applyResize } from './geometry';
import { eraseSeg } from './eraser';
import { HistoryManager, cloneObj } from './history';
import { drawScene, ensureFontLoaded } from './render';
import { resizeImageToDataUrl } from './export';

export interface BoardOptions {
  hanyaLihat?: boolean;
  onUbah?: (payload: UbahEventPayload) => void;
  onStateChange?: (state: BoardState) => void;
  onSelectionChange?: (selId: string | null) => void;
  onViewChange?: (view: BoardView) => void;
  onOpenTextEditor?: (editor: TextEditorState) => void;
  onCloseTextEditor?: () => void;
  onToast?: (msg: string) => void;
  onLassoChange?: (lasso: Pt[] | null) => void;
}

export class Board {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public objs: CanvasObj[] = [];
  public view: BoardView = { x: 0, y: 0, z: 1 };
  public state: BoardState = {
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
  };

  public sel: string | null = null;
  public lasso: Pt[] | null = null;
  public laser: LaserPoint[] = [];
  public cur: CanvasObj | null = null;
  public hanyaLihat = false;

  private mouse: Pt | null = null;
  private activePointers: Map<number, Pt> = new Map();
  private drag: {
    k: 'pan' | 'er' | 'ai' | 'mv' | 'ls' | 'resize' | 'pinch';
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    p?: Pt;
    last?: Pt;
    ch?: boolean;
    initialObjBeforeMove?: CanvasObj;
    erasedRemoved?: CanvasObj[];
    erasedAdded?: CanvasObj[];
    corner?: ResizeCorner;
    initialObjBeforeResize?: CanvasObj;
    resizeStartPt?: Pt;
    pinchDist?: number;
    pinchCenter?: Pt;
  } | null = null;

  private spacePressed = false;
  private prevTool: ToolType | null = null;
  private rafId = 0;
  private history: HistoryManager;
  private options: BoardOptions;
  private resizeObserver: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement, initialObjs: CanvasObj[] = [], options: BoardOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context tidak didukung');
    this.ctx = ctx;
    this.objs = initialObjs.map(cloneObj);
    this.options = options;
    this.hanyaLihat = !!options.hanyaLihat;

    this.history = new HistoryManager((payload) => {
      if (this.options.onUbah) {
        this.options.onUbah(payload);
      }
    });

    ensureFontLoaded(() => this.rd());
    this.initCanvasSize();
    this.bindEvents();
    this.rd();
  }

  // --- Utility & Render loop ---
  public rd(): void {
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = 0;
        this.draw();
      });
    }
  }

  private draw(): void {
    drawScene({
      ctx: this.ctx,
      canvas: this.canvas,
      view: this.view,
      state: this.state,
      objs: this.objs,
      cur: this.cur,
      lasso: this.lasso,
      sel: this.sel,
      laser: this.laser,
      mouse: this.mouse,
      onImageLoad: () => this.rd(),
    });

    // Jika jejak laser masih ada, jadwalkan render frame berikutnya
    if (this.laser.length > 0) {
      const now = performance.now();
      this.laser = this.laser.filter((p) => now - p.t < 900);
      if (this.laser.length > 0) {
        this.rd();
      }
    }
  }

  public toWorld(clientX: number, clientY: number): Pt {
    const r = this.canvas.getBoundingClientRect();
    const cx = clientX - r.left;
    const cy = clientY - r.top;
    return {
      x: (cx - this.view.x) / this.view.z,
      y: (cy - this.view.y) / this.view.z,
    };
  }

  public getCenter(): Pt {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    return {
      x: (w / 2 - this.view.x) / this.view.z,
      y: (h / 2 - this.view.y) / this.view.z,
    };
  }

  public toast(msg: string): void {
    if (this.options.onToast) {
      this.options.onToast(msg);
    }
  }

  // --- Setting State & Tool ---
  public setTool(tool: ToolType): void {
    if (this.hanyaLihat && tool !== 'hand' && tool !== 'laser') {
      this.toast('Mode Viewer: Hanya melihat kanvas');
      return;
    }
    this.closeLasso();
    this.state.tool = tool;
    if (tool !== 'select') {
      this.setSelection(null);
    }

    const cursorMap: Record<string, string> = {
      hand: 'grab',
      eraser: 'none',
      select: 'default',
      text: 'text',
      pick: 'copy',
      laser: 'crosshair',
    };
    this.canvas.style.cursor = cursorMap[tool] || 'crosshair';

    this.notifyState();
    this.rd();
  }

  public updateState(patch: Partial<BoardState>): void {
    Object.assign(this.state, patch);
    this.notifyState();
    this.rd();
  }

  private notifyState(): void {
    if (this.options.onStateChange) {
      this.options.onStateChange({ ...this.state });
    }
  }

  public setSelection(id: string | null): void {
    this.sel = id;
    if (this.options.onSelectionChange) {
      this.options.onSelectionChange(id);
    }
    this.rd();
  }

  // --- Zoom & View ---
  public zoomAt(sx: number, sy: number, f: number): void {
    const z = Math.max(0.1, Math.min(4, this.view.z * f));
    const k = z / this.view.z;
    this.view.x = sx - (sx - this.view.x) * k;
    this.view.y = sy - (sy - this.view.y) * k;
    this.view.z = z;
    if (this.options.onViewChange) {
      this.options.onViewChange({ ...this.view });
    }
    this.rd();
  }

  public zoomIn(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.zoomAt(w / 2, h / 2, 1.25);
  }

  public zoomOut(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.zoomAt(w / 2, h / 2, 0.8);
  }

  public resetZoom(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.zoomAt(w / 2, h / 2, 1 / this.view.z);
  }

  public centerView(): void {
    this.view = { x: 0, y: 0, z: 1 };
    if (this.options.onViewChange) {
      this.options.onViewChange({ ...this.view });
    }
    this.rd();
  }

  public toggleGrid(): void {
    this.state.grid = !this.state.grid;
    this.notifyState();
    this.rd();
  }

  // --- Undo, Redo, Commit, Terapan Ops Luar ---
  public canUndo(): boolean {
    return this.history.canUndo();
  }

  public canRedo(): boolean {
    return this.history.canRedo();
  }

  public undo(): void {
    if (this.hanyaLihat) return;
    const res = this.history.undo(this.objs);
    if (res.reverted) {
      this.objs = res.newObjs;
      this.setSelection(null);
      this.rd();
    }
  }

  public redo(): void {
    if (this.hanyaLihat) return;
    const res = this.history.redo(this.objs);
    if (res.reapplied) {
      this.objs = res.newObjs;
      this.rd();
    }
  }

  public terapkanOps(ops: UbahEventPayload): void {
    let changed = false;
    let list = [...this.objs];

    if (ops.hapus && ops.hapus.length > 0) {
      const setHapus = new Set(ops.hapus);
      list = list.filter((o) => !setHapus.has(o.id));
      changed = true;
    }

    if (ops.ubah && ops.ubah.length > 0) {
      const mapUbah = new Map(ops.ubah.map((u) => [u.id, u]));
      list = list.map((o) => {
        const pengganti = mapUbah.get(o.id);
        return pengganti ? cloneObj(pengganti) : o;
      });
      changed = true;
    }

    if (ops.tambah && ops.tambah.length > 0) {
      const existingIds = new Set(list.map((o) => o.id));
      for (const t of ops.tambah) {
        if (!existingIds.has(t.id)) {
          list.push(cloneObj(t));
          existingIds.add(t.id);
        }
      }
      changed = true;
    }

    if (changed) {
      this.objs = list;
      this.rd();
    }
  }

  // --- Manipulasi Objek (Duplikat, Hapus, dsb) ---
  public deleteSelected(): void {
    if (this.hanyaLihat || !this.sel) return;
    const target = this.objs.find((o) => o.id === this.sel);
    if (!target) return;
    this.objs = this.objs.filter((o) => o.id !== this.sel);
    this.history.commit({ hapus: [target] });
    this.setSelection(null);
    this.rd();
  }

  public duplicateSelected(): void {
    if (this.hanyaLihat || !this.sel) return;
    const o = this.objs.find((x) => x.id === this.sel);
    if (!o) return;
    const copy = cloneObj(o);
    copy.id = crypto.randomUUID();
    move(copy, 24, 24);
    this.objs.push(copy);
    this.setSelection(copy.id);
    this.history.commit({ tambah: [copy] });
    this.rd();
  }

  public clearAll(): void {
    if (this.hanyaLihat || this.objs.length === 0) return;
    const hapusSemua = [...this.objs];
    this.objs = [];
    this.setSelection(null);
    this.history.commit({ hapus: hapusSemua });
    this.rd();
  }

  public addNote(text: string): void {
    if (this.hanyaLihat) return;
    const c = this.getCenter();
    const cleanText = text.slice(0, 5000);
    const o: TextObj = {
      id: crypto.randomUUID(),
      type: 'text',
      x: c.x - 80 + Math.random() * 40,
      y: c.y - 60 + Math.random() * 40,
      text: cleanText,
      fs: 22,
      color: '#111827',
      fill: '#fde68a',
      size: 1,
    };
    this.objs.push(o);
    this.setSelection(o.id);
    this.history.commit({ tambah: [o] });
    this.rd();
  }

  public addAiCard(text: string, pos: Pt): TextObj | null {
    if (this.hanyaLihat) return null;
    const cleanText = text.slice(0, 5000);
    const o: TextObj = {
      id: crypto.randomUUID(),
      type: 'text',
      x: pos.x,
      y: pos.y,
      text: cleanText,
      fs: 17,
      fw: 600,
      color: '#78350f',
      fill: '#fef3c7',
      size: 1,
      ai: true,
    };
    this.objs.push(o);
    this.setSelection(o.id);
    this.history.commit({ tambah: [o] });
    this.rd();
    return o;
  }

  public addText(kind: 'box' | 'h' | 's' | 'b'): void {
    if (this.hanyaLihat) return;
    const defs: Record<string, [string, number, number]> = {
      box: ['Teks baru', 24, 600],
      h: ['Judul', 48, 800],
      s: ['Subjudul', 32, 700],
      b: ['Teks isi', 20, 500],
    };
    const [t, fs, fw] = defs[kind] || defs.box;
    const c = this.getCenter();
    const o: TextObj = {
      id: crypto.randomUUID(),
      type: 'text',
      x: c.x - 80,
      y: c.y - 30,
      text: t,
      fs,
      fw,
      color: this.state.color,
      fill: null,
      size: 1,
    };
    this.objs.push(o);
    this.setSelection(o.id);
    this.history.commit({ tambah: [o] });
    this.rd();

    if (this.options.onOpenTextEditor) {
      this.options.onOpenTextEditor({
        obj: o,
        x: o.x,
        y: o.y,
        text: o.text,
      });
    }
  }

  public addTable(rows: number, cols: number): void {
    if (this.hanyaLihat) return;
    const c = this.getCenter();
    const o: TableObj = {
      id: crypto.randomUUID(),
      type: 'table',
      x: c.x - cols * 60,
      y: c.y - rows * 22,
      rows,
      cols,
      cw: 120,
      ch: 44,
      cells: {},
      color: this.state.color,
      size: 2,
      fill: null,
    };
    this.objs.push(o);
    this.setSelection(o.id);
    this.history.commit({ tambah: [o] });
    this.rd();
  }

  public async addImageFile(file: File, atWorldPos?: Pt): Promise<void> {
    if (this.hanyaLihat) return;
    try {
      const resized = await resizeImageToDataUrl(file);
      const c = atWorldPos || this.getCenter();
      const k = Math.min(1, 360 / resized.w);
      const o: CanvasObj = {
        id: crypto.randomUUID(),
        type: 'image',
        src: resized.src,
        x: c.x - (resized.w * k) / 2,
        y: c.y - (resized.h * k) / 2,
        w: resized.w * k,
        h: resized.h * k,
        color: '#000000',
        size: 1,
      };
      this.objs.push(o);
      this.setSelection(o.id);
      this.history.commit({ tambah: [o] });
      this.rd();
    } catch (err: any) {
      this.toast(err.message || 'Gagal menambahkan gambar');
    }
  }

  public commitTextEdit(editor: TextEditorState, value: string): void {
    if (this.hanyaLihat) return;
    const trimmed = value.slice(0, 5000);

    if (editor.obj && editor.r !== undefined && editor.c !== undefined) {
      const tbl = editor.obj as TableObj;
      const key = `${editor.r},${editor.c}`;
      const sebelum = cloneObj(tbl);
      if (trimmed.trim()) {
        tbl.cells[key] = trimmed;
      } else {
        delete tbl.cells[key];
      }
      this.history.commit({ ubah: [{ sebelum, sesudah: cloneObj(tbl) }] });
    } else if (editor.obj) {
      const txtObj = editor.obj as TextObj;
      if (trimmed.trim()) {
        const sebelum = cloneObj(txtObj);
        txtObj.text = trimmed;
        this.history.commit({ ubah: [{ sebelum, sesudah: cloneObj(txtObj) }] });
      } else {
        this.objs = this.objs.filter((x) => x !== txtObj);
        this.history.commit({ hapus: [txtObj] });
        if (this.sel === txtObj.id) this.setSelection(null);
      }
    } else if (trimmed.trim()) {
      const o: TextObj = {
        id: crypto.randomUUID(),
        type: 'text',
        x: editor.x,
        y: editor.y,
        text: trimmed,
        fs: this.state.fs,
        color: this.state.color,
        fill: null,
        size: 1,
      };
      this.objs.push(o);
      this.setSelection(o.id);
      this.history.commit({ tambah: [o] });
    }

    this.rd();
  }

  // --- Tanya AI Lasso ---
  public closeLasso(): void {
    this.lasso = null;
    if (this.options.onLassoChange) {
      this.options.onLassoChange(null);
    }
    this.rd();
  }

  // --- Mode Presentasi ---
  public setPresentation(on: boolean): void {
    document.body.classList.toggle('pres', on);
    if (on) {
      this.prevTool = this.state.tool;
      this.setTool('laser');
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      if (this.prevTool) {
        this.setTool(this.prevTool);
        this.prevTool = null;
      }
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  // --- Event Handlers Pointer & Window ---
  private initCanvasSize(): void {
    const d = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = w * d;
    this.canvas.height = h * d;
  }

  private handleResize = (): void => {
    this.initCanvasSize();
    this.rd();
  };

  private handlePointerDown = (e: PointerEvent): void => {
    if (e.button === 2) return; // Right click
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Deteksi gestur dua jari layar sentuh: Pan & Pinch Zoom
    if (this.activePointers.size === 2) {
      this.cur = null;
      if (this.lasso) this.closeLasso();

      const pts = Array.from(this.activePointers.values());
      const p1 = pts[0];
      const p2 = pts[1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      this.drag = {
        k: 'pinch',
        pinchDist: Math.max(1, dist),
        pinchCenter: center,
      };
      this.canvas.style.cursor = 'grab';
      this.rd();
      return;
    }

    if (this.activePointers.size > 2) {
      return;
    }

    if (this.options.onCloseTextEditor) {
      this.options.onCloseTextEditor();
    }
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      // Abaikan jika pointer capture gagal
    }

    const p = this.toWorld(e.clientX, e.clientY);
    const t = this.state.tool;

    // Pan dengan tombol tengah, tool Tangan, atau Spasi ditahan
    if (e.button === 1 || t === 'hand' || this.spacePressed) {
      this.drag = {
        k: 'pan',
        x: e.clientX,
        y: e.clientY,
        vx: this.view.x,
        vy: this.view.y,
      };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (t === 'laser') {
      this.drag = { k: 'ls' };
      this.laser.push({ ...p, t: performance.now() });
      this.rd();
      return;
    }

    if (t === 'zoom') {
      const r = this.canvas.getBoundingClientRect();
      this.zoomAt(e.clientX - r.left, e.clientY - r.top, e.shiftKey ? 1 / 1.4 : 1.4);
      return;
    }

    // Jika mode hanya lihat, tolak semua aksi pengubahan di bawah ini
    if (this.hanyaLihat) {
      this.toast('Mode Viewer: Anda tidak memiliki izin mengedit papan ini');
      return;
    }

    if (t === 'pen') {
      this.cur = {
        id: crypto.randomUUID(),
        type: 'stroke',
        pts: [p],
        color: this.state.color,
        size: this.state.size,
        st: this.state.style,
        op: this.state.op,
      };
    } else if (t === 'eraser') {
      this.drag = {
        k: 'er',
        ch: false,
        last: p,
        erasedAdded: [],
        erasedRemoved: [],
      };
      const res = eraseSeg(this.objs, p, p, this.state.er / 2);
      if (res.changed) {
        this.objs = res.newObjs;
        this.drag.ch = true;
        this.drag.erasedAdded!.push(...res.added);
        this.drag.erasedRemoved!.push(...res.removed);
      }
    } else if (t === 'select') {
      // Cek apakah kursor mengenai handle sudut resize objek aktif
      if (this.sel) {
        const selObj = this.objs.find((item) => item.id === this.sel);
        if (selObj && selObj.type !== 'stroke') {
          const b = bounds(selObj);
          const corner = hitResizeCorner(b, p, 10 / this.view.z, 6);
          if (corner) {
            this.drag = {
              k: 'resize',
              corner,
              resizeStartPt: p,
              initialObjBeforeResize: cloneObj(selObj),
              ch: false,
            };
            this.rd();
            return;
          }
        }
      }

      const o = topAt(this.objs, p, 6 / this.view.z);
      this.setSelection(o ? o.id : null);
      if (o) {
        this.drag = {
          k: 'mv',
          p,
          ch: false,
          initialObjBeforeMove: cloneObj(o),
        };
      }
    } else if (t === 'shape') {
      this.cur = {
        id: crypto.randomUUID(),
        type: 'shape',
        kind: this.state.shape,
        x: p.x,
        y: p.y,
        w: 0,
        h: 0,
        color: this.state.color,
        size: this.state.ss,
        op: this.state.op,
        fill: null,
      };
    } else if (t === 'text') {
      if (this.options.onOpenTextEditor) {
        this.options.onOpenTextEditor({
          obj: null,
          x: p.x,
          y: p.y,
          text: '',
        });
      }
    } else if (t === 'table') {
      const n = this.state.tsz;
      const o: TableObj = {
        id: crypto.randomUUID(),
        type: 'table',
        x: p.x - 60,
        y: p.y - 22,
        rows: n,
        cols: n,
        cw: 120,
        ch: 44,
        cells: {},
        color: this.state.color,
        size: 2,
        fill: null,
      };
      this.objs.push(o);
      this.setSelection(o.id);
      this.history.commit({ tambah: [o] });
    } else if (t === 'fill') {
      const o = topAt(this.objs, p, 2 / this.view.z);
      if (o && o.type !== 'stroke' && o.type !== 'image') {
        const sebelum = cloneObj(o);
        o.fill = this.state.fill || null;
        this.history.commit({ ubah: [{ sebelum, sesudah: cloneObj(o) }] });
      } else if (o) {
        this.toast('Isi warna hanya untuk bentuk, teks, dan tabel');
      }
    } else if (t === 'pick') {
      const o = topAt(this.objs, p, 4 / this.view.z);
      if (o) {
        const c =
          o.type === 'stroke' || (o.type === 'text' && !o.fill)
            ? o.color
            : 'fill' in o && o.fill
            ? o.fill
            : o.color;
        this.state.color = c;
        this.setTool('pen');
        this.toast(`Warna diambil: ${c}`);
      }
    } else if (t === 'ai') {
      this.lasso = [p];
      this.drag = { k: 'ai' };
    }

    this.rd();
  };

  private handlePointerMove = (e: PointerEvent): void => {
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Gestur 2 Jari Layar Sentuh: Pan & Pinch Zoom
    if (this.drag && this.drag.k === 'pinch' && this.activePointers.size >= 2) {
      const pts = Array.from(this.activePointers.values());
      const p1 = pts[0];
      const p2 = pts[1];
      const curDist = Math.max(1, Math.hypot(p2.x - p1.x, p2.y - p1.y));
      const curCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      const prevDist = this.drag.pinchDist || curDist;
      const prevCenter = this.drag.pinchCenter || curCenter;

      // Geser (Pan)
      const dx = curCenter.x - prevCenter.x;
      const dy = curCenter.y - prevCenter.y;
      this.view.x += dx;
      this.view.y += dy;

      // Pinch Zoom
      const scaleFactor = curDist / prevDist;
      const r = this.canvas.getBoundingClientRect();
      const cx = curCenter.x - r.left;
      const cy = curCenter.y - r.top;

      const newZ = Math.max(0.1, Math.min(4, this.view.z * scaleFactor));
      if (newZ !== this.view.z) {
        this.view.x = cx - (cx - this.view.x) * (newZ / this.view.z);
        this.view.y = cy - (cy - this.view.y) * (newZ / this.view.z);
        this.view.z = newZ;
      }

      this.drag.pinchDist = curDist;
      this.drag.pinchCenter = curCenter;

      if (this.options.onViewChange) {
        this.options.onViewChange({ ...this.view });
      }
      this.rd();
      return;
    }

    const r = this.canvas.getBoundingClientRect();
    this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    const p = this.toWorld(e.clientX, e.clientY);

    if (this.drag) {
      if (this.drag.k === 'pan') {
        this.view.x = (this.drag.vx || 0) + e.clientX - (this.drag.x || 0);
        this.view.y = (this.drag.vy || 0) + e.clientY - (this.drag.y || 0);
        if (this.options.onViewChange) {
          this.options.onViewChange({ ...this.view });
        }
      } else if (this.drag.k === 'er') {
        const res = eraseSeg(this.objs, this.drag.last || p, p, this.state.er / 2);
        if (res.changed) {
          this.objs = res.newObjs;
          this.drag.ch = true;
          this.drag.erasedAdded?.push(...res.added);
          this.drag.erasedRemoved?.push(...res.removed);
        }
        this.drag.last = p;
      } else if (this.drag.k === 'ai') {
        if (!this.lasso) this.lasso = [];
        this.lasso.push(p);
      } else if (this.drag.k === 'mv' && this.sel) {
        const o = this.objs.find((item) => item.id === this.sel);
        if (o && this.drag.p) {
          move(o, p.x - this.drag.p.x, p.y - this.drag.p.y);
          this.drag.p = p;
          this.drag.ch = true;
        }
      } else if (
        this.drag.k === 'resize' &&
        this.sel &&
        this.drag.corner &&
        this.drag.initialObjBeforeResize &&
        this.drag.resizeStartPt
      ) {
        const o = this.objs.find((item) => item.id === this.sel);
        if (o) {
          applyResize(
            o,
            this.drag.corner,
            this.drag.initialObjBeforeResize,
            this.drag.resizeStartPt,
            p,
            e.shiftKey
          );
          this.drag.ch = true;
        }
      } else if (this.drag.k === 'ls') {
        this.laser.push({ ...p, t: performance.now() });
      }
    } else if (this.cur) {
      if (this.cur.type === 'stroke') {
        const lastPt = this.cur.pts[this.cur.pts.length - 1];
        if (Math.hypot(p.x - lastPt.x, p.y - lastPt.y) > 1 / this.view.z) {
          if (this.cur.pts.length < 5000) {
            this.cur.pts.push(p);
          }
        }
      } else if (this.cur.type === 'shape') {
        this.cur.w = p.x - this.cur.x;
        this.cur.h = p.y - this.cur.y;
        if (e.shiftKey && this.cur.kind !== 'line' && this.cur.kind !== 'arrow') {
          const m = Math.max(Math.abs(this.cur.w), Math.abs(this.cur.h));
          this.cur.w = Math.sign(this.cur.w || 1) * m;
          this.cur.h = Math.sign(this.cur.h || 1) * m;
        }
      }
    } else if (this.state.tool === 'select' && this.sel) {
      // Hover kursor saat berada di atas handle resize
      const selObj = this.objs.find((item) => item.id === this.sel);
      if (selObj && selObj.type !== 'stroke') {
        const b = bounds(selObj);
        const corner = hitResizeCorner(b, p, 10 / this.view.z, 6);
        if (corner === 'nw' || corner === 'se') {
          this.canvas.style.cursor = 'nwse-resize';
        } else if (corner === 'ne' || corner === 'sw') {
          this.canvas.style.cursor = 'nesw-resize';
        } else {
          this.canvas.style.cursor = 'default';
        }
      }
    }

    this.rd();
  };

  private handlePointerUp = (e?: PointerEvent): void => {
    if (e) {
      this.activePointers.delete(e.pointerId);
    }
    if (this.drag && this.drag.k === 'pinch') {
      if (this.activePointers.size < 2) {
        this.drag = null;
        this.canvas.style.cursor = 'default';
        this.rd();
      }
      return;
    }

    if (this.cur) {
      if (
        this.cur.type === 'stroke' ||
        (this.cur.type === 'shape' && Math.abs(this.cur.w) + Math.abs(this.cur.h) > 6)
      ) {
        this.objs.push(this.cur);
        this.history.commit({ tambah: [this.cur] });
      }
      this.cur = null;
    }

    if (this.drag) {
      if (this.drag.k === 'ai') {
        if (this.lasso && this.lasso.length >= 8) {
          if (this.options.onLassoChange) {
            this.options.onLassoChange([...this.lasso]);
          }
        } else {
          this.closeLasso();
        }
      }

      if (this.drag.k === 'mv' && this.drag.ch && this.sel && this.drag.initialObjBeforeMove) {
        const movedObj = this.objs.find((item) => item.id === this.sel);
        if (movedObj) {
          this.history.commit({
            ubah: [{ sebelum: this.drag.initialObjBeforeMove, sesudah: cloneObj(movedObj) }],
          });
        }
      }

      if (this.drag.k === 'resize' && this.drag.ch && this.sel && this.drag.initialObjBeforeResize) {
        const resizedObj = this.objs.find((item) => item.id === this.sel);
        if (resizedObj) {
          this.history.commit({
            ubah: [{ sebelum: this.drag.initialObjBeforeResize, sesudah: cloneObj(resizedObj) }],
          });
        }
      }

      if (this.drag.k === 'er' && this.drag.ch) {
        const removed = this.drag.erasedRemoved || [];
        const added = this.drag.erasedAdded || [];
        this.history.commit({ hapus: removed, tambah: added });
      }

      if (this.drag.k === 'pan') {
        this.canvas.style.cursor = this.state.tool === 'hand' ? 'grab' : 'crosshair';
      }

      this.drag = null;
    }

    if (e && this.canvas.hasPointerCapture(e.pointerId)) {
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Abaikan jika pointer sudah tidak tertangkap
      }
    }

    this.rd();
  };

  private handlePointerCancel = (e: PointerEvent): void => {
    this.handlePointerUp(e);
  };

  private handlePointerLeave = (): void => {
    this.mouse = null;
    this.rd();
  };

  private handleDblClick = (e: MouseEvent): void => {
    if (this.hanyaLihat) return;
    const p = this.toWorld(e.clientX, e.clientY);
    const o = topAt(this.objs, p, 4 / this.view.z);
    if (!o) return;

    if (o.type === 'text') {
      if (this.options.onOpenTextEditor) {
        this.options.onOpenTextEditor({
          obj: o,
          x: o.x,
          y: o.y,
          text: o.text,
        });
      }
    } else if (o.type === 'table') {
      const c = Math.floor((p.x - o.x) / o.cw);
      const r = Math.floor((p.y - o.y) / o.ch);
      if (c >= 0 && r >= 0 && c < o.cols && r < o.rows) {
        if (this.options.onOpenTextEditor) {
          this.options.onOpenTextEditor({
            obj: o,
            r,
            c,
            x: o.x + c * o.cw,
            y: o.y + r * o.ch,
            text: o.cells[`${r},${c}`] || '',
          });
        }
      }
    }
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const r = this.canvas.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;

    if (e.ctrlKey || e.metaKey) {
      this.zoomAt(sx, sy, Math.exp(-e.deltaY * 0.01));
    } else {
      this.view.x -= e.deltaX;
      this.view.y -= e.deltaY;
      if (this.options.onViewChange) {
        this.options.onViewChange({ ...this.view });
      }
    }
    this.rd();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName)) return;
    const k = e.key.toLowerCase();
    const m = e.ctrlKey || e.metaKey;

    if (m && k === 'z') {
      e.preventDefault();
      if (e.shiftKey) this.redo();
      else this.undo();
      return;
    }
    if (m && k === 'y') {
      e.preventDefault();
      this.redo();
      return;
    }
    if (m && k === 'd') {
      e.preventDefault();
      this.duplicateSelected();
      return;
    }
    if (m && (k === '=' || k === '+')) {
      e.preventDefault();
      this.zoomIn();
      return;
    }
    if (m && k === '-') {
      e.preventDefault();
      this.zoomOut();
      return;
    }
    if (k === 'escape') {
      if (document.body.classList.contains('pres')) {
        this.setPresentation(false);
      } else {
        this.setSelection(null);
        this.closeLasso();
      }
      return;
    }
    if (k === 'delete' || k === 'backspace') {
      this.deleteSelected();
      return;
    }
    if (k === ' ') {
      this.spacePressed = true;
      e.preventDefault();
      return;
    }

    // Alat pintasan huruf tunggal
    const keyMap: Record<string, ToolType> = {
      v: 'select',
      h: 'hand',
      l: 'laser',
      p: 'pen',
      e: 'eraser',
      s: 'shape',
      t: 'text',
      b: 'table',
      f: 'fill',
      i: 'pick',
      a: 'ai',
      u: 'upload',
    };
    if (keyMap[k] && !m) {
      this.setTool(keyMap[k]);
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (e.key === ' ') {
      this.spacePressed = false;
    }
  };

  private handleFullscreenChange = (): void => {
    if (!document.fullscreenElement && document.body.classList.contains('pres')) {
      this.setPresentation(false);
    }
  };

  private handleDragOver = (e: DragEvent): void => {
    e.preventDefault();
  };

  private handleDrop = (e: DragEvent): void => {
    e.preventDefault();
    if (this.hanyaLihat) return;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const pos = this.toWorld(e.clientX, e.clientY);
      for (let i = 0; i < files.length; i++) {
        this.addImageFile(files[i], pos);
      }
    }
  };

  private handlePaste = (e: ClipboardEvent): void => {
    if (this.hanyaLihat) return;
    if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName)) return;
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            this.addImageFile(file);
          }
        }
      }
    }
  };

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    this.canvas.addEventListener('pointercancel', this.handlePointerCancel);
    this.canvas.addEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.addEventListener('dblclick', this.handleDblClick);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);

    window.addEventListener('dragover', this.handleDragOver);
    window.addEventListener('drop', this.handleDrop);
    window.addEventListener('paste', this.handlePaste);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.canvas);
    }
  }

  public destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    this.canvas.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas.removeEventListener('pointercancel', this.handlePointerCancel);
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    this.canvas.removeEventListener('dblclick', this.handleDblClick);
    this.canvas.removeEventListener('wheel', this.handleWheel);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);

    window.removeEventListener('dragover', this.handleDragOver);
    window.removeEventListener('drop', this.handleDrop);
    window.removeEventListener('paste', this.handlePaste);

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}

