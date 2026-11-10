// Edit plans produced by the chat AI: a list of real tools with full, validated settings.
import { z } from "zod";

import type { ToolId } from "@/lib/tools";
import { CC_DARK_PRESET } from "@/lib/video/pipelines/basic";

const intensity = z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(50)]);
const level = z.enum(["off", "light", "strong"]);
const box = z
  .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1), w: z.number().min(0.01).max(1), h: z.number().min(0.01).max(1) })
  .nullable();

export const SETTINGS_SCHEMAS = {
  reverse: z.object({ audio: z.enum(["silence", "reverse", "none"]) }),
  rsmb: z.object({ intensity, fast: z.boolean() }),
  "fps-mod": z.object({ targetFps: z.union([z.literal(60), z.literal(90), z.literal(120)]), quality: z.enum(["fast", "precise"]), fast: z.boolean() }),
  qualidade: z.object({
    upscale: z.union([z.literal(0), z.literal(1080), z.literal(1440), z.literal(2160)]),
    denoise: level,
    sharpen: level,
  }),
  "cc-dark": z.object({
    exposure: z.number().min(-1).max(1),
    contrast: z.number().min(0.5).max(1.5),
    saturation: z.number().min(0).max(1.5),
    shadows: z.number().min(-1).max(1),
    highlights: z.number().min(-1).max(1),
    temperature: z.number().min(-1).max(1),
  }),
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
  "fps-mod": { targetFps: 60, quality: "precise", fast: true },
  qualidade: { upscale: 0, denoise: "light", sharpen: "light" },
  "cc-dark": { ...CC_DARK_PRESET },
  tracking: { mode: "frame", box: null, aspect: "9:16", smoothness: "mid" },
  zoom: { mode: "in", intensity: 20, transition: 0.6, period: 0.5, box: null, fast: true },
  "time-remap": { mode: "slow", speed: 0.5, rampSlow: 0.3, rampFast: 2, at: 0.5, until: 1, transition: 0.3, interpolate: true },
};

/** Processing order for combos: framing first, then speed, then look, motion effects last. */
export const COMBO_ORDER: ToolId[] = ["tracking", "zoom", "time-remap", "reverse", "qualidade", "cc-dark", "rsmb", "fps-mod"];

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
    const defaults = PLAN_DEFAULTS[tool] as Record<string, unknown>;
    // Keep only known keys, so stale settings (e.g. an old "intensity") never break validation.
    const merged = { ...defaults, ...Object.fromEntries(Object.entries(partial).filter(([k]) => k in defaults)) };
    steps.push({ tool, settings: SETTINGS_SCHEMAS[tool].parse(merged) as Record<string, SettingValue> });
  }
  return steps.sort((a, b) => COMBO_ORDER.indexOf(a.tool) - COMBO_ORDER.indexOf(b.tool));
}

/** Steps that need the user to mark an object on the first frame. */
export const needsBox = (s: PlanStep) => s.tool === "tracking" || (s.tool === "zoom" && s.settings["mode"] === "track");
