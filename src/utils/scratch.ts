/**
 * Shared scratch objects — the enforcement mechanism for the "zero per-frame
 * allocations" budget (PRD §4.6). Every update() borrows these; nothing inside
 * a per-frame path may call `new`.
 */
import { Vector3, Matrix4, Quaternion, Color, Euler } from 'three';

export const _v1 = new Vector3();
export const _v2 = new Vector3();
export const _v3 = new Vector3();
export const _m1 = new Matrix4();
export const _q1 = new Quaternion();
export const _e1 = new Euler();
export const _c1 = new Color();
export const _c2 = new Color();

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Remap localT into a sub-window [a,b] of the scene, clamped to [0,1]. */
export const window01 = (t: number, a: number, b: number): number =>
  clamp01((t - a) / (b - a));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/** power3.out-style ease for structural reveals. */
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/** power4.out — heavy structures settling. */
export const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

export const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

/** expo.out — HUD/UI moments. */
export const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** ≤2% overshoot-settle for heavy structural arrivals (PRD §6.3). */
export const easeOutBackSoft = (t: number): number => {
  const s = 0.9; // tuned for ~2% overshoot
  const u = t - 1;
  return 1 + u * u * ((s + 1) * u + s);
};

/** Frame-rate-independent damping factor: t += (target-t) * damp(dt). */
export const damp = (dt: number): number => 1 - Math.pow(0.001, dt);
