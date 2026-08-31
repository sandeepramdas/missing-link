/**
 * Portalworks — PERSISTENT corridor anchors at all four tunnel faces, now a
 * proper NATM expressway portal: an extruded face wall with two TRUE arched
 * openings, projecting canopy hoods over each bore, dark bore-depth caps,
 * wing walls, a crown parapet and a road stub. (Replaces the grey-box
 * box-headwall + mouth-sticker version.)
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
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Line,
  LineDashedMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Path,
  Shape,
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
  /** how far the wall stands proud of the analytic face. The approach faces
   *  sit in carved corridors, 2 is plenty; the GORGE faces must clear a full
   *  terrain-mesh cell (~6.5 units) of the wall→bench interpolation ramp or
   *  the wall renders inside the slope. */
  out: number;
}

const FACES: PortalFace[] = [
  { x: TUNNEL_SHORT.x0, dir: -1, out: 2.0 }, // Khalapur end
  { x: TUNNEL_SHORT.x1, dir: 1, out: 5.0 }, // short tunnel → gorge
  { x: TUNNEL_LONG.x0, dir: -1, out: 5.0 }, // gorge → long tunnel
  { x: TUNNEL_LONG.x1, dir: 1, out: 2.0 }, // Kusgaon end
];

const ARCH_R = 1.55; // opening radius
const SPRING = 1.0; // straight wall height below the arch
const faceMat = new MeshLambertMaterial({ color: 0xa8a8ad, flatShading: true });
const hoodMat = new MeshLambertMaterial({ color: 0x9a9aa0, flatShading: true });
const boreMat = new MeshBasicMaterial({ color: 0x0a0a0d });

/** Face wall with two real arched openings, extruded. Local frame: X across
 *  the road (world Z), Y up, extruded along +Z (world ±X after rotation). */
function buildFaceGeometry(): ExtrudeGeometry {
  const w = 13.6;
  const h = 6.8;
  const shape = new Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(w / 2, h - 1.2);
  shape.lineTo(0, h); // gentle crown peak
  shape.lineTo(-w / 2, h - 1.2);
  shape.closePath();
  for (const zc of [TUBE_OFFSET_Z, -TUBE_OFFSET_Z]) {
    const hole = new Path();
    hole.moveTo(zc - ARCH_R, 0);
    hole.lineTo(zc - ARCH_R, SPRING);
    hole.absarc(zc, SPRING, ARCH_R, Math.PI, 0, true);
    hole.lineTo(zc + ARCH_R, 0);
    hole.closePath();
    shape.holes.push(hole);
  }
  return new ExtrudeGeometry(shape, { depth: 1.3, bevelEnabled: false });
}

const faceGeo = buildFaceGeometry();
/** canopy hood: upper half-shell projecting out over each bore */
const hoodGeo = new CylinderGeometry(ARCH_R + 0.18, ARCH_R + 0.34, 3.4, 12, 1, true, 0, Math.PI);
const boreCap = new CircleGeometry(ARCH_R * 0.98, 16);

export class Portalworks {
  readonly group = new Group();
  private portals: Group[] = [];
  private guides: Line[] = [];
  private guideMat!: LineDashedMaterial;

  constructor() {
    for (const f of FACES) {
      const p = new Group();

      // arched face wall, stood PROUD of the terrain skin (buried walls show
      // only their crown through the slope); wings cover the seam behind
      const wx = f.x + f.dir * f.out; // wall plane x — everything hangs off it
      const face = new Mesh(faceGeo, faceMat);
      face.rotation.y = f.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      face.position.set(wx, ROAD_Y + 0.02, 0);
      p.add(face);

      // gorge faces stand on the carved bench, whose skin undulates around
      // deck level — a foundation plinth seals any daylight under the wall
      if (f.out > 2) {
        p.add(box(1.6, 4.4, 12.4, mat.concrete, wx + f.dir * 0.6, ROAD_Y - 2.1, 0));
      }

      for (const zc of [TUBE_OFFSET_Z, -TUBE_OFFSET_Z]) {
        // projecting canopy hood over the bore
        const hood = new Mesh(hoodGeo, hoodMat);
        hood.rotation.z = Math.PI / 2; // cylinder axis → X
        hood.rotation.y = f.dir > 0 ? 0 : Math.PI;
        hood.position.set(wx + f.dir * 1.9, ROAD_Y + SPRING + 0.02, zc);
        p.add(hood);
        // dark bore depth just inside the opening
        const cap = new Mesh(boreCap, boreMat);
        cap.position.set(wx - f.dir * 0.6, ROAD_Y + SPRING + 0.3, zc);
        cap.rotation.y = f.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        p.add(cap);
      }

      // wing walls easing the cut into the slope — tucked against the face
      for (const s of [1, -1]) {
        const wing = box(4.6, 4.0, 1.0, mat.concrete, wx - f.dir * 0.5, ROAD_Y + 1.5, s * 7.0);
        wing.rotation.y = s * f.dir * 0.42;
        p.add(wing);
      }
      // road stub through the portal — same width AND deck height as the
      // S11 surfacing and the tie-ins, so there is no kink or step at joins
      p.add(box(11, 0.24, 5.2, mat.asphalt, wx + f.dir * 2.5, ROAD_Y + 0.5, 0));
      p.scale.y = 1e-3;
      p.visible = false;
      this.group.add(p);
      this.portals.push(p);
    }

    // draped survey line over each tunnel span (the aerial "blueprint") —
    // ONE Line per span: a shared Line would connect the spans and draw a
    // 151-unit dashed beam straight across the gorge
    this.guideMat = new LineDashedMaterial({
      color: PALETTE.sodiumAmber,
      dashSize: 4,
      gapSize: 3.5,
      transparent: true,
      opacity: 0,
    });
    this.guides = [TUNNEL_SHORT, TUNNEL_LONG].map((span) => {
      const pts: Vector3[] = [];
      for (let x = span.x0; x <= span.x1; x += 8) {
        pts.push(new Vector3(x, Math.max(ROAD_Y + 1, heightAt(x, 0) + 2), 0));
      }
      const line = new Line(new BufferGeometry().setFromPoints(pts), this.guideMat);
      line.computeLineDistances();
      this.group.add(line);
      return line;
    });
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
    for (const gl of this.guides) gl.visible = vis > 0.01;
  }
}
