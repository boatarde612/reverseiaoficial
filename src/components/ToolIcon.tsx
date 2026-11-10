import { Contrast, Crosshair, Gauge, Repeat2, Sparkles, Timer, Wind, ZoomIn, type LucideProps } from "lucide-react";

import type { ToolId } from "@/lib/tools";

const ICONS: Record<ToolId, React.ComponentType<LucideProps>> = {
  reverse: Repeat2,
  rsmb: Wind,
  "fps-mod": Gauge,
  qualidade: Sparkles,
  tracking: Crosshair,
  zoom: ZoomIn,
  "time-remap": Timer,
  "cc-dark": Contrast,
};

export function ToolIcon({ id, ...props }: { id: ToolId } & LucideProps) {
  const Icon = ICONS[id];
  return <Icon strokeWidth={1.75} {...props} />;
}
