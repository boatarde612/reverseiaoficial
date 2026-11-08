// Time remap math: a speed curve over input time -> output timestamps.
import { piecewiseValue, type Keyframe } from "./expr";

export const MIN_SPEED = 0.1;
export const MAX_SPEED = 8;

export type RemapMode = "slow" | "fast" | "ramp" | "accel" | "decel" | "segment";

export interface RemapSettings {
  mode: RemapMode;
  /** Constant speed for slow/fast; target speed for accel/decel/segment. */
  speed: number;
  /** Speed of the slow moment inside a speed ramp. */
  rampSlow: number;
  /** Speed of the fast parts of a speed ramp. */
  rampFast: number;
  /** Seconds (input time) where the ramp/accel/decel happens. */
  at: number;
  /** Segment end (input time) for "segment" mode. */
  until: number;
  /** Transition duration in seconds. */
  transition: number;
}

const clampSpeed = (s: number) => Math.min(MAX_SPEED, Math.max(MIN_SPEED, s));

/** Speed control points as [inputTime, speed], linear in between. */
export function speedCurve(s: RemapSettings, duration: number): Keyframe[] {
  const D = duration;
  const tr = Math.max(0.05, s.transition);
  const at = Math.min(Math.max(0, s.at), D);
  const pts: Keyframe[] = [];
  switch (s.mode) {
    case "slow":
    case "fast":
      return [[0, clampSpeed(s.speed)], [D, clampSpeed(s.speed)]];
    case "ramp": {
      const hold = 0.15;
      const f = clampSpeed(s.rampFast);
      const sl = clampSpeed(s.rampSlow);
      pts.push([0, f], [at - hold - tr, f], [at - hold, sl], [at + hold, sl], [at + hold + tr, f], [D, f]);
      break;
    }
    case "accel":
    case "decel":
      pts.push([0, 1], [at, 1], [at + tr, clampSpeed(s.speed)], [D, clampSpeed(s.speed)]);
      break;
    case "segment": {
      const end = Math.min(Math.max(at, s.until), D);
      const v = clampSpeed(s.speed);
      pts.push([0, 1], [at - tr, 1], [at, v], [end, v], [end + tr, 1], [D, 1]);
      break;
    }
  }
  // Keep points inside the clip, evaluating the curve at the borders.
  const inside = pts.filter(([x]) => x > 0 && x < D);
  const raw = [...pts].sort((a, b) => a[0] - b[0]);
  const at0 = piecewiseValue(raw, 0);
  const atD = piecewiseValue(raw, D);
  return [[0, at0], ...inside, [D, atD]];
}

/**
 * Output time for each input keyframe: out(t) = ∫ 1/speed(u) du.
 * Returns [inputTime, outputTime] keyframes sampled every `step` seconds.
 */
export function timeMap(curve: Keyframe[], duration: number, step = 0.1): Keyframe[] {
  const dt = 1 / 2000;
  const out: Keyframe[] = [[0, 0]];
  let acc = 0;
  let nextSample = step;
  for (let t = 0; t < duration - 1e-9; t += dt) {
    const h = Math.min(dt, duration - t);
    const mid = t + h / 2;
    acc += h / piecewiseValue(curve, mid);
    const tn = t + h;
    if (tn >= nextSample - 1e-9 || tn >= duration - 1e-9) {
      out.push([tn, acc]);
      nextSample += step;
    }
  }
  return out;
}

export function outputDuration(curve: Keyframe[], duration: number): number {
  const map = timeMap(curve, duration, duration);
  return map[map.length - 1][1];
}

/** atempo accepts 0.5–2.0 per instance in the bundled FFmpeg; chain to reach other speeds. */
export function atempoChain(speed: number): string {
  const parts: number[] = [];
  let s = speed;
  while (s > 2) {
    parts.push(2);
    s /= 2;
  }
  while (s < 0.5) {
    parts.push(0.5);
    s /= 0.5;
  }
  parts.push(s);
  return parts.map((p) => `atempo=${Math.round(p * 10000) / 10000}`).join(",");
}
