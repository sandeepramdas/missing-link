/**
 * Vegetation — instanced low-poly tree cover for the "nature view".
 * One InstancedMesh (single draw call). Deterministic placement: rejection-
 * sampled onto gentle, mid-altitude green slopes; keeps clear of the
 * alignment corridor, the gorge and the lake.
 */
import {
  Color,
  ConeGeometry,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { heightAt, LAKE } from './Terrain';
import { ROAD_Y } from './Alignment';

const _m = new Matrix4();
const _p = new Vector3();
const _q = new Quaternion();
const _s = new Vector3();
const _c = new Color();

export function buildVegetation(count = 700): InstancedMesh {
  // squat cone reads as monsoon canopy at 1u = 10 m (≈9–14 m trees)
  const geo = new ConeGeometry(0.55, 1.15, 6);
  geo.translate(0, 0.55, 0);
  const mat = new MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const mesh = new InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;

  // deterministic LCG so every visit grows the same forest
  let seed = 20260821;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  let placed = 0;
  let guard = 0;
  while (placed < count && guard++ < count * 40) {
    const x = -120 + rnd() * 1560;
    const z = -370 + rnd() * 740;
    const h = heightAt(x, z);
    if (h < 3 || h > 44) continue; // gorge floor / bare plateau
    const slope = Math.hypot(heightAt(x + 3, z) - h, heightAt(x, z + 3) - h) / 3;
    if (slope > 0.55) continue; // cliffs stay bare basalt
    if (Math.abs(z) < 12 && h < ROAD_Y + 4) continue; // alignment corridor
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r * 1.15) continue; // lake
    const sc = 0.75 + rnd() * 0.9;
    _p.set(x, h - 0.05, z);
    _q.identity();
    _s.set(sc, sc * (0.85 + rnd() * 0.5), sc);
    _m.compose(_p, _q, _s);
    mesh.setMatrixAt(placed, _m);
    // canopy hue variation: deep monsoon green → brighter grass green
    _c.setHSL(0.29 + rnd() * 0.05, 0.38 + rnd() * 0.18, 0.22 + rnd() * 0.12);
    mesh.setColorAt(placed, _c);
    placed++;
  }
  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return mesh;
}
