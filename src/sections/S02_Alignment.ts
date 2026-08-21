/**
 * S2 — Alignment Reveal: the glowing route carves across the terrain,
 * dashed where subsurface (tunnels), solid over the viaducts. Draw-on via
 * geometry drawRange (grey-box stand-in for the dashOffset shader).
 */
import {
  BoxGeometry,
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  Mesh,
  MeshBasicMaterial,
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

interface Ribbon {
  mesh: Mesh;
  x0: number;
  x1: number;
}
const ribbons: Ribbon[] = [];

export const S02_Alignment: Section = {
  id: 'S02',
  title: 'The Missing Link',
  // NOT persistent: the reveal is a moment, not furniture — a glowing beam
  // floating over the real viaduct in S8–S12 reads as a bug
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

      // glowing x-ray ribbon: depthTest off so the route reads THROUGH the
      // massif during the reveal (this group only exists around S2)
      const ribbonMat = new MeshBasicMaterial({
        color: PALETTE.sodiumAmber,
        transparent: true,
        opacity: s.kind === 'tunnel' ? 0.35 : 0.9,
        depthTest: false,
      });
      const ribbon = new Mesh(new BoxGeometry(1, 0.12, 1.5), ribbonMat);
      ribbon.position.set(s.x0, ROAD_Y + 1.2, 0);
      ribbon.scale.x = 1e-3;
      ribbon.visible = false;
      ribbon.renderOrder = 2;
      g.add(ribbon);
      ribbons.push({ mesh: ribbon, x0: s.x0, x1: s.x1 });
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
    for (const r of ribbons) {
      const local = window01(head, r.x0, r.x1);
      r.mesh.visible = local > 0.005;
      const len = Math.max(1e-3, (r.x1 - r.x0) * local);
      r.mesh.scale.x = len;
      r.mesh.position.x = r.x0 + len / 2;
    }
  },
};
