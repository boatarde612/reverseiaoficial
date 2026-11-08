import type { ReactNode } from "react";

import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { INTENSITIES, type Intensity } from "@/lib/tools";
import { cn } from "@/lib/utils";

export function Field({ label, hint, children }: { label: string; hint?: string | undefined; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: { value: T; label: string; sub?: string }[];
  value: T;
  onChange: (v: T) => void;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid gap-2",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-4",
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-12 rounded-xl border px-3 py-2 text-left transition-all active:scale-[0.97]",
              active
                ? "border-primary bg-accent text-accent-foreground glow-ring"
                : "border-border bg-surface-raised text-muted-foreground hover:border-primary/40",
            )}
          >
            <span className={cn("block text-sm font-semibold", active && "text-foreground")}>{o.label}</span>
            {o.sub && <span className="block text-[11px] leading-tight opacity-80">{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function IntensityPicker({ value, onChange }: { value: Intensity; onChange: (v: Intensity) => void }) {
  return (
    <Field label="Intensidade">
      <div role="radiogroup" className="grid grid-cols-4 gap-2">
        {INTENSITIES.map((i) => {
          const active = i.value === value;
          return (
            <button
              key={i.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(i.value)}
              className={cn(
                "flex flex-col items-center rounded-xl border py-2.5 transition-all active:scale-[0.97]",
                active
                  ? "border-primary bg-gradient-primary text-primary-foreground glow-ring"
                  : "border-border bg-surface-raised text-muted-foreground hover:border-primary/40",
              )}
            >
              <span className="font-display text-lg font-semibold">{i.value}</span>
              <span className="text-[11px]">{i.label}</span>
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label} hint={format(value)}>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? value)}
        className="py-2"
        aria-label={label}
      />
    </Field>
  );
}

export function SwitchField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-surface-raised p-3.5">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} className="mt-0.5" />
    </label>
  );
}
