/**
 * S2 — Alignment Reveal: the glowing route carves across the terrain,
 * dashed where subsurface (tunnels), solid over the viaducts. Draw-on via
 * geometry drawRange (grey-box stand-in for the dashOffset shader).
 */
import {
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  Vector3,
} from 'three';
import type { BuildCtx, Section } from './types';
import { ROAD_Y, SPANS, X_END } from '../world/Alignment';
import { PALETTE } from '../materials/greybox';
import { window01, easeInOutQuad } from '../utils/scratch';

interface DrawnLine {
  line: Line;
  count: number; // total vertices
  x0: number;
  x1: number;
}
const lines: DrawnLine[] = [];

export const S02_Alignment: Section = {
  id: 'S02',
  title: 'The Missing Link',
  range: [0, 0],
  cameraTrack: [
    { t: 0, pos: [420, 160, 340], look: [650, 20, 0], fov: 55 },
    { t: 0.5, pos: [660, 240, 460], look: [660, 10, 0], fov: 62, calm: true },
    { t: 1, pos: [860, 200, 420], look: [700, 10, 0], fov: 60 },
  ],
  build(_ctx: BuildCtx): Group {
    const g = new Group();
    const solid = new LineBasicMaterial({ color: PALETTE.sodiumAmber });
    const dashed = new LineDashedMaterial({ color: PALETTE.sodiumAmber, dashSize: 6, gapSize: 5 });
    for (const s of SPANS) {
      const pts: Vector3[] = [];
      const n = Math.max(8, Math.floor((s.x1 - s.x0) / 8));
      for (let i = 0; i <= n; i++) {
        pts.push(new Vector3(s.x0 + ((s.x1 - s.x0) * i) / n, ROAD_Y + 1.6, 0));
      }
      const geo = new BufferGeometry().setFromPoints(pts);
      const line = new Line(geo, s.kind === 'tunnel' ? dashed : solid);
      if (s.kind === 'tunnel') line.computeLineDistances();
      geo.setDrawRange(0, 0);
      line.visible = false;
      g.add(line);
      lines.push({ line, count: pts.length, x0: s.x0, x1: s.x1 });
    }
    return g;
  },
  update(localT, _dt, _ctx): void {
    // route draws Khalapur → Kusgaon across 15–80% of the scene
    const k = easeInOutQuad(window01(localT, 0.15, 0.8));
    const head = k * X_END;
    for (const d of lines) {
      const local = window01(head, d.x0, d.x1);
      d.line.visible = local > 0;
      d.line.geometry.setDrawRange(0, Math.ceil(local * d.count));
    }
  },
};
