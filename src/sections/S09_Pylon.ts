/**
 * S9 — the TWIN cable-stayed crossings. Both gorge viaducts are cable-stayed
 * (⟨VERIFY⟩ reported ~770 m & ~645 m, diamond pylons, tallest ~182 m), so
 * each gets its own diamond pylon, balanced-cantilever deck and stay fans.
 * Form travelers extend deck segments symmetrically from each pylon; cables
 * install one-by-one with a catenary→taut lerp; wind sway micro-motion on
 * the free cantilever tips. Viaduct 1 leads, viaduct 2 follows a beat behind.
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
import { GEO, makeInstanced, mat } from './helpers';
import { revealInstances, type InstanceSlot } from '../utils/instanceReveal';
import { ROAD_Y, VALLEY_FLOOR_Y, VIADUCT_1, VIADUCT_2 } from '../world/Alignment';
import { window01, easeOutCubic, easeOutBackSoft, lerp, clamp01 } from '../utils/scratch';
import { makePylon, formTravelerGeometry, equipMat } from '../world/Equipment';

export const SEG_LEN = 3.4;
const CABLES_PER_SIDE = 8;
const DECK_TOP = ROAD_Y + 0.45; // deck segments are 0.9 thick, centered on ROAD_Y

export interface CableBridge {
  x: number; // pylon x (span centre)
  h: number; // pylon height (world units, 1u = 10 m)
  segs: number; // cantilever deck segments per side
  delay: number; // build stagger within the S9 window
}

/** Both viaducts are cable-stayed ⟨VERIFY⟩ — the cantilever reach covers the
 *  central main span of each; anchor piers (S8) carry the side spans. */
export const BRIDGES: CableBridge[] = [
  { x: (VIADUCT_1.x0 + VIADUCT_1.x1) / 2, h: 17.0, segs: 7, delay: 0 }, // ~170 m ⟨VERIFY⟩
  { x: (VIADUCT_2.x0 + VIADUCT_2.x1) / 2, h: 18.2, segs: 6, delay: 0.08 }, // 182 m ⟨VERIFY⟩
];
const B1X = BRIDGES[0].x; // 244.5
const B2X = BRIDGES[1].x; // 316.5

interface BridgeState {
  cfg: CableBridge;
  pylon: Group;
  travelers: [Mesh, Mesh];
  deckSegs: InstancedMesh;
  deckSlots: InstanceSlot[];
}

let bridges: BridgeState[] = [];
let cables: LineSegments;
let cablePos: Float32Array;
let windT = 0;

export const S09_Pylon: Section = {
  id: 'S09',
  title: 'The Pylons',
  range: [0, 0],
  persistent: true,
  cameraTrack: [
    { t: 0, pos: [200, 30, 100], look: [(B1X + B2X) / 2, 8, 0], fov: 58 }, // both crossings
    { t: 0.25, pos: [B1X - 16, 6, 22], look: [B1X, 12, 0], fov: 60 }, // heroic low angle, V1
    { t: 0.55, pos: [(B1X + B2X) / 2 - 4, 26, 46], look: [B2X, 11, 0], fov: 55, calm: true },
    { t: 0.85, pos: [B2X + 26, 30, 34], look: [B2X, 11, 0], fov: 58 },
    { t: 1, pos: [B2X + 30, 42, 90], look: [(B1X + B2X) / 2 + 10, 10, 0], fov: 60 },
  ],
  build(_ctx: BuildCtx): Group {
    const g = new Group();
    const travGeo = formTravelerGeometry();
    bridges = BRIDGES.map((cfg) => {
      // diamond pylon, authored base-at-origin so scale.y grows it out of
      // the valley floor
      const pylon = makePylon(cfg.h, ROAD_Y - VALLEY_FLOOR_Y);
      pylon.position.set(cfg.x, VALLEY_FLOOR_Y, 0);
      pylon.scale.y = 1e-3;
      g.add(pylon);

      // deck segments — symmetric pairs out from the pylon
      const deckSlots: InstanceSlot[] = [];
      for (let i = 0; i < cfg.segs; i++) {
        const order = i / (cfg.segs - 1);
        const dx = (i + 0.5) * SEG_LEN;
        deckSlots.push({ x: cfg.x + dx, y: ROAD_Y, z: 0, sx: SEG_LEN * 0.94, sy: 0.9, sz: 5.4, order });
        deckSlots.push({ x: cfg.x - dx, y: ROAD_Y, z: 0, sx: SEG_LEN * 0.94, sy: 0.9, sz: 5.4, order });
      }
      const deckSegs = makeInstanced(GEO.unitBox, mat.concrete, deckSlots);
      g.add(deckSegs);

      // form travelers: truss gantries straddling the deck with the suspended
      // formwork platform hanging over the leading edge (origin = deck top,
      // working face +X; the −X traveler is mirrored by yaw)
      const travelers: [Mesh, Mesh] = [new Mesh(travGeo, equipMat), new Mesh(travGeo, equipMat)];
      travelers[0].position.set(cfg.x + 2, DECK_TOP, 0);
      travelers[1].position.set(cfg.x - 2, DECK_TOP, 0);
      travelers[1].rotation.y = Math.PI;
      // persistent section ⇒ must BUILD in zero state; update() shows them
      travelers[0].visible = travelers[1].visible = false;
      g.add(...travelers);
      return { cfg, pylon, travelers, deckSegs, deckSlots };
    });

    // stay cables, ALL bridges in one LineSegments: 2 points per cable
    // (grey-box straight lines; the catenary sag is faked by dropping the
    // midpoint — Phase 2 curves them)
    cablePos = new Float32Array(BRIDGES.length * 2 * CABLES_PER_SIDE * 2 * 3);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(cablePos, 3));
    cables = new LineSegments(geo, mat.cable);
    cables.frustumCulled = false;
    g.add(cables);
    return g;
  },
  update(localT, dt, _ctx): void {
    windT += dt;
    for (let bi = 0; bi < bridges.length; bi++) {
      const { cfg, pylon, travelers, deckSegs, deckSlots } = bridges[bi];
      const t = clamp01(localT - cfg.delay);
      // pylon rises 0–35% with heavy settle (group authored base-at-origin:
      // scale.y IS the rise fraction, no recentering needed)
      const rise = easeOutBackSoft(window01(t, 0.02, 0.35));
      pylon.scale.y = Math.max(1e-3, rise);

      // balanced cantilever 30–80%, symmetric; travelers ride the tips
      const deckK = window01(t, 0.3, 0.8);
      revealInstances(deckSegs, deckSlots, deckK, { spread: 0.18, overshoot: true });
      const tip = deckK * cfg.segs * SEG_LEN;
      const sway = Math.sin(windT * 1.7 + bi * 2.1) * 0.12 * (1 - window01(t, 0.8, 1));
      // truss anchored over cast deck, formwork platform hanging past the tip
      travelers[0].position.set(cfg.x + tip - 1.6, DECK_TOP + sway, 0);
      travelers[1].position.set(cfg.x - tip + 1.6, DECK_TOP - sway, 0);
      travelers[0].visible = travelers[1].visible = deckK > 0.02 && deckK < 0.99;

      // cables install one-by-one 40–95%, catenary-sag → taut; they land on
      // the anchor spine above the diamond's merge point
      const cableK = window01(t, 0.4, 0.95);
      const topY = VALLEY_FLOOR_Y + cfg.h * rise - 0.6;
      for (let side = 0; side < 2; side++) {
        const dir = side === 0 ? 1 : -1;
        for (let i = 0; i < CABLES_PER_SIDE; i++) {
          const own = clamp01(cableK * CABLES_PER_SIDE - i);
          const anchorX = cfg.x + dir * (i + 1) * SEG_LEN * (cfg.segs / CABLES_PER_SIDE) * 0.95;
          const sag = (1 - easeOutCubic(own)) * 2.2; // tensioning pulls it taut
          const o = ((bi * 2 + side) * CABLES_PER_SIDE + i) * 6;
          cablePos[o] = cfg.x;
          cablePos[o + 1] = topY - i * 0.28;
          cablePos[o + 2] = 0;
          cablePos[o + 3] = lerp(cfg.x, anchorX, own);
          cablePos[o + 4] = ROAD_Y + 0.4 - sag * own;
          cablePos[o + 5] = 0;
        }
      }
    }
    const attr = cables.geometry.getAttribute('position');
    (attr.array as Float32Array).set(cablePos);
    attr.needsUpdate = true;
  },
};
