/**
 * S12 — Finale: full end-to-end journey with a real low-poly vehicle fleet
 * (cars/trucks/buses, three instanced draw calls) flowing across the existing
 * expressway, through the corridor and over the bridge; golden-hour → dusk
 * with the lit pylon. Status-conditional copy is handled by the HUD — this
 * scene never claims an inauguration.
 */
import { Group, InstancedMesh, Mesh, MeshBasicMaterial, PointLight } from 'three';
import type { BuildCtx, Section } from './types';
import { box } from './helpers';
import { ROAD_Y, TUBE_OFFSET_Z, X_END } from '../world/Alignment';
import { makeVehicleMesh, type VehicleType } from '../world/Vehicles';
import { window01 } from '../utils/scratch';
import { PALETTE } from '../materials/greybox';
import { _m1, _v1, _q1, _e1 } from '../utils/scratch';
import { Vector3 } from 'three';

const N_VEHICLES = 84;
const PYLON_X = 316.5;
const TRAFFIC_X0 = -95;
const TRAFFIC_X1 = X_END + 160;

const FLEET_CAPS: Record<VehicleType, number> = { car: 52, truck: 20, bus: 12 };

let fleet: Record<VehicleType, InstancedMesh>;
let typeOf: VehicleType[] = [];
let idxOf: number[] = [];
let speeds: Float32Array;
let offsets: Float32Array;
let lanes: Float32Array;
let roll = 0;
let pylonBeacon: Mesh;
let pylonLight: PointLight;
const SCALE = new Vector3(1, 1, 1);

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
    { t: 0.27, pos: [110, 78, 118], look: [270, 10, 0], fov: 54 }, // hop OVER the short-tunnel massif
    { t: 0.38, pos: [PYLON_X - 65, 30, 92], look: [PYLON_X + 36, 12, 0], fov: 56 }, // the bridge
    { t: 0.48, pos: [760, 92, 160], look: [1000, 14, 0], fov: 55 }, // aerial sweep OVER the massif (never through it)
    { t: 0.58, pos: [1266, 26, 26], look: [1238, 10, 0], fov: 48 }, // exit portal, Kusgaon end
    { t: 0.74, pos: [1315, 42, 130], look: [1250, 11, 0], fov: 52, calm: true }, // merge to the expressway
    { t: 1, pos: [490, 95, 250], look: [PYLON_X + 4, 13, 0], fov: 58, calm: true }, // golden hero
  ],
  build(_ctx: BuildCtx): Group {
    const g = new Group();

    fleet = {
      car: makeVehicleMesh('car', FLEET_CAPS.car, 11),
      truck: makeVehicleMesh('truck', FLEET_CAPS.truck, 29),
      bus: makeVehicleMesh('bus', FLEET_CAPS.bus, 47),
    };
    g.add(fleet.car, fleet.truck, fleet.bus);

    // deterministic type/lane/speed assignment
    typeOf = [];
    idxOf = [];
    const used: Record<VehicleType, number> = { car: 0, truck: 0, bus: 0 };
    speeds = new Float32Array(N_VEHICLES);
    offsets = new Float32Array(N_VEHICLES);
    lanes = new Float32Array(N_VEHICLES);
    for (let i = 0; i < N_VEHICLES; i++) {
      const pick: VehicleType =
        used.car < FLEET_CAPS.car && i % 5 !== 0 ? 'car' : used.truck < FLEET_CAPS.truck && i % 2 === 0 ? 'truck' : used.bus < FLEET_CAPS.bus ? 'bus' : 'car';
      typeOf.push(pick);
      idxOf.push(used[pick]++);
      speeds[i] = (0.02 + ((i * 29) % 10) * 0.0016) * (pick === 'car' ? 1.15 : 0.9);
      offsets[i] = (i / N_VEHICLES + ((i * 13) % 7) * 0.01) % 1;
      const dir = i % 2 === 0 ? 1 : -1;
      // lanes stay ON the 5.2-wide deck (±2.6): outer lane at ±2.0, inner ±1.0
      lanes[i] = dir * (1.0 + (i % 4 < 2 ? 0 : 1.0));
    }
    void TUBE_OFFSET_Z;

    pylonBeacon = box(0.6, 0.6, 0.6, new MeshBasicMaterial({ color: PALETTE.sodiumAmber }), PYLON_X, 14.8, 0);
    pylonBeacon.visible = false; // zero state — lit only during the finale dusk
    pylonLight = new PointLight(PALETTE.sodiumAmber, 0, 200, 1.2);
    pylonLight.position.set(PYLON_X, 15, 0);
    g.add(pylonBeacon, pylonLight);
    return g;
  },
  update(localT, dt, _ctx): void {
    roll += dt * (0.4 + localT);
    const grow = window01(localT, 0.05, 0.35);
    for (let i = 0; i < N_VEHICLES; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      let p = (offsets[i] + roll * speeds[i]) % 1;
      if (dir < 0) p = 1 - p;
      const x = TRAFFIC_X0 + p * (TRAFFIC_X1 - TRAFFIC_X0);
      _v1.set(x, ROAD_Y + 0.62, lanes[i]); // seated on the asphalt
      _q1.setFromEuler(_e1.set(0, dir > 0 ? 0 : Math.PI, 0));
      _m1.compose(_v1, _q1, SCALE);
      fleet[typeOf[i]].setMatrixAt(idxOf[i], _m1);
    }
    for (const t of ['car', 'truck', 'bus'] as VehicleType[]) {
      fleet[t].count = Math.floor(FLEET_CAPS[t] * grow);
      fleet[t].instanceMatrix.needsUpdate = true;
    }
    // pylon lights up as dusk falls in the last third
    const dusk = window01(localT, 0.6, 0.95);
    pylonBeacon.visible = dusk > 0.02;
    pylonLight.intensity = 60 * dusk;
    (pylonBeacon.material as MeshBasicMaterial).color.setHex(
      dusk > 0.05 ? PALETTE.sodiumAmber : 0x555555
    );
  },
};
