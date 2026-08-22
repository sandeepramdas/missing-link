/**
 * S1 — The Problem: the old Khandala Ghat. Serpentine ghat road in safety
 * orange hugging the massif flank, instanced stalled traffic, a rockfall
 * burst, monsoon rain. Exit: the old road desaturates (ghost).
 */
import {
  BufferGeometry,
  CatmullRomCurve3,
  Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  TubeGeometry,
  Vector3,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import type { BuildCtx, Section } from './types';
import { heightAt } from '../world/Terrain';
import { makeVehicleMesh } from '../world/Vehicles';
import { revealInstances, type InstanceSlot } from '../utils/instanceReveal';
import { window01, easeOutCubic } from '../utils/scratch';

let ghatMat: MeshBasicMaterial;
let ghatLineMat: LineBasicMaterial;
let convoyCars: InstancedMesh;
let convoyTrucks: InstancedMesh;
let carSlots: InstanceSlot[] = [];
let truckSlots: InstanceSlot[] = [];
let ghatCurve: CatmullRomCurve3;

export const S01_Problem: Section = {
  id: 'S01',
  title: 'The Old Ghat',
  range: [0, 0],
  cameraTrack: [
    { t: 0, pos: [520, 120, 300], look: [420, 60, 140], fov: 55 },
    { t: 0.35, pos: [420, 70, 240], look: [380, 46, 130], fov: 42 },
    { t: 0.75, pos: [340, 58, 210], look: [300, 40, 120], fov: 40, calm: true },
    { t: 1, pos: [420, 160, 340], look: [650, 20, 0], fov: 55 },
  ],
  build(ctx: BuildCtx): Group {
    const g = new Group();
    // serpentine ghat descending the flank of the short-tunnel massif (z>0
    // side). The ribbon must be DRAPED: sample the horizontal serpentine
    // densely and pin every sample to the terrain surface — a coarse curve
    // interpolated in 3D dives under the hillside between control points and
    // renders as disconnected orange fragments.
    const pts: Vector3[] = [];
    const N = 120;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = 140 + t * 320 + Math.sin(t * Math.PI * 4) * 46;
      const z = 200 - t * 110;
      pts.push(new Vector3(x, heightAt(x, z) + 0.9, z));
    }
    ghatCurve = new CatmullRomCurve3(pts);
    ghatMat = new MeshBasicMaterial({ color: 0xf26522, transparent: true, opacity: 0 });
    const tube = new Mesh(new TubeGeometry(ghatCurve, 240, 0.7, 6, false), ghatMat);
    g.add(tube);

    // outline line for legibility at distance — own material so it fades
    // with the tube (shared mat.hazardLine is always-opaque)
    ghatLineMat = new LineBasicMaterial({ color: 0xf26522, transparent: true, opacity: 0 });
    const line = new Line(new BufferGeometry().setFromPoints(ghatCurve.getPoints(90)), ghatLineMat);
    line.position.y = 0.6;
    g.add(line);

    // stalled convoy along the curve — REAL low-poly vehicles (cars/trucks),
    // seated on the surface and yawed to the road direction
    carSlots = [];
    truckSlots = [];
    for (let i = 0; i < 26; i++) {
      const ct = 0.25 + (i / 26) * 0.5;
      const p = ghatCurve.getPoint(ct);
      const tan = ghatCurve.getTangent(ct);
      const slot: InstanceSlot = {
        x: p.x,
        y: heightAt(p.x, p.z) + 0.75,
        z: p.z,
        sx: 1, sy: 1, sz: 1,
        ry: Math.atan2(-tan.z, tan.x),
        order: i / 25,
      };
      if (i % 3 === 0) truckSlots.push(slot);
      else carSlots.push(slot);
    }
    convoyCars = makeVehicleMesh('car', carSlots.length, 5);
    convoyTrucks = makeVehicleMesh('truck', truckSlots.length, 17);
    g.add(convoyCars, convoyTrucks);

    // rockfall + rain emitters (scrub-driven)
    const rockAt = ghatCurve.getPoint(0.45);
    ctx.particles.ensure('s1_rockfall', 'rockfall', rockAt.x, rockAt.y + 26, rockAt.z - 8, 1.6);
    ctx.particles.ensure('s1_rain', 'monsoonRain', 350, 120, 140, 2.5);
    return g;
  },
  update(localT, _dt, ctx): void {
    // NOTE: terrain morph is owned by S00 (which now updates every frame) —
    // a neighbour writing shared world state was destroying the hero beat.
    // draw on, then desaturate/hand off completely before S2's reveal
    ghatMat.opacity = 0.85 * easeOutCubic(window01(localT, 0.05, 0.3)) * (1 - window01(localT, 0.85, 1));
    ghatLineMat.opacity = ghatMat.opacity;
    const convoyK = window01(localT, 0.2, 0.55);
    revealInstances(convoyCars, carSlots, convoyK, { spread: 0.3 });
    revealInstances(convoyTrucks, truckSlots, convoyK, { spread: 0.3 });
    ctx.particles.scrub('s1_rockfall', window01(localT, 0.45, 0.75));
    ctx.particles.scrub('s1_rain', window01(localT, 0.1, 0.9));
  },
};
