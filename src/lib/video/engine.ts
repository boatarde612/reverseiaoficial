// FFmpeg (WebAssembly) engine running on the user's device. Browser-only: import lazily.
import type { FFmpeg } from "@ffmpeg/ffmpeg";

import { parseProbe, type MediaInfo } from "./probe";

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let lock: Promise<unknown> = Promise.resolve();

export type EngineState = "idle" | "loading" | "ready" | "error";
let state: EngineState = "idle";
const listeners = new Set<() => void>();
const setState = (s: EngineState) => {
  state = s;
  listeners.forEach((l) => l());
};
export const engineState = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function loadEngine(): Promise<FFmpeg> {
  if (instance) return Promise.resolve(instance);
  if (!loading) {
    setState("loading");
    loading = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import("@ffmpeg/ffmpeg"),
        import("@ffmpeg/util"),
      ]);
      const ff = new FFmpeg();
      await ff.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      });
      instance = ff;
      setState("ready");
      return ff;
    })().catch((e) => {
      loading = null;
      setState("error");
      throw e;
    });
  }
  return loading;
}

/** Stops any running command immediately. The engine reloads on the next use. */
export function terminateEngine() {
  if (instance) instance.terminate();
  instance = null;
  loading = null;
  lock = Promise.resolve();
  setState("idle");
}

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.catch(() => undefined);
  return run;
}

export interface ExecResult {
  code: number;
  log: string;
}

/** Runs one FFmpeg command; reports processed output seconds parsed from FFmpeg's log. */
export function exec(args: string[], onTime?: (seconds: number) => void): Promise<ExecResult> {
  return withLock(async () => {
    const ff = await loadEngine();
    const lines: string[] = [];
    const onLog = ({ message }: { message: string }) => {
      lines.push(message);
      if (onTime) {
        const m = message.match(/time=\s*(-?\d+):(\d+):(\d+(?:\.\d+)?)/);
        if (m) onTime(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
      }
    };
    ff.on("log", onLog);
    try {
      const code = await ff.exec(["-hide_banner", "-nostdin", ...args]);
      return { code, log: lines.join("\n") };
    } finally {
      ff.off("log", onLog);
    }
  });
}

export async function writeFile(name: string, data: Uint8Array) {
  const ff = await loadEngine();
  await ff.writeFile(name, data);
}

export async function readFile(name: string): Promise<Uint8Array> {
  const ff = await loadEngine();
  const data = await ff.readFile(name);
  if (typeof data === "string") return new TextEncoder().encode(data);
  return data;
}

export async function deleteFile(name: string) {
  if (!instance) return;
  try {
    await instance.deleteFile(name);
  } catch {
    // already gone
  }
}

/** Reads real duration/resolution/fps with FFmpeg. File must already be in the engine FS. */
export async function probeFile(name: string): Promise<MediaInfo | null> {
  const { log } = await exec(["-i", name]);
  return parseProbe(log);
}

/** Probe a user File: writes it, probes, removes it. */
export async function probeUpload(file: File, name: string): Promise<MediaInfo | null> {
  await writeFile(name, new Uint8Array(await file.arrayBuffer()));
  try {
    return await probeFile(name);
  } finally {
    await deleteFile(name);
  }
}

/** First frame as JPEG (works for MOV/HEVC that the browser player can't show). */
export async function extractFrame(file: File, maxWidth = 960): Promise<Blob | null> {
  const inName = `frame_in_${Date.now()}.${file.name.split(".").pop()}`;
  const outName = `frame_${Date.now()}.jpg`;
  await writeFile(inName, new Uint8Array(await file.arrayBuffer()));
  try {
    const { code } = await exec([
      "-i",
      inName,
      "-frames:v",
      "1",
      "-vf",
      `scale='min(${maxWidth},iw)':-2`,
      "-q:v",
      "3",
      outName,
    ]);
    if (code !== 0) return null;
    const data = await readFile(outName);
    return new Blob([data.slice().buffer], { type: "image/jpeg" });
  } finally {
    await deleteFile(inName);
    await deleteFile(outName);
  }
}

/** `count` frames spread over the clip, as small JPEGs (for AI analysis). */
export async function extractFrames(file: File, duration: number, count = 4, maxWidth = 448): Promise<Blob[]> {
  const stamp = Date.now();
  const inName = `frames_in_${stamp}.${file.name.split(".").pop()}`;
  await writeFile(inName, new Uint8Array(await file.arrayBuffer()));
  const out: Blob[] = [];
  try {
    for (let i = 0; i < count; i++) {
      const t = (duration * (i + 0.5)) / count;
      const name = `frames_${stamp}_${i}.jpg`;
      const { code } = await exec(["-ss", t.toFixed(3), "-i", inName, "-frames:v", "1", "-vf", `scale='min(${maxWidth},iw)':-2`, "-q:v", "5", name]);
      if (code === 0) {
        const data = await readFile(name);
        out.push(new Blob([data.slice().buffer], { type: "image/jpeg" }));
      }
      await deleteFile(name);
    }
  } finally {
    await deleteFile(inName);
  }
  return out;
}
