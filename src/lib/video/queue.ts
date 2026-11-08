// On-device job queue: one job runs at a time; every job has id, tool, status, real progress,
// input/output and error message. Temp files are removed from the engine when a job ends.
import type { ToolId } from "@/lib/tools";

import { deleteFile, exec, probeFile, readFile, terminateEngine, writeFile } from "./engine";
import { fileExtension } from "./limits";
import type { Pipeline, PipelineContext } from "./pipelines/context";
import type { MediaInfo } from "./probe";

export type JobStatus = "queued" | "running" | "done" | "error" | "cancelled";

export interface JobResult {
  url: string;
  fileName: string;
  size: number;
  info: MediaInfo | null;
}

export interface Job {
  id: string;
  tool: ToolId;
  status: JobStatus;
  progress: number;
  stage: string;
  inputName: string;
  outputName?: string;
  error?: string;
  createdAt: number;
  result?: JobResult;
}

interface Pending {
  job: Job;
  file: File;
  info: MediaInfo;
  run: (ctx: PipelineContext) => Promise<string>;
}

let jobs: Job[] = [];
const pending: Pending[] = [];
let active: string | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const patch = (id: string, p: Partial<Job>) => {
  jobs = jobs.map((j) => (j.id === id ? { ...j, ...p } : j));
  emit();
};

export const jobStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getAll: () => jobs,
  get: (id: string | null) => (id ? jobs.find((j) => j.id === id) : undefined),
};

class Cancelled extends Error {}

export function enqueue<S>(tool: ToolId, file: File, info: MediaInfo, pipeline: Pipeline<S>, settings: S): string {
  const id = `${tool}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const job: Job = {
    id,
    tool,
    status: "queued",
    progress: 0,
    stage: "Na fila",
    inputName: file.name,
    createdAt: Date.now(),
  };
  jobs = [...jobs, job];
  pending.push({ job, file, info, run: (ctx) => pipeline(ctx, settings) });
  emit();
  void pump();
  return id;
}

export function cancelJob(id: string) {
  const idx = pending.findIndex((p) => p.job.id === id);
  if (idx >= 0) {
    pending.splice(idx, 1);
    patch(id, { status: "cancelled", stage: "Cancelado" });
    return;
  }
  if (active === id) {
    patch(id, { status: "cancelled", stage: "Cancelado" });
    terminateEngine();
  }
}

/** Frees the result video from memory. */
export function discardJob(id: string) {
  const job = jobStore.get(id);
  if (job?.result) URL.revokeObjectURL(job.result.url);
  jobs = jobs.filter((j) => j.id !== id);
  emit();
}

async function pump() {
  if (active) return;
  const next = pending.shift();
  if (!next) return;
  active = next.job.id;
  try {
    await runJob(next);
  } finally {
    active = null;
    void pump();
  }
}

function friendlyError(log: string): string {
  const lines = log.split("\n").filter((l) => /error|invalid|failed|not found|cannot|unable/i.test(l));
  return lines.slice(-2).join(" · ").slice(0, 300) || "O processamento falhou.";
}

async function runJob({ job, file, info, run }: Pending) {
  const id = job.id;
  const temps: string[] = [];
  let n = 0;
  const isCancelled = () => jobStore.get(id)?.status === "cancelled";
  const input = `in_${id}.${fileExtension(file.name) || "mp4"}`;
  temps.push(input);

  const ctx: PipelineContext = {
    input,
    info,
    tmp(ext) {
      const name = `tmp_${id}_${n++}.${ext}`;
      temps.push(name);
      return name;
    },
    async run(args, o) {
      if (isCancelled()) throw new Cancelled();
      patch(id, { stage: o.label, progress: o.from });
      const r = await exec(args, (t) => {
        const f = o.seconds > 0 ? Math.min(1, Math.max(0, t / o.seconds)) : 0;
        const p = o.from + (o.to - o.from) * f;
        if (!isCancelled()) patch(id, { progress: p });
      });
      if (isCancelled()) throw new Cancelled();
      if (r.code !== 0) throw new Error(friendlyError(r.log));
    },
    report(label, fraction) {
      if (!isCancelled()) patch(id, { stage: label, progress: fraction });
    },
    read: readFile,
    write: writeFile,
  };

  try {
    patch(id, { status: "running", stage: "Preparando o motor de vídeo", progress: 0 });
    await writeFile(input, new Uint8Array(await file.arrayBuffer()));
    const output = await run(ctx);
    patch(id, { stage: "Finalizando", progress: 1, outputName: output });
    const outInfo = await probeFile(output);
    const data = await readFile(output);
    const blob = new Blob([data.slice().buffer], { type: "video/mp4" });
    const base = file.name.replace(/\.[^.]+$/, "");
    patch(id, {
      status: "done",
      stage: "Pronto",
      progress: 1,
      result: {
        url: URL.createObjectURL(blob),
        fileName: `reverse-ia-${job.tool}-${base}.mp4`,
        size: blob.size,
        info: outInfo,
      },
    });
  } catch (e) {
    if (e instanceof Cancelled || isCancelled()) {
      patch(id, { status: "cancelled", stage: "Cancelado" });
    } else {
      patch(id, { status: "error", stage: "Erro", error: e instanceof Error ? e.message : String(e) });
    }
  } finally {
    for (const t of temps) await deleteFile(t);
  }
}

// Keep exec import used for future steps that need raw access (e.g. combos).
export { exec as runCommand };
