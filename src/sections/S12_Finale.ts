/**
 * S12 — Finale: full-corridor fly-through, instanced traffic on the
 * alignment, golden-hour → night lerp with the lit pylon. Status-conditional
 * copy is handled by the HUD (narrative + projectData.overview.currentStatus)
 * — this scene never claims an inauguration.
 */
import { Group, InstancedMesh, Mesh, MeshBasicMaterial, PointLight } from 'three';
import type { BuildCtx, Section } from './types';
import { GEO, box, mat } from './helpers';
import { ROAD_Y, TUBE_OFFSET_Z, X_END } from '../world/Alignment';
import { window01 } from '../utils/scratch';
import { PALETTE } from '../materials/greybox';
import { _m1, _v1, _q1 } from '../utils/scratch';
import { Vector3 } from 'three';

const N_VEHICLES = 84;
const PYLON_X = 316.5;
let traffic: InstancedMesh;
let speeds: Float32Array;
let offsets: Float32Array;
let lanes: Float32Array;
let roll = 0;
let pylonBeacon: Mesh;
let pylonLight: PointLight;
const SCALE = new Vector3();

export const S12_Finale: Section = {
  id: 'S12',
  title: 'Ready for the Road Ahead',
  range: [0, 0],
  persistent: true,
  cameraTrack: [
    // full end-to-end journey: toll plaza → portal A → bridge → exit portal →
    // Kusgaon merge → golden hero on the span
    { t: 0, pos: [-72, 30, 78], look: [-10, 9, 0], fov: 52 }, // Khalapur toll plaza + portal
    { t: 0.16, pos: [-52, 24, 16], look: [31, 10, 0], fov: 46 }, // near-frontal: twin mouths + road in
    { t: 0.38, pos: [PYLON_X - 65, 30, 92], look: [PYLON_X + 36, 12, 0], fov: 56 }, // the bridge
    { t: 0.58, pos: [1170, 26, 80], look: [1243, 10, 0], fov: 50 }, // exit portal, Kusgaon end
    { t: 0.74, pos: [1315, 42, 130], look: [1250, 11, 0], fov: 52, calm: true }, // merge to the expressway
    { t: 1, pos: [490, 95, 250], look: [PYLON_X + 4, 13, 0], fov: 58, calm: true }, // golden hero
  ],
  build(_ctx: BuildCtx): Group {
    const g = new Group();
    traffic = new InstancedMesh(GEO.unitBox, mat.steel, N_VEHICLES);
    traffic.frustumCulled = false;
    g.add(traffic);

    speeds = new Float32Array(N_VEHICLES);
    offsets = new Float32Array(N_VEHICLES);
    lanes = new Float32Array(N_VEHICLES);
    for (let i = 0; i < N_VEHICLES; i++) {
      speeds[i] = 0.02 + ((i * 29) % 10) * 0.0016;
      offsets[i] = (i / N_VEHICLES + ((i * 13) % 7) * 0.01) % 1;
      const dir = i % 2 === 0 ? 1 : -1;
      lanes[i] = dir * (TUBE_OFFSET_Z + (i % 4 < 2 ? -0.6 : 0.6));
    }

    pylonBeacon = box(0.6, 0.6, 0.6, new MeshBasicMaterial({ color: PALETTE.sodiumAmber }), PYLON_X, 14.8, 0);
    pylonBeacon.visible = false; // zero state — lit only during the finale dusk
    pylonLight = new PointLight(PALETTE.sodiumAmber, 0, 200, 1.2);
    pylonLight.position.set(PYLON_X, 15, 0);
    g.add(pylonBeacon, pylonLight);
    return g;
  },
  update(localT, dt, _ctx): void {
    roll += dt * (0.4 + localT);
    for (let i = 0; i < N_VEHICLES; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      let p = (offsets[i] + roll * speeds[i]) % 1;
      if (dir < 0) p = 1 - p;
      // traffic runs onto the EXISTING expressway at both ends — the tie-in
      // is only believable if vehicles cross it
      const x = -95 + p * (X_END + 160 + 95);
      _v1.set(x, ROAD_Y + 1.08, lanes[i]); // seated on the surfaced deck (asphalt top ≈ +0.62)
      _q1.identity();
      _m1.compose(_v1, _q1, SCALE.set(2.4, 0.9, 1.1));
      traffic.setMatrixAt(i, _m1);
    }
    traffic.instanceMatrix.needsUpdate = true;
    traffic.count = Math.floor(N_VEHICLES * window01(localT, 0.05, 0.35));
    // pylon lights up as dusk falls in the last third
    const dusk = window01(localT, 0.6, 0.95);
    pylonBeacon.visible = dusk > 0.02;
    pylonLight.intensity = 60 * dusk;
    (pylonBeacon.material as MeshBasicMaterial).color.setHex(
      dusk > 0.05 ? PALETTE.sodiumAmber : 0x555555
    );
  },
};
