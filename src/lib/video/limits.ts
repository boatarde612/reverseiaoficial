import { getTool, type ToolId } from "@/lib/tools";

export const ACCEPTED_EXTENSIONS = ["mp4", "mov"] as const;
export const ACCEPT_ATTR = "video/mp4,video/quicktime,.mp4,.mov";
/** Videos are processed in the device's memory, so the file size is capped. */
export const MAX_FILE_MB = 150;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
/** Container durations are rounded; allow a few milliseconds over the limit. */
const DURATION_TOLERANCE = 0.05;

export function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function validateFile(file: { name: string; size: number }): string | null {
  const ext = fileExtension(file.name);
  if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) {
    return "Formato não aceito. Envie um vídeo MP4 ou MOV.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return `Arquivo muito grande. O limite é ${MAX_FILE_MB} MB.`;
  }
  if (file.size === 0) return "O arquivo está vazio.";
  return null;
}

export function maxSecondsFor(toolId: ToolId): number {
  return getTool(toolId)?.maxSeconds ?? 60;
}

export function validateDuration(toolId: ToolId, seconds: number): string | null {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "Não foi possível ler a duração do vídeo.";
  }
  const max = maxSecondsFor(toolId);
  if (seconds > max + DURATION_TOLERANCE) {
    const label = max >= 60 ? `${max / 60} minuto` : `${max} segundos`;
    return `Este vídeo tem ${seconds.toFixed(2)} s. O limite desta ferramenta é ${label}.`;
  }
  return null;
}
