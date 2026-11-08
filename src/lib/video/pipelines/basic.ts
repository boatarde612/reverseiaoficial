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

export interface FpsSettings {
  targetFps: 60 | 90 | 120;
  intensity: Intensity;
  fast: boolean;
}

const FPS_LEVELS: Record<Intensity, string> = {
  10: "mi_mode=blend",
  20: "mi_mode=mci:mc_mode=obmc:me_mode=bilat",
  30: "mi_mode=mci:mc_mode=aobmc:me_mode=bidir",
  50: "mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1",
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
    `minterpolate=fps=${s.targetFps}:${FPS_LEVELS[s.intensity]}:scd=fdiff`,
    EVEN,
  ].join(",");
  await ctx.run(
    ["-i", ctx.input, "-map", "0:v:0", "-vf", vf, ...VIDEO_ENCODE, "-r", String(s.targetFps), ...audioMap(ctx), out],
    { label: `Criando quadros até ${s.targetFps} FPS`, from: 0, to: 1, seconds: ctx.info.duration },
  );
  return out;
};

/* ------------------------------- QUALIDADE ----------------------------- */

export interface QualitySettings {
  intensity: Intensity;
  upscale: boolean;
}

const QUALITY_LEVELS: Record<Intensity, string[]> = {
  10: ["hqdn3d=1.5:1.5:3:3", "cas=0.3"],
  20: ["hqdn3d=2.5:2:4:4", "cas=0.45"],
  30: ["hqdn3d=3.5:3:5:5", "cas=0.6", "eq=contrast=1.03:saturation=1.03"],
  50: ["hqdn3d=5:4:7:7", "cas=0.75", "unsharp=5:5:0.35:3:3:0", "eq=contrast=1.05:saturation=1.04"],
};

export const qualityPipeline: Pipeline<QualitySettings> = async (ctx, s) => {
  const out = ctx.tmp("mp4");
  const filters = ["setpts=PTS-STARTPTS"];
  const short = Math.min(ctx.info.width, ctx.info.height);
  if (s.upscale && short < 1080) {
    const k = 1080 / short;
    filters.push(`scale=${Math.round((ctx.info.width * k) / 2) * 2}:${Math.round((ctx.info.height * k) / 2) * 2}:flags=lanczos`);
  }
  filters.push(...QUALITY_LEVELS[s.intensity], EVEN);
  await ctx.run(
    ["-i", ctx.input, "-map", "0:v:0", "-vf", filters.join(","), ...VIDEO_ENCODE, ...audioMap(ctx), out],
    { label: "Reduzindo ruído e realçando detalhes", from: 0, to: 1, seconds: ctx.info.duration },
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
