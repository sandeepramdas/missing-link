/**
 * S10 — Systems fit-out: jet fans spin up, the sodium-amber lamp cascade,
 * SCADA room glow, and the post-PRD additions — high-pressure water-mist
 * test burst from ceiling nozzles + fire-resistant cladding panels snapping
 * onto the lower walls.
 */
import { Group, InstancedMesh, Mesh, MeshBasicMaterial, PointLight } from 'three';
import type { BuildCtx, Section } from './types';
import { GEO, box, cyl, makeInstanced, makeStringLights, makeTubeShell, mat } from './helpers';
import { revealInstances, type InstanceSlot } from '../utils/instanceReveal';
import { ROAD_Y, TUBE_OFFSET_Z } from '../world/Alignment';
import { window01, clamp01 } from '../utils/scratch';
import { PALETTE } from '../materials/greybox';

const Z = TUBE_OFFSET_Z;
const X0 = 480;
const X1 = 640;
let fans: Mesh[] = [];
let lamps: InstancedMesh;
let lampSlots: InstanceSlot[] = [];
let lampMat: MeshBasicMaterial;
let cladding: InstancedMesh;
let cladSlots: InstanceSlot[] = [];
let scada: Mesh;
let scadaGlow: PointLight;
let amberGlow: PointLight;
let fanSpin = 0;

export const S10_Systems: Section = {
  id: 'S10',
  title: 'Bringing It Alive',
  range: [0, 0],
  cameraTrack: [
    { t: 0, pos: [X0 - 26, ROAD_Y + 1.6, Z], look: [X0, ROAD_Y + 1.4, Z], fov: 34 },
    { t: 0.45, pos: [X0 + 60, ROAD_Y + 1.7, Z + 0.5], look: [X0 + 120, ROAD_Y + 1.4, Z], fov: 32, calm: true },
    { t: 0.8, pos: [X0 + 110, ROAD_Y + 1.6, Z], look: [X0 + 150, ROAD_Y + 2.2, Z], fov: 34 },
    { t: 1, pos: [X1, ROAD_Y + 1.7, Z], look: [X1 + 50, ROAD_Y + 1.2, Z], fov: 38 },
  ],
  build(ctx: BuildCtx): Group {
    const g = new Group();
    g.add(makeTubeShell(X0 - 30, X1 + 60, Z));

    // paired jet fans at intervals near the crown
    fans = [];
    for (let x = X0 + 14; x < X1; x += 40) {
      for (const dz of [-0.7, 0.7]) {
        const f = cyl(0.45, 2.2, mat.steel, x, ROAD_Y + 2.05, Z + dz);
        f.rotation.z = Math.PI / 2;
        f.scale.setScalar(1e-3);
        fans.push(f);
        g.add(f);
      }
    }

    // sodium lamp cascade — instanced emissive blocks along the crown
    lampSlots = [];
    const N = 36;
    for (let i = 0; i < N; i++) {
      lampSlots.push({
        x: X0 + (i / (N - 1)) * (X1 - X0),
        y: ROAD_Y + 2.25,
        z: Z,
        sx: 0.8, sy: 0.15, sz: 0.4,
        order: i / (N - 1),
      });
    }
    lampMat = new MeshBasicMaterial({ color: 0x333333 });
    lamps = makeInstanced(GEO.unitBox, lampMat, lampSlots);
    g.add(lamps);
    amberGlow = new PointLight(PALETTE.sodiumAmber, 0, 140, 1.1);
    amberGlow.position.set((X0 + X1) / 2, ROAD_Y + 2, Z);
    g.add(amberGlow);

    // fire-resistant cladding panels on the lower walls (correction §2.4)
    cladSlots = [];
    let ci = 0;
    for (let x = X0 + 4; x < X1; x += 8) {
      for (const s of [-1, 1]) {
        cladSlots.push({
          x, y: ROAD_Y + 0.7, z: Z + s * 1.32, sx: 7.4, sy: 1.3, sz: 0.12,
          order: ci++ / 38,
        });
      }
    }
    cladding = makeInstanced(GEO.unitBox, mat.concrete, cladSlots);
    g.add(cladding);

    // water-mist nozzles: three test-burst cones from the ceiling
    for (let i = 0; i < 3; i++) {
      ctx.particles.ensure(`s10_mist_${i}`, 'waterMist', X0 + 70 + i * 12, ROAD_Y + 2.2, Z, 1.4);
    }

    // SCADA room glimpse in a widened niche
    scada = box(4, 2.4, 3, mat.steel, X1 + 10, ROAD_Y + 1.2, Z + 3.4);
    scadaGlow = new PointLight(0x9fd8ff, 0, 24, 1.6);
    scadaGlow.position.set(X1 + 10, ROAD_Y + 1.6, Z + 3);
    g.add(scada, scadaGlow);

    // dim pre-commissioning string lighting so the fit-out reads before the
    // sodium cascade takes over
    makeStringLights(g, X0 - 24, X1 + 40, Z, 48, 16);
    const work = new PointLight(0xffe6c4, 20, 90, 1.4);
    work.position.set(X0 + 40, ROAD_Y + 2.4, Z);
    g.add(work);
    return g;
  },
  update(localT, dt, ctx): void {
    // fans mount 5–30%, then spin up
    const mountK = window01(localT, 0.05, 0.3);
    fanSpin += dt * (2 + 18 * window01(localT, 0.3, 0.6));
    for (let i = 0; i < fans.length; i++) {
      const own = clamp01(mountK * fans.length - i);
      fans[i].scale.setScalar(Math.max(1e-3, own));
      fans[i].rotation.x = fanSpin;
    }
    // lamp bloom cascade 35–65% (staggered on/off via instanced reveal + glow)
    const lampK = window01(localT, 0.35, 0.65);
    revealInstances(lamps, lampSlots, Math.max(lampK, 0.001), { spread: 0.1 });
    lampMat.color.setHex(lampK > 0.02 ? PALETTE.sodiumAmber : 0x333333);
    amberGlow.intensity = 26 * lampK;
    // cladding snaps on 55–80%
    revealInstances(cladding, cladSlots, window01(localT, 0.55, 0.8), { spread: 0.2, overshoot: true });
    // water-mist test burst 70–90%
    for (let i = 0; i < 3; i++) {
      ctx.particles.scrub(`s10_mist_${i}`, window01(localT, 0.7 + i * 0.03, 0.92));
    }
    scadaGlow.intensity = 12 * window01(localT, 0.82, 0.95);
  },
};
