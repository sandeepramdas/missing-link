/**
 * Small, dependency-free 2D/1D Perlin-style noise.
 * Used for: terrain heightfield (build-time) and camera-head micro-motion
 * (runtime, allocation-free). Deterministic — seeded permutation table.
 */
const PERM = new Uint8Array(512);
(() => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // xorshift-seeded Fisher–Yates for a stable, deterministic table
  let s = 1337;
  const rnd = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1000) / 1000;
  };
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
})();

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function grad(hash: number, x: number, y: number): number {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? 2 * v : -2 * v);
}

/** 2D Perlin noise, ~[-1, 1]. */
export function noise2(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  const u = fade(x);
  const v = fade(y);
  const a = PERM[X] + Y;
  const b = PERM[X + 1] + Y;
  return (
    lerp(
      lerp(grad(PERM[a], x, y), grad(PERM[b], x - 1, y), u),
      lerp(grad(PERM[a + 1], x, y - 1), grad(PERM[b + 1], x - 1, y - 1), u),
      v
    ) * 0.5
  );
}

/** Fractal Brownian motion over noise2. */
export function fbm2(x: number, y: number, octaves = 4, lacunarity = 2, gain = 0.5): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * freq, y * freq);
    amp *= gain;
    freq *= lacunarity;
  }
  return sum;
}

/** 1D noise for camera micro-motion (time-domain). */
export const noise1 = (t: number): number => noise2(t, 17.13);
