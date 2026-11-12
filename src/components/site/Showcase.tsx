import { Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import dexterThumb from "@/assets/media/dexter-thumb.jpg.asset.json";
import dexterVideo from "@/assets/media/dexter.mp4.asset.json";
import holyEnhanced from "@/assets/media/holy-enhanced.mp4.asset.json";
import holyThumb from "@/assets/media/holy-thumb.jpg.asset.json";
import holyVideo from "@/assets/media/holy.mp4.asset.json";
import kaiserThumb from "@/assets/media/kaiser-thumb.jpg.asset.json";
import kaiserVideo from "@/assets/media/kaiser.mp4.asset.json";
import { assetUrl } from "@/lib/asset-url";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const EDITS = [
  { title: "Dexter", tag: "Reverse + Zoom", video: assetUrl(dexterVideo.url), thumb: assetUrl(dexterThumb.url) },
  { title: "Holy Phonk", tag: "Filler remake", video: assetUrl(holyVideo.url), thumb: assetUrl(holyThumb.url) },
  { title: "Michael Kaiser", tag: "Shake · Headbop", video: assetUrl(kaiserVideo.url), thumb: assetUrl(kaiserThumb.url) },
];

export function EditsShowcase() {
  const [open, setOpen] = useState<(typeof EDITS)[number] | null>(null);
  return (
    <>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
        {EDITS.map((e) => (
          <PreviewCard key={e.title} edit={e} onOpen={() => setOpen(e)} />
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-md border-border bg-background p-2 sm:max-w-lg">
          <DialogTitle className="sr-only">{open?.title}</DialogTitle>
          {open && (
            <video src={open.video} poster={open.thumb} controls autoPlay playsInline className="max-h-[80vh] w-full rounded-lg bg-background" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PreviewCard({ edit, onOpen }: { edit: (typeof EDITS)[number]; onOpen: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const start = () => {
    void ref.current?.play().catch(() => {});
  };
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
      aria-label={`Abrir edit ${edit.title}`}
      className="surface-card group relative aspect-square w-[72%] shrink-0 snap-center overflow-hidden p-0 text-left sm:w-auto"
    >
      <video
        ref={ref}
        src={edit.video}
        poster={edit.thumb}
        muted
        loop
        playsInline
        preload="none"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-hero-fade opacity-80" />
      <span className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground glow-ring">
        <Play className="size-4" />
      </span>
      <span className="absolute bottom-3 left-3 right-3">
        <span className="block font-display text-base font-semibold">{edit.title}</span>
        <span className="text-xs text-primary-glow">{edit.tag}</span>
      </span>
    </button>
  );
}

/** Before/after slider with two synced videos: left is the untouched original, right is a real Melhorar Qualidade output at the same resolution. */
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
        <video ref={before} src={assetUrl(holyVideo.url)} poster={assetUrl(holyThumb.url)} muted loop autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
          <video ref={after} src={assetUrl(holyEnhanced.url)} muted loop playsInline className="h-full w-full object-cover" />
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-primary glow-ring" style={{ left: `${pos}%` }} />
        <span className="absolute left-2 top-2 rounded-md bg-background/80 px-2 py-1 text-[10px] font-semibold leading-tight">
          ANTES
          <br />
          <span className="text-muted-foreground">VÍDEO ORIGINAL</span>
        </span>
        <span className="absolute right-2 top-2 rounded-md bg-background/80 px-2 py-1 text-right text-[10px] font-semibold leading-tight">
          DEPOIS
          <br />
          <span className="text-primary-glow">REVERSE IA</span>
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
        Arraste para comparar. Mesmo vídeo e mesma resolução: à esquerda o original sem nenhuma alteração, à direita
        processado pelo Melhorar Qualidade (ruído leve, nitidez forte). O resultado varia de acordo com o vídeo original.
      </p>
    </div>
  );
}
