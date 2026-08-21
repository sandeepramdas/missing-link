/**
 * SceneDirector — owns the renderer, the ONE master timeline position, the
 * RAF loop and section lifecycle. Scroll writes targetT (ScrollEngine); the
 * director runs the damped follower  t += (targetT − t) · (1 − 0.001^dt)
 * and dispatches update() to the active section ± neighbours.
 *
 * Grading: each section carries an exposure + sky/fog mood; the director
 * crossfades them (grey-box stand-in for the Phase-2 HDRI swap).
 */
import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { CameraRig } from './CameraRig';
import { ScrollEngine } from './ScrollEngine';
import { QualityManager } from './QualityManager';
import { hudStore, track } from './HUDBridge';
import { Terrain } from '../world/Terrain';
import { GPUParticles } from '../particles/GPUParticles';
import type { BuildCtx, Section } from '../sections/types';
import { TOTAL_CH_M } from '../world/Alignment';
import { clamp01, damp, _c1, _c2 } from '../utils/scratch';
import gsap from 'gsap';

export interface Mood {
  sky: number;
  fog: number;
  exposure: number;
  sunIntensity: number;
  hemiIntensity: number;
}

const MOODS: Record<string, Mood> = {
  // monsoon-overcast default (S0–S11)
  monsoon: { sky: 0x767d84, fog: 0x767d84, exposure: 1.0, sunIntensity: 1.6, hemiIntensity: 0.8 },
  tunnel: { sky: 0x1a1a1e, fog: 0x141416, exposure: 0.85, sunIntensity: 0.25, hemiIntensity: 0.3 },
  golden: { sky: 0xd9a05b, fog: 0xc98d4e, exposure: 1.15, sunIntensity: 2.2, hemiIntensity: 0.9 },
  night: { sky: 0x0d1020, fog: 0x0d1020, exposure: 0.95, sunIntensity: 0.1, hemiIntensity: 0.25 },
};

/** per-section mood key; sections can hand back a blended mood in update via director API later */
const SECTION_MOOD: Record<string, keyof typeof MOODS> = {
  S00: 'monsoon', S01: 'monsoon', S02: 'monsoon', S03: 'monsoon', S04: 'monsoon',
  S04b: 'monsoon', S05: 'tunnel', S06: 'tunnel', S07: 'tunnel', S08: 'monsoon',
  S09: 'monsoon', S10: 'tunnel', S11: 'monsoon', S12: 'golden',
};

// percentBuilt window: construction spans S03 → S11
const BUILD_START_ID = 'S03';
const BUILD_END_ID = 'S11';

export class SceneDirector {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly rig: CameraRig;
  readonly quality: QualityManager;
  readonly terrain: Terrain;
  readonly particles: GPUParticles;
  t = 0;

  private sections: Section[] = [];
  private groups = new Map<string, { group: import('three').Group; persistent: boolean }>();
  private activeId = '';
  private scroll: ScrollEngine;
  private sun: DirectionalLight;
  private hemi: HemisphereLight;
  private fog: FogExp2;
  private moodCurrent: Mood = { ...MOODS.monsoon };
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement, scroll: ScrollEngine, reducedMotion: boolean) {
    this.scroll = scroll;
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = false; // grey-box; Phase 2 enables PCFSoft
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.quality = new QualityManager(this.renderer);
    this.rig = new CameraRig(window.innerWidth / window.innerHeight);
    this.rig.reducedMotion = reducedMotion;
    this.scene.add(this.rig.dolly, this.rig.focusTarget);

    this.fog = new FogExp2(0x767d84, 0.0009);
    this.scene.fog = this.fog;
    this.scene.background = new Color(0x767d84);

    this.sun = new DirectionalLight(0xfff2e0, 1.6);
    this.sun.position.set(400, 500, 300);
    this.hemi = new HemisphereLight(0xbfd0da, 0x3a3a3e, 0.8);
    // cool rim from the opposite quadrant so slopes facing away from the sun
    // (both portal faces) never read as black voids
    const rim = new DirectionalLight(0xbfd0da, 0.55);
    rim.position.set(-320, 220, -180);
    this.scene.add(this.sun, this.hemi, rim);

    this.terrain = new Terrain();
    this.scene.add(this.terrain.group);

    this.particles = new GPUParticles(this.quality.particleScale);
    this.scene.add(this.particles.group);

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.rig.resize(window.innerWidth / window.innerHeight);
    });
  }

  get ctx(): BuildCtx {
    return {
      scene: this.scene,
      terrain: this.terrain,
      rig: this.rig,
      quality: this.quality,
      particles: this.particles,
    };
  }

  addSections(sections: Section[]): void {
    this.sections = sections;
    for (const s of sections) {
      const group = s.build(this.ctx);
      this.scene.add(group);
      this.groups.set(s.id, { group, persistent: !!s.persistent });
    }
    this.scroll.registerSections(sections.map((s) => ({ id: s.id, t: s.range[0] })));
  }

  start(): void {
    gsap.ticker.add(() => this.frame());
  }

  private frame(): void {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, this.lastTime === 0 ? 0.016 : now - this.lastTime);
    this.lastTime = now;

    // damped follower — the one and only master-timeline driver
    this.t += (this.scroll.targetT - this.t) * damp(dt);
    this.rig.setScrollVelocity(this.scroll.velocity * 0.01);

    // scrub-robustness: past S01 the massif is always fully formed, even when
    // the user deep-links/seeks and S00's own update never ran
    if (this.t > 0.16) this.terrain.setMorph(1);

    let active: Section | null = null;
    for (const s of this.sections) {
      const [t0, t1] = s.range;
      const isActive = this.t >= t0 && this.t < t1;
      const isNeighbor = this.t >= t0 - 0.04 && this.t < t1 + 0.04;
      if (isActive || isNeighbor) {
        const localT = clamp01((this.t - t0) / (t1 - t0));
        s.update(localT, dt, this.ctx);
        if (isActive && !active) active = s;
      }
      // lifecycle: non-persistent stages (machinery, survey gear) unload
      // outside their neighbourhood; built infrastructure stays
      const entry = this.groups.get(s.id);
      if (entry) {
        entry.group.visible =
          entry.persistent || (this.t >= t0 - 0.06 && this.t < t1 + 0.06);
      }
    }
    // past the final range boundary, keep the last section live
    if (!active && this.t >= 1 - 1e-6) active = this.sections[this.sections.length - 1];

    if (active) {
      if (active.id !== this.activeId) {
        const prev = this.sections.find((s) => s.id === this.activeId);
        prev?.exit?.(this.ctx);
        active.enter?.(this.ctx);
        this.activeId = active.id;
        track(`section_enter_${active.id}`);
        if (active.id === 'S06') track('breakthrough_view', true);
        if (active.id === 'S12') track('finale_view', true);
      }
      const [t0, t1] = active.range;
      const localT = clamp01((this.t - t0) / (t1 - t0));
      this.rig.sample(active.cameraTrack, localT);
      this.grade(active.id, dt);
      this.pushHUD(active.id);
    }

    this.rig.tick(dt);
    this.quality.tick(dt);
    this.renderer.render(this.scene, this.rig.camera);
  }

  private grade(sectionId: string, dt: number): void {
    const target = MOODS[SECTION_MOOD[sectionId] ?? 'monsoon'];
    const k = damp(dt * 1.5);
    const m = this.moodCurrent;
    m.exposure += (target.exposure - m.exposure) * k;
    m.sunIntensity += (target.sunIntensity - m.sunIntensity) * k;
    m.hemiIntensity += (target.hemiIntensity - m.hemiIntensity) * k;
    this.renderer.toneMappingExposure = m.exposure;
    this.sun.intensity = m.sunIntensity;
    this.hemi.intensity = m.hemiIntensity;
    _c1.setHex(target.sky);
    (this.scene.background as Color).lerp(_c1, k);
    _c2.setHex(target.fog);
    this.fog.color.lerp(_c2, k);
  }

  private pushHUD(sectionId: string): void {
    const buildStart = this.sections.find((s) => s.id === BUILD_START_ID)?.range[0] ?? 0.15;
    const buildEnd = this.sections.find((s) => s.id === BUILD_END_ID)?.range[1] ?? 0.92;
    const pb = clamp01((this.t - buildStart) / (buildEnd - buildStart));
    // Corporate hand-off: the canvas NEVER dims (the golden hero must hold
    // full strength to the last pixel) — #corporate simply scrolls over it.
    // Only the HUD chrome fades, right at the very end.
    const fade = 1 - clamp01((this.t - 0.997) / 0.003);
    hudStore.getState().setFrame({
      t: this.t,
      sectionId,
      percentBuilt: Math.round(pb * 100),
      chainage_m: pb * TOTAL_CH_M,
      velocity: this.scroll.velocity,
      webglFade: fade,
    });
  }
}
