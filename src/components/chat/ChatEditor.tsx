import { useServerFn } from "@tanstack/react-start";
import { Check, Download, Loader2, Paperclip, RotateCcw, Send, Wand2, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { TOOL_DEFS } from "@/components/tool/registry";
import { RegionSelector } from "@/components/tool/RegionSelector";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { chatTurn, type ChatTurnResult } from "@/lib/chat/chat.functions";
import { needsBox, type PlanStep } from "@/lib/chat/plan";
import { getTool } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { extractFrame, extractFrames, probeFile, probeUpload } from "@/lib/video/engine";
import { ACCEPT_ATTR, maxSecondsFor, validateDuration, validateFile } from "@/lib/video/limits";
import { comboPipeline } from "@/lib/video/pipelines/combo";
import type { NormBox } from "@/lib/video/pipelines/vision";
import { formatDuration, type MediaInfo } from "@/lib/video/probe";
import { enqueue, jobStore } from "@/lib/video/queue";

interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
  plan?: PlanStep[] | undefined;
  attachment?: string | undefined;
  /** Session-only fields (not saved). */
  jobId?: string;
  resultUrl?: string;
  resultName?: string;
  error?: boolean;
}

interface Video {
  file: File;
  info: MediaInfo;
  url: string;
  frameUrl: string | null;
}

const STORAGE = "reverse-ia-chat-v1";
const SUGGESTIONS = [
  "Analise meu vídeo",
  "Motion Blur 30",
  "Melhorar qualidade em 4K",
  "Deixar em 120 FPS",
  "Zoom suave",
  "Slow motion 0.5x",
  "Tracking no jogador, Zoom 30, Motion Blur 20 e 120 FPS",
];

const uid = () => Math.random().toString(36).slice(2, 10);
const toDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(b);
  });

function describe(step: PlanStep): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = step.settings as any;
  const parts: string[] = [];
  if (s.intensity) parts.push(`intensidade ${s.intensity}`);
  if (step.tool === "fps-mod") parts.push(`${s.targetFps} FPS`);
  if (step.tool === "fps-mod") parts.push(s.quality === "fast" ? "interpolação rápida" : "interpolação precisa");
  if (step.tool === "qualidade") {
    const lv = { off: "desligado", light: "leve", strong: "forte" } as Record<string, string>;
    if (s.upscale) parts.push(s.upscale === 2160 ? "4K" : `${s.upscale}p`);
    parts.push(`ruído ${lv[s.denoise]}`, `nitidez ${lv[s.sharpen]}`);
  }
  if (step.tool === "cc-dark") parts.push(`contraste ${s.contrast.toFixed(2)} · saturação ${s.saturation.toFixed(2)} · temperatura ${s.temperature > 0 ? "+" : ""}${s.temperature.toFixed(2)}`);
  if (step.tool === "zoom") parts.push(String({ in: "Zoom In", out: "Zoom Out", smooth: "suave", dynamic: "dinâmico", approach: "aproximação", retreat: "afastamento", track: "com tracking" }[s.mode as string]));
  if (step.tool === "time-remap") parts.push(`${s.mode}${s.mode === "slow" || s.mode === "fast" ? ` ${s.speed}x` : ""}`);
  if (step.tool === "tracking") parts.push(s.mode === "frame" ? `enquadramento ${s.aspect}` : "marcar objeto");
  if (step.tool === "reverse") parts.push(String({ silence: "áudio só na ida", reverse: "áudio invertido", none: "sem áudio" }[s.audio as string]));
  return parts.filter(Boolean).join(" · ");
}

export function ChatEditor() {
  const ask = useServerFn(chatTurn);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [box, setBox] = useState<NormBox | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const jobs = useSyncExternalStore(jobStore.subscribe, jobStore.getAll, jobStore.getAll);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) setMsgs(JSON.parse(raw) as Msg[]);
    } catch {
      // ignore broken storage
    }
    setLoaded(true);
    taRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const keep = msgs.map(({ jobId: _j, resultUrl: _u, resultName: _n, ...m }) => m);
    localStorage.setItem(STORAGE, JSON.stringify(keep));
  }, [msgs, loaded]);

  // Braces matter: newer Chrome returns a Promise from scrollIntoView, and React would call it as cleanup.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, busy, jobs]);

  // Turn finished jobs into result messages.
  useEffect(() => {
    for (const m of msgs) {
      if (!m.jobId || m.resultUrl || m.error) continue;
      const job = jobs.find((j) => j.id === m.jobId);
      if (!job) continue;
      if (job.status === "done" && job.result) {
        const r = job.result;
        setMsgs((all) => all.map((x) => (x.id === m.id ? { ...x, text: x.text.replace("Processando…", "Pronto!"), resultUrl: r.url, resultName: r.fileName } : x)));
      } else if (job.status === "error" || job.status === "cancelled") {
        setMsgs((all) => all.map((x) => (x.id === m.id ? { ...x, error: true, text: `Não deu certo: ${job.error ?? "cancelado"}` } : x)));
      }
    }
  }, [jobs, msgs]);

  const lastPlan = [...msgs].reverse().find((m) => m.plan)?.plan ?? null;

  async function send(text: string) {
    const t = text.trim();
    if ((!t && !pendingFile) || busy) return;
    let vid = video;
    let frames: string[] = [];
    const file = pendingFile;
    const userMsg: Msg = { id: uid(), role: "user", text: t || "Analise meu vídeo", attachment: file?.name };
    setMsgs((m) => [...m, userMsg]);
    setInput("");
    setPendingFile(null);
    try {
      if (file) {
        setBusy("Lendo o vídeo no seu aparelho…");
        const info = await probeUpload(file, `chat_probe_${Date.now()}.${file.name.split(".").pop()}`);
        if (!info) throw new Error("Não foi possível ler este vídeo.");
        const durErr = info.duration > 60.05 ? validateDuration("rsmb", info.duration) : null;
        if (durErr) throw new Error(durErr);
        setBusy("Extraindo quadros para análise…");
        const blobs = await extractFrames(file, info.duration, 4);
        frames = await Promise.all(blobs.map(toDataUrl));
        const first = await extractFrame(file);
        if (video) URL.revokeObjectURL(video.url);
        vid = { file, info, url: URL.createObjectURL(file), frameUrl: first ? URL.createObjectURL(first) : null };
        setVideo(vid);
        setBox(null);
      }
      setBusy(frames.length ? "Analisando o vídeo…" : "Pensando…");
      const history = [...msgs, userMsg].slice(-20).map((m) => ({
        role: m.role,
        text: (m.plan ? `${m.text}\n[plano: ${JSON.stringify(m.plan)}]` : m.text).slice(0, 4000),
      }));
      const res: ChatTurnResult = await ask({ data: { history, video: vid?.info ?? null, frames, lastPlan } });
      if (res.error) throw new Error(res.error);
      setMsgs((m) => [...m, { id: uid(), role: "assistant", text: res.reply, plan: res.plan ?? undefined }]);
    } catch (e) {
      setMsgs((m) => [...m, { id: uid(), role: "assistant", error: true, text: e instanceof Error ? e.message : "Algo deu errado." }]);
    } finally {
      setBusy(null);
      taRef.current?.focus();
    }
  }

  function blockReason(plan: PlanStep[]): string | null {
    if (!video) return "Anexe um vídeo para processar.";
    for (const s of plan) {
      const max = maxSecondsFor(s.tool);
      if (video.info.duration > max + 0.05) return `${getTool(s.tool)?.name} aceita até ${max} s. Seu vídeo tem ${formatDuration(video.info.duration)}.`;
    }
    if (plan.some(needsBox) && !box) return "Marque o objeto no primeiro quadro.";
    return null;
  }

  function confirm(plan: PlanStep[]) {
    if (!video || blockReason(plan)) return;
    const steps = plan.map((s) => ({
      label: getTool(s.tool)?.name ?? s.tool,
      pipeline: TOOL_DEFS[s.tool].pipeline,
      settings: needsBox(s) ? { ...s.settings, box } : s.settings,
    }));
    const jobId = enqueue("combo", video.file, video.info, comboPipeline(steps, probeFile), null);
    const list = plan.map((s) => `- ${getTool(s.tool)?.name} ✅`).join("\n");
    setMsgs((m) => [...m, { id: uid(), role: "assistant", text: `Processando…\n${list}`, jobId }]);
  }

  function reset() {
    if (!window.confirm("Apagar a conversa?")) return;
    setMsgs([]);
    setBox(null);
    if (video) URL.revokeObjectURL(video.url);
    setVideo(null);
  }

  const running = jobs.some((j) => j.status === "running" || j.status === "queued");

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-2xl flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
        <p className="text-sm text-muted-foreground">
          {video ? `🎬 ${video.file.name} · ${formatDuration(video.info.duration)} · ${video.info.width}x${video.info.height}` : "Editor por conversa"}
        </p>
        {msgs.length > 0 && (
          <Button size="sm" variant="ghost" onClick={reset} disabled={running}>
            <RotateCcw /> Nova conversa
          </Button>
        )}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {msgs.length === 0 && (
          <div className="pt-8 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent glow-ring">
              <Wand2 className="size-7 text-primary" />
            </div>
            <h1 className="font-display text-xl font-semibold">Edite falando</h1>
            <p className="mt-1 text-sm text-muted-foreground">Anexe um vídeo e diga o que quer, ou escolha uma sugestão.</p>
            <div className="mt-6 flex flex-col items-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setInput(s)} className="rounded-full border border-border bg-surface-raised px-4 py-2 text-xs text-foreground transition-colors hover:border-primary/50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m) => {
          const job = m.jobId ? jobs.find((j) => j.id === m.jobId) : undefined;
          const reason = m.plan ? blockReason(m.plan) : null;
          return (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap text-sm",
                  m.role === "user" ? "rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground" : "text-foreground",
                  m.error && "text-destructive",
                )}
              >
                {m.attachment && <p className="mb-1 flex items-center gap-1 text-xs opacity-80"><Paperclip className="size-3" /> {m.attachment}</p>}
                {m.text}

                {m.plan && (
                  <div className="mt-3 space-y-3 rounded-2xl border border-border bg-surface-raised p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Efeitos selecionados</p>
                    <ol className="space-y-1.5">
                      {m.plan.map((s, i) => (
                        <li key={s.tool} className="flex gap-2">
                          <span className="text-primary">{i + 1}.</span>
                          <span><b>{getTool(s.tool)?.name}</b> <span className="text-muted-foreground">{describe(s)}</span></span>
                        </li>
                      ))}
                    </ol>
                    {m.plan === lastPlan && video && m.plan.some(needsBox) && (
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Toque e arraste sobre o objeto a seguir:</p>
                        <RegionSelector frameUrl={video.frameUrl} value={box} onChange={setBox} />
                      </div>
                    )}
                    {m.plan === lastPlan && (
                      <>
                        {m.plan.some((s) => s.tool === "fps-mod" || s.tool === "rsmb" || (s.tool === "qualidade" && s.settings["upscale"] === 2160)) && (
                          <p className="text-xs text-muted-foreground">Inclui efeitos pesados: no celular pode levar vários minutos.</p>
                        )}
                        <Button variant="hero" className="w-full" disabled={!!reason || running} onClick={() => confirm(m.plan!)}>
                          <Check /> CONFIRMAR PROCESSAMENTO
                        </Button>
                        {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
                      </>
                    )}
                  </div>
                )}

                {job && (job.status === "running" || job.status === "queued") && (
                  <div className="mt-3 space-y-1.5">
                    <Progress value={job.progress * 100} />
                    <p className="text-xs text-muted-foreground">{job.stage} · {Math.round(job.progress * 100)}%</p>
                  </div>
                )}

                {m.resultUrl && (
                  <div className="mt-3 space-y-2">
                    <video src={m.resultUrl} controls playsInline className="max-h-[60vh] w-full rounded-xl bg-surface" />
                    <Button asChild variant="hero" size="sm" className="w-full">
                      <a href={m.resultUrl} download={m.resultName}>
                        <Download /> BAIXAR VÍDEO
                      </a>
                    </Button>
                    <p className="text-xs text-muted-foreground">Quer ajustar? Escreva, por exemplo, "diminua o Motion Blur".</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> {busy}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {pendingFile && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface-raised px-3 py-2 text-xs">
            <Paperclip className="size-3" /> <span className="flex-1 truncate">{pendingFile.name}</span>
            <button aria-label="Remover vídeo" onClick={() => setPendingFile(null)}><X className="size-4" /></button>
          </div>
        )}
        <form
          className="flex items-end gap-2 rounded-2xl border border-border bg-surface-raised p-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const err = validateFile(f);
              if (err) {
                setMsgs((m) => [...m, { id: uid(), role: "assistant", error: true, text: err }]);
                return;
              }
              setPendingFile(f);
              taRef.current?.focus();
            }}
          />
          <Button type="button" size="icon" variant="ghost" aria-label="Anexar vídeo" onClick={() => fileRef.current?.click()} disabled={!!busy}>
            <Paperclip />
          </Button>
          <Textarea
            ref={taRef}
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Envie uma mensagem…"
            className="max-h-32 min-h-10 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <Button type="submit" size="icon" variant="hero" aria-label="Enviar" disabled={!!busy || (!input.trim() && !pendingFile)}>
            <Send />
          </Button>
        </form>
      </div>
    </div>
  );
}
