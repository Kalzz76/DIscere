export const COL: string[] = [
  '#111827',
  '#ef4444',
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
  '#9b17f5',
  '#ffffff',
];

export const LCOL: string[] = ['#ef4444', '#22c55e', '#3b82f6'];

export function h2r(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number): number => {
    const k = (n + h / 60) % 6;
    return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))));
  };
  return [f(5), f(3), f(1)];
}

export function r2h(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const m = Math.max(r, g, b);
  const d = m - Math.min(r, g, b);
  const h = d
    ? (m === r ? ((g - b) / d + 6) % 6 : m === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60
    : 0;
  return {
    h,
    s: m ? d / m : 0,
    v: m / 255,
  };
}

export function hx(a: [number, number, number] | number[]): string {
  return (
    '#' +
    a
      .slice(0, 3)
      .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0'))
      .join('')
  );
}

