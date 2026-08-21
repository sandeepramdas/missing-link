/**
 * S4.5 — Cut-and-cover approaches (post-PRD correction §2.3).
 * Open-cut trench → box structure casts in → backfill closes over it.
 * Approach embankment builds and the viaduct-segment casting yard appears.
 */
import { Group, Mesh, MeshLambertMaterial } from 'three';
import type { BuildCtx, Section } from './types';
import { GEO, box, makeInstanced, mat } from './helpers';
import { revealInstances, type InstanceSlot } from '../utils/instanceReveal';
import { ROAD_Y } from '../world/Alignment';
import { window01, easeOutCubic, easeOutBackSoft } from '../utils/scratch';

const CX = 14; // cut-and-cover box on the Khalapur approach
let trenchWalls: Mesh[];
let ccBox: Mesh;
let backfill: Mesh;
let embankment: Mesh;
let yardSegs: ReturnType<typeof makeInstanced>;
let yardSlots: InstanceSlot[] = [];
let gantry: Mesh;

export const S04b_CutAndCover: Section = {
  id: 'S04b',
  title: 'Cut and Cover',
  range: [0, 0],
  cameraTrack: [
    { t: 0, pos: [4, 10.5, 2.2], look: [30, 9.5, 2.2], fov: 34 },
    { t: 0.25, pos: [-16, 40, 52], look: [CX, 8, 0], fov: 50 },
    { t: 0.65, pos: [-8, 30, 40], look: [CX + 4, 8, 0], fov: 46, calm: true },
    { t: 1, pos: [170, 50, 140], look: [238, 10, 84], fov: 52 },
  ],
  build(_ctx: BuildCtx): Group {
    const g = new Group();
    trenchWalls = [
      box(24, 5, 1.2, mat.rock, CX, ROAD_Y - 0.5, 7.5),
      box(24, 5, 1.2, mat.rock, CX, ROAD_Y - 0.5, -7.5),
    ];
    g.add(...trenchWalls);

    ccBox = box(22, 4.4, 12, mat.concrete, CX, ROAD_Y + 0.4, 0);
    ccBox.scale.setScalar(1e-4);
    g.add(ccBox);

    backfill = box(24, 2.4, 15, new MeshLambertMaterial({ color: 0x4f5546, flatShading: true }), CX, ROAD_Y + 3.4, 0);
    backfill.scale.y = 1e-3;
    g.add(backfill);

    embankment = box(26, 2, 10, mat.terrain, -6, ROAD_Y - 1.4, 0);
    embankment.scale.y = 1e-3;
    g.add(embankment);

    // casting yard for viaduct segments (glimpse) — near the gorge rim
    yardSlots = [];
    for (let i = 0; i < 12; i++) {
      yardSlots.push({
        x: 226 + (i % 4) * 9,
        y: 10.2,
        z: 78 + Math.floor(i / 4) * 8,
        sx: 6, sy: 2.4, sz: 3,
        order: i / 11,
      });
    }
    yardSegs = makeInstanced(GEO.unitBox, mat.concrete, yardSlots);
    // slim portal gantry crane straddling the yard rows
    gantry = box(1.2, 5.5, 18, mat.machine, 240, 12.6, 86);
    gantry.scale.setScalar(1e-4);
    const yard = new Group();
    yard.add(yardSegs, gantry);
    g.add(yard);
    return g;
  },
  update(localT, _dt, _ctx): void {
    // trench opens (walls part), box casts, backfill closes over
    const open = easeOutCubic(window01(localT, 0.02, 0.22));
    trenchWalls[0].position.z = 6.5 + open * 2;
    trenchWalls[1].position.z = -6.5 - open * 2;
    // box() stores dimensions in scale — progress multiplies the stored dims
    const cast = Math.max(1e-4, easeOutBackSoft(window01(localT, 0.22, 0.5)));
    ccBox.scale.set(22 * cast, 4.4 * cast, 12 * cast);
    ccBox.visible = cast > 0.01;
    const bk = window01(localT, 0.5, 0.72);
    backfill.scale.y = Math.max(1e-3, 2.4 * bk);
    backfill.visible = bk > 0.01;
    const ek = easeOutCubic(window01(localT, 0.35, 0.65));
    embankment.scale.y = Math.max(1e-3, 2 * ek);
    embankment.visible = ek > 0.01;
    revealInstances(yardSegs, yardSlots, window01(localT, 0.68, 0.95), { spread: 0.3, overshoot: true });
    const gk = Math.max(1e-4, easeOutCubic(window01(localT, 0.75, 0.95)));
    gantry.scale.set(1.2 * gk, 5.5 * gk, 18 * gk);
  },
};
