import type { Intensity } from "@/lib/tools";

import { workSize } from "../expr";
import { atempoChain, outputDuration, speedCurve, timeMap, type RemapSettings } from "../speed";
import { piecewiseExpr } from "../expr";
import {
  AUDIO_ENCODE,
  EVEN,
  FAST_SHORT_SIDE,
  VIDEO_ENCODE,
  fpsOf,
  type Pipeline,
  type PipelineContext,
} from "./context";

const scaleFor = (ctx: PipelineContext, fast: boolean) => {
  const { w, h } = workSize(ctx.info.width, ctx.info.height, fast ? FAST_SHORT_SIDE : null);
  return { w, h, filter: `scale=${w}:${h}:flags=lanczos` };
};

const audioMap = (ctx: PipelineContext) =>
  ctx.info.hasAudio ? ["-map", "0:a:0", ...AUDIO_ENCODE] : [];

/* ------------------------------- REVERSE ------------------------------- */

export type ReverseAudio = "silence" | "none" | "reverse";
export interface ReverseSettings {
  audio: ReverseAudio;
}

export const reversePipeline: Pipeline<ReverseSettings> = async (ctx, s) => {
  const fps = fpsOf(ctx.info);
  const D = ctx.info.duration;
  const frame = 1 / fps;
  const total = D + Math.max(0, D - frame);
  const out = ctx.tmp("mp4");

  let graph =
    `[0:v]setpts=PTS-STARTPTS,format=yuv420p,split=2[f][b];` +
    `[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];` +
    `[f][r]concat=n=2:v=1:a=0,${EVEN}[v]`;
  const maps = ["-map", "[v]"];
  let audio: string[] = ["-an"];

  if (ctx.info.hasAudio && s.audio === "silence") {
    graph += `;[0:a]asetpts=PTS-STARTPTS,apad[a]`;
    maps.push("-map", "[a]");
    audio = AUDIO_ENCODE;
  } else if (ctx.info.hasAudio && s.audio === "reverse") {
    graph +=
      `;[0:a]asetpts=PTS-STARTPTS,asplit=2[a1][a2];` +
      `[a2]areverse,atrim=start=${frame.toFixed(4)},asetpts=PTS-STARTPTS[ar];` +
      `[a1][ar]concat=n=2:v=0:a=1[a]`;
    maps.push("-map", "[a]");
    audio = AUDIO_ENCODE;
  }

  await ctx.run(
    ["-i", ctx.input, "-filter_complex", graph, ...maps, ...VIDEO_ENCODE, ...audio, "-t", total.toFixed(3), out],
    { label: "Invertendo e unindo", from: 0, to: 1, seconds: total },
  );
  return out;
};

/* --------------------------------- RSMB -------------------------------- */

export interface RsmbSettings {
  intensity: Intensity;
  fast: boolean;
}

// Sub-frames created by motion-compensated interpolation, then blended: a blur that follows
// each pixel's motion vector (what RSMB does), not a plain gaussian.
const RSMB_LEVELS: Record<Intensity, { sub: number; weights: string }> = {
  10: { sub: 3, weights: "1 2 4" },
  20: { sub: 3, weights: "1 1 1" },
  30: { sub: 4, weights: "1 1 1 1" },
  50: { sub: 6, weights: "1 1 1 1 1 1" },
};

export const rsmbPipeline: Pipeline<RsmbSettings> = async (ctx, s) => {
  const fps = fpsOf(ctx.info);
  const { sub, weights } = RSMB_LEVELS[s.intensity];
  const { filter } = scaleFor(ctx, s.fast);
  const out = ctx.tmp("mp4");
  const vf = [
    "setpts=PTS-STARTPTS",
    filter,
    `minterpolate=fps=${fps * sub}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=fdiff`,
    `tmix=frames=${sub}:weights='${weights}'`,
    `fps=${fps}`,
    EVEN,
  ].join(",");
  await ctx.run(
    ["-i", ctx.input, "-map", "0:v:0", "-vf", vf, ...VIDEO_ENCODE, ...audioMap(ctx), out],
    { label: "Analisando movimento e aplicando blur", from: 0, to: 1, seconds: ctx.info.duration },
  );
  return out;
};

/* -------------------------------- FPS MOD ------------------------------ */

export type InterpQuality = "fast" | "precise";
export interface FpsSettings {
  targetFps: 60 | 90 | 120;
  quality: InterpQuality;
  fast: boolean;
}

const FPS_MODES: Record<InterpQuality, string> = {
  fast: "mi_mode=mci:mc_mode=obmc:me_mode=bilat",
  precise: "mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
};

export const fpsPipeline: Pipeline<FpsSettings> = async (ctx, s) => {
  const src = fpsOf(ctx.info);
  if (src >= s.targetFps - 0.5) {
    throw new Error(`Seu vídeo já tem ${Math.round(src)} FPS. Escolha uma saída maior.`);
  }
  const { filter } = scaleFor(ctx, s.fast);
  const out = ctx.tmp("mp4");
  const vf = [
    "setpts=PTS-STARTPTS",
    filter,
    `minterpolate=fps=${s.targetFps}:${FPS_MODES[s.quality]}:scd=fdiff`,
    EVEN,
  ].join(",");
  await ctx.run(
    ["-i", ctx.input, "-map", "0:v:0", "-vf", vf, ...VIDEO_ENCODE, "-r", String(s.targetFps), ...audioMap(ctx), out],
    { label: `Criando quadros até ${s.targetFps} FPS`, from: 0, to: 1, seconds: ctx.info.duration },
  );
  return out;
};

/* ------------------------------- QUALIDADE ----------------------------- */

export type Level = "off" | "light" | "strong";
export interface QualitySettings {
  /** Target short side: 0 keeps the original; 1080, 1440 or 2160 (4K). */
  upscale: 0 | 1080 | 1440 | 2160;
  denoise: Level;
  sharpen: Level;
}

const DENOISE: Record<Level, string[]> = { off: [], light: ["hqdn3d=1.5:1.5:3:3"], strong: ["hqdn3d=4:3:6:6"] };
const SHARPEN: Record<Level, string[]> = { off: [], light: ["cas=0.4"], strong: ["cas=0.7", "unsharp=5:5:0.35:3:3:0"] };

export function qualityFilters(s: QualitySettings, width: number, height: number): string[] {
  const filters = ["setpts=PTS-STARTPTS"];
  const short = Math.min(width, height);
  if (s.upscale && short < s.upscale) {
    const k = s.upscale / short;
    filters.push(`scale=${Math.round((width * k) / 2) * 2}:${Math.round((height * k) / 2) * 2}:flags=lanczos`);
  }
  filters.push(...DENOISE[s.denoise], ...SHARPEN[s.sharpen], EVEN);
  return filters;
}

export const qualityPipeline: Pipeline<QualitySettings> = async (ctx, s) => {
  const out = ctx.tmp("mp4");
  await ctx.run(
    ["-i", ctx.input, "-map", "0:v:0", "-vf", qualityFilters(s, ctx.info.width, ctx.info.height).join(","), ...VIDEO_ENCODE, ...audioMap(ctx), out],
    { label: "Reduzindo ruído e realçando detalhes", from: 0, to: 1, seconds: ctx.info.duration },
  );
  return out;
};

/* -------------------------------- CC DARK ------------------------------ */

export interface CcDarkSettings {
  /** All in -1..1 except contrast/saturation (0.5..1.5 / 0..1.5). */
  exposure: number;
  contrast: number;
  saturation: number;
  shadows: number;
  highlights: number;
  temperature: number;
}

export const CC_DARK_PRESET: CcDarkSettings = {
  exposure: -0.15,
  contrast: 1.15,
  saturation: 0.8,
  shadows: -0.3,
  highlights: -0.2,
  temperature: -0.35,
};

const r3 = (v: number) => Math.round(v * 1000) / 1000;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Dark cinematic grade. Black point is lifted slightly so shadows keep detail. */
export function ccDarkFilters(s: CcDarkSettings): string[] {
  const sh = r3(clamp(0.25 + 0.1 * s.shadows, 0.1, 0.4));
  const hl = r3(clamp(0.75 + 0.1 * s.highlights, 0.6, 0.9));
  const t = clamp(s.temperature, -1, 1);
  return [
    `eq=brightness=${r3(clamp(s.exposure, -1, 1) * 0.2)}:contrast=${r3(clamp(s.contrast, 0.5, 1.5))}:saturation=${r3(clamp(s.saturation, 0, 1.5))}`,
    `curves=all='0/0.03 0.25/${sh} 0.75/${hl} 1/0.97'`,
    // Temperature, plus a cool tint in the shadows for the cinematic look.
    `colorbalance=rs=${r3(t * 0.08)}:bs=${r3(-t * 0.08 + 0.04)}:rm=${r3(t * 0.06)}:bm=${r3(-t * 0.06)}:rh=${r3(t * 0.04)}:bh=${r3(-t * 0.04)}`,
  ];
}

/** Approximate on-screen preview of the grade (CSS filter). */
export function ccDarkCss(s: CcDarkSettings): string {
  const b = 1 + s.exposure * 0.2 + (s.shadows + s.highlights) * 0.05;
  return `brightness(${r3(b)}) contrast(${r3(s.contrast)}) saturate(${r3(s.saturation)}) hue-rotate(${r3(-s.temperature * 8)}deg)`;
}

export const ccDarkPipeline: Pipeline<CcDarkSettings> = async (ctx, s) => {
  const out = ctx.tmp("mp4");
  const vf = ["setpts=PTS-STARTPTS", ...ccDarkFilters(s), EVEN].join(",");
  await ctx.run(
    ["-i", ctx.input, "-map", "0:v:0", "-vf", vf, ...VIDEO_ENCODE, ...audioMap(ctx), out],
    { label: "Aplicando correção de cor", from: 0, to: 1, seconds: ctx.info.duration },
  );
  return out;
};

/* ------------------------------- TIME REMAP ---------------------------- */

export interface TimeRemapSettings extends RemapSettings {
  interpolate: boolean;
}

export const timeRemapPipeline: Pipeline<TimeRemapSettings> = async (ctx, s) => {
  const fps = Math.min(60, fpsOf(ctx.info));
  const D = ctx.info.duration;
  const curve = speedCurve(s, D);
  const outDur = outputDuration(curve, D);
  const constant = s.mode === "slow" || s.mode === "fast";
  const minSpeed = Math.min(...curve.map((p) => p[1]));
  const out = ctx.tmp("mp4");

  const filters = ["setpts=PTS-STARTPTS"];
  if (constant) {
    filters.push(`setpts=PTS/${s.speed}`);
  } else {
    const map = timeMap(curve, D, 0.1);
    filters.push(`setpts='(${piecewiseExpr(map, "T")})/TB'`);
  }
  if (s.interpolate && minSpeed < 1) {
    filters.push(`minterpolate=fps=${fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=fdiff`);
  } else {
    filters.push(`fps=${fps}`);
  }
  filters.push(EVEN);

  const audio =
    constant && ctx.info.hasAudio
      ? ["-map", "0:a:0", "-af", `asetpts=PTS-STARTPTS,${atempoChain(s.speed)}`, ...AUDIO_ENCODE]
      : ["-an"];

  await ctx.run(
    ["-i", ctx.input, "-map", "0:v:0", "-vf", filters.join(","), ...VIDEO_ENCODE, ...audio, "-t", outDur.toFixed(3), out],
    { label: "Remapeando o tempo", from: 0, to: 1, seconds: outDur },
  );
  return out;
};
