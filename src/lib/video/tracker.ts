// Object tracker: normalized cross-correlation template matching on grayscale frames,
// with constant-velocity prediction, coarse-to-fine search and slow template adaptation.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TrackPoint {
  cx: number;
  cy: number;
  score: number;
}

const MAX_SAMPLES_SIDE = 28;

export class TemplateTracker {
  private offsets: Int32Array;
  private tpl: Float32Array;
  private sx: number;
  private sy: number;
  private x: number;
  private y: number;
  private vx = 0;
  private vy = 0;
  private lost = 0;
  readonly w: number;
  readonly h: number;
  readonly stride: number;

  constructor(
    first: Uint8Array,
    private W: number,
    private H: number,
    box: Box,
  ) {
    this.w = Math.max(4, Math.min(W, Math.round(box.w)));
    this.h = Math.max(4, Math.min(H, Math.round(box.h)));
    this.x = clamp(Math.round(box.x), 0, W - this.w);
    this.y = clamp(Math.round(box.y), 0, H - this.h);
    this.stride = Math.max(1, Math.ceil(Math.max(this.w, this.h) / MAX_SAMPLES_SIDE));
    this.sx = Math.ceil(this.w / this.stride);
    this.sy = Math.ceil(this.h / this.stride);
    const offs: number[] = [];
    for (let j = 0; j < this.sy; j++) {
      for (let i = 0; i < this.sx; i++) {
        offs.push(Math.min(this.h - 1, j * this.stride) * W + Math.min(this.w - 1, i * this.stride));
      }
    }
    this.offsets = Int32Array.from(offs);
    this.tpl = new Float32Array(this.offsets.length);
    this.sample(first, this.x, this.y, this.tpl);
  }

  get center(): TrackPoint {
    return { cx: this.x + this.w / 2, cy: this.y + this.h / 2, score: 1 };
  }

  private sample(frame: Uint8Array, x: number, y: number, out: Float32Array) {
    const base = y * this.W + x;
    for (let k = 0; k < this.offsets.length; k++) out[k] = frame[base + this.offsets[k]!]!;
  }

  /** Normalized cross-correlation in [-1, 1] between the template and the patch at (x, y). */
  private ncc(frame: Uint8Array, x: number, y: number): number {
    const base = y * this.W + x;
    const n = this.offsets.length;
    let si = 0;
    let si2 = 0;
    let st = 0;
    let st2 = 0;
    let sit = 0;
    for (let k = 0; k < n; k++) {
      const a = frame[base + this.offsets[k]!]!;
      const b = this.tpl[k]!;
      si += a;
      si2 += a * a;
      st += b;
      st2 += b * b;
      sit += a * b;
    }
    const cov = sit - (si * st) / n;
    const vi = si2 - (si * si) / n;
    const vt = st2 - (st * st) / n;
    if (vi < 1e-3 || vt < 1e-3) return 0;
    return cov / Math.sqrt(vi * vt);
  }

  step(frame: Uint8Array): TrackPoint {
    const px = clamp(Math.round(this.x + this.vx), 0, this.W - this.w);
    const py = clamp(Math.round(this.y + this.vy), 0, this.H - this.h);
    const base = Math.max(6, Math.round(0.5 * Math.max(this.w, this.h)));
    const radius = Math.min(Math.max(this.W, this.H), base * (1 + Math.min(this.lost, 4)));
    const coarse = Math.max(1, this.stride);

    let best = -2;
    let bx = px;
    let by = py;
    const scan = (x0: number, x1: number, y0: number, y1: number, st: number) => {
      for (let y = Math.max(0, y0); y <= Math.min(this.H - this.h, y1); y += st) {
        for (let x = Math.max(0, x0); x <= Math.min(this.W - this.w, x1); x += st) {
          const s = this.ncc(frame, x, y);
          if (s > best) {
            best = s;
            bx = x;
            by = y;
          }
        }
      }
    };
    scan(px - radius, px + radius, py - radius, py + radius, coarse);
    if (coarse > 1) {
      const cx = bx;
      const cy = by;
      scan(cx - coarse, cx + coarse, cy - coarse, cy + coarse, 1);
    }

    if (best >= 0.45) {
      this.vx = 0.6 * (bx - this.x) + 0.4 * this.vx;
      this.vy = 0.6 * (by - this.y) + 0.4 * this.vy;
      this.x = bx;
      this.y = by;
      this.lost = 0;
      if (best > 0.75) {
        const patch = new Float32Array(this.tpl.length);
        this.sample(frame, bx, by, patch);
        for (let k = 0; k < patch.length; k++) this.tpl[k] = 0.9 * this.tpl[k]! + 0.1 * patch[k]!;
      }
    } else {
      // Occluded or lost: coast on the predicted motion and widen the search next frame.
      this.x = px;
      this.y = py;
      this.vx *= 0.7;
      this.vy *= 0.7;
      this.lost++;
    }
    return { cx: this.x + this.w / 2, cy: this.y + this.h / 2, score: best };
  }
}

/** Tracks through `count` frames packed in `frames`; yields to the UI between chunks. */
export async function trackFrames(
  frames: Uint8Array,
  W: number,
  H: number,
  count: number,
  box: Box,
  onProgress?: (f: number) => void,
): Promise<TrackPoint[]> {
  const size = W * H;
  const tracker = new TemplateTracker(frames.subarray(0, size), W, H, box);
  const out: TrackPoint[] = [tracker.center];
  for (let i = 1; i < count; i++) {
    out.push(tracker.step(frames.subarray(i * size, (i + 1) * size)));
    if (i % 15 === 0) {
      onProgress?.(i / count);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  onProgress?.(1);
  return out;
}

/** Centered moving average, applied twice (close to a gaussian). */
export function smooth(values: number[], radius: number): number[] {
  let cur = values;
  for (let pass = 0; pass < 2; pass++) {
    const next = new Array<number>(cur.length);
    for (let i = 0; i < cur.length; i++) {
      let s = 0;
      let c = 0;
      for (let j = Math.max(0, i - radius); j <= Math.min(cur.length - 1, i + radius); j++) {
        s += cur[j]!;
        c++;
      }
      next[i] = s / c;
    }
    cur = next;
  }
  return cur;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
