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
  PCFSoftShadowMap,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { CameraRig } from './CameraRig';
import { ScrollEngine } from './ScrollEngine';
import { QualityManager } from './QualityManager';
import { hudStore, track } from './HUDBridge';
import { Terrain, heightAt } from '../world/Terrain';
import { Sky } from '../world/Sky';
import { buildVegetation } from '../world/Vegetation';
import { Portalworks } from '../world/Portals';
import { buildTieIns } from '../world/TieIns';
import { GPUParticles } from '../particles/GPUParticles';
import type { BuildCtx, Section } from '../sections/types';
import { TOTAL_CH_M } from '../world/Alignment';
import { clamp01, damp, _c1, _c2 } from '../utils/scratch';
import gsap from 'gsap';

export interface Mood {
  skyTop: number;
  skyBottom: number;
  fog: number;
  fogDensity: number;
  exposure: number;
  sunIntensity: number;
  hemiIntensity: number;
}

const MOODS: Record<string, Mood> = {
  // bright monsoon daylight — denser haze buries the terrain-plane edge and
  // the razor horizon that used to show in the hero
  monsoon: {
    skyTop: 0x6fa8d6, skyBottom: 0xe8f0f4, fog: 0xd9e6ee, fogDensity: 0.0008,
    exposure: 1.08, sunIntensity: 2.4, hemiIntensity: 1.05,
  },
  // tunnel — dark but LEGIBLE: lifted ambient so the bore geometry reads
  // between light pools, murk kept short-range
  tunnel: {
    skyTop: 0x15171b, skyBottom: 0x33373d, fog: 0x26282c, fogDensity: 0.0011,
    exposure: 1.05, sunIntensity: 0.35, hemiIntensity: 0.95,
  },
  // golden — thinner fog + calmer exposure so the massif keeps rock, form
  // and silhouette instead of collapsing into cream-brown wash
  golden: {
    skyTop: 0x6d87ad, skyBottom: 0xf6d8a4, fog: 0xe6cda2, fogDensity: 0.0002,
    exposure: 1.1, sunIntensity: 2.4, hemiIntensity: 0.95,
  },
  night: {
    skyTop: 0x0d1020, skyBottom: 0x2a3050, fog: 0x141830, fogDensity: 0.0006,
    exposure: 0.95, sunIntensity: 0.1, hemiIntensity: 0.3,
  },
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
  private sky!: Sky;
  private vegetation!: import('three').InstancedMesh;
  private portalworks!: Portalworks;
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
    // contact is the strongest "resting on the ground" cue — one sun shadow
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.quality = new QualityManager(this.renderer);
    this.rig = new CameraRig(window.innerWidth / window.innerHeight);
    this.rig.reducedMotion = reducedMotion;
    this.scene.add(this.rig.dolly, this.rig.focusTarget);

    this.fog = new FogExp2(0xd9e6ee, 0.00042);
    this.scene.fog = this.fog;
    this.scene.background = new Color(0xd9e6ee); // safety fill behind the dome
    this.sky = new Sky();
    this.scene.add(this.sky.mesh);

    this.sun = new DirectionalLight(0xfff4e2, 2.4);
    this.sun.position.set(400, 500, 300);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0015;
    this.sun.shadow.camera.near = 50;
    this.sun.shadow.camera.far = 1400;
    // the frustum follows the focus target each frame (fitted, not scene-wide)
    const sc = this.sun.shadow.camera;
    sc.left = -160; sc.right = 160; sc.top = 160; sc.bottom = -160;
    this.sun.target = this.rig.focusTarget;
    // bright sky bounce + green ground bounce — the daylight feel
    this.hemi = new HemisphereLight(0xdcecf7, 0x55603f, 1.05);
    // cool rim from the opposite quadrant so slopes facing away from the sun
    // (both portal faces) never read as black voids
    const rim = new DirectionalLight(0xcfe0ec, 0.7);
    rim.position.set(-320, 220, -180);
    this.scene.add(this.sun, this.hemi, rim);

    this.terrain = new Terrain();
    this.scene.add(this.terrain.group);
    this.vegetation = buildVegetation(reducedMotion ? 500 : 700, this.terrain);
    this.vegetation.visible = false; // grows in once the massif has formed
    this.scene.add(this.vegetation);

    this.portalworks = new Portalworks();
    this.scene.add(this.portalworks.group);
    // the existing expressway at both ends — present from scene zero
    this.scene.add(buildTieIns());

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

    // shadow roles: everything structural casts; ground/sky/lines/points don't
    this.scene.traverse((o) => {
      const m = o as import('three').Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
    });
    this.terrain.mesh.castShadow = false;
    this.sky.mesh.castShadow = this.sky.mesh.receiveShadow = false;

    // compile every program up front — lazy compilation lands its hitch on
    // exactly the transition frame where each material first becomes visible
    this.renderer.compile(this.scene, this.rig.camera);

    if (import.meta.env.DEV) this.auditCameraTracks();
  }

  /** DEV: warn on any interpolated camera sample below terrain + clearance
   *  (tunnel interiors excluded — those are meant to be inside). */
  private auditCameraTracks(): void {
    const INTERIOR = new Set(['S05', 'S06', 'S07', 'S10']);
    for (const s of this.sections) {
      if (INTERIOR.has(s.id)) continue;
      for (let i = 0; i <= 60; i++) {
        const lt = i / 60;
        this.rig.sample(s.cameraTrack, lt);
        const p = this.rig.debugTargetPos();
        const ground = heightAt(p.x, p.z);
        if (p.y < ground + 1.5) {
          console.warn(
            `[camera-audit] ${s.id} localT=${lt.toFixed(2)} buried: y=${p.y.toFixed(1)} ground=${ground.toFixed(1)} at x=${p.x.toFixed(0)},z=${p.z.toFixed(0)}`
          );
        }
      }
    }
    this.rig.snap();
  }

  /** resolves after the first REAL rendered frame (the loader waits on this —
   *  the terrain build is a large CPU-bound cost, not a network one) */
  onFirstFrame: (() => void) | null = null;
  private firstFrameDone = false;

  start(): void {
    gsap.ticker.add(() => this.frame());
  }

  private frame(): void {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, this.lastTime === 0 ? 0.016 : now - this.lastTime);
    this.lastTime = now;

    // damped follower — the one and only master-timeline driver
    this.t += (this.scroll.targetT - this.t) * damp(dt);
    // pass raw lenis velocity; the rig owns the (working) gain
    this.rig.setScrollVelocity(this.scroll.velocity);
    // the world keeps breathing while the reader pauses: dust drifts, rain
    // falls and recycles, mist rises — independent of scroll
    this.particles.advect(dt);
    // sky dome follows the camera along the corridor (a fixed centre makes
    // the horizon glow slide as the camera travels 1,300 units)
    this.sky.mesh.position.x = Math.max(0, Math.min(1330, this.rig.dolly.position.x));

    // trees sit at final terrain height — showing them mid-morph leaves them
    // floating over the flat contour map
    this.vegetation.visible = this.terrain.morph > 0.93;
    // persistent corridor anchors: portals + draped tunnel route guide
    this.portalworks.update(this.t);

    let active: Section | null = null;
    for (const s of this.sections) {
      const [t0, t1] = s.range;
      const isActive = this.t >= t0 && this.t < t1;
      // EVERY section updates EVERY frame with clamped localT. Updates are
      // pure functions of localT and cheap, and this reconciles all state on
      // any jump in t (reload, deep link, chip seek, fast scrub) — no stale
      // geometry, no zero-state persistent sections, no dead bands.
      const localT = clamp01((this.t - t0) / (t1 - t0));
      s.update(localT, dt, this.ctx);
      if (isActive && !active) active = s;

      // lifecycle: non-persistent stages (machinery, survey gear) unload
      // outside their neighbourhood; built infrastructure stays visible only
      // once its own chapter has begun (scrolling back up tears it down)
      const entry = this.groups.get(s.id);
      if (entry) {
        entry.group.visible = entry.persistent
          ? this.t >= t0 - 0.04
          : this.t >= t0 - 0.05 && this.t < t1 + 0.05;
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
        // once per session — scrubbing back and forth must not inflate analytics
        track(`section_enter_${active.id}`, true);
        if (active.id === 'S06') track('breakthrough_view', true);
        if (active.id === 'S12') track('finale_view', true);
      }
      const [t0, t1] = active.range;
      const localT = clamp01((this.t - t0) / (t1 - t0));
      this.rig.sample(active.cameraTrack, localT);
      this.grade(active.id, dt);
      this.pushHUD(active.id, localT);
    }

    this.rig.tick(dt);
    this.quality.tick(dt);
    this.renderer.render(this.scene, this.rig.camera);
    if (!this.firstFrameDone) {
      this.firstFrameDone = true;
      this.onFirstFrame?.();
    }
  }

  private grade(sectionId: string, dt: number): void {
    const moodKey = SECTION_MOOD[sectionId] ?? 'monsoon';
    const target = MOODS[moodKey];
    // inside the mountain the sky dome must NOT render: terrain backfaces are
    // culled, so from underground the dome shines through and blows the whole
    // interior out white
    this.sky.mesh.visible = moodKey !== 'tunnel';
    const k = damp(dt * 1.5);
    const m = this.moodCurrent;
    m.fogDensity += (target.fogDensity - m.fogDensity) * k;
    this.fog.density = m.fogDensity;
    _c1.setHex(target.skyTop);
    _c2.setHex(target.skyBottom);
    this.sky.lerpTo(_c1, _c2, k);
    m.exposure += (target.exposure - m.exposure) * k;
    m.sunIntensity += (target.sunIntensity - m.sunIntensity) * k;
    m.hemiIntensity += (target.hemiIntensity - m.hemiIntensity) * k;
    this.renderer.toneMappingExposure = m.exposure;
    this.sun.intensity = m.sunIntensity;
    this.hemi.intensity = m.hemiIntensity;
    _c1.setHex(target.skyBottom);
    (this.scene.background as Color).lerp(_c1, k);
    _c2.setHex(target.fog);
    this.fog.color.lerp(_c2, k);
  }

  private pushHUD(sectionId: string, localT = 0): void {
    const buildStart = this.sections.find((s) => s.id === BUILD_START_ID)?.range[0] ?? 0.15;
    const buildEnd = this.sections.find((s) => s.id === BUILD_END_ID)?.range[1] ?? 0.92;
    const pb = clamp01((this.t - buildStart) / (buildEnd - buildStart));
    // During construction, chainage tracks percent-built. In the finale the
    // corridor is complete and the camera RIDES it end-to-end — so chainage
    // travels CH 0+000 → 13+300 again with the journey (holding complete
    // once the merge is reached, through the golden hero).
    const chainage =
      sectionId === 'S12' ? TOTAL_CH_M * clamp01(localT / 0.74) : pb * TOTAL_CH_M;
    // Corporate hand-off: the canvas NEVER dims (the golden hero must hold
    // full strength to the last pixel) — #corporate simply scrolls over it.
    // Only the HUD chrome fades, right at the very end.
    const fade = 1 - clamp01((this.t - 0.997) / 0.003);
    hudStore.getState().setFrame({
      t: this.t,
      sectionId,
      percentBuilt: Math.round(pb * 100),
      chainage_m: chainage,
      velocity: this.scroll.velocity,
      webglFade: fade,
    });
  }
}
