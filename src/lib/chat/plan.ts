// Edit plans produced by the chat AI: a list of real tools with full, validated settings.
import { z } from "zod";

import type { ToolId } from "@/lib/tools";

const intensity = z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(50)]);
const box = z
  .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().min(0.01).max(1), h: z.number().min(0.01).max(1) })
  .nullable();

export const SETTINGS_SCHEMAS = {
  reverse: z.object({ audio: z.enum(["silence", "reverse", "none"]) }),
  rsmb: z.object({ intensity, fast: z.boolean() }),
  "fps-mod": z.object({ targetFps: z.union([z.literal(60), z.literal(90), z.literal(120)]), intensity, fast: z.boolean() }),
  qualidade: z.object({ intensity, upscale: z.union([z.literal(0), z.literal(1080), z.literal(1440), z.literal(2160)]) }),
  tracking: z.object({
    mode: z.enum(["frame", "object"]),
    box,
    aspect: z.enum(["9:16", "4:5", "1:1", "zoom"]),
    smoothness: z.enum(["low", "mid", "high"]),
  }),
  zoom: z.object({
    mode: z.enum(["in", "out", "smooth", "dynamic", "approach", "retreat", "track"]),
    intensity,
    transition: z.number().min(0.1).max(5),
    period: z.number().min(0.2).max(2),
    box,
    fast: z.boolean(),
  }),
  "time-remap": z.object({
    mode: z.enum(["slow", "fast", "ramp", "accel", "decel", "segment"]),
    speed: z.number().min(0.1).max(4),
    rampSlow: z.number().min(0.1).max(0.9),
    rampFast: z.number().min(1).max(4),
    at: z.number().min(0),
    until: z.number().min(0),
    transition: z.number().min(0.05).max(2),
    interpolate: z.boolean(),
  }),
} satisfies Record<ToolId, z.ZodTypeAny>;

export const PLAN_DEFAULTS: { [K in ToolId]: z.infer<(typeof SETTINGS_SCHEMAS)[K]> } = {
  reverse: { audio: "silence" },
  rsmb: { intensity: 20, fast: true },
  "fps-mod": { targetFps: 60, intensity: 30, fast: true },
  qualidade: { intensity: 20, upscale: 0 },
  tracking: { mode: "frame", box: null, aspect: "9:16", smoothness: "mid" },
  zoom: { mode: "in", intensity: 20, transition: 0.6, period: 0.5, box: null, fast: true },
  "time-remap": { mode: "slow", speed: 0.5, rampSlow: 0.3, rampFast: 2, at: 0.5, until: 1, transition: 0.3, interpolate: true },
};

/** Processing order for combos: framing first, then speed, then look, motion effects last. */
export const COMBO_ORDER: ToolId[] = ["tracking", "zoom", "time-remap", "reverse", "qualidade", "rsmb", "fps-mod"];

export type SettingValue = string | number | boolean | { x: number; y: number; w: number; h: number } | null;
export interface PlanStep {
  tool: ToolId;
  settings: Record<string, SettingValue>;
}

/** Merges AI-provided partial settings onto defaults and validates them. Throws on invalid values. */
export function normalizePlan(raw: unknown): PlanStep[] {
  if (!Array.isArray(raw)) throw new Error("Plano inválido.");
  const seen = new Set<ToolId>();
  const steps: PlanStep[] = [];
  for (const item of raw) {
    const tool = (item as { tool?: string })?.tool as ToolId;
    if (!(tool in SETTINGS_SCHEMAS)) throw new Error(`Ferramenta desconhecida: ${String(tool)}`);
    if (seen.has(tool)) continue;
    seen.add(tool);
    const partial = ((item as { settings?: object }).settings ?? {}) as Record<string, unknown>;
    const merged = { ...PLAN_DEFAULTS[tool], ...partial };
    steps.push({ tool, settings: SETTINGS_SCHEMAS[tool].parse(merged) as Record<string, SettingValue> });
  }
  return steps.sort((a, b) => COMBO_ORDER.indexOf(a.tool) - COMBO_ORDER.indexOf(b.tool));
}

/** Steps that need the user to mark an object on the first frame. */
export const needsBox = (s: PlanStep) => s.tool === "tracking" || (s.tool === "zoom" && s.settings["mode"] === "track");
