// Runs several tool pipelines in sequence; each step reads the previous step's output.
import type { MediaInfo } from "../probe";
import type { Pipeline, PipelineContext } from "./context";

export interface ComboStep {
  label: string;
  pipeline: Pipeline<unknown>;
  settings: unknown;
}

export function comboPipeline(steps: ComboStep[], probe: (name: string) => Promise<MediaInfo | null>): Pipeline<null> {
  return async (ctx) => {
    let input = ctx.input;
    let info = ctx.info;
    const n = steps.length;
    for (let i = 0; i < n; i++) {
      const step = steps[i]!;
      const map = (f: number) => (i + f) / n;
      const prefix = `${i + 1}/${n} ${step.label}`;
      const child: PipelineContext = {
        ...ctx,
        input,
        info,
        run: (args, o) => ctx.run(args, { ...o, label: `${prefix} · ${o.label}`, from: map(o.from), to: map(o.to) }),
        report: (label, f) => ctx.report(`${prefix} · ${label}`, map(f)),
      };
      input = await step.pipeline(child, step.settings);
      if (i < n - 1) {
        const next = await probe(input);
        if (!next) throw new Error(`Não foi possível ler o resultado da etapa ${step.label}.`);
        info = next;
      }
    }
    return input;
  };
}
