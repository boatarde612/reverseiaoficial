import { Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import dexterThumb from "@/assets/media/dexter-thumb.jpg.asset.json";
import dexterVideo from "@/assets/media/dexter.mp4.asset.json";
import holy360 from "@/assets/media/holy-360p.mp4.asset.json";
import holyEnhanced from "@/assets/media/holy-reverse-ia.mp4.asset.json";
import holyThumb from "@/assets/media/holy-thumb.jpg.asset.json";
import holyVideo from "@/assets/media/holy.mp4.asset.json";
import kaiserThumb from "@/assets/media/kaiser-thumb.jpg.asset.json";
import kaiserVideo from "@/assets/media/kaiser.mp4.asset.json";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { assetUrl } from "@/lib/asset-url";

const EDITS = [
  { title: "Dexter — Reverse Zoom", video: dexterVideo.url, thumb: dexterThumb.url },
  { title: "Holy Phonk — Filler", video: holyVideo.url, thumb: holyThumb.url },
  { title: "Michael Kaiser — Shake", video: kaiserVideo.url, thumb: kaiserThumb.url },
];

function EditCard({ e, onOpen }: { e: (typeof EDITS)[number]; onOpen: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const start = () => void ref.current?.play().catch(() => {});
  const stop = () => {
    const v = ref.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };
  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      className="surface-card group relative w-[72%] shrink-0 snap-center overflow-hidden p-0 text-left sm:w-auto"
    >
      <div className="relative aspect-square">
        <video ref={ref} src={assetUrl(e.video)} poster={assetUrl(e.thumb)} muted loop playsInline preload="none" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
        <span className="absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary/80 text-primary-foreground glow-ring transition-opacity group-hover:opacity-0">
          <Play className="size-5" />
        </span>
        <span className="absolute bottom-3 left-3 right-3 font-display text-sm font-semibold">{e.title}</span>
      </div>
    </button>
  );
}

/** Three featured edits: swipe on phones, grid on desktop, full-screen player on tap. */
export function EditsShowcase() {
  const [open, setOpen] = useState<number | null>(null);
  const cur = open === null ? null : EDITS[open];
  return (
    <>
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {EDITS.map((e, i) => (
          <EditCard key={e.title} e={e} onOpen={() => setOpen(i)} />
        ))}
      </div>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg border-primary/30 bg-background p-2">
          <DialogTitle className="px-2 pt-1 text-sm">{cur?.title}</DialogTitle>
          {cur && <video src={assetUrl(cur.video)} poster={assetUrl(cur.thumb)} controls autoPlay playsInline className="w-full rounded-lg" />}
          <button type="button" onClick={() => setOpen(null)} className="sr-only">
            <X /> Fechar
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Before/after slider: left is the clip reduced to 360p, right is the original run through Melhorar Qualidade. */
export function QualityCompare() {
  const before = useRef<HTMLVideoElement>(null);
  const after = useRef<HTMLVideoElement>(null);
  const [pos, setPos] = useState(50);

  useEffect(() => {
    const a = before.current;
    const b = after.current;
    if (!a || !b) return;
    const sync = () => {
      if (Math.abs(a.currentTime - b.currentTime) > 0.08) b.currentTime = a.currentTime;
    };
    const play = () => {
      void b.play().catch(() => {});
    };
    const pause = () => b.pause();
    a.addEventListener("timeupdate", sync);
    a.addEventListener("play", play);
    a.addEventListener("pause", pause);
    return () => {
      a.removeEventListener("timeupdate", sync);
      a.removeEventListener("play", play);
      a.removeEventListener("pause", pause);
    };
  }, []);

  return (
    <div>
      <div className="surface-card relative mx-auto aspect-square max-w-xl overflow-hidden p-0 select-none">
        <video ref={before} src={assetUrl(holy360.url)} poster={assetUrl(holyThumb.url)} muted loop autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
          <video ref={after} src={assetUrl(holyEnhanced.url)} muted loop playsInline className="h-full w-full object-cover" />
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-primary glow-ring" style={{ left: `${pos}%` }} />
        <span className="absolute left-2 top-2 rounded-md bg-background/80 px-2 py-1 text-[10px] font-semibold">ANTES — 360p</span>
        <span className="absolute right-2 top-2 rounded-md bg-background/80 px-2 py-1 text-[10px] font-semibold text-primary-glow">
          DEPOIS — REVERSE IA
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Comparar antes e depois"
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
      <p className="mx-auto mt-3 max-w-xl text-center text-xs text-muted-foreground">
        Arraste para comparar o mesmo trecho. À esquerda, reduzido para 360p. À direita, o vídeo na resolução original
        passado pela ferramenta Melhorar Qualidade (redução de ruído leve + nitidez forte).
      </p>
    </div>
  );
}
