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
let benches: Mesh[] = [];
let excavators: ReturnType<typeof makeInstanced>;
let excSlots: InstanceSlot[] = [];
let bolts: ReturnType<typeof makeInstanced>;
let boltSlots: InstanceSlot[] = [];
let shotcrete: Mesh;
let portalFrame: Group;

export const S04_Portals: Section = {
  id: 'S04',
  title: 'Opening the Face',
  range: [0, 0],
  cameraTrack: [
    { t: 0, pos: [120, 60, 120], look: [PX, 20, 0], fov: 50 },
    { t: 0.5, pos: [-20, 34, 60], look: [PX + 4, 14, 0], fov: 44 },
    { t: 0.9, pos: [-6, 14, 26], look: [PX + 2, 10, 0], fov: 38, calm: true },
    { t: 1, pos: [4, 10.5, TUBE_OFFSET_Z], look: [PX + 30, 9.5, TUBE_OFFSET_Z], fov: 34 },
  ],
  build(_ctx: BuildCtx): Group {
    const g = new Group();
    // five bench layers stacked against the hillside — excavation removes top-down
    benches = [];
    for (let i = 0; i < 5; i++) {
      const w = 30 - i * 3;
      const b = box(w, 4.5, 34 - i * 4, mat.rock, PX + w / 2, ROAD_Y + 20 - i * 4.5, 0);
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

    // slope stabilization bolts above the portal
    boltSlots = [];
    for (let i = 0; i < 60; i++) {
      const row = Math.floor(i / 12);
      const colI = i % 12;
      boltSlots.push({
        x: PX + 2 + row * 1.5,
        y: ROAD_Y + 6 + row * 3.2,
        z: -11 + colI * 2,
        sx: 1, sy: 2.2, sz: 1,
        order: i / 59,
      });
    }
    bolts = makeInstanced(GEO.bolt, mat.steel, boltSlots);
    g.add(bolts);

    shotcrete = box(0.8, 18, 30, new MeshLambertMaterial({ color: 0x7d7d84, transparent: true, opacity: 0 }), PX + 0.5, ROAD_Y + 10, 0);
    g.add(shotcrete);

    portalFrame = new Group();
    for (const zc of [TUBE_OFFSET_Z, -TUBE_OFFSET_Z]) {
      portalFrame.add(box(2, 4.2, 3.6, mat.concrete, PX - 1, ROAD_Y + 1.6, zc));
    }
    portalFrame.scale.setScalar(1e-4);
    g.add(portalFrame);

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
      benches[i].scale.y = Math.max(1e-3, 4.5 * (1 - easeOutCubic(local))); // box dims live in scale
      benches[i].visible = benches[i].scale.y > 0.01;
    }
    revealInstances(excavators, excSlots, window01(localT, 0.08, 0.3), { spread: 0.4, overshoot: true });
    revealInstances(bolts, boltSlots, window01(localT, 0.5, 0.8), { spread: 0.25 });
    (shotcrete.material as MeshLambertMaterial).opacity = 0.9 * window01(localT, 0.6, 0.85);
    const frame = easeOutCubic(window01(localT, 0.75, 0.95));
    portalFrame.scale.setScalar(Math.max(1e-4, frame));
  },
};
