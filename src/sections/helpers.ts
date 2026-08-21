/**
 * Grey-box construction kit shared by sections: primitive factories, tube
 * shells, instanced slot generators. Geometries are shared singletons where
 * possible (draw-call + memory budget).
 */
import {
  BackSide,
  BoxGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Material,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  SphereGeometry,
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

/** Interior tunnel shell (back-side cylinder + floor) for one tube. */
const tubeInterior = new MeshLambertMaterial({ color: 0x232326, side: BackSide });
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
  return g;
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

/** slots fanned around a tunnel crown arc (rock bolts). */
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
        ry: 0,
        order: (r + centerDist) / rings,
      });
    }
  }
  return out;
}

export const noop = (): void => undefined;
export { mat };
