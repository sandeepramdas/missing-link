/**
 * Alignment — the geometric spine of the whole experience.
 * World scale: 1 unit = 10 m. Chainage CH 0+000 → CH 13+300 maps to
 * world X 0 → 1330 (Khalapur toll plaza end → Kusgaon / Sinhgad Institute).
 *
 * Layout (representational, NOT survey-accurate — PRD NG1):
 *   [0    .. 30  ] approach, Khalapur end
 *   [30   .. 205 ] short tunnel  (1.75 km)
 *   [205  .. 349 ] valley — viaduct 1 (790 m) + viaduct 2 (650 m, cable-stayed)
 *   [349  .. 1241] long tunnel   (8.92 km)
 *   [1241 .. 1330] approach, Kusgaon end
 */
import { Vector3 } from 'three';

export const WORLD_PER_M = 0.1; // 1 world unit = 10 m
export const TOTAL_CH_M = 13300;

export const ROAD_Y = 8; // deck/road level (~80 m datum)
export const VALLEY_FLOOR_Y = -3.5; // ~115 m below deck (deck "100 m+" ⟨VERIFY⟩)

export interface Span {
  kind: 'approach' | 'tunnel' | 'viaduct';
  name: string;
  x0: number;
  x1: number;
}

export const SPANS: Span[] = [
  { kind: 'approach', name: 'Khalapur approach', x0: 0, x1: 30 },
  { kind: 'tunnel', name: 'Short tunnel (1.75 km)', x0: 30, x1: 205 },
  { kind: 'viaduct', name: 'Viaduct 1 (790 m)', x0: 205, x1: 284 },
  { kind: 'viaduct', name: 'Viaduct 2 — cable-stayed (650 m)', x0: 284, x1: 349 },
  { kind: 'tunnel', name: 'Long tunnel (8.92 km)', x0: 349, x1: 1241 },
  { kind: 'approach', name: 'Kusgaon approach', x0: 1241, x1: 1330 },
];

export const TUNNEL_SHORT = SPANS[1];
export const VIADUCT_1 = SPANS[2];
export const VIADUCT_2 = SPANS[3];
export const TUNNEL_LONG = SPANS[4];

/** Twin-tube lateral offsets (tube centre ±2.2 units ≈ 22 m c/c). */
export const TUBE_OFFSET_Z = 2.2;
/** Tube half-width: 23.75 m wide ⟨VERIFY⟩ → 2.375 units. */
export const TUBE_HALF_W = 1.19;
export const TUBE_HEIGHT = 1.1; // ~11 m clearance envelope (grey-box)

export const X_START = 0;
export const X_END = 1330;

/** chainage01 ∈ [0,1] → world position on the alignment centreline. */
export function pointAt(chainage01: number, out: Vector3): Vector3 {
  const x = X_START + (X_END - X_START) * chainage01;
  return out.set(x, ROAD_Y, 0);
}

export function chainageAtX(x: number): number {
  return ((x - X_START) / (X_END - X_START)) * TOTAL_CH_M;
}

export function spanKindAt(x: number): Span['kind'] {
  for (const s of SPANS) if (x >= s.x0 && x < s.x1) return s.kind;
  return 'approach';
}

export function formatChainage(m: number): string {
  const mm = Math.max(0, Math.min(TOTAL_CH_M, Math.round(m)));
  const km = Math.floor(mm / 1000);
  const rest = mm % 1000;
  return `CH ${km}+${String(rest).padStart(3, '0')}`;
}
