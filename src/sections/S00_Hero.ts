/**
 * S0 — Loader / Hero: contour lines resolve into the basalt massif.
 * The terrain morph (contour map → 3D) is the whole beat; monsoon mist via
 * fog density handled by the director's grading.
 */
import { Group } from 'three';
import type { BuildCtx, Section } from './types';
import { easeInOutQuad, window01 } from '../utils/scratch';

export const S00_Hero: Section = {
  id: 'S00',
  title: 'The Sahyadris',
  range: [0, 0],
  cameraTrack: [
    { t: 0, pos: [250, 260, 520], look: [650, 0, 0], fov: 55, calm: true },
    { t: 0.55, pos: [420, 190, 430], look: [650, 25, 0], fov: 58 },
    { t: 1, pos: [520, 120, 300], look: [620, 30, 20], fov: 60 },
  ],
  build(_ctx: BuildCtx): Group {
    return new Group(); // terrain is shared world; S0 only drives its morph
  },
  update(localT, _dt, ctx): void {
    // contours self-draw over the first 30%, then the massif rises
    const morph = easeInOutQuad(window01(localT, 0.15, 0.85));
    ctx.terrain.setMorph(morph);
  },
};
