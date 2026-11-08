import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Download, FileVideo, Loader2, RefreshCw, Upload, X } from "lucide-react";

import { ToolIcon } from "@/components/ToolIcon";
import { Button } from "@/components/ui/button";
import type { ToolMeta } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { engineState, extractFrame, probeUpload } from "@/lib/video/engine";
import { ACCEPT_ATTR, MAX_FILE_MB, fileExtension, validateDuration, validateFile } from "@/lib/video/limits";
import { formatDuration, type MediaInfo } from "@/lib/video/probe";
import { cancelJob, discardJob, enqueue, jobStore } from "@/lib/video/queue";

import { TOOL_DEFS } from "./registry";

interface Upload {
  file: File;
  url: string;
  info: MediaInfo | null;
  frameUrl: string | null;
}

function useJob(id: string | null) {
  return useSyncExternalStore(
    jobStore.subscribe,
    () => jobStore.get(id),
    () => undefined,
  );
}

export function ToolWorkspace({ tool }: { tool: ToolMeta }) {
  const def = TOOL_DEFS[tool.id];
  const [settings, setSettings] = useState(def.defaults);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const job = useJob(jobId);
  const engine = useSyncExternalStore(engineState.subscribe, engineState.get, () => "idle" as const);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<Upload | null>(null);
  uploadRef.current = upload;

  useEffect(
    () => () => {
      const u = uploadRef.current;
      if (u) {
        URL.revokeObjectURL(u.url);
        if (u.frameUrl) URL.revokeObjectURL(u.frameUrl);
      }
    },
    [],
  );

  // First frame for object selection (tracking / zoom with tracking).
  const needsFrame = def.needsFrame(settings);
  useEffect(() => {
    if (!needsFrame || !upload?.info || upload.frameUrl) return;
    let alive = true;
    void extractFrame(upload.file).then((blob) => {
      if (!alive || !blob) return;
      const frameUrl = URL.createObjectURL(blob);
      setUpload((u) => (u && u.file === upload.file ? { ...u, frameUrl } : u));
    });
    return () => {
      alive = false;
    };
  }, [needsFrame, upload]);

  useEffect(() => {
    if (job?.status === "done") resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [job?.status]);

  const reset = () => {
    if (upload) {
      URL.revokeObjectURL(upload.url);
      if (upload.frameUrl) URL.revokeObjectURL(upload.frameUrl);
    }
    if (jobId) discardJob(jobId);
    setJobId(null);
    setUpload(null);
    setError(null);
    setSettings(def.defaults);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const fileErr = validateFile(file);
    if (fileErr) {
      setError(fileErr);
      return;
    }
    reset();
    const url = URL.createObjectURL(file);
    setUpload({ file, url, info: null, frameUrl: null });
    setChecking(true);
    try {
      // Fast check with the browser player when it can read the file…
      const quick = await browserDuration(url);
      if (quick != null) {
        const e = validateDuration(tool.id, quick);
        if (e) throw new Error(e);
      }
      // …then the real check with FFmpeg on the device.
      const info = await probeUpload(file, `probe_${Date.now()}.${fileExtension(file.name)}`);
      if (!info) throw new Error("Não foi possível ler este vídeo. Tente outro arquivo MP4 ou MOV.");
      const e = validateDuration(tool.id, info.duration);
      if (e) throw new Error(e);
      setUpload((u) => (u && u.file === file ? { ...u, info } : u));
    } catch (e) {
      URL.revokeObjectURL(url);
      setUpload(null);
      setError(
        e instanceof Error && !/fetch|network|load/i.test(e.message)
          ? e.message
          : "Não foi possível carregar o motor de vídeo. Verifique sua conexão e tente de novo.",
      );
    } finally {
      setChecking(false);
    }
  };

  const info = upload?.info ?? null;
  const notReady = info ? def.ready(settings, info) : "Escolha um vídeo primeiro.";
  const busy = job?.status === "queued" || job?.status === "running";

  const process = () => {
    if (!upload?.info || notReady) return;
    if (jobId) discardJob(jobId);
    setJobId(enqueue(tool.id, upload.file, upload.info, def.pipeline, settings));
  };

  const Settings = def.Settings;

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-4">
      {/* Topo: nome, voltar, player */}
      <header className="flex items-center gap-3 py-2">
        <Link
          to="/"
          aria-label="Voltar"
          className="flex size-11 items-center justify-center rounded-full border border-border bg-surface-raised transition-colors hover:border-primary/50"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-primary glow-ring">
          <ToolIcon id={tool.id} className="size-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-semibold leading-tight">{tool.name}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {tool.tagline} · até {tool.maxSeconds >= 60 ? "1 min" : `${tool.maxSeconds} s`}
          </p>
        </div>
      </header>

      <section className="mt-3 overflow-hidden rounded-3xl border border-border bg-surface">
        {upload ? (
          <video
            key={upload.url}
            src={upload.url}
            controls
            playsInline
            muted
            loop
            className="aspect-video w-full bg-background object-contain"
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="bg-grid flex aspect-video w-full flex-col items-center justify-center gap-3 text-muted-foreground"
          >
            <span className="flex size-14 items-center justify-center rounded-full border border-primary/40 bg-accent animate-glow-pulse">
              <Upload className="size-6 text-primary-glow" />
            </span>
            <span className="text-sm">Nenhum vídeo escolhido</span>
          </button>
        )}
      </section>

      {/* Centro: escolher vídeo, configurações */}
      <section className="mt-4 space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <div className="surface-card p-4">
          {upload ? (
            <div className="flex items-start gap-3">
              <FileVideo className="mt-0.5 size-5 shrink-0 text-primary-glow" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{upload.file.name}</p>
                {info ? (
                  <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                    <Meta k="Duração" v={formatDuration(info.duration)} />
                    <Meta k="Resolução" v={`${info.width}×${info.height}`} />
                    <Meta k="Formato" v={`${fileExtension(upload.file.name).toUpperCase()} · ${info.videoCodec}`} />
                    <Meta k="FPS" v={info.fps ? info.fps.toFixed(info.fps % 1 ? 2 : 0) : "—"} />
                  </dl>
                ) : (
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    {engine === "loading"
                      ? "Baixando o motor de vídeo (≈ 31 MB, só na primeira vez)…"
                      : "Verificando duração e formato…"}
                  </p>
                )}
              </div>
              <Button variant="surface" size="sm" onClick={() => inputRef.current?.click()} disabled={busy || checking}>
                <RefreshCw /> Trocar
              </Button>
            </div>
          ) : (
            <Button variant="surface" size="xl" className="w-full" onClick={() => inputRef.current?.click()}>
              <Upload /> ESCOLHER VÍDEO
            </Button>
          )}
          {!upload && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              MP4 ou MOV · até {tool.maxSeconds >= 60 ? "1 minuto" : `${tool.maxSeconds} segundos`} · máx. {MAX_FILE_MB} MB
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/15 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          )}
        </div>

        <div className={cn("surface-card space-y-5 p-4", !info && "pointer-events-none opacity-50")}>
          <h2 className="eyebrow">Configurações</h2>
          <Settings value={settings} onChange={setSettings} info={info} frameUrl={upload?.frameUrl ?? null} />
          {tool.heavy && (
            <p className="text-xs text-muted-foreground">
              Esta ferramenta calcula o movimento de cada quadro no seu aparelho e pode levar vários minutos em
              vídeos longos.
            </p>
          )}
        </div>
      </section>

      {/* Base: processar, progresso, preview, baixar */}
      <section className="mt-4 space-y-4">
        {busy && job ? (
          <div className="surface-card p-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Loader2 className="size-4 animate-spin text-primary-glow" /> {job.stage}
              </span>
              <span className="font-mono text-primary-glow">{Math.round(job.progress * 100)}%</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-primary transition-[width] duration-300"
                style={{ width: `${Math.max(2, job.progress * 100)}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Mantenha esta página aberta até terminar.</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => cancelJob(job.id)}>
              <X /> Cancelar
            </Button>
          </div>
        ) : (
          <>
            <Button variant="hero" size="xl" className="w-full" disabled={!!notReady || checking} onClick={process}>
              PROCESSAR VÍDEO
            </Button>
            {info && notReady && <p className="text-center text-xs text-muted-foreground">{notReady}</p>}
          </>
        )}

        {job?.status === "error" && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/15 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {job.error}
          </p>
        )}
        {job?.status === "cancelled" && (
          <p className="text-center text-sm text-muted-foreground">Processamento cancelado.</p>
        )}

        {job?.status === "done" && job.result && (
          <div ref={resultRef} className="surface-card scroll-mt-4 overflow-hidden glow-ring">
            <div className="p-4 pb-3">
              <h2 className="eyebrow">Resultado</h2>
            </div>
            <video src={job.result.url} controls playsInline loop autoPlay muted className="aspect-video w-full bg-background object-contain" />
            <div className="space-y-4 p-4">
              <dl className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                <Meta k="Duração" v={job.result.info ? formatDuration(job.result.info.duration) : "—"} />
                <Meta k="Resolução" v={job.result.info ? `${job.result.info.width}×${job.result.info.height}` : "—"} />
                <Meta k="FPS" v={job.result.info?.fps ? String(Math.round(job.result.info.fps)) : "—"} />
              </dl>
              <Button asChild variant="hero" size="xl" className="w-full">
                <a href={job.result.url} download={job.result.fileName}>
                  <Download /> BAIXAR VÍDEO
                </a>
              </Button>
              <Button variant="surface" size="xl" className="w-full" onClick={reset}>
                CRIAR OUTRO
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wider opacity-70">{k}</dt>
      <dd className="truncate font-medium text-foreground">{v}</dd>
    </div>
  );
}

/** Duration from the browser player, or null when it can't decode the file (e.g. some MOV). */
function browserDuration(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    const done = (d: number | null) => {
      v.removeAttribute("src");
      v.load();
      resolve(d);
    };
    const timer = setTimeout(() => done(null), 4000);
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      clearTimeout(timer);
      done(Number.isFinite(v.duration) ? v.duration : null);
    };
    v.onerror = () => {
      clearTimeout(timer);
      done(null);
    };
    v.src = url;
  });
}
