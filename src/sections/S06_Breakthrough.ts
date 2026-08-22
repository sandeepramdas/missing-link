/**
 * S6 — Breakthrough. The final veil blasts away; a volumetric-cheat light
 * cone floods the bore; slow-mo dust; FOV release handled by the camera
 * track (30° → 48°). Date stamp comes from projectData via the HUD.
 */
import { Group, Mesh, MeshBasicMaterial, PointLight, CylinderGeometry, AdditiveBlending } from 'three';
import type { BuildCtx, Section } from './types';
import { makeStringLights, makeTubeShell } from './helpers';
import { ROAD_Y, TUBE_OFFSET_Z } from '../world/Alignment';
import { window01, easeOutExpo, smoothstep } from '../utils/scratch';
import { PALETTE } from '../materials/greybox';

const Z = TUBE_OFFSET_Z;
const BX = 795; // meeting point of the two drives (mid long tunnel)
let veil: Mesh;
let shaft: Mesh;
let shaftMat: MeshBasicMaterial;
let flood: PointLight;

export const S06_Breakthrough: Section = {
  id: 'S06',
  title: 'Two Drives Meet',
  range: [0, 0],
  cameraTrack: [
    { t: 0, pos: [BX - 36, ROAD_Y + 1.6, Z], look: [BX, ROAD_Y + 1.2, Z], fov: 30 },
    { t: 0.45, pos: [BX - 22, ROAD_Y + 1.6, Z], look: [BX, ROAD_Y + 1.2, Z], fov: 30, calm: true },
    { t: 0.7, pos: [BX - 14, ROAD_Y + 1.6, Z], look: [BX + 8, ROAD_Y + 1.2, Z], fov: 40 },
    { t: 1, pos: [BX - 4, ROAD_Y + 1.6, Z], look: [BX + 30, ROAD_Y + 1.2, Z], fov: 48 },
  ],
  build(ctx: BuildCtx): Group {
    const g = new Group();
    g.add(makeTubeShell(BX - 50, BX + 50, Z));
    makeStringLights(g, BX - 48, BX - 6, Z, 16, 22);

    veil = new Mesh(
      new CylinderGeometry(1.44, 1.44, 0.8, 14),
      new MeshBasicMaterial({ color: PALETTE.basaltDark })
    );
    veil.rotation.z = Math.PI / 2;
    veil.position.set(BX, ROAD_Y + 0.9, Z);
    g.add(veil);

    // light-shaft cheat: additive cone through the opening
    // the OTHER drive's sodium floodlights through the veil — this beat is
    // 4 km under rock, so "daylight" here would be nonsense
    shaftMat = new MeshBasicMaterial({
      color: 0xffc987,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    // positioned BEYOND the opening so the camera never flies through the cone
    shaft = new Mesh(new CylinderGeometry(0.4, 1.3, 20, 12, 1, true), shaftMat);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(BX + 11, ROAD_Y + 1.1, Z);
    g.add(shaft);

    flood = new PointLight(0xfff2d8, 0, 120, 1.2);
    flood.position.set(BX + 2, ROAD_Y + 1.4, Z);
    const work = new PointLight(0xffe6c4, 26, 70, 1.3);
    work.position.set(BX - 22, ROAD_Y + 2.2, Z);
    g.add(flood, work);

    ctx.particles.ensure('s6_burst', 'breakthroughBurst', BX, ROAD_Y + 1.2, Z, 2.2);
    ctx.particles.ensure('s6_dust', 'dust', BX - 6, ROAD_Y + 1.2, Z, 3.5);
    return g;
  },
  update(localT, _dt, ctx): void {
    // anticipation: veil shudders 0.30–0.45, blasts at 0.45
    const pre = window01(localT, 0.3, 0.45);
    veil.position.y = ROAD_Y + 0.9 + Math.sin(pre * 40) * 0.05 * pre;
    const blast = window01(localT, 0.45, 0.6);
    veil.scale.setScalar(Math.max(1e-3, 1 - easeOutExpo(blast)));
    veil.visible = blast < 0.95;
    ctx.particles.scrub('s6_burst', window01(localT, 0.45, 0.9));
    ctx.particles.scrub('s6_dust', window01(localT, 0.5, 1)); // slow-mo linger
    const lightK = smoothstep(window01(localT, 0.45, 0.75));
    shaftMat.opacity = lightK * 0.28;
    flood.intensity = lightK * 140;
  },
};
