/**
 * Section contract (PRD §5.2 / build prompt §4.2).
 * Each scene owns a normalized window on the ONE master timeline.
 * `update(localT, dt)` must be deterministic in localT (scrub-safe, both
 * directions) and allocation-free.
 */
import type { Group, Scene } from 'three';
import type { CameraRig, CamKey } from '../core/CameraRig';
import type { Terrain } from '../world/Terrain';
import type { QualityManager } from '../core/QualityManager';
import type { GPUParticles } from '../particles/GPUParticles';

export interface BuildCtx {
  scene: Scene;
  terrain: Terrain;
  rig: CameraRig;
  quality: QualityManager;
  particles: GPUParticles;
}

export interface Section {
  id: string; // "S05" — matches narrative SceneCopy id
  title: string;
  /** normalized t window on the master timeline (assigned by the registry) */
  range: [number, number];
  /**
   * Persistent sections leave their built output in the world for later
   * scenes (piers, deck, pylon, surfacing, alignment). Non-persistent
   * sections (machinery, survey gear, scaffolding) are hidden by the
   * SceneDirector once the camera is more than a neighbour-window away —
   * construction equipment must never appear in the finale.
   */
  persistent?: boolean;
  /** camera keyframes in local t (0..1 within the section window) */
  cameraTrack: CamKey[];
  /** create objects; called once at boot (grey-box: everything procedural) */
  build(ctx: BuildCtx): Group;
  /** per-frame while active or neighbouring; localT ∈ [0,1] clamped */
  update(localT: number, dt: number, ctx: BuildCtx): void;
  enter?(ctx: BuildCtx): void;
  exit?(ctx: BuildCtx): void;
  dispose?(): void;
}
