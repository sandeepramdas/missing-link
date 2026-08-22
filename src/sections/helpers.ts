/**
 * Grey-box construction kit shared by sections: primitive factories, tube
 * shells, instanced slot generators. Geometries are shared singletons where
 * possible (draw-call + memory budget).
 */
import {
  BackSide,
  BoxGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  PointLight,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { mat } from '../materials/greybox';
import { ROAD_Y, TUBE_OFFSET_Z } from '../world/Alignment';
import type { InstanceSlot } from '../utils/instanceReveal';

export const GEO = {
  unitBox: new BoxGeometry(1, 1, 1),
  unitCyl: new CylinderGeometry(0.5, 0.5, 1, 10),
  bolt: new CylinderGeometry(0.05, 0.05, 1, 5),
  sphere: new SphereGeometry(0.5, 10, 8),
};

export function box(
  w: number,
  h: number,
  d: number,
  m: Material,
  x = 0,
  y = 0,
  z = 0
): Mesh {
  const mesh = new Mesh(GEO.unitBox, m);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  return mesh;
}

export function cyl(r: number, h: number, m: Material, x = 0, y = 0, z = 0): Mesh {
  const mesh = new Mesh(GEO.unitCyl, m);
  mesh.scale.set(r * 2, h, r * 2);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Interior tunnel shell (back-side cylinder + floor) for one tube.
 *  Warm mid-grey, not near-black — work lights must have something to catch. */
const tubeInterior = new MeshLambertMaterial({ color: 0x4a4642, side: BackSide });
const tubeEndCap = new MeshLambertMaterial({ color: 0x0c0c0f, side: DoubleSide });
const capGeo = new CircleGeometry(1.46, 14);
export function makeTubeShell(x0: number, x1: number, zOffset: number): Group {
  const g = new Group();
  const len = x1 - x0;
  const shell = new Mesh(new CylinderGeometry(1.45, 1.45, len, 14, 1, true), tubeInterior);
  shell.rotation.z = Math.PI / 2;
  shell.position.set(x0 + len / 2, ROAD_Y + 0.9, zOffset);
  shell.scale.y = 1; // along axis after rotation
  const floor = new Mesh(new PlaneGeometry(len, 2.6), mat.asphalt);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x0 + len / 2, ROAD_Y + 0.02, zOffset);
  g.add(shell, floor);
  // dark end caps: the bore must terminate in darkness — with no cap the
  // sightline down the axis exits the shell and shows whatever stands 7 km
  // away (the far portal was visible THROUGH the mountain)
  for (const xe of [x0, x1]) {
    const cap = new Mesh(capGeo, tubeEndCap);
    cap.position.set(xe, ROAD_Y + 0.9, zOffset);
    cap.rotation.y = Math.PI / 2;
    g.add(cap);
  }
  return g;
}

/** Construction string lights: emissive amber blocks along the crown +
 *  matching point lights every `spacing` — the standard site-lighting look
 *  that keeps every tunnel beat legible. */
export function makeStringLights(
  g: Group,
  x0: number,
  x1: number,
  zOffset: number,
  spacing = 18,
  intensity = 22
): void {
  const slots: InstanceSlot[] = [];
  for (let x = x0; x <= x1; x += 6) {
    slots.push({ x, y: ROAD_Y + 2.2, z: zOffset + 0.9, sx: 0.35, sy: 0.08, sz: 0.14 });
  }
  const bulbs = makeInstanced(new BoxGeometry(1, 1, 1), mat.amberEmissive, slots);
  revealAll(bulbs, slots);
  g.add(bulbs);
  // physical decay (2) with intensity retuned: pools of light in darkness,
  // not an evenly-lit corridor
  for (let x = x0 + spacing / 2; x <= x1; x += spacing) {
    const l = new PointLight(0xffd9a6, intensity * 3.5, spacing * 2.6, 2);
    l.position.set(x, ROAD_Y + 2.0, zOffset);
    g.add(l);
  }
}

function revealAll(mesh: InstancedMesh, slots: InstanceSlot[]): void {
  const m = new Matrix4();
  const p = new Vector3();
  const q = new Quaternion();
  const s = new Vector3();
  slots.forEach((slot, i) => {
    p.set(slot.x, slot.y, slot.z);
    s.set(slot.sx, slot.sy, slot.sz);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.count = slots.length;
  mesh.instanceMatrix.needsUpdate = true;
}

/** Twin tubes. */
export function makeTwinTubes(x0: number, x1: number): Group {
  const g = new Group();
  g.add(makeTubeShell(x0, x1, TUBE_OFFSET_Z), makeTubeShell(x0, x1, -TUBE_OFFSET_Z));
  return g;
}

export function makeInstanced(
  geo: BoxGeometry | CylinderGeometry,
  material: Material,
  slots: InstanceSlot[]
): InstancedMesh {
  const m = new InstancedMesh(geo, material, slots.length);
  m.frustumCulled = false;
  m.count = 0;
  return m;
}

/** slots in a line along X. */
export function lineSlots(
  n: number,
  x0: number,
  x1: number,
  y: number,
  z: number,
  size: [number, number, number],
  jitterZ = 0
): InstanceSlot[] {
  const out: InstanceSlot[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    out.push({
      x: x0 + (x1 - x0) * t,
      y,
      z: z + (i % 2 === 0 ? 1 : -1) * jitterZ * ((i * 37) % 5) * 0.2,
      sx: size[0],
      sy: size[1],
      sz: size[2],
    });
  }
  return out;
}

/** slots fanned around a tunnel crown arc (rock bolts), each bolt's axis
 *  pointing RADIALLY into the rock — not straight up. */
export function crownSlots(
  rings: number,
  perRing: number,
  x0: number,
  dx: number,
  zOffset: number,
  radius: number
): InstanceSlot[] {
  const out: InstanceSlot[] = [];
  for (let r = 0; r < rings; r++) {
    for (let i = 0; i < perRing; i++) {
      const a = Math.PI * (0.15 + (0.7 * i) / (perRing - 1)); // crown arc
      // centre-out stagger order (build prompt: bolts fire centre-out)
      const centerDist = Math.abs(i - (perRing - 1) / 2) / ((perRing - 1) / 2);
      out.push({
        x: x0 + r * dx,
        y: ROAD_Y + 0.9 + Math.sin(a) * radius,
        z: zOffset + Math.cos(a) * radius,
        sx: 1,
        sy: 0.45, // ~4.5 m NATM rock bolts
        sz: 1,
        axis: [0, Math.sin(a), Math.cos(a)], // radial into the crown
        order: (r + centerDist) / rings,
      });
    }
  }
  return out;
}

export const noop = (): void => undefined;
export { mat };
