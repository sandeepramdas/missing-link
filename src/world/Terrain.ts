/**
 * Terrain — shared Sahyadri massif heightfield.
 * Mesa-profile massifs over the tunnel spans (flat top, steep flanks —
 * Deccan trap), a REAL gorge between them that blends wall→floor so both
 * mid-gorge portal faces meet full rock, a lake basin over the long tunnel,
 * monsoon-green colouring by altitude and slope.
 *
 * Grounding contract: `heightAt(x, z)` is the analytic field the world is
 * generated from; `terrain.groundAt(x, z)` bilinearly samples the SAME grid
 * the visible mesh uses — anything that must rest on the visible surface
 * (trees, props, piers) uses groundAt, not the raw function.
 *
 * S0's contour→3D morph is driven by `setMorph(k)`.
 */
import {
  BufferAttribute,
  Color,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  CircleGeometry,
  SRGBColorSpace,
} from 'three';
import { fbm2 } from '../utils/noise';
import { mat, PALETTE } from '../materials/greybox';
import {
  SPANS,
  VALLEY_FLOOR_Y,
  ROAD_Y,
  VIADUCT_1,
  VIADUCT_2,
  TUNNEL_SHORT,
  TUNNEL_LONG,
} from './Alignment';
import { clamp01, smoothstep } from '../utils/scratch';

const SIZE_X = 1700;
const SIZE_Z = 900;
const SEG_X = 260;
const SEG_Z = 130;
const X_MIN = -150;

/** Lake basin centre over the long tunnel (Lonavala/Tungarli region ⟨VERIFY⟩). */
export const LAKE = { x: 700, z: -90, r: 48, y: ROAD_Y + 42 };

function massifProfile(x: number): number {
  // mesa profile (flat top, steep flanks) over each tunnel span — keeps the
  // rock face TALL right at every portal so tunnel mouths meet real mountain
  let h = 6;
  for (const s of [TUNNEL_SHORT, TUNNEL_LONG]) {
    const mid = (s.x0 + s.x1) / 2;
    const half = (s.x1 - s.x0) / 2;
    const d = Math.abs(x - mid) / (half + 40);
    const mesa = Math.max(0, 1 - Math.pow(d, 3.4));
    h += mesa * (s.x1 - s.x0 > 400 ? 54 : 40);
  }
  return h;
}

export function heightAt(x: number, z: number): number {
  let h = massifProfile(x);
  // ridge falls away laterally from the alignment
  const lateral = Math.abs(z) / 320;
  h *= Math.max(0.15, 1 - lateral * lateral);
  h += fbm2(x * 0.008, z * 0.008, 5) * 22;
  h += fbm2(x * 0.03, z * 0.03, 3) * 5;

  // ── the gorge: a real valley BETWEEN the viaduct portals only ────────
  // blends massif-wall → floor over 14 units from each face, so the floor
  // is a consistent ~VALLEY_FLOOR_Y (piers/pylon reach it) and both faces
  // at x=205/349 remain full-height rock. (The old additive depressions
  // superimposed to −31 and swallowed the massif ends.)
  const gk =
    smoothstep(clamp01((x - VIADUCT_1.x0) / 14)) * smoothstep(clamp01((VIADUCT_2.x1 - x) / 14));
  if (gk > 0) {
    const floor = VALLEY_FLOOR_Y + Math.abs(z) * 0.09 + fbm2(x * 0.05, z * 0.05, 2) * 1.5;
    h = h * (1 - gk) + floor * gk;
  }

  // Lake basin flattens into a bowl
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (dl < LAKE.r * 1.8) h = Math.min(h, LAKE.y - 2.2 + Math.pow(dl / LAKE.r, 2) * 4);

  // Approach corridors carve to the PAVEMENT UNDERSIDE (slabs sit at
  // ROAD_Y+0.5, 0.24 thick → underside 8.38), stopping at the portal faces
  const inTunnel =
    (x > TUNNEL_SHORT.x0 + 1 && x < TUNNEL_SHORT.x1 - 1) ||
    (x > TUNNEL_LONG.x0 + 1 && x < TUNNEL_LONG.x1 - 1);
  if (!inTunnel && gk < 0.02) {
    for (const s of SPANS) {
      if (s.kind !== 'approach') continue;
      if (x >= s.x0 - 170 && x <= s.x1 + 170 && Math.abs(z) < 26) {
        const k = 1 - Math.min(1, Math.abs(z) / 26);
        h = h * (1 - k) + (ROAD_Y + 0.35) * k;
      }
    }
  }
  return h;
}

export class Terrain {
  readonly group = new Group();
  readonly mesh: Mesh;
  readonly contours: LineSegments;
  readonly lake: Mesh;
  private lakeMat: MeshLambertMaterial;
  private baseHeights: Float32Array;
  private morphK = -1;
  private lastNormalsK = -1;

  /** current contour→massif morph state (0 flat map … 1 full relief) */
  get morph(): number {
    return Math.max(0, this.morphK);
  }

  constructor() {
    const geo = new PlaneGeometry(SIZE_X, SIZE_Z, SEG_X, SEG_Z);
    geo.rotateX(-Math.PI / 2);
    geo.translate(X_MIN + SIZE_X / 2, 0, 0);
    const pos = geo.getAttribute('position') as BufferAttribute;
    this.baseHeights = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      this.baseHeights[i] = heightAt(pos.getX(i), pos.getZ(i));
    }
    geo.setAttribute('color', buildTerrainColors(this.baseHeights));
    this.mesh = new Mesh(geo, terrainNaturalMat);
    this.mesh.receiveShadow = true;

    this.contours = buildContours();
    this.contours.position.y = 0.5;

    this.lakeMat = new MeshLambertMaterial({
      color: 0x9cc8de,
      transparent: true,
      opacity: 0,
    });
    this.lake = new Mesh(new CircleGeometry(LAKE.r, 40).rotateX(-Math.PI / 2), this.lakeMat);
    this.lake.position.set(LAKE.x, LAKE.y, LAKE.z);
    this.lake.visible = false;
    void mat;

    this.group.add(this.mesh, this.contours, this.lake);
    this.setMorph(0);
  }

  /** Sample the SAME grid the visible mesh interpolates — the analytic
   *  heightAt differs from the rendered surface by 1–2 units between grid
   *  samples, which is exactly the "everything is stickered on" error. */
  groundAt(x: number, z: number): number {
    const fx = clamp01((x - X_MIN) / SIZE_X) * SEG_X;
    const fz = clamp01((z + SIZE_Z / 2) / SIZE_Z) * SEG_Z;
    const cx = Math.min(SEG_X - 1, Math.floor(fx));
    const cz = Math.min(SEG_Z - 1, Math.floor(fz));
    const tx = fx - cx;
    const tz = fz - cz;
    const W = SEG_X + 1;
    const h00 = this.baseHeights[cz * W + cx];
    const h10 = this.baseHeights[cz * W + cx + 1];
    const h01 = this.baseHeights[(cz + 1) * W + cx];
    const h11 = this.baseHeights[(cz + 1) * W + cx + 1];
    return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
  }

  /** k=0 → flat contour map; k=1 → full 3D massif (S0 morph). */
  setMorph(k: number): void {
    if (Math.abs(k - this.morphK) < 1e-4) return;
    this.morphK = k;
    const pos = this.mesh.geometry.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, this.baseHeights[i] * k);
    pos.needsUpdate = true;
    // normals: throttled recompute so the terrain shades DURING the morph
    // without paying 24k-vertex normal math every scrub frame
    if (Math.abs(k - this.lastNormalsK) > 0.15 || (k === 1 && this.lastNormalsK !== 1)) {
      this.lastNormalsK = k;
      this.mesh.geometry.computeVertexNormals();
      if (k === 1) this.mesh.geometry.computeBoundingSphere();
    }
    // contours are a map-state graphic: gone well before full relief
    const cvis = clamp01(1 - k / 0.6);
    this.contours.visible = cvis > 0.01;
    (this.contours.material as LineBasicMaterial).opacity = cvis;
    // lake fades in as the basin forms (no binary pop)
    const lk = clamp01((k - 0.85) / 0.12);
    this.lake.visible = lk > 0.01;
    this.lakeMat.opacity = 0.85 * lk;
    this.lake.position.y = (LAKE.y - 1.1) * Math.max(0.01, k);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.contours.geometry.dispose();
    this.lake.geometry.dispose();
  }
}

/** Natural Sahyadri colouring by altitude + slope. Slope comes from the
 *  already-sampled height grid (the old version re-called heightAt 4× per
 *  vertex — most of the 212 ms terrain build). Colours are authored in sRGB
 *  and converted to the renderer's linear working space. */
const terrainNaturalMat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
const _cc = new Color();

function buildTerrainColors(heights: Float32Array): Float32BufferAttribute {
  const W = SEG_X + 1;
  const H = SEG_Z + 1;
  const dx = SIZE_X / SEG_X;
  const dz = SIZE_Z / SEG_Z;
  const colors = new Float32Array(W * H * 3);
  const c = { r: 0, g: 0, b: 0 };
  const mix = (a: [number, number, number], b: [number, number, number], t: number) => {
    c.r = a[0] + (b[0] - a[0]) * t;
    c.g = a[1] + (b[1] - a[1]) * t;
    c.b = a[2] + (b[2] - a[2]) * t;
  };
  const GREEN_DEEP: [number, number, number] = [0.24, 0.36, 0.2];
  const GREEN_MID: [number, number, number] = [0.36, 0.5, 0.29];
  const PLATEAU: [number, number, number] = [0.5, 0.53, 0.36];
  const BASALT: [number, number, number] = [0.36, 0.34, 0.32];
  const EARTH: [number, number, number] = [0.42, 0.37, 0.28];

  for (let row = 0; row < H; row++) {
    for (let col = 0; col < W; col++) {
      const i = row * W + col;
      const h = heights[i];
      const hx0 = heights[row * W + Math.max(0, col - 1)];
      const hx1 = heights[row * W + Math.min(W - 1, col + 1)];
      const hz0 = heights[Math.max(0, row - 1) * W + col];
      const hz1 = heights[Math.min(H - 1, row + 1) * W + col];
      const slope = Math.min(1, Math.hypot((hx1 - hx0) / (2 * dx), (hz1 - hz0) / (2 * dz)) * 1.6);

      if (h < 2) mix(EARTH, GREEN_DEEP, Math.max(0, (h + 4) / 6));
      else if (h < 24) mix(GREEN_DEEP, GREEN_MID, h / 24);
      else if (h < 46) mix(GREEN_MID, PLATEAU, (h - 24) / 22);
      else mix(PLATEAU, PLATEAU, 0);
      if (slope > 0.45) {
        const k = Math.min(1, (slope - 0.45) / 0.35);
        mix([c.r, c.g, c.b], BASALT, k);
      }
      const x = X_MIN + col * dx;
      const z = -SIZE_Z / 2 + row * dz;
      const v = 1 + fbm2(x * 0.02, z * 0.02, 3) * 0.18;
      // authored sRGB → linear working space (raw attribute writes bypass
      // three's colour management)
      _cc.setRGB(Math.min(1, c.r * v), Math.min(1, c.g * v), Math.min(1, c.b * v), SRGBColorSpace);
      colors[i * 3] = _cc.r;
      colors[i * 3 + 1] = _cc.g;
      colors[i * 3 + 2] = _cc.b;
    }
  }
  return new Float32BufferAttribute(colors, 3);
}

/** Concentric contour rings sampled from the heightfield (grey-box stand-in
 *  for the S0 dashOffset self-draw; Phase 2 gives these a draw-on shader). */
function buildContours(): LineSegments {
  const verts: number[] = [];
  const levels = 10;
  const step = 60 / levels;
  for (let li = 1; li <= levels; li++) {
    const level = li * step;
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
