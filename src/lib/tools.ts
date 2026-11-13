// Tool catalogue: metadata only (safe for SSR). Processing lives in src/lib/video/pipelines.

export type ToolId = "reverse" | "rsmb" | "fps-mod" | "qualidade" | "tracking" | "zoom" | "time-remap" | "cc-dark" | "smooth-reverse" | "gelatina";

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
    id: "smooth-reverse",
    name: "SMOOTH REVERSE",
    tagline: "Reverso com virada suave",
    description: "Desacelera na virada e volta ao contrário com quadros intermediários reais, sem corte brusco.",
    maxSeconds: 5,
    heavy: true,
  },
  {
    id: "rsmb",
    name: "MOTION BLUR (RSMB)",
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
    name: "RASTREIO DE CÂMERA",
    tagline: "Câmera que segue o alvo",
    description: "Analisa o movimento da câmera, estabiliza e faz o enquadramento seguir a pessoa ou objeto marcado.",
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
    name: "CC — COLOR CORRECTION",
    tagline: "Correção de cor e presets",
    description: "Exposição, contraste, saturação, sombras, realces, temperatura e tinta, com presets como CC Dark.",
    maxSeconds: 60,
    heavy: false,
  },
  {
    id: "gelatina",
    name: "GELATINA",
    tagline: "Deformação elástica",
    description: "Ondula e balança a imagem como gelatina, no vídeo todo ou num trecho.",
    maxSeconds: 60,
    heavy: true,
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
