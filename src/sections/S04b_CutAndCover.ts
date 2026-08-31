/**
 * S4.5 — Cut-and-cover approaches (post-PRD correction §2.3).
 * Open-cut trench → box structure casts in → backfill closes over it.
 * Approach embankment builds and the viaduct-segment casting yard appears.
 */
import { Group, Mesh, MeshLambertMaterial } from 'three';
import type { BuildCtx, Section } from './types';
import { GEO, box, makeInstanced, mat } from './helpers';
import { girderSegmentGeometry, makeGantryCrane, equipMat } from '../world/Equipment';
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
let gantry: Group;

export const S04b_CutAndCover: Section = {
  id: 'S04b',
  title: 'Cut and Cover',
  range: [0, 0],
  cameraTrack: [
    // the works sit at the FOOT of the ~450 m short-tunnel mesa, so any
    // ground-level key looking east fills the frame with its rock wall (the
    // old opening key even sat at the portal mouth looking into the bore).
    // Stay HIGH south-west — same altitude recipe as S4's keys — so the
    // ridge line stays inside frame and the trench reads front-and-center.
    // The rig's damping bridges the jump from S4's exit pose on its own.
    { t: 0, pos: [-56, 52, 86], look: [CX - 4, 8, 2], fov: 46 },
    { t: 0.35, pos: [-40, 46, 66], look: [CX, 8, 0], fov: 44 },
    { t: 0.7, pos: [-26, 42, 50], look: [CX + 2, 8, 0], fov: 40, calm: true },
    // pan west to the casting yard on the staging plain (the old key crossed
    // the massif shoulder 110 m underground)
    { t: 1, pos: [-46, 28, 62], look: [-82, 9, 15], fov: 50 },
  ],
  build(_ctx: BuildCtx): Group {
    const g = new Group();
    // road-scale works: the box is a twin-cell underpass (~8 units wide),
    // not the 240×150 m megastructure the old dims implied
    trenchWalls = [
      box(16, 3.6, 1.0, mat.rock, CX, ROAD_Y - 0.4, 4.8),
      box(16, 3.6, 1.0, mat.rock, CX, ROAD_Y - 0.4, -4.8),
    ];
    g.add(...trenchWalls);

    ccBox = box(14, 3.4, 7, mat.concrete, CX, ROAD_Y + 0.4, 0);
    ccBox.scale.setScalar(1e-4);
    g.add(ccBox);

    backfill = box(16, 1.8, 9, new MeshLambertMaterial({ color: 0x4f5546, flatShading: true }), CX, ROAD_Y + 2.8, 0);
    backfill.scale.y = 1e-3;
    g.add(backfill);

    embankment = box(26, 2, 10, mat.terrain, -6, ROAD_Y - 1.4, 0);
    embankment.scale.y = 1e-3;
    g.add(embankment);

    // casting yard for viaduct segments — on the FLAT Khalapur staging plain
    // beside the toll road (the old spot on the gorge rim floated in mid-air).
    // Real precast box-girder segments: top slab + wings, inclined webs.
    yardSlots = [];
    for (let i = 0; i < 12; i++) {
      yardSlots.push({
        x: -92 + (i % 4) * 8,
        y: ROAD_Y + 0.35,
        z: 11 + Math.floor(i / 4) * 6.5,
        sx: 1, sy: 1, sz: 1,
        order: i / 11,
      });
    }
    yardSegs = makeInstanced(GEO.unitBox, equipMat, yardSlots);
    yardSegs.geometry = girderSegmentGeometry();
    // rail-mounted portal gantry crane straddling the rows: A-frame legs on
    // bogies, main girder, hoist trolley with rope + hook
    gantry = makeGantryCrane(6.2, 4.4);
    gantry.position.set(-78, ROAD_Y + 0.35, 14.2);
    gantry.scale.y = 1e-3;
    gantry.visible = false;
    const yard = new Group();
    yard.add(yardSegs, gantry);
    g.add(yard);
    return g;
  },
  update(localT, _dt, _ctx): void {
    // trench opens (walls part), box casts, backfill closes over
    const open = easeOutCubic(window01(localT, 0.02, 0.22));
    trenchWalls[0].position.z = 4.2 + open * 1.4;
    trenchWalls[1].position.z = -4.2 - open * 1.4;
    // box() stores dimensions in scale — progress multiplies the stored dims
    const cast = Math.max(1e-4, easeOutBackSoft(window01(localT, 0.22, 0.5)));
    ccBox.scale.set(14 * cast, 3.4 * cast, 7 * cast);
    ccBox.visible = cast > 0.01;
    const bk = window01(localT, 0.5, 0.72);
    backfill.scale.y = Math.max(1e-3, 1.8 * bk);
    backfill.visible = bk > 0.01;
    const ek = easeOutCubic(window01(localT, 0.35, 0.65));
    embankment.scale.y = Math.max(1e-3, 2 * ek);
    embankment.visible = ek > 0.01;
    revealInstances(yardSegs, yardSlots, window01(localT, 0.68, 0.95), { spread: 0.3, overshoot: true });
    const gk = Math.max(1e-4, easeOutCubic(window01(localT, 0.75, 0.95)));
    gantry.scale.y = gk;
    gantry.visible = gk > 0.01;
  },
};
