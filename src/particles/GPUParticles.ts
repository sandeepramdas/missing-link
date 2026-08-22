/**
 * GPUParticles — pooled point-sprite system (grey-box CPU sim; Phase 2 moves
 * integration into the vertex shader). One geometry per emitter, attributes
 * mutated in place — zero per-frame allocation. Deterministic per-scrub beats
 * (blast, breakthrough) re-seed from localT so scrubbing backwards replays.
 */
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Group,
} from 'three';

export type PresetName =
  | 'blastDebris'
  | 'dust'
  | 'drillSparks'
  | 'monsoonRain'
  | 'breakthroughBurst'
  | 'valleyWind'
  | 'waterMist'
  | 'rockfall';

interface Preset {
  count: number;
  color: number;
  size: number;
  gravity: number;
  spread: number;
  speed: number;
  additive?: boolean;
  /** continuous per-second drift while visible (the "world keeps breathing"
   *  clock — scroll owns state, dt owns life) */
  drift?: [number, number, number];
  /** vertical wrap range for looping weather (rain) */
  wrapY?: number;
}

const PRESETS: Record<PresetName, Preset> = {
  blastDebris: { count: 260, color: 0x8a8a90, size: 1.6, gravity: -14, spread: 5, speed: 12, drift: [0.15, -0.35, 0.1] },
  dust: { count: 200, color: 0xa0968a, size: 2.4, gravity: 0.6, spread: 8, speed: 2.2, drift: [0.5, 0.35, 0.3] },
  drillSparks: { count: 90, color: 0xffb454, size: 0.8, gravity: -7, spread: 1.2, speed: 5, additive: true, drift: [0, -1.2, 0] },
  monsoonRain: { count: 400, color: 0x8fb3c7, size: 0.7, gravity: -40, spread: 90, speed: 0.5, drift: [2, -30, 0], wrapY: 130 },
  breakthroughBurst: { count: 350, color: 0xfff2d8, size: 1.8, gravity: -3, spread: 3, speed: 16, additive: true, drift: [0.3, 0.2, 0.2] },
  valleyWind: { count: 120, color: 0xcfd8dd, size: 1.4, gravity: 0, spread: 60, speed: 6, drift: [4, 0, 1] },
  waterMist: { count: 220, color: 0xd8ecf5, size: 1.2, gravity: -2.5, spread: 2.5, speed: 4, additive: true, drift: [0.2, -0.9, 0.2] },
  rockfall: { count: 60, color: 0x6e6e76, size: 2.2, gravity: -22, spread: 4, speed: 3 },
};

interface Emitter {
  points: Points;
  vel: Float32Array;
  seedPos: Float32Array;
  preset: Preset;
  /** progress of the burst 0..1 (scrub-driven, deterministic) */
  progress: number;
  duration: number;
  /** last scrubbed k — scrub is idempotent so advect() owns idle frames */
  lastK: number;
}

let seedState = 42;
const srand = () => {
  seedState = (seedState * 1664525 + 1013904223) >>> 0;
  return seedState / 0xffffffff;
};

export class GPUParticles {
  readonly group = new Group();
  private emitters = new Map<string, Emitter>();
  private scale: number;

  constructor(particleScale = 1) {
    this.scale = particleScale;
    this.group.frustumCulled = false;
  }

  /** Create (once) a named emitter at a world origin. */
  ensure(key: string, preset: PresetName, x: number, y: number, z: number, duration = 1): Emitter {
    let e = this.emitters.get(key);
    if (e) return e;
    const p = PRESETS[preset];
    const count = Math.max(8, Math.floor(p.count * this.scale));
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    seedState = 42 + key.length * 7 + preset.length;
    for (let i = 0; i < count; i++) {
      pos[i * 3] = x + (srand() - 0.5) * p.spread;
      pos[i * 3 + 1] = y + (srand() - 0.5) * p.spread * 0.4;
      pos[i * 3 + 2] = z + (srand() - 0.5) * p.spread;
      vel[i * 3] = (srand() - 0.5) * p.speed * 2;
      vel[i * 3 + 1] = srand() * p.speed;
      vel[i * 3 + 2] = (srand() - 0.5) * p.speed * 2;
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(pos.slice(), 3));
    const mat = new PointsMaterial({
      color: p.color,
      size: p.size,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: p.additive ? AdditiveBlending : undefined,
    });
    const points = new Points(geo, mat);
    points.frustumCulled = false;
    e = { points, vel, seedPos: pos, preset: p, progress: 0, duration, lastK: -1 };
    this.emitters.set(key, e);
    this.group.add(points);
    return e;
  }

  /** Scrub a burst deterministically: k∈[0,1] positions every particle
   *  analytically (p = p0 + v·t + ½g·t²) — reversible, allocation-free. */
  scrub(key: string, k: number): void {
    const e = this.emitters.get(key);
    if (!e) return;
    if (Math.abs(k - e.lastK) < 1e-5) return; // idle: advect() owns the frame
    e.lastK = k;
    const t = k * e.duration;
    const attr = e.points.geometry.getAttribute('position');
    const arr = attr.array as Float32Array;
    const g = e.preset.gravity;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] = e.seedPos[i] + e.vel[i] * t;
      arr[i + 1] = e.seedPos[i + 1] + e.vel[i + 1] * t + 0.5 * g * t * t;
      arr[i + 2] = e.seedPos[i + 2] + e.vel[i + 2] * t;
    }
    attr.needsUpdate = true;
    const m = e.points.material as PointsMaterial;
    m.opacity = k <= 0 ? 0 : k < 0.15 ? k / 0.15 : Math.max(0, 1 - (k - 0.15) / 0.85);
    e.points.visible = m.opacity > 0.01;
  }

  /** dt-driven life on top of the scrub state: visible emitters drift
   *  continuously (dust rises, mist falls, rain recycles) so the world keeps
   *  breathing when the reader stops scrolling. Allocation-free. */
  advect(dt: number): void {
    for (const e of this.emitters.values()) {
      const m = e.points.material as PointsMaterial;
      if (!e.points.visible || m.opacity < 0.02) continue;
      const drift = e.preset.drift;
      if (!drift) continue;
      const attr = e.points.geometry.getAttribute('position');
      const arr = attr.array as Float32Array;
      const jx = drift[0] * dt;
      const jy = drift[1] * dt;
      const jz = drift[2] * dt;
      const wrap = e.preset.wrapY ?? 0;
      for (let i = 0; i < arr.length; i += 3) {
        // per-particle variation from its own seed keeps the drift organic
        const v = 0.5 + ((i * 2654435761) % 1000) / 1000;
        arr[i] += jx * v;
        arr[i + 1] += jy * v;
        arr[i + 2] += jz * v;
        if (wrap > 0 && arr[i + 1] < e.seedPos[i + 1] - wrap) {
          arr[i + 1] += wrap; // looping weather — rain recycles, never a one-shot sheet
        }
      }
      attr.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const e of this.emitters.values()) {
      e.points.geometry.dispose();
      (e.points.material as PointsMaterial).dispose();
    }
    this.emitters.clear();
  }
}
