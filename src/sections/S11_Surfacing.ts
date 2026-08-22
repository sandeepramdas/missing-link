/**
 * S11 — Surfacing & finishing: asphalt sweeps across the open sections
 * (scale-clip along X), lane markings paint on, barriers & signage snap in.
 */
import { Group, InstancedMesh, Mesh } from 'three';
import type { BuildCtx, Section } from './types';
import { GEO, box, makeInstanced, mat } from './helpers';
import { revealInstances, type InstanceSlot } from '../utils/instanceReveal';
import { ROAD_Y, SPANS } from '../world/Alignment';
import { window01, easeInOutQuad } from '../utils/scratch';

let deckStrips: { mesh: Mesh; x0: number; x1: number }[] = [];
let dashes: InstancedMesh;
let dashSlots: InstanceSlot[] = [];
let barriers: InstancedMesh;
let barrierSlots: InstanceSlot[] = [];
let signs: InstancedMesh;
let signSlots: InstanceSlot[] = [];

export const S11_Surfacing: Section = {
  id: 'S11',
  title: 'The Final Layer',
  range: [0, 0],
  persistent: true,
  cameraTrack: [
    { t: 0, pos: [230, 22, 70], look: [274, 9, 0], fov: 46 },
    { t: 0.5, pos: [280, 14, 26], look: [330, 9, 0], fov: 40, calm: true },
    { t: 1, pos: [340, 30, 90], look: [300, 10, 0], fov: 55 },
  ],
  build(_ctx: BuildCtx): Group {
    const g = new Group();
    // asphalt strips over viaducts + approaches (tunnels already floored)
    deckStrips = [];
    for (const s of SPANS) {
      if (s.kind === 'tunnel') continue;
      const m = box(s.x1 - s.x0, 0.24, 5.2, mat.asphalt, (s.x0 + s.x1) / 2, ROAD_Y + 0.5, 0);
      m.scale.x = 1e-3;
      deckStrips.push({ mesh: m, x0: s.x0, x1: s.x1 });
      g.add(m);
    }
    // lane-marking dashes over the viaduct zone
    dashSlots = [];
    let i = 0;
    for (let x = 208; x < 348; x += 6) {
      dashSlots.push({ x, y: ROAD_Y + 0.66, z: 0, sx: 2.6, sy: 0.05, sz: 0.22, order: i++ / 23 });
    }
    dashes = makeInstanced(GEO.unitBox, mat.amberEmissive, dashSlots);
    // barriers both edges
    barrierSlots = [];
    i = 0;
    for (let x = 208; x < 348; x += 10) {
      for (const s of [-1, 1]) {
        barrierSlots.push({ x, y: ROAD_Y + 0.9, z: s * 2.5, sx: 9, sy: 0.5, sz: 0.24, order: i++ / 28 });
      }
    }
    barriers = makeInstanced(GEO.unitBox, mat.concrete, barrierSlots);
    // gantry signage on the approaches
    signSlots = [
      { x: 216, y: ROAD_Y + 3.4, z: 0, sx: 0.4, sy: 0.4, sz: 7, order: 0 },
      { x: 300, y: ROAD_Y + 3.4, z: 0, sx: 0.4, sy: 0.4, sz: 7, order: 0.5 },
      { x: 344, y: ROAD_Y + 3.4, z: 0, sx: 0.4, sy: 0.4, sz: 7, order: 1 },
    ];
    signs = makeInstanced(GEO.unitBox, mat.machine, signSlots);
    g.add(dashes, barriers, signs);
    return g;
  },
  update(localT, _dt, _ctx): void {
    const sweep = easeInOutQuad(window01(localT, 0.05, 0.55));
    for (const d of deckStrips) {
      const k = Math.max(1e-3, sweep);
      d.mesh.scale.x = (d.x1 - d.x0) * k; // box dims live in scale
      d.mesh.position.x = d.x0 + ((d.x1 - d.x0) * k) / 2;
    }
    revealInstances(dashes, dashSlots, window01(localT, 0.45, 0.75), { spread: 0.15 });
    revealInstances(barriers, barrierSlots, window01(localT, 0.55, 0.85), { spread: 0.2, overshoot: true });
    revealInstances(signs, signSlots, window01(localT, 0.75, 0.95), { spread: 0.4, overshoot: true });
  },
};
