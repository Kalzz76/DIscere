import { Pt, Bounds, CanvasObj, TextObj } from './types';

const mc = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;

const textBoundsCache = new WeakMap<TextObj, { text: string; fs: number; fw: any; w: number; h: number }>();

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
    return {
      x: a - r,
      y: b - r,
      w: c - a + 2 * r,
      h: d - b + 2 * r,
    };
  }

  if (o.type === 'text') {
    const cached = textBoundsCache.get(o);
    if (cached && cached.text === o.text && cached.fs === o.fs && cached.fw === o.fw) {
      return { x: o.x, y: o.y, w: cached.w, h: cached.h };
    }

    let maxW = 40;
    const L = lines(o);
    if (mc) {
      mc.font = `${o.fw || 600} ${o.fs}px "Plus Jakarta Sans", sans-serif`;
      for (const line of L) {
        const measured = mc.measureText(line).width;
        if (measured > maxW) maxW = measured;
      }
    }
    const w = maxW + 24;
    const h = L.length * o.fs * 1.3 + 16;
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
  } else {
    o.x += dx;
    o.y += dy;
  }
}

