// Tool catalogue: metadata only (safe for SSR). Processing lives in src/lib/video/pipelines.

export type ToolId = "reverse" | "rsmb" | "fps-mod" | "qualidade" | "tracking" | "zoom" | "time-remap" | "cc-dark";

export interface ToolMeta {
  id: ToolId;
  name: string;
  tagline: string;
  description: string;
  maxSeconds: number;
  /** Heavy tools (motion interpolation) take noticeably longer on phones. */
  heavy: boolean;
}

export const TOOLS: ToolMeta[] = [
  {
    id: "reverse",
    name: "REVERSE",
    tagline: "Vai e volta perfeito",
    description: "Reproduz o clipe e depois ao contrário, sem repetir o quadro da junção.",
    maxSeconds: 2,
    heavy: false,
  },
  {
    id: "rsmb",
    name: "RSMB",
    tagline: "Motion blur por movimento",
    description: "Estima o movimento entre quadros e aplica desfoque na direção do movimento.",
    maxSeconds: 60,
    heavy: true,
  },
  {
    id: "fps-mod",
    name: "FPS MOD",
    tagline: "Até 120 FPS",
    description: "Cria quadros intermediários reais para deixar o vídeo mais fluido.",
    maxSeconds: 60,
    heavy: true,
  },
  {
    id: "qualidade",
    name: "MELHORAR QUALIDADE",
    tagline: "Mais nitidez, menos ruído",
    description: "Reduz ruído e realça detalhes preservando as cores originais.",
    maxSeconds: 60,
    heavy: false,
  },
  {
    id: "tracking",
    name: "TRACKING",
    tagline: "Siga o objeto",
    description: "Marque um jogador ou objeto e o enquadramento acompanha o movimento.",
    maxSeconds: 60,
    heavy: false,
  },
  {
    id: "zoom",
    name: "ZOOM",
    tagline: "Zoom suave e dinâmico",
    description: "Zoom in, zoom out, punch e aproximação gradual com keyframes reais.",
    maxSeconds: 60,
    heavy: false,
  },
  {
    id: "time-remap",
    name: "TIME REMAP",
    tagline: "Slow, fast e speed ramp",
    description: "Controle a velocidade com transições graduais entre trechos.",
    maxSeconds: 60,
    heavy: false,
  },
  {
    id: "cc-dark",
    name: "CC DARK",
    tagline: "Cor escura e cinematográfica",
    description: "Correção de cor escura com sombras frias, preservando os detalhes da imagem.",
    maxSeconds: 60,
    heavy: false,
  },
];

export function getTool(id: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.id === id);
}

export const INTENSITIES = [
  { value: 10, label: "Leve" },
  { value: 20, label: "Suave" },
  { value: 30, label: "Médio" },
  { value: 50, label: "Forte" },
] as const;

export type Intensity = (typeof INTENSITIES)[number]["value"];

export const CREATOR = {
  handle: "@tankaiofc",
  url: "https://www.tiktok.com/@tankaiofc",
};
