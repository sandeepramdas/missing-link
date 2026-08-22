/**
 * Vehicles — procedural low-poly fleet (car / truck / bus), the art-pass
 * replacement for placeholder boxes. Each type is ONE merged geometry with
 * baked vertex colours (body / glass / wheels), instanced per type — three
 * draw calls for any number of vehicles. Bodies are near-white so
 * per-instance colours tint them (wheels/glass are dark enough to ignore
 * the tint).
 *
 * Authoring frame: length along +X (nose at +X), ground at y=0.
 * Representational scale (~1:10 exaggerated) per PRD NG1 — true-scale cars
 * would be invisible specks from the aerial cameras.
 */
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  InstancedMesh,
  MeshLambertMaterial,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const vehicleMat = new MeshLambertMaterial({ vertexColors: true });

const GLASS = 0x232b38;
const WHEEL = 0x17171b;
const BODY = 0xd9dade; // near-white; instanceColor supplies the tint

function bake(geo: BufferGeometry, hex: number): BufferGeometry {
  const c = new Color(hex);
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new Float32BufferAttribute(arr, 3));
  return geo;
}

function boxPart(w: number, h: number, d: number, x: number, y: number, z: number, hex: number) {
  const g = new BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return bake(g, hex);
}

function wheelSet(slots: [number, number][], r = 0.2): BufferGeometry[] {
  return slots.map(([x, z]) => {
    const w = new CylinderGeometry(r, r, 0.16, 8);
    w.rotateX(Math.PI / 2);
    w.translate(x, r, z);
    return bake(w, WHEEL);
  });
}

export function carGeometry(): BufferGeometry {
  return mergeGeometries([
    boxPart(2.0, 0.34, 1.0, 0, 0.42, 0, BODY), // body
    boxPart(1.05, 0.3, 0.9, -0.12, 0.72, 0, GLASS), // cabin/glass
    ...wheelSet([
      [0.62, 0.44],
      [0.62, -0.44],
      [-0.62, 0.44],
      [-0.62, -0.44],
    ]),
  ]);
}

export function truckGeometry(): BufferGeometry {
  return mergeGeometries([
    boxPart(0.75, 0.62, 1.0, 1.15, 0.62, 0, GLASS), // cab
    boxPart(0.75, 0.22, 1.0, 1.15, 0.28, 0, BODY), // cab base
    boxPart(2.05, 0.95, 1.05, -0.3, 0.82, 0, BODY), // cargo
    ...wheelSet(
      [
        [1.15, 0.46],
        [1.15, -0.46],
        [-0.1, 0.46],
        [-0.1, -0.46],
        [-1.05, 0.46],
        [-1.05, -0.46],
      ],
      0.23
    ),
  ]);
}

export function busGeometry(): BufferGeometry {
  return mergeGeometries([
    boxPart(3.4, 0.85, 1.05, 0, 0.72, 0, BODY), // shell
    boxPart(3.1, 0.24, 1.08, 0, 0.96, 0, GLASS), // window band
    ...wheelSet(
      [
        [1.2, 0.46],
        [1.2, -0.46],
        [-1.2, 0.46],
        [-1.2, -0.46],
      ],
      0.23
    ),
  ]);
}

export type VehicleType = 'car' | 'truck' | 'bus';
const GEOMS: Record<VehicleType, () => BufferGeometry> = {
  car: carGeometry,
  truck: truckGeometry,
  bus: busGeometry,
};

/** Plausible Indian-highway body tints (applied via instanceColor). */
const TINTS = [0xffffff, 0xe8e8ea, 0xc7ccd2, 0x9aa3ad, 0xb23a2e, 0x2e5fb2, 0xd9a441, 0x3f7a4e];

export function makeVehicleMesh(type: VehicleType, capacity: number, seed = 1): InstancedMesh {
  const mesh = new InstancedMesh(GEOMS[type](), vehicleMat, capacity);
  mesh.frustumCulled = false;
  mesh.count = 0;
  const c = new Color();
  let s = seed;
  for (let i = 0; i < capacity; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    c.setHex(TINTS[s % TINTS.length]);
    mesh.setColorAt(i, c);
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}
