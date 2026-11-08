import type { MediaInfo } from "../probe";

export interface RunOptions {
  label: string;
  /** Overall progress range covered by this command, 0..1. */
  from: number;
  to: number;
  /** Expected output duration in seconds, used to turn FFmpeg's time= into progress. */
  seconds: number;
}

/**
 * What every tool pipeline receives. A pipeline reads `input`, writes temp files and returns
 * the name of its MP4 output — so pipelines can be chained later (combos).
 */
export interface PipelineContext {
  input: string;
  info: MediaInfo;
  tmp(ext: string): string;
  run(args: string[], opts: RunOptions): Promise<void>;
  report(label: string, fraction: number): void;
  read(name: string): Promise<Uint8Array>;
  write(name: string, data: Uint8Array): Promise<void>;
}

export type Pipeline<S> = (ctx: PipelineContext, settings: S) => Promise<string>;

export const VIDEO_ENCODE = [
  "-c:v",
  "libx264",
  "-preset",
  "veryfast",
  "-crf",
  "18",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
];

export const AUDIO_ENCODE = ["-c:a", "aac", "-b:a", "160k"];

export const EVEN = "scale=trunc(iw/2)*2:trunc(ih/2)*2";

export const fpsOf = (info: MediaInfo) => {
  const f = info.fps ?? 30;
  return Math.round(Math.min(Math.max(f, 1), 240) * 1000) / 1000;
};

/** Short side cap used by the "Rápido" processing mode on heavy tools. */
export const FAST_SHORT_SIDE = 720;
