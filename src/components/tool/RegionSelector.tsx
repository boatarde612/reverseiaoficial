import { useRef, useState } from "react";
import { Crosshair, Loader2 } from "lucide-react";

import type { NormBox } from "@/lib/video/pipelines/vision";

/** Drag on the first frame to mark the object to follow. */
export function RegionSelector({
  frameUrl,
  value,
  onChange,
}: {
  frameUrl: string | null;
  value: NormBox | null;
  onChange: (b: NormBox | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<NormBox | null>(null);

  const point = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  if (!frameUrl) {
    return (
      <div className="flex aspect-video items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-raised text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Lendo o primeiro quadro…
      </div>
    );
  }

  const box = draft ?? value;
  return (
    <div className="space-y-2">
      <div
        ref={ref}
        className="relative touch-none select-none overflow-hidden rounded-xl border border-border"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          start.current = point(e);
          setDraft({ ...start.current, w: 0, h: 0 });
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          const p = point(e);
          const s = start.current;
          setDraft({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
        }}
        onPointerUp={() => {
          start.current = null;
          if (draft && draft.w > 0.02 && draft.h > 0.02) onChange(draft);
          setDraft(null);
        }}
      >
        <img src={frameUrl} alt="Primeiro quadro do vídeo" className="block w-full" draggable={false} />
        {box && box.w > 0 && (
          <div
            className="pointer-events-none absolute rounded-md border-2 border-primary-glow bg-primary/15 glow-ring"
            style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }}
          />
        )}
        {!box && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-background/70 py-2 text-xs font-medium">
            <Crosshair className="size-4 text-primary-glow" /> Arraste sobre o objeto para marcar
          </div>
        )}
      </div>
      {value && (
        <button type="button" onClick={() => onChange(null)} className="text-xs font-medium text-primary-glow underline-offset-4 hover:underline">
          Marcar de novo
        </button>
      )}
    </div>
  );
}
