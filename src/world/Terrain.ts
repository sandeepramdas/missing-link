/**
 * Terrain — shared Sahyadri massif heightfield (grey-box).
 * Built once, reused by every section. Two basalt massifs over the tunnel
 * spans, a deep gorge under the viaduct spans, a lake basin over the long
 * tunnel (the "beneath the lake" beat), monsoon-green skirts by altitude.
 *
 * S0's contour→3D morph is driven by `setMorph(k)`: vertex heights scale
 * 0→1 against stored base heights (Phase 2 moves this into the triplanar
 * shader as a uniform).
 */
import {
  BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  PlaneGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  CircleGeometry,
} from 'three';
import { fbm2 } from '../utils/noise';
import { mat, PALETTE } from '../materials/greybox';
import { SPANS, VALLEY_FLOOR_Y, ROAD_Y, VIADUCT_1, VIADUCT_2 } from './Alignment';

const SIZE_X = 1700;
const SIZE_Z = 900;
const SEG_X = 220;
const SEG_Z = 110;
const X_MIN = -150;

/** Lake basin centre over the long tunnel (Lonavala/Tungarli region ⟨VERIFY⟩). */
export const LAKE = { x: 700, z: -90, r: 60, y: ROAD_Y + 42 };

function massifProfile(x: number): number {
  // Height envelope along the alignment: high over tunnels, gorge over viaducts.
  let h = 6;
  for (const s of SPANS) {
    const mid = (s.x0 + s.x1) / 2;
    const half = (s.x1 - s.x0) / 2;
    const d = Math.abs(x - mid) / (half + 40);
    const bump = Math.max(0, 1 - d * d);
    if (s.kind === 'tunnel') h += bump * (s.x1 - s.x0 > 400 ? 54 : 40);
    if (s.kind === 'viaduct') h -= bump * 26;
  }
  return h;
}

export function heightAt(x: number, z: number): number {
  const gorge = x > VIADUCT_1.x0 - 20 && x < VIADUCT_2.x1 + 20;
  let h = massifProfile(x);
  // Ridge falls away laterally from the alignment except in the gorge,
  // which cuts across (perpendicular to) the alignment.
  const lateral = Math.abs(z) / 320;
  h *= Math.max(0.15, 1 - lateral * lateral);
  h += fbm2(x * 0.008, z * 0.008, 5) * 22;
  h += fbm2(x * 0.03, z * 0.03, 3) * 5;
  if (gorge) h = Math.min(h, VALLEY_FLOOR_Y + Math.abs(z) * 0.06 + fbm2(x * 0.05, z * 0.05, 2) * 1.5);
  // Lake basin flattens into a bowl
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (dl < LAKE.r * 1.4) h = Math.min(h, LAKE.y - 2 + (dl / LAKE.r) * 3);
  // Approach corridors stay near road level around z≈0
  for (const s of SPANS) {
    if (s.kind !== 'approach') continue;
    if (x >= s.x0 - 30 && x <= s.x1 + 30 && Math.abs(z) < 26) {
      const k = 1 - Math.min(1, Math.abs(z) / 26);
      h = h * (1 - k) + (ROAD_Y - 0.8) * k;
    }
  }
  return h;
}

export class Terrain {
  readonly group = new Group();
  readonly mesh: Mesh;
  readonly contours: LineSegments;
  readonly lake: Mesh;
  private baseHeights: Float32Array;
  private morphK = -1;

  constructor() {
    const geo = new PlaneGeometry(SIZE_X, SIZE_Z, SEG_X, SEG_Z);
    geo.rotateX(-Math.PI / 2);
    geo.translate(X_MIN + SIZE_X / 2, 0, 0);
    const pos = geo.getAttribute('position') as BufferAttribute;
    this.baseHeights = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      this.baseHeights[i] = heightAt(pos.getX(i), pos.getZ(i));
    }
    this.mesh = new Mesh(geo, mat.terrain);
    this.mesh.receiveShadow = true;

    this.contours = buildContours();
    this.contours.position.y = 0.5;

    this.lake = new Mesh(new CircleGeometry(LAKE.r, 40).rotateX(-Math.PI / 2), mat.water);
    this.lake.position.set(LAKE.x, LAKE.y, LAKE.z);
    this.lake.visible = false;

    this.group.add(this.mesh, this.contours, this.lake);
    this.setMorph(0);
  }

  /** k=0 → flat contour map; k=1 → full 3D massif (S0 morph). */
  setMorph(k: number): void {
    if (Math.abs(k - this.morphK) < 1e-4) return;
    this.morphK = k;
    const pos = this.mesh.geometry.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, this.baseHeights[i] * k);
    pos.needsUpdate = true;
    if (k > 0.6) this.mesh.geometry.computeVertexNormals();
    this.contours.visible = k < 0.95;
    (this.contours.material as LineBasicMaterial).opacity = 1 - k;
    this.lake.visible = k > 0.85;
    this.lake.position.y = LAKE.y * Math.max(0.01, k);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.contours.geometry.dispose();
    this.lake.geometry.dispose();
  }
}

/** Concentric contour rings sampled from the heightfield (grey-box stand-in
 *  for the S0 dashOffset self-draw; Phase 2 gives these a draw-on shader). */
function buildContours(): LineSegments {
  const verts: number[] = [];
  const levels = 10;
  const step = 60 / levels;
  for (let li = 1; li <= levels; li++) {
    const level = li * step;
    // march a coarse grid; emit segments where height crosses the level
    const n = 90;
    for (let ix = 0; ix < n; ix++) {
      for (let iz = 0; iz < 45; iz++) {
        const x0 = X_MIN + (ix / n) * SIZE_X;
        const x1 = X_MIN + ((ix + 1) / n) * SIZE_X;
        const z0 = -SIZE_Z / 2 + (iz / 45) * SIZE_Z;
        const h00 = heightAt(x0, z0);
        const h10 = heightAt(x1, z0);
        if ((h00 - level) * (h10 - level) < 0) {
          const t = (level - h00) / (h10 - h00);
          const xc = x0 + (x1 - x0) * t;
          verts.push(xc, 0, z0, xc, 0, z0 + SIZE_Z / 45);
        }
      }
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(verts, 3));
  const m = new LineBasicMaterial({ color: PALETTE.skySteel, transparent: true, opacity: 1 });
  return new LineSegments(geo, m);
}
