/**
 * S4 — Portal Excavation & Slope Stabilization (Khalapur end portal).
 * Bench cuts remove stepped layers (scale-out in reverse), excavators work,
 * slope bolts + shotcrete pin the face, the portal frame casts in.
 */
import { Group, Mesh, MeshLambertMaterial, PointLight } from 'three';
import type { BuildCtx, Section } from './types';
import { GEO, box, makeInstanced, mat } from './helpers';
import { revealInstances, type InstanceSlot } from '../utils/instanceReveal';
import { ROAD_Y, TUNNEL_SHORT, TUBE_OFFSET_Z } from '../world/Alignment';
import { window01, easeOutCubic, clamp01 } from '../utils/scratch';

const PX = TUNNEL_SHORT.x0; // portal face x = 30
const BENCH_H = 3.2;
let benches: Mesh[] = [];
let excavators: ReturnType<typeof makeInstanced>;
let excSlots: InstanceSlot[] = [];
let bolts: ReturnType<typeof makeInstanced>;
let boltSlots: InstanceSlot[] = [];
let shotcrete: Mesh;

export const S04_Portals: Section = {
  id: 'S04',
  title: 'Opening the Face',
  range: [0, 0],
  cameraTrack: [
    { t: 0, pos: [120, 60, 120], look: [PX, 20, 0], fov: 50 },
    { t: 0.5, pos: [-46, 58, 96], look: [PX + 6, 16, 0], fov: 48 },
    { t: 0.9, pos: [-26, 34, 52], look: [PX + 2, 12, 0], fov: 42, calm: true },
    { t: 1, pos: [2, 12.4, TUBE_OFFSET_Z], look: [PX + 30, 9.5, TUBE_OFFSET_Z], fov: 34 },
  ],
  build(_ctx: BuildCtx): Group {
    const g = new Group();
    // five bench layers stepping down the cut face — held PROUD of the
    // terrain skin (the old stack sat entirely inside the mountain and the
    // whole excavation beat was invisible). Dimension stored separately from
    // the animation channel.
    benches = [];
    for (let i = 0; i < 5; i++) {
      const b = box(4, BENCH_H, 21 - i * 2.5, mat.rock, PX + 2 + i * 0.9, ROAD_Y + 14.5 - i * 3.2, 0);
      benches.push(b);
      g.add(b);
    }
    excSlots = [
      { x: PX - 8, y: ROAD_Y + 1.2, z: 5, sx: 3.4, sy: 2.2, sz: 2, ry: 0.5 },
      { x: PX - 14, y: ROAD_Y + 1.2, z: -6, sx: 3.4, sy: 2.2, sz: 2, ry: -0.8 },
      { x: PX - 20, y: ROAD_Y + 1.2, z: 1, sx: 4.2, sy: 2, sz: 2.2, ry: Math.PI },
    ];
    excavators = makeInstanced(GEO.unitBox, mat.machine, excSlots);
    g.add(excavators);

    // slope stabilization bolts above the portal, within the cut face
    boltSlots = [];
    for (let i = 0; i < 60; i++) {
      const row = Math.floor(i / 12);
      const colI = i % 12;
      boltSlots.push({
        x: PX + 1.5 + row * 1.2,
        y: ROAD_Y + 5 + row * 2.2,
        z: -7 + colI * 1.27,
        sx: 1, sy: 2.2, sz: 1,
        order: i / 59,
      });
    }
    bolts = makeInstanced(GEO.bolt, mat.steel, boltSlots);
    g.add(bolts);

    shotcrete = box(0.6, 9, 15, new MeshLambertMaterial({ color: 0x7d7d84, transparent: true, opacity: 0 }), PX + 0.5, ROAD_Y + 6.5, 0);
    g.add(shotcrete);

    // (the portal structure itself lives in world/Portals.ts — persistent —
    // and reveals during this section's window; S4 owns only the excavation)

    // fill light — the portal face looks away from the sun (backlit slope)
    const fill = new PointLight(0xdfe6ea, 30, 110, 1.6);
    fill.position.set(-14, 22, 26);
    g.add(fill);
    return g;
  },
  update(localT, _dt, _ctx): void {
    // benches excavate top-down across 5–55%
    const cut = window01(localT, 0.05, 0.55);
    for (let i = 0; i < benches.length; i++) {
      const local = clamp01(cut * benches.length - i);
      benches[i].scale.y = Math.max(1e-3, BENCH_H * (1 - easeOutCubic(local))); // dims separate from anim
      benches[i].visible = benches[i].scale.y > 0.01;
    }
    revealInstances(excavators, excSlots, window01(localT, 0.08, 0.3), { spread: 0.4, overshoot: true });
    revealInstances(bolts, boltSlots, window01(localT, 0.5, 0.8), { spread: 0.25 });
    (shotcrete.material as MeshLambertMaterial).opacity = 0.9 * window01(localT, 0.6, 0.85);
  },
};
