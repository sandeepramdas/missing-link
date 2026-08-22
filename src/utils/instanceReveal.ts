/**
 * Instanced-reveal helpers — the grey-box stand-in for the Phase-2 vertex-shader
 * per-instance progress attribute (PRD §4.6). Drives staggered scale/position
 * reveals on an InstancedMesh from a scene-local progress value, allocation-free.
 */
import { InstancedMesh } from 'three';
import { _m1, _v1, _q1, clamp01, easeOutCubic, easeOutBackSoft } from './scratch';

export interface InstanceSlot {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  ry?: number;
  /** align local +Y to this world direction (rock bolts drive radially) */
  axis?: [number, number, number];
  /** normalized stagger order 0..1 (defaults to index/count) */
  order?: number;
}

/**
 * Reveal instances by scaling them in, staggered by `order`.
 * `progress` 0 → none visible; 1 → all settled.
 * `spread` = how much of the progress window each instance's own tween takes.
 */
export function revealInstances(
  mesh: InstancedMesh,
  slots: InstanceSlot[],
  progress: number,
  opts: { spread?: number; growFrom?: 'center' | 'bottom'; overshoot?: boolean } = {}
): void {
  const spread = opts.spread ?? 0.35;
  const n = slots.length;
  for (let i = 0; i < n; i++) {
    const s = slots[i];
    const order = s.order ?? i / Math.max(1, n - 1);
    const start = order * (1 - spread);
    const local = clamp01((progress - start) / spread);
    const k = opts.overshoot ? easeOutBackSoft(local) : easeOutCubic(local);
    const sy = Math.max(1e-4, s.sy * k);
    _v1.set(s.x, opts.growFrom === 'bottom' ? s.y + (sy - s.sy) * 0.5 : s.y, s.z);
    if (s.axis) {
      AXIS.set(s.axis[0], s.axis[1], s.axis[2]).normalize();
      _q1.setFromUnitVectors(UP, AXIS);
    } else {
      _q1.setFromAxisAngle(UP, s.ry ?? 0);
    }
    _m1.compose(_v1, _q1, SCALE.set(Math.max(1e-4, s.sx * k), sy, Math.max(1e-4, s.sz * k)));
    mesh.setMatrixAt(i, _m1);
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
}

import { Vector3 } from 'three';
const UP = new Vector3(0, 1, 0);
const AXIS = new Vector3();
const SCALE = new Vector3();
