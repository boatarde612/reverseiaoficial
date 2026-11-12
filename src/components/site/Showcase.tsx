import { useEffect, useRef, useState } from "react";

import holy480 from "@/assets/media/holy-480p.mp4.asset.json";
import holyThumb from "@/assets/media/holy-thumb.jpg.asset.json";
import holyVideo from "@/assets/media/holy.mp4.asset.json";
import { assetUrl } from "@/lib/asset-url";

/** Before/after slider with two synced videos: left is the clip reduced to 480p, right is the untouched original. */
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
        <video ref={before} src={assetUrl(holy480.url)} poster={assetUrl(holyThumb.url)} muted loop autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
          <video ref={after} src={assetUrl(holyVideo.url)} muted loop playsInline className="h-full w-full object-cover" />
        </div>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-primary glow-ring" style={{ left: `${pos}%` }} />
        <span className="absolute left-2 top-2 rounded-md bg-background/80 px-2 py-1 text-[10px] font-semibold leading-tight">
          ANTES
          <br />
          <span className="text-muted-foreground">480p</span>
        </span>
        <span className="absolute right-2 top-2 rounded-md bg-background/80 px-2 py-1 text-right text-[10px] font-semibold leading-tight">
          DEPOIS
          <br />
          <span className="text-primary-glow">QUALIDADE ORIGINAL</span>
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
        Arraste para comparar. Mesmo trecho: à esquerda reduzido para 480p, à direita na qualidade original, sem
        nenhuma alteração.
      </p>
    </div>
  );
}
