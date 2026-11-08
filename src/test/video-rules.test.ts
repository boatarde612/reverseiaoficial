import { describe, expect, it } from "vitest";

import { piecewiseValue } from "@/lib/video/expr";
import { validateDuration, validateFile } from "@/lib/video/limits";
import { parseProbe } from "@/lib/video/probe";
import { outputDuration, speedCurve, type RemapSettings } from "@/lib/video/speed";
import { TemplateTracker } from "@/lib/video/tracker";

describe("upload limits", () => {
  it("Reverse accepts 2 seconds and rejects longer clips", () => {
    expect(validateDuration("reverse", 2)).toBeNull();
    expect(validateDuration("reverse", 2.5)).not.toBeNull();
  });

  it("other tools accept 1 minute and reject longer videos", () => {
    expect(validateDuration("zoom", 60)).toBeNull();
    expect(validateDuration("rsmb", 61)).not.toBeNull();
  });

  it("accepts only MP4 and MOV", () => {
    expect(validateFile({ name: "clip.MP4", size: 1000 })).toBeNull();
    expect(validateFile({ name: "clip.mov", size: 1000 })).toBeNull();
    expect(validateFile({ name: "clip.avi", size: 1000 })).not.toBeNull();
  });

  it("rejects files over 150 MB", () => {
    expect(validateFile({ name: "a.mp4", size: 151 * 1024 * 1024 })).not.toBeNull();
  });
});

describe("probe parsing", () => {
  it("reads duration, size, fps, audio and swaps size for rotated phone videos", () => {
    const log = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'in.mov':
  Duration: 00:00:01.50, start: 0.000000, bitrate: 9000 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p, 1920x1080, 8000 kb/s, 29.97 fps, 29.97 tbr, 90k tbn (default)
      Side data:
        displaymatrix: rotation of -90.00 degrees
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo, fltp, 128 kb/s`;
    expect(parseProbe(log)).toEqual({
      duration: 1.5,
      width: 1080,
      height: 1920,
      fps: 29.97,
      hasAudio: true,
      videoCodec: "h264",
    });
  });
});

describe("time remap", () => {
  const base: RemapSettings = { mode: "slow", speed: 0.5, rampSlow: 0.3, rampFast: 2, at: 1, until: 2, transition: 0.3 };

  it("0.5x slow motion doubles the duration", () => {
    expect(outputDuration(speedCurve(base, 4), 4)).toBeCloseTo(8, 2);
  });

  it("2x fast motion halves the duration", () => {
    expect(outputDuration(speedCurve({ ...base, mode: "fast", speed: 2 }, 4), 4)).toBeCloseTo(2, 2);
  });

  it("segment mode applies the chosen speed inside the segment", () => {
    const curve = speedCurve({ ...base, mode: "segment", speed: 0.25, at: 1, until: 2 }, 4);
    expect(piecewiseValue(curve, 1.5)).toBeCloseTo(0.25, 5);
    expect(piecewiseValue(curve, 3)).toBeCloseTo(1, 5);
  });
});

describe("tracker", () => {
  it("follows a textured square moving 3 px per frame", () => {
    const W = 120;
    const H = 80;
    const make = (ox: number) => {
      const f = new Uint8Array(W * H);
      for (let i = 0; i < f.length; i++) f[i] = 40 + ((i * 7919) % 23);
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) f[(30 + y) * W + ox + x] = (x + y) % 4 < 2 ? 230 : 120;
      return f;
    };
    const t = new TemplateTracker(make(10), W, H, { x: 10, y: 30, w: 16, h: 16 });
    let p = t.center;
    for (let k = 1; k <= 20; k++) p = t.step(make(10 + 3 * k));
    expect(p.cx).toBeCloseTo(10 + 60 + 8, 0);
    expect(p.cy).toBeCloseTo(38, 0);
  });
});
