/**
 * Section registry — assigns each scene its window on the ONE master
 * timeline. Weights are the pacing design: S5 (NATM) is the emotional core
 * and gets the largest share of scroll; weights sum to 1.0 exactly.
 */
import type { Section } from './types';
import { S00_Hero } from './S00_Hero';
import { S01_Problem } from './S01_Problem';
import { S02_Alignment } from './S02_Alignment';
import { S03_Geotech } from './S03_Geotech';
import { S04_Portals } from './S04_Portals';
import { S04b_CutAndCover } from './S04b_CutAndCover';
import { S05_NATM } from './S05_NATM';
import { S06_Breakthrough } from './S06_Breakthrough';
import { S07_Lining } from './S07_Lining';
import { S08_Piers } from './S08_Piers';
import { S09_Pylon } from './S09_Pylon';
import { S10_Systems } from './S10_Systems';
import { S11_Surfacing } from './S11_Surfacing';
import { S12_Finale } from './S12_Finale';

const WEIGHTS: [Section, number][] = [
  [S00_Hero, 0.06],
  [S01_Problem, 0.06],
  [S02_Alignment, 0.07],
  [S03_Geotech, 0.06],
  [S04_Portals, 0.07],
  [S04b_CutAndCover, 0.05],
  [S05_NATM, 0.16],
  [S06_Breakthrough, 0.06],
  [S07_Lining, 0.07],
  [S08_Piers, 0.06],
  [S09_Pylon, 0.1],
  [S10_Systems, 0.08],
  [S11_Surfacing, 0.05],
  [S12_Finale, 0.05],
];

export function buildSectionList(): Section[] {
  const total = WEIGHTS.reduce((a, [, w]) => a + w, 0);
  if (Math.abs(total - 1) > 1e-6) throw new Error(`section weights sum to ${total}, expected 1`);
  let acc = 0;
  return WEIGHTS.map(([s, w]) => {
    s.range = [acc, acc + w];
    acc += w;
    return s;
  });
}
