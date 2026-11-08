import type { Intensity } from "@/lib/tools";

import { even, piecewiseExpr, workSize, type Keyframe } from "../expr";
import { smooth, trackFrames, type Box } from "../tracker";
import { AUDIO_ENCODE, EVEN, FAST_SHORT_SIDE, VIDEO_ENCODE, fpsOf, type Pipeline, type PipelineContext } from "./context";

/** Normalized box (0..1) over the video frame. */
export type NormBox = Box;

interface TrackResult {
  /** [seconds, normalized center] keyframes. */
  cx: Keyframe[];
  cy: Keyframe[];
}

const ANALYSIS_FPS = 15;
const ANALYSIS_WIDTH = 320;

async function analyzeMotion(
  ctx: PipelineContext,
  box: NormBox,
  smoothRadius: number,
  from: number,
  to: number,
): Promise<TrackResult> {
  const fps = Math.min(ANALYSIS_FPS, fpsOf(ctx.info));
  const AW = even(Math.min(ANALYSIS_WIDTH, ctx.info.width));
  const AH = even((AW * ctx.info.height) / ctx.info.width);
  const raw = ctx.tmp("raw");
  const mid = from + (to - from) * 0.45;

  await ctx.run(
    ["-i", ctx.input, "-an", "-vf", `setpts=PTS-STARTPTS,fps=${fps},scale=${AW}:${AH},format=gray`, "-f", "rawvideo", "-pix_fmt", "gray", raw],
    { label: "Lendo os quadros do vídeo", from, to: mid, seconds: ctx.info.duration },
  );
  const frames = await ctx.read(raw);
  const count = Math.floor(frames.length / (AW * AH));
  if (count < 2) throw new Error("O vídeo tem poucos quadros para rastrear.");

  const points = await trackFrames(
    frames,
    AW,
    AH,
    count,
    { x: box.x * AW, y: box.y * AH, w: box.w * AW, h: box.h * AH },
    (f) => ctx.report("Rastreando o objeto quadro a quadro", mid + (to - mid) * f),
  );

  const xs = smooth(points.map((p) => p.cx / AW), smoothRadius);
  const ys = smooth(points.map((p) => p.cy / AH), smoothRadius);
  // ~7–8 keyframes per second is plenty after smoothing and keeps expressions compact.
  const stepEvery = Math.max(1, Math.round(fps / 7.5));
  const cx: Keyframe[] = [];
  const cy: Keyframe[] = [];
  for (let i = 0; i < count; i += stepEvery) {
    cx.push([i / fps, xs[i]!]);
    cy.push([i / fps, ys[i]!]);
  }
  const last = count - 1;
  if (last % stepEvery !== 0) {
    cx.push([last / fps, xs[last]!]);
    cy.push([last / fps, ys[last]!]);
  }
  return { cx, cy };
}

const audioMap = (ctx: PipelineContext) =>
  ctx.info.hasAudio ? ["-map", "0:a:0?", ...AUDIO_ENCODE] : ["-an"];

/* ------------------------------- TRACKING ------------------------------ */

export type TrackingMode = "object" | "frame";
export type FrameAspect = "9:16" | "1:1" | "4:5" | "zoom";
export type Smoothness = "low" | "mid" | "high";

export interface TrackingSettings {
  mode: TrackingMode;
  box: NormBox | null;
  aspect: FrameAspect;
  smoothness: Smoothness;
}

const SMOOTH_RADIUS: Record<Smoothness, number> = { low: 2, mid: 5, high: 10 };

async function markerPng(w: number, h: number): Promise<Uint8Array> {
  const pad = 6;
  const cw = Math.round(w) + pad * 2;
  const ch = Math.round(h) + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const g = canvas.getContext("2d")!;
  const line = Math.max(3, Math.round(Math.min(w, h) / 28));
  const len = Math.max(10, Math.round(Math.min(w, h) / 4));
  g.fillStyle = "rgba(139, 92, 246, 0.10)";
  g.fillRect(pad, pad, w, h);
  g.strokeStyle = "rgba(167, 139, 250, 0.95)";
  g.lineWidth = line;
  g.lineCap = "round";
  const corners: [number, number, number, number][] = [
    [pad, pad, 1, 1],
    [pad + w, pad, -1, 1],
    [pad, pad + h, 1, -1],
    [pad + w, pad + h, -1, -1],
  ];
  for (const [x, y, dx, dy] of corners) {
    g.beginPath();
    g.moveTo(x, y + dy * len);
    g.lineTo(x, y);
    g.lineTo(x + dx * len, y);
    g.stroke();
  }
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("Não foi possível criar o marcador de tracking.");
  return new Uint8Array(await blob.arrayBuffer());
}

function cropSize(W: number, H: number, aspect: FrameAspect) {
  if (aspect === "zoom") return { cw: even(W / 1.5), ch: even(H / 1.5) };
  const [a = 9, b = 16] = aspect.split(":").map(Number);
  const r = a / b;
  if (W / H > r) return { cw: even(H * r), ch: even(H) };
  return { cw: even(W), ch: even(W / r) };
}

export const trackingPipeline: Pipeline<TrackingSettings> = async (ctx, s) => {
  if (!s.box) throw new Error("Marque o objeto no primeiro quadro antes de processar.");
  const W = even(ctx.info.width);
  const H = even(ctx.info.height);
  const radius = s.mode === "object" ? 1 : SMOOTH_RADIUS[s.smoothness];
  const track = await analyzeMotion(ctx, s.box, radius, 0, 0.5);
  const out = ctx.tmp("mp4");
  const D = ctx.info.duration;

  if (s.mode === "object") {
    const bw = s.box.w * W;
    const bh = s.box.h * H;
    const marker = ctx.tmp("png");
    await ctx.write(marker, await markerPng(bw, bh));
    const pad = 6;
    const X = piecewiseExpr(track.cx.map(([t, v]) => [t, v * W - bw / 2 - pad]), "t");
    const Y = piecewiseExpr(track.cy.map(([t, v]) => [t, v * H - bh / 2 - pad]), "t");
    const graph = `[0:v]setpts=PTS-STARTPTS,scale=${W}:${H}[base];[base][1:v]overlay=x='${X}':y='${Y}':eval=frame:shortest=1,${EVEN}[v]`;
    await ctx.run(
      ["-i", ctx.input, "-loop", "1", "-i", marker, "-filter_complex", graph, "-map", "[v]", ...VIDEO_ENCODE, ...audioMap(ctx), "-t", D.toFixed(3), out],
      { label: "Desenhando o tracking no vídeo", from: 0.5, to: 1, seconds: D },
    );
    return out;
  }

  const { cw, ch } = cropSize(W, H, s.aspect);
  const clampTo = (v: number, max: number) => Math.min(max, Math.max(0, v));
  const X = piecewiseExpr(track.cx.map(([t, v]) => [t, clampTo(v * W - cw / 2, W - cw)]), "t");
  const Y = piecewiseExpr(track.cy.map(([t, v]) => [t, clampTo(v * H - ch / 2, H - ch)]), "t");
  const scaleBack = s.aspect === "zoom" ? `,scale=${W}:${H}:flags=lanczos` : "";
  const vf = `setpts=PTS-STARTPTS,scale=${W}:${H},crop=w=${cw}:h=${ch}:x='${X}':y='${Y}'${scaleBack},${EVEN}`;
  await ctx.run(
    ["-i", ctx.input, "-map", "0:v:0", "-vf", vf, ...VIDEO_ENCODE, ...audioMap(ctx), out],
    { label: "Acompanhando o enquadramento", from: 0.5, to: 1, seconds: D },
  );
  return out;
};

/* --------------------------------- ZOOM -------------------------------- */

export type ZoomMode = "in" | "out" | "smooth" | "dynamic" | "approach" | "retreat" | "track";

export interface ZoomSettings {
  mode: ZoomMode;
  intensity: Intensity;
  /** Seconds the zoom-in / zoom-out takes. */
  transition: number;
  /** Seconds between punches in dynamic mode. */
  period: number;
  box: NormBox | null;
  fast: boolean;
}

const ZOOM_AMOUNT: Record<Intensity, number> = { 10: 0.1, 20: 0.2, 30: 0.3, 50: 0.5 };

/** Zoom factor expression of time variable `it` (input seconds). */
export function zoomExpr(s: ZoomSettings, duration: number): string {
  const k = ZOOM_AMOUNT[s.intensity];
  const tr = Math.max(0.1, s.transition).toFixed(3);
  const D = Math.max(0.1, duration).toFixed(3);
  const ease = (x: string) => `(${x}*${x}*(3-2*${x}))`;
  switch (s.mode) {
    case "in":
    case "track":
      return `1+${k}*${ease(`clip(it/${tr},0,1)`)}`;
    case "out":
      return `1+${k}*(1-${ease(`clip(it/${tr},0,1)`)})`;
    case "smooth":
      return `1+${k}*${ease(`clip(it/${D},0,1)`)}`;
    case "dynamic": {
      const p = Math.max(0.2, s.period).toFixed(3);
      return `1+${k}*exp(-5*mod(it,${p})/${p})`;
    }
    case "approach":
      return `1+${k}*clip(it/${D},0,1)`;
    case "retreat":
      return `1+${k}*(1-clip(it/${D},0,1))`;
  }
}

export const zoomPipeline: Pipeline<ZoomSettings> = async (ctx, s) => {
  if (s.mode === "track" && !s.box) throw new Error("Marque o objeto que o zoom deve seguir.");
  const fps = fpsOf(ctx.info);
  const D = ctx.info.duration;
  const { w: W, h: H } = workSize(ctx.info.width, ctx.info.height, s.fast ? FAST_SHORT_SIDE : null);
  // Zoompan crops on whole pixels; working at 2x keeps slow zooms from shaking.
  const k = Math.min(W, H) <= 720 ? 2 : 1;
  let from = 0;
  let cxExpr = "0.5";
  let cyExpr = "0.5";
  if (s.mode === "track" && s.box) {
    const track = await analyzeMotion(ctx, s.box, 6, 0, 0.4);
    cxExpr = piecewiseExpr(track.cx, "it");
    cyExpr = piecewiseExpr(track.cy, "it");
    from = 0.4;
  }
  const z = zoomExpr(s, D);
  const x = `max(0,min(iw-iw/zoom,(${cxExpr})*iw-iw/zoom/2))`;
  const y = `max(0,min(ih-ih/zoom,(${cyExpr})*ih-ih/zoom/2))`;
  const vf = [
    "setpts=PTS-STARTPTS",
    `fps=${fps}`,
    `scale=${W * k}:${H * k}:flags=lanczos`,
    `zoompan=z='${z}':x='${x}':y='${y}':d=1:s=${W}x${H}:fps=${fps}`,
    EVEN,
  ].join(",");
  const out = ctx.tmp("mp4");
  await ctx.run(
    ["-i", ctx.input, "-map", "0:v:0", "-vf", vf, ...VIDEO_ENCODE, ...audioMap(ctx), out],
    { label: "Aplicando o zoom com keyframes", from, to: 1, seconds: D },
  );
  return out;
};
