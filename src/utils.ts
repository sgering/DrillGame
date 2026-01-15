import { WIDTH, HEIGHT, PIXELS_PER_METER, Y_PIXELS_PER_METER } from './config';
import type { Point, Color } from './types';

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function worldToScreen(
  x: number,
  y: number,
  camX: number,
  camY: number,
  verticalMode: boolean
): Point {
  if (verticalMode) {
    // Vertical mode: drill moves down (y increases), camera follows y
    // x is horizontal deviation
    const sx = Math.floor(WIDTH / 2 + x * (PIXELS_PER_METER * Y_PIXELS_PER_METER / 4.0));
    const sy = Math.floor((y - camY) * PIXELS_PER_METER + 200);
    return [sx, sy];
  } else {
    // Horizontal mode: drill moves right (x increases), camera follows x
    // y is vertical deviation
    const sx = Math.floor((x - camX) * PIXELS_PER_METER + 200);
    const sy = Math.floor(HEIGHT / 2 - y * (PIXELS_PER_METER * Y_PIXELS_PER_METER / 4.0));
    return [sx, sy];
  }
}

export function colorToRgb(color: Color): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

export function colorToRgba(color: Color, alpha: number): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

// Seeded random number generator (Mulberry32)
export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  uniform(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  randint(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}
