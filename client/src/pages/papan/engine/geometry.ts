import { Pt, Bounds, CanvasObj, TextObj } from './types';

const mc = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;

const textBoundsCache = new WeakMap<TextObj, { text: string; fs: number; fw: any; w: number; h: number }>();
const strokeBoundsCache = new WeakMap<CanvasObj, Bounds>();

export function clearBoundsCache(o: CanvasObj): void {
  strokeBoundsCache.delete(o);
}

export function intersects(b1: Bounds, b2: Bounds): boolean {
  return (
    b1.x <= b2.x + b2.w &&
    b1.x + b1.w >= b2.x &&
    b1.y <= b2.y + b2.h &&
    b1.y + b1.h >= b2.y
  );
}

export function lines(o: TextObj): string[] {
  return String(o.text ?? '').split('\n');
}

export function ew(o: CanvasObj): number {
  if (o.type === 'stroke') {
    return o.size * (o.st === 'marker' ? 2.6 : o.st === 'pencil' ? 0.85 : 1);
  }
  return o.size;
}

export function bounds(o: CanvasObj): Bounds {
  if (o.type === 'stroke') {
    const cached = strokeBoundsCache.get(o);
    if (cached) return cached;
    if (o.pts.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
    let a = 1e9,
      b = 1e9,
      c = -1e9,
      d = -1e9;
    for (const p of o.pts) {
      if (p.x < a) a = p.x;
      if (p.y < b) b = p.y;
      if (p.x > c) c = p.x;
      if (p.y > d) d = p.y;
    }
    const r = ew(o) / 2;
    const res = {
      x: a - r,
      y: b - r,
      w: c - a + 2 * r,
      h: d - b + 2 * r,
    };
    strokeBoundsCache.set(o, res);
    return res;
  }

  if (o.type === 'text') {
    const cached = textBoundsCache.get(o);
    if (cached && cached.text === o.text && cached.fs === o.fs && cached.fw === o.fw) {
      return { x: o.x, y: o.y, w: cached.w, h: cached.h };
    }

    const minW = o.ai ? 240 : 40;
    const badgeH = o.ai ? 28 : 0;
    let maxW = minW;
    const L = lines(o);
    if (mc) {
      mc.font = `${o.fw || 600} ${o.fs}px "Plus Jakarta Sans", sans-serif`;
      for (const line of L) {
        const measured = mc.measureText(line).width;
        if (measured > maxW) maxW = measured;
      }
    }
    const w = maxW + 24;
    const h = L.length * o.fs * 1.3 + 16 + badgeH;
    textBoundsCache.set(o, { text: o.text, fs: o.fs, fw: o.fw, w, h });
    return { x: o.x, y: o.y, w, h };
  }

  if (o.type === 'table') {
    return {
      x: o.x,
      y: o.y,
      w: o.cols * o.cw,
      h: o.rows * o.ch,
    };
  }

  return {
    x: Math.min(o.x, o.x + o.w),
    y: Math.min(o.y, o.y + o.h),
    w: Math.abs(o.w),
    h: Math.abs(o.h),
  };
}

export function dseg(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = dx * dx + dy * dy;
  let u = l ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l : 0;
  u = Math.max(0, Math.min(1, u));
  return Math.hypot(p.x - a.x - u * dx, p.y - a.y - u * dy);
}

export function hit(o: CanvasObj, p: Pt, t = 6): boolean {
  if (o.type === 'stroke') {
    const r = ew(o) / 2 + t;
    for (let i = 0; i < o.pts.length; i++) {
      const a = o.pts[i];
      const b = o.pts[i + 1] || a;
      if (dseg(p, a, b) <= r) return true;
    }
    return false;
  }
  const b = bounds(o);
  return p.x >= b.x - t && p.x <= b.x + b.w + t && p.y >= b.y - t && p.y <= b.y + b.h + t;
}

export function topAt(objs: CanvasObj[], p: Pt, t = 6): CanvasObj | undefined {
  for (let i = objs.length - 1; i >= 0; i--) {
    if (hit(objs[i], p, t)) return objs[i];
  }
  return undefined;
}

export function move(o: CanvasObj, dx: number, dy: number): void {
  if (o.type === 'stroke') {
    for (const p of o.pts) {
      p.x += dx;
      p.y += dy;
    }
    const cached = strokeBoundsCache.get(o);
    if (cached) {
      cached.x += dx;
      cached.y += dy;
    }
  } else {
    o.x += dx;
    o.y += dy;
  }
}

export type ResizeCorner = 'nw' | 'ne' | 'se' | 'sw';

export function getResizeHandles(b: Bounds, offset = 6): Record<ResizeCorner, Pt> {
  return {
    nw: { x: b.x - offset, y: b.y - offset },
    ne: { x: b.x + b.w + offset, y: b.y - offset },
    se: { x: b.x + b.w + offset, y: b.y + b.h + offset },
    sw: { x: b.x - offset, y: b.y + b.h + offset },
  };
}

export function hitResizeCorner(b: Bounds, p: Pt, threshold = 8, offset = 6): ResizeCorner | null {
  const handles = getResizeHandles(b, offset);
  const corners: ResizeCorner[] = ['nw', 'ne', 'se', 'sw'];
  for (const c of corners) {
    const h = handles[c];
    if (Math.abs(p.x - h.x) <= threshold && Math.abs(p.y - h.y) <= threshold) {
      return c;
    }
  }
  return null;
}

export function applyResize(
  o: CanvasObj,
  corner: ResizeCorner,
  initial: CanvasObj,
  startP: Pt,
  curP: Pt,
  keepAspect = false
): void {
  const initB = bounds(initial);
  const dx = curP.x - startP.x;
  const dy = curP.y - startP.y;

  // Kasus Teks: resize mengubah skala ukuran font (fs)
  if (o.type === 'text') {
    const textObj = o as TextObj;
    const initText = initial as TextObj;
    let factor = 1;

    if (corner === 'se') {
      factor = Math.max(0.2, (initB.w + dx) / initB.w);
    } else if (corner === 'sw') {
      factor = Math.max(0.2, (initB.w - dx) / initB.w);
    } else if (corner === 'ne') {
      factor = Math.max(0.2, (initB.w + dx) / initB.w);
    } else if (corner === 'nw') {
      factor = Math.max(0.2, (initB.w - dx) / initB.w);
    }

    const newFs = Math.max(10, Math.min(160, Math.round(initText.fs * factor)));
    textObj.fs = newFs;

    const newB = bounds(textObj);
    if (corner === 'nw' || corner === 'sw') {
      textObj.x = initB.x + initB.w - newB.w;
    } else {
      textObj.x = initB.x;
    }
    if (corner === 'nw' || corner === 'ne') {
      textObj.y = initB.y + initB.h - newB.h;
    } else {
      textObj.y = initB.y;
    }
    return;
  }

  // Kasus Bentuk, Gambar, dan Tabel
  let newW = initB.w;
  let newH = initB.h;
  let newX = initB.x;
  let newY = initB.y;

  if (corner === 'se') {
    newW = initB.w + dx;
    newH = initB.h + dy;
    if (keepAspect) {
      const scale = Math.max(newW / initB.w, newH / initB.h);
      newW = initB.w * scale;
      newH = initB.h * scale;
    }
  } else if (corner === 'sw') {
    newW = initB.w - dx;
    newH = initB.h + dy;
    if (keepAspect) {
      const scale = Math.max(newW / initB.w, newH / initB.h);
      newW = initB.w * scale;
      newH = initB.h * scale;
    }
    newX = initB.x + initB.w - newW;
  } else if (corner === 'ne') {
    newW = initB.w + dx;
    newH = initB.h - dy;
    if (keepAspect) {
      const scale = Math.max(newW / initB.w, newH / initB.h);
      newW = initB.w * scale;
      newH = initB.h * scale;
    }
    newY = initB.y + initB.h - newH;
  } else if (corner === 'nw') {
    newW = initB.w - dx;
    newH = initB.h - dy;
    if (keepAspect) {
      const scale = Math.max(newW / initB.w, newH / initB.h);
      newW = initB.w * scale;
      newH = initB.h * scale;
    }
    newX = initB.x + initB.w - newW;
    newY = initB.y + initB.h - newH;
  }

  newW = Math.max(16, newW);
  newH = Math.max(16, newH);

  if (o.type === 'shape' || o.type === 'image') {
    o.x = newX;
    o.y = newY;
    o.w = newW;
    o.h = newH;
  } else if (o.type === 'table') {
    o.x = newX;
    o.y = newY;
    o.cw = Math.max(16, Math.round(newW / o.cols));
    o.ch = Math.max(14, Math.round(newH / o.rows));
  }
}


