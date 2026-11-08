// Parses FFmpeg's "-i" stream report into media info (the wasm build's probe output).

export interface MediaInfo {
  duration: number;
  width: number;
  height: number;
  fps: number | null;
  hasAudio: boolean;
  videoCodec: string;
}

export function parseProbe(log: string): MediaInfo | null {
  const dur = log.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  const videoLine = log.split("\n").find((l) => /Stream #\d+:\d+.*Video:/.test(l));
  if (!dur || !videoLine) return null;
  const duration = Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]);

  const size = videoLine.match(/,\s*(\d{2,5})x(\d{2,5})/);
  if (!size) return null;
  let width = Number(size[1]);
  let height = Number(size[2]);

  const rot =
    log.match(/rotation of (-?\d+(?:\.\d+)?) degrees/) ?? log.match(/rotate\s*:\s*(-?\d+)/);
  if (rot && Math.abs(Math.round(Number(rot[1]))) % 180 === 90) {
    [width, height] = [height, width];
  }

  const fpsMatch = videoLine.match(/(\d+(?:\.\d+)?)\s*fps/) ?? videoLine.match(/(\d+(?:\.\d+)?)\s*tbr/);
  const fps = fpsMatch ? Number(fpsMatch[1]) : null;
  const codec = videoLine.match(/Video:\s*([a-z0-9_]+)/i);

  return {
    duration,
    width,
    height,
    fps: fps && fps > 0 && fps < 1000 ? fps : null,
    hasAudio: /Stream #\d+:\d+.*Audio:/.test(log),
    videoCodec: codec ? codec[1] : "desconhecido",
  };
}

export function formatDuration(s: number): string {
  if (s < 10) return `${s.toFixed(2)} s`;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return m > 0 ? `${m}:${r.toFixed(1).padStart(4, "0")} min` : `${r.toFixed(1)} s`;
}
