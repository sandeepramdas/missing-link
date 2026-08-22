/**
 * S8 — Viaduct foundations & piers (Package 2 / Afcons). Pile caps set in
 * the gorge; piers stagger up from the valley floor toward deck level.
 */
import { Group, InstancedMesh } from 'three';
import type { BuildCtx, Section } from './types';
import { GEO, makeInstanced, mat } from './helpers';
import { revealInstances, type InstanceSlot } from '../utils/instanceReveal';
import { ROAD_Y, VALLEY_FLOOR_Y, VIADUCT_1, VIADUCT_2 } from '../world/Alignment';
import { window01 } from '../utils/scratch';

let caps: InstancedMesh;
let capSlots: InstanceSlot[] = [];
let piers: InstancedMesh;
let pierSlots: InstanceSlot[] = [];

export const PIER_XS: number[] = [];
for (let x = VIADUCT_1.x0 + 10; x <= VIADUCT_2.x1 - 10; x += 16) PIER_XS.push(x);

export const S08_Piers: Section = {
  id: 'S08',
  title: 'Rising from the Gorge',
  range: [0, 0],
  persistent: true,
  cameraTrack: [
    // exits the lined bore ABOVE the massif shoulder (the old first key at
    // 640,30,60 was 236 m inside the mountain)
    { t: 0, pos: [420, 62, 130], look: [330, 5, 0], fov: 52 },
    { t: 0.4, pos: [380, 70, 170], look: [277, 5, 0], fov: 60, calm: true },
    { t: 1, pos: [250, 40, 130], look: [300, 20, 0], fov: 58 },
  ],
  build(ctx: BuildCtx): Group {
    const g = new Group();
    // every pier's length comes from the ACTUAL ground at its x — constants
    // left foundations floating over the deeper parts of the gorge
    capSlots = PIER_XS.map((x, i) => {
      const ground = ctx.terrain.groundAt(x, 0);
      return {
        x, y: ground + 0.5, z: 0, sx: 5, sy: 1.4, sz: 6, order: i / (PIER_XS.length - 1),
      };
    });
    caps = makeInstanced(GEO.unitBox, mat.concrete, capSlots);

    pierSlots = PIER_XS.map((x, i) => {
      const ground = ctx.terrain.groundAt(x, 0);
      const pierH = Math.max(2, ROAD_Y - ground - 1.0);
      return {
        x, y: ground + 1.0 + pierH / 2, z: 0, sx: 2.4, sy: pierH, sz: 3.4,
        order: i / (PIER_XS.length - 1),
      };
    });
    piers = makeInstanced(GEO.unitBox, mat.concrete, pierSlots);
    g.add(caps, piers);
    void VALLEY_FLOOR_Y;
    return g;
  },
  update(localT, _dt, _ctx): void {
    revealInstances(caps, capSlots, window01(localT, 0.08, 0.4), { spread: 0.3, overshoot: true });
    revealInstances(piers, pierSlots, window01(localT, 0.3, 0.95), {
      spread: 0.35,
      growFrom: 'bottom',
      overshoot: true,
    });
  },
};
