/**
 * TieIns — the EXISTING Mumbai–Pune Expressway at both ends of the new link.
 * Present from scene zero (this road predates the project): pavement with
 * centreline dashes and pale edge lines running off-map at each end, the
 * Khalapur toll plaza (booth row + canopy, scaled against the vehicle
 * fleet), and a merge gantry at the Kusgaon end.
 */
import { Group, MeshLambertMaterial } from 'three';
import { box, mat } from '../sections/helpers';
import { ROAD_Y, X_END } from './Alignment';

const edgeMat = new MeshLambertMaterial({ color: 0xb9b9be });

function roadStrip(g: Group, x0: number, x1: number): void {
  const len = x1 - x0;
  const cx = (x0 + x1) / 2;
  g.add(box(len, 0.24, 5.2, mat.asphalt, cx, ROAD_Y + 0.5, 0));
  // pale edge lines give the pavement structure at aerial distance
  for (const s of [1, -1]) {
    g.add(box(len, 0.05, 0.14, edgeMat, cx, ROAD_Y + 0.64, s * 2.45));
  }
  for (let x = x0 + 6; x < x1 - 4; x += 9) {
    g.add(box(3, 0.05, 0.22, mat.amberEmissive, x, ROAD_Y + 0.64, 0));
  }
}

export function buildTieIns(): Group {
  const g = new Group();

  // existing expressway pavement, running to the map edges
  roadStrip(g, -110, 0);
  roadStrip(g, X_END, X_END + 170);

  // ── Khalapur toll plaza — proportioned against the vehicle fleet ────
  // (bus is 3.4 long × 0.85 tall; booths ≈ bus height, canopy just clears)
  g.add(box(14, 0.26, 9, mat.asphalt, -24, ROAD_Y + 0.5, 0)); // apron
  for (let i = 0; i < 6; i++) {
    g.add(box(0.8, 0.95, 0.55, mat.concrete, -24, ROAD_Y + 0.48 + 0.475, -4.1 + i * 1.64));
  }
  g.add(box(4.2, 0.28, 10, mat.steel, -24, ROAD_Y + 2.05, 0)); // canopy
  for (const [dx, dz] of [
    [-1.7, -4.6],
    [-1.7, 4.6],
    [1.7, -4.6],
    [1.7, 4.6],
  ]) {
    g.add(box(0.4, 1.6, 0.4, mat.steel, -24 + dx, ROAD_Y + 1.2, dz));
  }

  // ── Kusgaon merge gantry (eastern tie-in) ───────────────────────────
  g.add(box(0.4, 0.7, 7, mat.machine, X_END + 24, ROAD_Y + 3.4, 0));
  g.add(box(0.4, 2.9, 0.4, mat.steel, X_END + 24, ROAD_Y + 1.6, -3.3));
  g.add(box(0.4, 2.9, 0.4, mat.steel, X_END + 24, ROAD_Y + 1.6, 3.3));

  return g;
}
