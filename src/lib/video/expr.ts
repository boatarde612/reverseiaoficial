// Builds FFmpeg expressions for keyframed values (piecewise-linear, balanced if-tree so the
// expression stays shallow even with hundreds of keyframes).

export type Keyframe = [x: number, y: number];

const n = (v: number) => {
  const r = Math.round(v * 10000) / 10000;
  return Object.is(r, -0) ? "0" : String(r);
};

export function piecewiseExpr(points: Keyframe[], variable: string): string {
  const pts = dedupe(points);
  if (pts.length === 0) return "0";
  if (pts.length === 1) return n(pts[0]![1]);

  const segment = (i: number) => {
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[i + 1]!;
    const slope = (y1 - y0) / (x1 - x0);
    return `(${n(y0)}+${n(slope)}*(${variable}-${n(x0)}))`;
  };

  // Segments [lo, hi] inclusive; split on the x of the middle boundary.
  const build = (lo: number, hi: number): string => {
    if (lo === hi) return segment(lo);
    const mid = Math.floor((lo + hi) / 2);
    return `if(lt(${variable},${n(pts[mid + 1]![0])}),${build(lo, mid)},${build(mid + 1, hi)})`;
  };

  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  const inner = build(0, pts.length - 2);
  return `if(lt(${variable},${n(first[0])}),${n(first[1])},if(gte(${variable},${n(last[0])}),${n(last[1])},${inner}))`;
}

/** Evaluates the same piecewise function in JS (used for tests and output-duration math). */
export function piecewiseValue(points: Keyframe[], x: number): number {
  const pts = dedupe(points);
  if (pts.length === 0) return 0;
  if (x <= pts[0]![0]) return pts[0]![1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[i + 1]!;
    if (x < x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1]![1];
}

function dedupe(points: Keyframe[]): Keyframe[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0]);
  const out: Keyframe[] = [];
  for (const p of sorted) {
    if (out.length && Math.abs(out[out.length - 1]![0] - p[0]) < 1e-6) out[out.length - 1] = p;
    else out.push(p);
  }
  return out;
}

export function even(v: number): number {
  return Math.max(2, Math.round(v / 2) * 2);
}

/** Working size: optionally cap the short side (faster on phones), always even. */
export function workSize(width: number, height: number, maxShortSide: number | null) {
  const short = Math.min(width, height);
  const k = maxShortSide && short > maxShortSide ? maxShortSide / short : 1;
  return { w: even(width * k), h: even(height * k) };
}
