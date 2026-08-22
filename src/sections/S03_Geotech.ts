/**
 * S3 — Geotechnical Investigation: borehole rigs spin along the alignment,
 * a translucent strata cutaway rises, survey markers stagger in.
 */
import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, DoubleSide } from 'three';
import type { BuildCtx, Section } from './types';
import { GEO, makeInstanced, lineSlots } from './helpers';
import { mat } from '../materials/greybox';
import { revealInstances, type InstanceSlot } from '../utils/instanceReveal';
import { heightAt } from '../world/Terrain';
import { window01, easeOutCubic } from '../utils/scratch';

let rigs: ReturnType<typeof makeInstanced>;
let rigSlots: InstanceSlot[] = [];
let drills: ReturnType<typeof makeInstanced>;
let drillSlots: InstanceSlot[] = [];
let markers: ReturnType<typeof makeInstanced>;
let markerSlots: InstanceSlot[] = [];
let strata: Mesh[] = [];
let drillSpin = 0;

export const S03_Geotech: Section = {
  id: 'S03',
  title: 'Reading the Rock',
  range: [0, 0],
  cameraTrack: [
    { t: 0, pos: [860, 200, 420], look: [700, 40, 0], fov: 58 },
    { t: 0.4, pos: [500, 90, 130], look: [480, 55, 0], fov: 45 },
    { t: 0.8, pos: [430, 75, 70], look: [450, 58, 0], fov: 40, calm: true },
    { t: 1, pos: [120, 60, 120], look: [40, 10, 0], fov: 50 },
  ],
  build(_ctx: BuildCtx): Group {
    const g = new Group();
    // rigs on the ridge above the long tunnel
    rigSlots = [];
    drillSlots = [];
    for (let i = 0; i < 7; i++) {
      const x = 400 + i * 60;
      const y = heightAt(x, 0);
      rigSlots.push({ x, y: y + 2.5, z: 0, sx: 2, sy: 5, sz: 2, order: i / 6 });
      drillSlots.push({ x, y: y + 1, z: 0, sx: 0.5, sy: 6, sz: 0.5, order: i / 6 });
    }
    rigs = makeInstanced(GEO.unitBox, mat.machine, rigSlots);
    drills = makeInstanced(GEO.unitCyl, mat.steel, drillSlots);
    g.add(rigs, drills);

    // survey markers along the whole alignment
    markerSlots = lineSlots(24, 0, 1330, 0, 0, [0.6, 3, 0.6]).map((s, i) => ({
      ...s,
      y: heightAt(s.x, 0) + 1.5, // ON the ground — gorge markers were pinned to road level, hovering 375 m up
      order: i / 23,
    }));
    markers = makeInstanced(GEO.unitBox, mat.orangeEmissive, markerSlots);
    g.add(markers);

    // strata cutaway — three translucent layers below the ridge
    const layerColors = [0x4a4a50, 0x3a3a40, 0x2b2b2e];
    strata = layerColors.map((c, i) => {
      const m = new Mesh(
        new PlaneGeometry(340, 16),
        new MeshBasicMaterial({ color: c, transparent: true, opacity: 0, side: DoubleSide })
      );
      m.position.set(520, 34 - i * 17, 26);
      return m;
    });
    g.add(...strata);
    return g;
  },
  update(localT, dt, _ctx): void {
    revealInstances(rigs, rigSlots, window01(localT, 0.1, 0.45), { spread: 0.3, overshoot: true });
    // drills spin + plunge while rigs are up
    drillSpin += dt * 6;
    const plunge = window01(localT, 0.3, 0.75);
    for (let i = 0; i < drillSlots.length; i++) drillSlots[i].ry = drillSpin;
    revealInstances(drills, drillSlots, Math.min(1, plunge + 0.2), { spread: 0.4 });
    for (let i = 0; i < strata.length; i++) {
      const m = strata[i].material as MeshBasicMaterial;
      m.opacity = 0.35 * easeOutCubic(window01(localT, 0.45 + i * 0.08, 0.75 + i * 0.08));
    }
    revealInstances(markers, markerSlots, window01(localT, 0.55, 0.95), { spread: 0.25 });
  },
};
