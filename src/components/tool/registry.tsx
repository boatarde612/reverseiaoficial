import type { ReactNode } from "react";

import type { ToolId } from "@/lib/tools";
import {
  fpsPipeline,
  qualityPipeline,
  reversePipeline,
  rsmbPipeline,
  timeRemapPipeline,
  type FpsSettings,
  type QualitySettings,
  type ReverseSettings,
  type RsmbSettings,
  type TimeRemapSettings,
} from "@/lib/video/pipelines/basic";
import type { Pipeline } from "@/lib/video/pipelines/context";
import {
  trackingPipeline,
  zoomPipeline,
  type TrackingSettings,
  type ZoomSettings,
} from "@/lib/video/pipelines/vision";
import type { MediaInfo } from "@/lib/video/probe";

import { Chips, Field, IntensityPicker, SliderField, SwitchField } from "./controls";
import { RegionSelector } from "./RegionSelector";

export interface SettingsProps<S> {
  value: S;
  onChange: (s: S) => void;
  info: MediaInfo | null;
  frameUrl: string | null;
}

export interface ToolDefinition<S> {
  defaults: S;
  pipeline: Pipeline<S>;
  needsFrame: (s: S) => boolean;
  /** Blocks the process button with a reason, or null when ready. */
  ready: (s: S, info: MediaInfo) => string | null;
  Settings: (p: SettingsProps<S>) => ReactNode;
}

const sec = (v: number) => `${v.toFixed(1)} s`;
const FastSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <SwitchField
    label="Modo rápido (720p)"
    description="Processa em até 720p. Desligue para manter a resolução original (bem mais lento)."
    checked={checked}
    onChange={onChange}
  />
);

const reverse: ToolDefinition<ReverseSettings> = {
  defaults: { audio: "silence" },
  pipeline: reversePipeline,
  needsFrame: () => false,
  ready: () => null,
  Settings: ({ value, onChange, info }) => (
    <Field label="Áudio" hint={info && !info.hasAudio ? "Vídeo sem áudio" : undefined}>
      <Chips
        columns={3}
        value={value.audio}
        onChange={(audio) => onChange({ audio })}
        options={[
          { value: "silence", label: "Padrão", sub: "Áudio só na ida" },
          { value: "reverse", label: "Ida e volta", sub: "Áudio invertido" },
          { value: "none", label: "Sem áudio", sub: "Mudo" },
        ]}
      />
    </Field>
  ),
};

const rsmb: ToolDefinition<RsmbSettings> = {
  defaults: { intensity: 20, fast: true },
  pipeline: rsmbPipeline,
  needsFrame: () => false,
  ready: () => null,
  Settings: ({ value, onChange }) => (
    <>
      <IntensityPicker value={value.intensity} onChange={(intensity) => onChange({ ...value, intensity })} />
      <FastSwitch checked={value.fast} onChange={(fast) => onChange({ ...value, fast })} />
    </>
  ),
};

const fps: ToolDefinition<FpsSettings> = {
  defaults: { targetFps: 60, intensity: 30, fast: true },
  pipeline: fpsPipeline,
  needsFrame: () => false,
  ready: (s, info) =>
    info.fps && info.fps >= s.targetFps - 0.5 ? `Seu vídeo já tem ${Math.round(info.fps)} FPS. Escolha uma saída maior.` : null,
  Settings: ({ value, onChange, info }) => (
    <>
      <Field label="FPS de saída" hint={info?.fps ? `Original: ${Math.round(info.fps)} FPS` : undefined}>
        <Chips
          columns={3}
          value={value.targetFps}
          onChange={(targetFps) => onChange({ ...value, targetFps })}
          options={[
            { value: 60, label: "60 FPS" },
            { value: 90, label: "90 FPS" },
            { value: 120, label: "120 FPS" },
          ]}
        />
      </Field>
      <IntensityPicker value={value.intensity} onChange={(intensity) => onChange({ ...value, intensity })} />
      <FastSwitch checked={value.fast} onChange={(fast) => onChange({ ...value, fast })} />
    </>
  ),
};

const quality: ToolDefinition<QualitySettings> = {
  defaults: { intensity: 20, upscale: false },
  pipeline: qualityPipeline,
  needsFrame: () => false,
  ready: () => null,
  Settings: ({ value, onChange, info }) => (
    <>
      <IntensityPicker value={value.intensity} onChange={(intensity) => onChange({ ...value, intensity })} />
      {info && Math.min(info.width, info.height) < 1080 && (
        <SwitchField
          label="Aumentar para 1080p"
          description="Amplia com filtro Lanczos antes de realçar os detalhes."
          checked={value.upscale}
          onChange={(upscale) => onChange({ ...value, upscale })}
        />
      )}
    </>
  ),
};

const tracking: ToolDefinition<TrackingSettings> = {
  defaults: { mode: "frame", box: null, aspect: "9:16", smoothness: "mid" },
  pipeline: trackingPipeline,
  needsFrame: () => true,
  ready: (s) => (s.box ? null : "Marque o objeto no primeiro quadro."),
  Settings: ({ value, onChange, frameUrl }) => (
    <>
      <Field label="Modo">
        <Chips
          value={value.mode}
          onChange={(mode) => onChange({ ...value, mode })}
          options={[
            { value: "frame", label: "Enquadramento", sub: "A câmera segue o objeto" },
            { value: "object", label: "Rastrear objeto", sub: "Marca o objeto no vídeo" },
          ]}
        />
      </Field>
      <Field label="Objeto a seguir" hint="Toque e arraste">
        <RegionSelector frameUrl={frameUrl} value={value.box} onChange={(box) => onChange({ ...value, box })} />
      </Field>
      {value.mode === "frame" && (
        <>
          <Field label="Formato do enquadramento">
            <Chips
              columns={4}
              value={value.aspect}
              onChange={(aspect) => onChange({ ...value, aspect })}
              options={[
                { value: "9:16", label: "9:16" },
                { value: "4:5", label: "4:5" },
                { value: "1:1", label: "1:1" },
                { value: "zoom", label: "Zoom", sub: "Original" },
              ]}
            />
          </Field>
          <Field label="Suavidade da câmera">
            <Chips
              columns={3}
              value={value.smoothness}
              onChange={(smoothness) => onChange({ ...value, smoothness })}
              options={[
                { value: "low", label: "Rápida" },
                { value: "mid", label: "Média" },
                { value: "high", label: "Suave" },
              ]}
            />
          </Field>
        </>
      )}
    </>
  ),
};

const zoom: ToolDefinition<ZoomSettings> = {
  defaults: { mode: "in", intensity: 20, transition: 0.6, period: 0.5, box: null, fast: true },
  pipeline: zoomPipeline,
  needsFrame: (s) => s.mode === "track",
  ready: (s) => (s.mode === "track" && !s.box ? "Marque o objeto que o zoom deve seguir." : null),
  Settings: ({ value, onChange, info, frameUrl }) => (
    <>
      <Field label="Tipo de zoom">
        <Chips
          value={value.mode}
          onChange={(mode) => onChange({ ...value, mode })}
          options={[
            { value: "in", label: "Zoom In" },
            { value: "out", label: "Zoom Out" },
            { value: "smooth", label: "Zoom suave", sub: "Entra e sai devagar" },
            { value: "dynamic", label: "Zoom dinâmico", sub: "Punch no ritmo" },
            { value: "approach", label: "Aproximação", sub: "Gradual no clipe todo" },
            { value: "retreat", label: "Afastamento", sub: "Gradual no clipe todo" },
            { value: "track", label: "Com tracking", sub: "Segue um objeto" },
          ]}
        />
      </Field>
      <IntensityPicker value={value.intensity} onChange={(intensity) => onChange({ ...value, intensity })} />
      {(value.mode === "in" || value.mode === "out" || value.mode === "track") && (
        <SliderField
          label="Duração da transição"
          value={value.transition}
          min={0.1}
          max={Math.max(0.2, Math.min(5, info?.duration ?? 5))}
          step={0.1}
          format={sec}
          onChange={(transition) => onChange({ ...value, transition })}
        />
      )}
      {value.mode === "dynamic" && (
        <SliderField
          label="Intervalo entre punches"
          value={value.period}
          min={0.2}
          max={2}
          step={0.05}
          format={sec}
          onChange={(period) => onChange({ ...value, period })}
        />
      )}
      {value.mode === "track" && (
        <Field label="Objeto a seguir" hint="Toque e arraste">
          <RegionSelector frameUrl={frameUrl} value={value.box} onChange={(box) => onChange({ ...value, box })} />
        </Field>
      )}
      <FastSwitch checked={value.fast} onChange={(fast) => onChange({ ...value, fast })} />
    </>
  ),
};

const remap: ToolDefinition<TimeRemapSettings> = {
  defaults: { mode: "slow", speed: 0.5, rampSlow: 0.3, rampFast: 2, at: 0.5, until: 1, transition: 0.3, interpolate: true },
  pipeline: timeRemapPipeline,
  needsFrame: () => false,
  ready: (s, info) => (s.mode === "segment" && s.until <= s.at ? "O fim do trecho precisa ser depois do início." : info.duration < 0.2 ? "Vídeo curto demais." : null),
  Settings: ({ value, onChange, info }) => {
    const D = info?.duration ?? 1;
    const set = (p: Partial<TimeRemapSettings>) => onChange({ ...value, ...p });
    const speedFmt = (v: number) => `${v.toFixed(2)}x`;
    return (
      <>
        <Field label="Efeito">
          <Chips
            value={value.mode}
            onChange={(mode) =>
              set({
                mode,
                speed: mode === "slow" ? 0.5 : mode === "fast" ? 2 : mode === "accel" ? 2 : mode === "decel" ? 0.4 : 0.4,
                at: Math.min(value.at, D),
                until: Math.min(Math.max(value.until, value.at + 0.2), D),
              })
            }
            options={[
              { value: "slow", label: "Slow Motion" },
              { value: "fast", label: "Fast Motion" },
              { value: "ramp", label: "Speed Ramp", sub: "Rápido → lento → rápido" },
              { value: "accel", label: "Aceleração", sub: "Normal → rápido" },
              { value: "decel", label: "Desaceleração", sub: "Normal → lento" },
              { value: "segment", label: "Trecho", sub: "Velocidade num intervalo" },
            ]}
          />
        </Field>

        {value.mode === "slow" && (
          <Field label="Velocidade">
            <Chips columns={3} value={value.speed} onChange={(speed) => set({ speed })} options={[{ value: 0.25, label: "0.25x" }, { value: 0.5, label: "0.5x" }, { value: 0.75, label: "0.75x" }]} />
          </Field>
        )}
        {value.mode === "fast" && (
          <Field label="Velocidade">
            <Chips columns={4} value={value.speed} onChange={(speed) => set({ speed })} options={[{ value: 1.5, label: "1.5x" }, { value: 2, label: "2x" }, { value: 3, label: "3x" }, { value: 4, label: "4x" }]} />
          </Field>
        )}
        {value.mode === "ramp" && (
          <>
            <SliderField label="Momento lento" value={value.at} min={0} max={D} step={0.05} format={sec} onChange={(at) => set({ at })} />
            <SliderField label="Velocidade lenta" value={value.rampSlow} min={0.1} max={0.9} step={0.05} format={speedFmt} onChange={(rampSlow) => set({ rampSlow })} />
            <SliderField label="Velocidade rápida" value={value.rampFast} min={1} max={4} step={0.1} format={speedFmt} onChange={(rampFast) => set({ rampFast })} />
          </>
        )}
        {(value.mode === "accel" || value.mode === "decel") && (
          <>
            <SliderField label="Começa em" value={value.at} min={0} max={D} step={0.05} format={sec} onChange={(at) => set({ at })} />
            <SliderField
              label="Velocidade final"
              value={value.speed}
              min={value.mode === "accel" ? 1.1 : 0.1}
              max={value.mode === "accel" ? 4 : 0.9}
              step={0.05}
              format={speedFmt}
              onChange={(speed) => set({ speed })}
            />
          </>
        )}
        {value.mode === "segment" && (
          <>
            <SliderField label="Início do trecho" value={value.at} min={0} max={D} step={0.05} format={sec} onChange={(at) => set({ at })} />
            <SliderField label="Fim do trecho" value={value.until} min={0} max={D} step={0.05} format={sec} onChange={(until) => set({ until })} />
            <SliderField label="Velocidade no trecho" value={value.speed} min={0.1} max={4} step={0.05} format={speedFmt} onChange={(speed) => set({ speed })} />
          </>
        )}
        {value.mode !== "slow" && value.mode !== "fast" && (
          <SliderField label="Duração da transição" value={value.transition} min={0.05} max={2} step={0.05} format={sec} onChange={(transition) => set({ transition })} />
        )}
        <SwitchField
          label="Interpolação de quadros"
          description="Cria quadros intermediários nos trechos lentos para manter a fluidez (mais lento)."
          checked={value.interpolate}
          onChange={(interpolate) => set({ interpolate })}
        />
        {value.mode !== "slow" && value.mode !== "fast" && info?.hasAudio && (
          <p className="text-xs text-muted-foreground">
            Com velocidade variável o áudio é removido para não sair dessincronizado.
          </p>
        )}
      </>
    );
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOOL_DEFS: Record<ToolId, ToolDefinition<any>> = {
  reverse,
  rsmb,
  "fps-mod": fps,
  qualidade: quality,
  tracking,
  zoom,
  "time-remap": remap,
};
