/**
 * S7 — Final lining sweeps down the bore as instanced rings; cross-passage
 * doors (emissive green) open at intervals between the twin tubes.
 */
import { Group, PointLight, TorusGeometry, InstancedMesh } from 'three';
import type { BuildCtx, Section } from './types';
import { GEO, makeInstanced, makeStringLights, makeTwinTubes, mat } from './helpers';
import { revealInstances, type InstanceSlot } from '../utils/instanceReveal';
import { ROAD_Y, TUBE_OFFSET_Z } from '../world/Alignment';
import { window01 } from '../utils/scratch';

const Z = TUBE_OFFSET_Z;
const X0 = 420;
const X1 = 620;
let rings: InstancedMesh;
let ringSlots: InstanceSlot[] = [];
let doors: InstancedMesh;
let doorSlots: InstanceSlot[] = [];

export const S07_Lining: Section = {
  id: 'S07',
  title: 'Lining the Bore',
  range: [0, 0],
  cameraTrack: [
    { t: 0, pos: [X0 - 24, ROAD_Y + 1.6, Z], look: [X0, ROAD_Y + 1.2, Z], fov: 34 },
    { t: 0.6, pos: [X0 + 90, ROAD_Y + 1.7, Z - 0.4], look: [X0 + 150, ROAD_Y + 1.2, Z], fov: 38, calm: true },
    { t: 1, pos: [X1 - 10, ROAD_Y + 1.7, Z], look: [X1 + 40, ROAD_Y + 1.2, Z], fov: 42 },
  ],
  build(_ctx: BuildCtx): Group {
    const g = new Group();
    g.add(makeTwinTubes(X0 - 30, X1 + 60));

    // instanced lining rings sweeping down the bore
    const ringGeo = new TorusGeometry(1.38, 0.1, 6, 14, Math.PI * 1.25);
    ringGeo.rotateY(Math.PI / 2);
    ringGeo.rotateX(-Math.PI * 0.125);
    ringSlots = [];
    const N = 40;
    for (let i = 0; i < N; i++) {
      ringSlots.push({
        x: X0 + (i / (N - 1)) * (X1 - X0),
        y: ROAD_Y + 0.9,
        z: Z,
        sx: 1, sy: 1, sz: 1,
        order: i / (N - 1),
      });
    }
    rings = makeInstanced(GEO.unitBox, mat.concrete, ringSlots);
    (rings as InstancedMesh).geometry = ringGeo;
    g.add(rings);

    // cross-passage doors every ~30 units (~300 m ⟨VERIFY⟩) — flush emissive
    // panels ON the wall toward the twin tube (a free-standing block at z=0
    // parked a giant green slab in the middle of the carriageway)
    doorSlots = [];
    let d = 0;
    for (let x = X0 + 15; x < X1; x += 30) {
      doorSlots.push({
        x, y: ROAD_Y + 0.85, z: Z - 1.36, sx: 1.3, sy: 1.5, sz: 0.16, order: d++ / 6,
      });
    }
    doors = makeInstanced(GEO.unitBox, mat.greenEmissive, doorSlots);
    g.add(doors);

    makeStringLights(g, X0 - 20, X1 + 30, Z, 44, 30);
    const glow = new PointLight(0xffe6c4, 30, 110, 1.3);
    glow.position.set((X0 + X1) / 2, ROAD_Y + 2.6, Z);
    g.add(glow);
    return g;
  },
  update(localT, _dt, _ctx): void {
    revealInstances(rings, ringSlots, window01(localT, 0.05, 0.75), { spread: 0.2, overshoot: true });
    revealInstances(doors, doorSlots, window01(localT, 0.5, 0.9), { spread: 0.3 });
  },
};
