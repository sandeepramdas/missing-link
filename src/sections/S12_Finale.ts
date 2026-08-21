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

const N_VEHICLES = 48;
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
  cameraTrack: [
    { t: 0, pos: [140, 24, 60], look: [260, 10, 0], fov: 48 },
    { t: 0.3, pos: [PYLON_X - 60, 30, 90], look: [PYLON_X + 40, 12, 0], fov: 55 },
    { t: 0.55, pos: [520, 60, 160], look: [700, 20, 0], fov: 58 },
    { t: 0.8, pos: [900, 120, 300], look: [660, 20, 0], fov: 62, calm: true },
    { t: 1, pos: [980, 200, 430], look: [650, 30, 0], fov: 64, calm: true },
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
      const x = p * X_END;
      _v1.set(x, ROAD_Y + 0.6, lanes[i]);
      _q1.identity();
      _m1.compose(_v1, _q1, SCALE.set(2.4, 0.9, 1.1));
      traffic.setMatrixAt(i, _m1);
    }
    traffic.instanceMatrix.needsUpdate = true;
    traffic.count = Math.floor(N_VEHICLES * window01(localT, 0.05, 0.35));
    // pylon lights up as dusk falls in the last third
    const dusk = window01(localT, 0.6, 0.95);
    pylonLight.intensity = 60 * dusk;
    (pylonBeacon.material as MeshBasicMaterial).color.setHex(
      dusk > 0.05 ? PALETTE.sodiumAmber : 0x555555
    );
  },
};
