/**
 * Portalworks — PERSISTENT corridor anchors at all four tunnel faces:
 * headwall + wing walls + twin black tunnel mouths + a road stub running
 * into the mouth. Without these, roads dead-end into bare hillside and the
 * corridor never reads as one connected system from the air.
 *
 * Also owns the "route guide": a dashed survey line draped over the massif
 * surface above each tunnel span — the aerial blueprint of where the tubes
 * run, visible through the construction chapters (S3 → S11).
 *
 * Owned and driven by the SceneDirector (not a Section): portals reveal
 * during the S4 window and then stay for the rest of the story.
 */
import {
  BufferGeometry,
  CircleGeometry,
  Group,
  Line,
  LineDashedMaterial,
  Mesh,
  MeshBasicMaterial,
  Vector3,
} from 'three';
import { box, mat } from '../sections/helpers';
import { ROAD_Y, TUBE_OFFSET_Z, TUNNEL_SHORT, TUNNEL_LONG } from './Alignment';
import { heightAt } from './Terrain';
import { clamp01, easeOutBackSoft, window01 } from '../utils/scratch';
import { PALETTE } from '../materials/greybox';

interface PortalFace {
  x: number;
  dir: 1 | -1; // outward direction along X
}

const FACES: PortalFace[] = [
  { x: TUNNEL_SHORT.x0, dir: -1 }, // Khalapur end
  { x: TUNNEL_SHORT.x1, dir: 1 }, // short tunnel → gorge
  { x: TUNNEL_LONG.x0, dir: -1 }, // gorge → long tunnel
  { x: TUNNEL_LONG.x1, dir: 1 }, // Kusgaon end
];

const mouthMat = new MeshBasicMaterial({ color: 0x0b0b0e });
const mouthGeo = new CircleGeometry(1.5, 20);

export class Portalworks {
  readonly group = new Group();
  private portals: Group[] = [];
  private guide: Line;
  private guideMat: LineDashedMaterial;

  constructor() {
    for (const f of FACES) {
      const p = new Group();
      // headwall with twin arched mouths
      p.add(box(1.4, 6.4, 12.5, mat.concrete, f.x, ROAD_Y + 2.4, 0));
      for (const z of [TUBE_OFFSET_Z, -TUBE_OFFSET_Z]) {
        const mouth = new Mesh(mouthGeo, mouthMat);
        mouth.position.set(f.x + f.dir * 0.75, ROAD_Y + 1.15, z);
        mouth.rotation.y = f.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        p.add(mouth);
      }
      // wing walls easing the cut into the slope — tucked against the headwall
      for (const s of [1, -1]) {
        const wing = box(4.6, 4.0, 1.0, mat.concrete, f.x + f.dir * 1.5, ROAD_Y + 1.5, s * 6.6);
        wing.rotation.y = s * f.dir * 0.42;
        p.add(wing);
      }
      // road stub through the portal so the corridor connects visually
      p.add(box(11, 0.22, 6, mat.asphalt, f.x + f.dir * 4.5, ROAD_Y + 0.42, 0));
      p.scale.y = 1e-3;
      p.visible = false;
      this.group.add(p);
      this.portals.push(p);
    }

    // draped survey line over each tunnel span (the aerial "blueprint")
    const pts: Vector3[] = [];
    for (const span of [TUNNEL_SHORT, TUNNEL_LONG]) {
      for (let x = span.x0; x <= span.x1; x += 8) {
        pts.push(new Vector3(x, Math.max(ROAD_Y + 1, heightAt(x, 0) + 2), 0));
      }
      // break between spans: duplicate last point so Line doesn't bridge the gorge
      pts.push(pts[pts.length - 1].clone());
    }
    this.guideMat = new LineDashedMaterial({
      color: PALETTE.sodiumAmber,
      dashSize: 4,
      gapSize: 3.5,
      transparent: true,
      opacity: 0,
    });
    this.guide = new Line(new BufferGeometry().setFromPoints(pts), this.guideMat);
    this.guide.computeLineDistances();
    this.group.add(this.guide);
  }

  /** driven from the director's frame loop with master-timeline t */
  update(t: number): void {
    // portals cast in across the S4 window, staggered per face, then stay
    const k = window01(t, 0.25, 0.33);
    for (let i = 0; i < this.portals.length; i++) {
      const own = easeOutBackSoft(clamp01(k * 1.9 - i * 0.3));
      const p = this.portals[i];
      p.visible = own > 0.01;
      p.scale.y = Math.max(1e-3, own);
    }
    // route guide: fades in with geotech (S3), out before the finale grade
    const vis = window01(t, 0.19, 0.23) * (1 - window01(t, 0.93, 0.955));
    this.guideMat.opacity = 0.55 * vis;
    this.guide.visible = vis > 0.01;
  }
}
