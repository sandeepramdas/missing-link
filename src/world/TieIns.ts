/**
 * TieIns — the EXISTING Mumbai–Pune Expressway at both ends of the new link.
 * Present from scene zero (this road predates the project): pavement running
 * off-map at each end, the Khalapur toll plaza (booth row + canopy), and a
 * merge gantry at the Kusgaon end. Without these, the new corridor floats —
 * nothing to connect to before the first tunnel or after the last one.
 */
import { Group } from 'three';
import { box, mat } from '../sections/helpers';
import { ROAD_Y, X_END } from './Alignment';

export function buildTieIns(): Group {
  const g = new Group();

  // existing expressway pavement, running to the map edges
  g.add(box(110, 0.24, 5.2, mat.asphalt, -55, ROAD_Y + 0.5, 0));
  g.add(box(170, 0.24, 5.2, mat.asphalt, X_END + 85, ROAD_Y + 0.5, 0));
  // centreline dashes read as "live road" even before the new link opens
  for (let x = -100; x < -8; x += 9) {
    g.add(box(3, 0.06, 0.25, mat.amberEmissive, x, ROAD_Y + 0.66, 0));
  }
  for (let x = X_END + 10; x < X_END + 165; x += 9) {
    g.add(box(3, 0.06, 0.25, mat.amberEmissive, x, ROAD_Y + 0.66, 0));
  }

  // ── Khalapur toll plaza (the alignment's western datum ⟨VERIFY⟩) ────
  g.add(box(26, 0.26, 17, mat.asphalt, -24, ROAD_Y + 0.5, 0)); // widened apron
  for (let i = 0; i < 8; i++) {
    g.add(box(1.1, 2.1, 1.1, mat.concrete, -24, ROAD_Y + 1.05, -6.6 + i * 1.9));
  }
  g.add(box(7, 0.5, 17, mat.steel, -24, ROAD_Y + 3.5, 0)); // canopy
  g.add(box(0.7, 3.2, 0.7, mat.steel, -27.5, ROAD_Y + 1.6, -7.6));
  g.add(box(0.7, 3.2, 0.7, mat.steel, -27.5, ROAD_Y + 1.6, 7.6));

  // ── Kusgaon merge gantry (eastern tie-in) ───────────────────────────
  g.add(box(0.5, 0.9, 9, mat.machine, X_END + 24, ROAD_Y + 4.2, 0));
  g.add(box(0.5, 3.8, 0.5, mat.steel, X_END + 24, ROAD_Y + 1.9, -4.2));
  g.add(box(0.5, 3.8, 0.5, mat.steel, X_END + 24, ROAD_Y + 1.9, 4.2));

  return g;
}
