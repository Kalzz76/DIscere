import { CanvasObj, BoardView, BoardState, Pt, LaserPoint } from './types';
import { bounds, ew, lines } from './geometry';
import { up } from './shapes';

let fontLoaded = false;
export async function ensureFontLoaded(onReady?: () => void): Promise<void> {
  if (fontLoaded) return;
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.load('600 24px "Plus Jakarta Sans"');
      fontLoaded = true;
      if (onReady) onReady();
    } catch {
      // Font fallback browser tetap jalan
    }
  }
}

export function drawObj(
  c: CanvasRenderingContext2D,
  o: CanvasObj,
  onImageLoad?: () => void
): void {
  c.save();
  c.globalAlpha = (o.op ?? 1) * (o.type === 'stroke' && o.st === 'marker' ? 0.75 : 1);
  drawObj0(c, o, onImageLoad);
  c.restore();
}

export function drawObj0(
  c: CanvasRenderingContext2D,
  o: CanvasObj,
  onImageLoad?: () => void
): void {
  c.lineCap = c.lineJoin = 'round';
  c.strokeStyle = o.color;
  c.fillStyle = o.color;
  c.lineWidth = ew(o);
  if (o.type === 'stroke' && o.st === 'marker') {
    c.lineCap = 'square';
  }

  if (o.type === 'stroke') {
    if (o.pts.length === 0) return;
    if (o.pts.length === 1) {
      c.beginPath();
      c.arc(o.pts[0].x, o.pts[0].y, ew(o) / 2, 0, Math.PI * 2);
      c.fill();
      return;
    }
    c.beginPath();
    c.moveTo(o.pts[0].x, o.pts[0].y);
    for (let i = 1; i < o.pts.length - 1; i++) {
      const m = {
        x: (o.pts[i].x + o.pts[i + 1].x) / 2,
        y: (o.pts[i].y + o.pts[i + 1].y) / 2,
      };
      c.quadraticCurveTo(o.pts[i].x, o.pts[i].y, m.x, m.y);
    }
    const l = o.pts[o.pts.length - 1];
    c.lineTo(l.x, l.y);
    c.stroke();

    if (o.st === 'pencil') {
      c.globalAlpha *= 0.5;
      c.lineWidth = ew(o) * 0.45;
      c.setLineDash([1, 2.5]);
      c.stroke();
      c.setLineDash([]);
    }
  } else if (o.type === 'shape') {
    const { x, y, w, h } = o;
    const k = o.kind;
    const bx = Math.min(x, x + w);
    const by = Math.min(y, y + h);
    const bw = Math.abs(w);
    const bh = Math.abs(h);
    c.beginPath();

    if (k === 'line' || k === 'arrow') {
      c.moveTo(x, y);
      c.lineTo(x + w, y + h);
    } else if (k === 'rect') {
      c.rect(bx, by, bw, bh);
    } else if (k === 'round') {
      if (typeof c.roundRect === 'function') {
        c.roundRect(bx, by, bw, bh, Math.min(bw, bh) * 0.22);
      } else {
        c.rect(bx, by, bw, bh);
      }
    } else if (k === 'ellipse') {
      c.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2);
    } else {
      const points = up(k);
      points.forEach((q, i) => c[i ? 'lineTo' : 'moveTo'](bx + q[0] * bw, by + q[1] * bh));
      c.closePath();
    }

    if (o.fill && k !== 'line' && k !== 'arrow') {
      c.fillStyle = o.fill;
      c.fill();
    }
    c.stroke();

    if (k === 'arrow') {
      const a = Math.atan2(h, w);
      const s = 12 + o.size * 1.5;
      c.beginPath();
      c.moveTo(x + w, y + h);
      c.lineTo(x + w - s * Math.cos(a - 0.45), y + h - s * Math.sin(a - 0.45));
      c.moveTo(x + w, y + h);
      c.lineTo(x + w - s * Math.cos(a + 0.45), y + h - s * Math.sin(a + 0.45));
      c.stroke();
    }
  } else if (o.type === 'text') {
    const b = bounds(o);
    if (o.fill || o.ai) {
      c.fillStyle = o.fill || (o.ai ? '#fef3c7' : '#ffffff');
      c.beginPath();
      if (typeof c.roundRect === 'function') {
        c.roundRect(b.x, b.y, b.w, b.h, o.ai ? 14 : 10);
      } else {
        c.rect(b.x, b.y, b.w, b.h);
      }
      c.fill();

      // Border halus untuk kartu AI
      if (o.ai) {
        c.strokeStyle = '#f59e0b';
        c.lineWidth = 1.5;
        c.stroke();
      }
    }

    // Label "Dibuat AI" di pojok kartu
    if (o.ai) {
      c.save();
      const badgeText = 'Dibuat AI';
      c.font = '700 11px "Plus Jakarta Sans", sans-serif';
      const tw = c.measureText(badgeText).width;
      const bx = b.x + b.w - tw - 18;
      const by = b.y + 8;
      c.fillStyle = '#f59e0b';
      if (typeof c.roundRect === 'function') {
        c.beginPath();
        c.roundRect(bx, by, tw + 10, 18, 5);
        c.fill();
      } else {
        c.fillRect(bx, by, tw + 10, 18);
      }
      c.fillStyle = '#ffffff';
      c.textBaseline = 'middle';
      c.fillText(badgeText, bx + 5, by + 9);
      c.restore();
    }

    c.fillStyle = o.color;
    c.font = `${o.fw || 600} ${o.fs}px "Plus Jakarta Sans", sans-serif`;
    c.textBaseline = 'top';
    const L = lines(o);
    const topOffset = o.ai ? 32 : 8;
    L.forEach((line, i) => c.fillText(line, o.x + 12, o.y + topOffset + i * o.fs * 1.3));
  } else if (o.type === 'table') {
    const b = bounds(o);
    if (o.fill) {
      c.fillStyle = o.fill;
      c.fillRect(b.x, b.y, b.w, b.h);
    }
    c.lineWidth = 2;
    c.strokeStyle = o.color;
    c.beginPath();
    for (let r = 0; r <= o.rows; r++) {
      c.moveTo(o.x, o.y + r * o.ch);
      c.lineTo(o.x + b.w, o.y + r * o.ch);
    }
    for (let col = 0; col <= o.cols; col++) {
      c.moveTo(o.x + col * o.cw, o.y);
      c.lineTo(o.x + col * o.cw, o.y + b.h);
    }
    c.stroke();
    c.fillStyle = o.color;
    c.font = '500 16px "Plus Jakarta Sans", sans-serif';
    c.textBaseline = 'middle';
    for (const key in o.cells) {
      const [r, col] = key.split(',').map(Number);
      c.fillText(o.cells[key], o.x + col * o.cw + 10, o.y + r * o.ch + o.ch / 2, o.cw - 20);
    }
  } else if (o.type === 'image') {
    if (!o._i) {
      o._i = new Image();
      if (onImageLoad) {
        o._i.onload = onImageLoad;
      }
      o._i.src = o.src;
    }
    if (o._i.complete && o._i.naturalWidth > 0) {
      c.drawImage(o._i, o.x, o.y, o.w, o.h);
    }
  }
}

export interface DrawSceneParams {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  view: BoardView;
  state: BoardState;
  objs: CanvasObj[];
  cur: CanvasObj | null;
  lasso: Pt[] | null;
  sel: string | null;
  laser: LaserPoint[];
  mouse: Pt | null;
  onImageLoad?: () => void;
}

export function drawScene({
  ctx,
  canvas,
  view,
  state,
  objs,
  cur,
  lasso,
  sel,
  laser,
  mouse,
  onImageLoad,
}: DrawSceneParams): void {
  const d = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
  const height = canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);

  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(d * view.z, 0, 0, d * view.z, d * view.x, d * view.y);

  // Titik grid
  if (state.grid && view.z > 0.35) {
    const g = 24;
    const x0 = Math.floor(-view.x / view.z / g) * g;
    const y0 = Math.floor(-view.y / view.z / g) * g;
    const x1 = (width - view.x) / view.z;
    const y1 = (height - view.y) / view.z;
    ctx.fillStyle = '#c9cee0';
    for (let x = x0; x < x1; x += g) {
      for (let y = y0; y < y1; y += g) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
  }

  // Objek kanvas
  for (const o of objs) {
    drawObj(ctx, o, onImageLoad);
  }

  // Objek yang sedang digambar (preview)
  if (cur) {
    drawObj(ctx, cur, onImageLoad);
  }

  // Lasso Tanya AI
  if (lasso && lasso.length > 1) {
    ctx.save();
    ctx.beginPath();
    lasso.forEach((q, i) => ctx[i ? 'lineTo' : 'moveTo'](q.x, q.y));
    ctx.closePath();
    ctx.fillStyle = 'rgba(251, 191, 36, 0.13)';
    ctx.fill();
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3 / view.z;
    ctx.setLineDash([10 / view.z, 7 / view.z]);
    ctx.stroke();
    ctx.restore();
  }

  // Kotak seleksi objek aktif & Pegangan Resize di Sudut
  if (sel) {
    const s = objs.find((o) => o.id === sel);
    if (s) {
      const b = bounds(s);
      ctx.strokeStyle = '#9b17f5';
      ctx.lineWidth = 1.5 / view.z;
      ctx.setLineDash([6 / view.z, 4 / view.z]);
      ctx.strokeRect(b.x - 6, b.y - 6, b.w + 12, b.h + 12);
      ctx.setLineDash([]);

      // Gambar handle sudut jika objek bisa diubah ukuran (bentuk, gambar, tabel, teks)
      if (s.type !== 'stroke') {
        const handleSize = 8 / view.z;
        const hsHalf = handleSize / 2;
        const corners = [
          { x: b.x - 6, y: b.y - 6 },
          { x: b.x + b.w + 6, y: b.y - 6 },
          { x: b.x + b.w + 6, y: b.y + b.h + 6 },
          { x: b.x - 6, y: b.y + b.h + 6 },
        ];
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#9b17f5';
        ctx.lineWidth = 2 / view.z;
        for (const pt of corners) {
          ctx.fillRect(pt.x - hsHalf, pt.y - hsHalf, handleSize, handleSize);
          ctx.strokeRect(pt.x - hsHalf, pt.y - hsHalf, handleSize, handleSize);
        }
      }
    }
  }

  // Jejak Laser pointer (memudar 900 ms)
  const now = performance.now();
  ctx.lineCap = 'round';
  for (let i = 1; i < laser.length; i++) {
    const a = laser[i - 1];
    const b = laser[i];
    const k = 1 - (now - b.t) / 900;
    if (k > 0) {
      ctx.strokeStyle = state.lc;
      ctx.globalAlpha = Math.max(0, k);
      ctx.lineWidth = (6 * k + 2) / view.z;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  if (laser.length > 0) {
    const l = laser[laser.length - 1];
    ctx.globalAlpha = 1;
    ctx.fillStyle = state.lc;
    ctx.beginPath();
    ctx.arc(l.x, l.y, 6 / view.z, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;

  // Kursor penghapus
  if (state.tool === 'eraser' && mouse) {
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, (state.er * view.z) / 2 + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}

