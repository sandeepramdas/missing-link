/**
 * CameraRig — Dolly → Truck → Boom → Head → PerspectiveCamera (PRD §6.2).
 * Sections declare CamKey tracks; the rig samples them by local t with
 * eased segment interpolation. The camera looks at a DAMPED focusTarget —
 * never a snapped lookAt. Perlin micro-motion on the Head gives the
 * "human operator" feel; it damps to zero during stat moments and under
 * reduced motion. Lenis velocity couples to a ±2° FOV kick.
 */
import { Group, Object3D, PerspectiveCamera, Vector3 } from 'three';
import { noise1 } from '../utils/noise';
import { _v1, clamp01, damp, easeInOutQuad, lerp } from '../utils/scratch';

export interface CamKey {
  t: number; // local 0..1
  pos: [number, number, number]; // Dolly world position
  look: [number, number, number]; // focus target world position
  fov: number;
  /** damp micro-motion for HUD stat moments */
  calm?: boolean;
}

export class CameraRig {
  readonly dolly = new Group();
  readonly truck = new Group();
  readonly boom = new Group();
  readonly head = new Group();
  readonly camera: PerspectiveCamera;
  readonly focusTarget = new Object3D();

  noiseAmp = 0.05;
  reducedMotion = false;

  private time = 0;
  private targetPos = new Vector3(0, 120, 260);
  private targetFocus = new Vector3(650, 0, 0);
  private targetFov = 55;
  private calm = 0; // 0 = full micro-motion, 1 = calm
  private velocityKick = 0;

  constructor(aspect: number) {
    this.camera = new PerspectiveCamera(55, aspect, 0.5, 4000);
    this.dolly.add(this.truck);
    this.truck.add(this.boom);
    this.boom.add(this.head);
    this.head.add(this.camera);
    this.dolly.position.copy(this.targetPos);
    this.focusTarget.position.copy(this.targetFocus);
  }

  /** Sample a section's track at local t → set rig targets (no snapping). */
  sample(track: CamKey[], localT: number): void {
    if (track.length === 0) return;
    let a = track[0];
    let b = track[track.length - 1];
    for (let i = 0; i < track.length - 1; i++) {
      if (localT >= track[i].t && localT <= track[i + 1].t) {
        a = track[i];
        b = track[i + 1];
        break;
      }
    }
    const span = Math.max(1e-5, b.t - a.t);
    const k = easeInOutQuad(clamp01((localT - a.t) / span));
    this.targetPos.set(
      lerp(a.pos[0], b.pos[0], k),
      lerp(a.pos[1], b.pos[1], k),
      lerp(a.pos[2], b.pos[2], k)
    );
    this.targetFocus.set(
      lerp(a.look[0], b.look[0], k),
      lerp(a.look[1], b.look[1], k),
      lerp(a.look[2], b.look[2], k)
    );
    this.targetFov = lerp(a.fov, b.fov, k);
    const wantCalm = (k < 0.5 ? a.calm : b.calm) ? 1 : 0;
    this.calm += (wantCalm - this.calm) * 0.08;
  }

  /** Instantly converge to current targets (debug seeks / fallback opt-in). */
  snap(): void {
    this.dolly.position.copy(this.targetPos);
    this.focusTarget.position.copy(this.targetFocus);
    this.camera.fov = this.targetFov;
    this.camera.updateProjectionMatrix();
  }

  /** lenis velocity (raw px/frame) → subtle FOV kick, settling expo.out.
   *  Gain tuned so a brisk trackpad flick reads ~1.5° (the old chain of
   *  0.01 × 0.35 was mathematically dead). */
  setScrollVelocity(v: number): void {
    this.velocityKick = Math.max(-2, Math.min(2, v * 0.06));
  }

  /** current sampled target position (dev camera audits) */
  debugTargetPos(): Vector3 {
    return this.targetPos;
  }

  tick(dt: number): void {
    this.time += dt;
    // fast tracking damp: the master timeline is already scrub-damped by the
    // director and Lenis — a third slow filter here made the camera cut
    // corners through hillsides. This stage only removes key-frame kinks.
    const d = damp(dt * 6);
    this.dolly.position.lerp(this.targetPos, d);
    this.focusTarget.position.lerp(this.targetFocus, d);

    // micro-motion on the Head (~0.2 Hz), damped during calm/stat beats
    const amp = this.reducedMotion ? 0 : this.noiseAmp * (1 - this.calm);
    this.head.position.set(
      noise1(this.time * 0.2) * amp,
      noise1(this.time * 0.23 + 31.7) * amp,
      0
    );

    // aim the camera (not the group — Group.lookAt faces +Z) at the damped focus
    _v1.copy(this.focusTarget.position);
    this.dolly.updateMatrixWorld();
    this.camera.lookAt(_v1);
    // operator roll AFTER lookAt — lookAt recomputes the quaternion and
    // silently cancels any roll set before it
    this.camera.rotateZ(noise1(this.time * 0.17 + 91.2) * amp * 0.15);

    // fov + velocity kick, decaying
    this.velocityKick *= Math.pow(0.02, dt);
    const fov = this.targetFov + this.velocityKick;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov += (fov - this.camera.fov) * damp(dt * 3);
      this.camera.updateProjectionMatrix();
    }
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
