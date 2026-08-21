/**
 * S9 — Pylon, balanced-cantilever deck, stay cables. Form travelers extend
 * deck segments symmetrically from the pylon; cables install one-by-one with
 * a catenary→taut lerp; wind sway micro-motion on the free cantilever tips.
 */
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LineSegments,
  Mesh,
} from 'three';
import type { BuildCtx, Section } from './types';
import { GEO, box, makeInstanced, mat } from './helpers';
import { revealInstances, type InstanceSlot } from '../utils/instanceReveal';
import { ROAD_Y, VALLEY_FLOOR_Y, VIADUCT_2 } from '../world/Alignment';
import { window01, easeOutCubic, easeOutBackSoft, lerp, clamp01 } from '../utils/scratch';

const PYLON_X = (VIADUCT_2.x0 + VIADUCT_2.x1) / 2; // 316.5
const PYLON_H = 18.2; // 182 m ⟨VERIFY⟩ at 1u = 10 m
const SEGS_PER_SIDE = 9;
const SEG_LEN = 3.4;
const CABLES_PER_SIDE = 8;

let pylon: Mesh;
let travelers: [Mesh, Mesh];
let deckSegs: InstancedMesh;
let deckSlots: InstanceSlot[] = [];
let cables: LineSegments;
let cablePos: Float32Array;
let windT = 0;

export const S09_Pylon: Section = {
  id: 'S09',
  title: 'The Pylon',
  range: [0, 0],
  persistent: true,
  cameraTrack: [
    { t: 0, pos: [270, 24, 70], look: [PYLON_X, 8, 0], fov: 58 },
    { t: 0.25, pos: [PYLON_X - 16, 6, 22], look: [PYLON_X, 12, 0], fov: 60 }, // heroic low angle
    { t: 0.55, pos: [PYLON_X + 26, 20, 42], look: [PYLON_X, 11, 0], fov: 55, calm: true },
    { t: 0.85, pos: [PYLON_X + 48, 26, 26], look: [PYLON_X - 6, 10, 0], fov: 58 },
    { t: 1, pos: [PYLON_X + 30, 42, 90], look: [PYLON_X, 10, 0], fov: 60 },
  ],
  build(_ctx: BuildCtx): Group {
    const g = new Group();
    pylon = box(2.2, PYLON_H, 3, mat.concrete, PYLON_X, VALLEY_FLOOR_Y + PYLON_H / 2, 0);
    pylon.scale.y = 1e-3;
    g.add(pylon);

    // deck segments — symmetric pairs out from the pylon
    deckSlots = [];
    for (let i = 0; i < SEGS_PER_SIDE; i++) {
      const order = i / (SEGS_PER_SIDE - 1);
      const dx = (i + 0.5) * SEG_LEN;
      deckSlots.push({ x: PYLON_X + dx, y: ROAD_Y, z: 0, sx: SEG_LEN * 0.94, sy: 0.9, sz: 5.4, order });
      deckSlots.push({ x: PYLON_X - dx, y: ROAD_Y, z: 0, sx: SEG_LEN * 0.94, sy: 0.9, sz: 5.4, order });
    }
    deckSegs = makeInstanced(GEO.unitBox, mat.concrete, deckSlots);
    g.add(deckSegs);

    travelers = [
      box(4, 1.6, 6.2, mat.machine, PYLON_X + 2, ROAD_Y + 1.4, 0),
      box(4, 1.6, 6.2, mat.machine, PYLON_X - 2, ROAD_Y + 1.4, 0),
    ];
    // persistent section ⇒ must BUILD in zero state; update() shows them
    travelers[0].visible = travelers[1].visible = false;
    g.add(...travelers);

    // stay cables: 2 points per cable (grey-box straight lines; the
    // catenary sag is faked by dropping the midpoint — Phase 2 curves them)
    cablePos = new Float32Array(CABLES_PER_SIDE * 2 * 2 * 3);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(cablePos, 3));
    cables = new LineSegments(geo, mat.cable);
    cables.frustumCulled = false;
    g.add(cables);
    return g;
  },
  update(localT, dt, _ctx): void {
    windT += dt;
    // pylon rises 0–35% with heavy settle
    const rise = easeOutBackSoft(window01(localT, 0.02, 0.35));
    pylon.scale.y = Math.max(1e-3, PYLON_H * rise); // box() stores dims in scale

    pylon.position.y = VALLEY_FLOOR_Y + (PYLON_H * rise) / 2;

    // balanced cantilever 30–80%, symmetric; travelers ride the tips
    const deckK = window01(localT, 0.3, 0.8);
    revealInstances(deckSegs, deckSlots, deckK, { spread: 0.18, overshoot: true });
    const tip = deckK * SEGS_PER_SIDE * SEG_LEN;
    const sway = Math.sin(windT * 1.7) * 0.12 * (1 - window01(localT, 0.8, 1));
    travelers[0].position.set(PYLON_X + tip + 1.5, ROAD_Y + 1.4 + sway, 0);
    travelers[1].position.set(PYLON_X - tip - 1.5, ROAD_Y + 1.4 - sway, 0);
    travelers[0].visible = travelers[1].visible = deckK > 0.02 && deckK < 0.99;

    // cables install one-by-one 40–95%, catenary-sag → taut
    const cableK = window01(localT, 0.4, 0.95);
    const topY = VALLEY_FLOOR_Y + PYLON_H * rise - 0.8;
    for (let side = 0; side < 2; side++) {
      const dir = side === 0 ? 1 : -1;
      for (let i = 0; i < CABLES_PER_SIDE; i++) {
        const own = clamp01(cableK * CABLES_PER_SIDE - i);
        const anchorX = PYLON_X + dir * (i + 1) * SEG_LEN * (SEGS_PER_SIDE / CABLES_PER_SIDE) * 0.95;
        const sag = (1 - easeOutCubic(own)) * 2.2; // tensioning pulls it taut
        const o = (side * CABLES_PER_SIDE + i) * 6;
        cablePos[o] = PYLON_X;
        cablePos[o + 1] = topY - i * 0.5;
        cablePos[o + 2] = 0;
        cablePos[o + 3] = lerp(PYLON_X, anchorX, own);
        cablePos[o + 4] = ROAD_Y + 0.4 - sag * own;
        cablePos[o + 5] = 0;
      }
    }
    const attr = cables.geometry.getAttribute('position');
    (attr.array as Float32Array).set(cablePos);
    attr.needsUpdate = true;
  },
};
