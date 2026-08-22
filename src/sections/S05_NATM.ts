/**
 * S5 — NATM Excavation, the centerpiece. The drill-blast-muck-bolt-shotcrete
 * cycle loops 4× as you scroll, the face advancing each cycle. Everything is
 * a pure function of localT (scrub-safe both directions). A live METERS
 * ADVANCED counter and the 4-face schematic feed the HUD via hudStore.
 */
import { BackSide, Group, Mesh, MeshLambertMaterial, PointLight, CylinderGeometry } from 'three';
import type { BuildCtx, Section } from './types';
import { GEO, box, makeInstanced, makeTubeShell, makeStringLights, mat, crownSlots } from './helpers';
import { revealInstances, type InstanceSlot } from '../utils/instanceReveal';
import { ROAD_Y, TUBE_OFFSET_Z, TUNNEL_LONG } from '../world/Alignment';
import { hudStore } from '../core/HUDBridge';
import { window01, easeOutCubic, lerp, _c1, _c2 } from '../utils/scratch';
import { PALETTE } from '../materials/greybox';

const Z = TUBE_OFFSET_Z;
// deep enough inside the massif that the whole stage — bore, machines and the
// camera's full run-up — sits under rock (the gorge wall blend ends ~x=363;
// the old +12 hung 33 units of tunnel in the open gorge)
const FACE_START = TUNNEL_LONG.x0 + 75; // 424
const CYCLES = 4;
const ADV = 8; // world units per cycle (readability over realism — PRD NG1)

let stage: Group;
let face: Mesh;
let faceMat: MeshLambertMaterial;
let jumbo: Group;
let loader: Mesh;
let tipper: Mesh;
let muckPile: Mesh;
let bolts: ReturnType<typeof makeInstanced>;
let boltSlots: InstanceSlot[] = [];
let shotcreteShell: Mesh;
let shotcreteMat: MeshLambertMaterial;
let blastLight: PointLight;
let baseNoiseAmp = 0.05;

function faceX(cycleF: number): number {
  return FACE_START + cycleF * ADV;
}

export const S05_NATM: Section = {
  id: 'S05',
  title: 'The NATM Cycle',
  range: [0, 0],
  cameraTrack: [
    // in-tunnel dolly following the face, tight FOV (28–32°)
    { t: 0, pos: [FACE_START - 30, ROAD_Y + 1.6, Z], look: [FACE_START, ROAD_Y + 1.2, Z], fov: 34 },
    { t: 0.3, pos: [FACE_START - 20, ROAD_Y + 1.6, Z + 0.8], look: [FACE_START + ADV, ROAD_Y + 1.2, Z], fov: 30 },
    { t: 0.7, pos: [FACE_START - 8, ROAD_Y + 1.7, Z - 0.6], look: [FACE_START + 2.5 * ADV, ROAD_Y + 1.2, Z], fov: 29, calm: true },
    { t: 1, pos: [FACE_START + 2 * ADV, ROAD_Y + 1.6, Z], look: [FACE_START + 4 * ADV + 14, ROAD_Y + 1.2, Z], fov: 28 },
  ],
  build(ctx: BuildCtx): Group {
    stage = new Group();
    // excavated bore behind the face — starts well behind the first camera key
    // so the camera is always INSIDE the bore (back-side shell is invisible
    // from outside)
    stage.add(makeTubeShell(FACE_START - 45, FACE_START + CYCLES * ADV + 2, Z));
    // site string lighting keeps the whole drive legible
    makeStringLights(stage, FACE_START - 42, FACE_START + CYCLES * ADV - 4, Z, 16, 26);
    void TUNNEL_LONG;

    faceMat = new MeshLambertMaterial({ color: PALETTE.basaltDark, flatShading: true });
    face = new Mesh(new CylinderGeometry(1.44, 1.44, 0.6, 14), faceMat);
    face.rotation.z = Math.PI / 2;
    face.position.set(faceX(0), ROAD_Y + 0.9, Z);
    stage.add(face);

    // drill jumbo: chassis + two booms
    jumbo = new Group();
    const chassis = box(3.6, 1.6, 1.8, mat.machine, 0, 0.8, 0);
    const boomL = box(3, 0.3, 0.3, mat.steel, 2.6, 1.6, 0.5);
    const boomR = box(3, 0.3, 0.3, mat.steel, 2.6, 1.2, -0.5);
    jumbo.add(chassis, boomL, boomR);
    jumbo.position.set(faceX(0) - 6, ROAD_Y, Z);
    stage.add(jumbo);

    loader = box(2.8, 1.5, 1.6, mat.machine, faceX(0) - 12, ROAD_Y + 0.75, Z + 0.6);
    tipper = box(3.4, 1.8, 1.8, mat.steel, faceX(0) - 18, ROAD_Y + 0.9, Z - 0.6);
    muckPile = new Mesh(GEO.sphere, mat.rock);
    muckPile.scale.set(3, 1.4, 2.4);
    muckPile.position.set(faceX(0) - 2, ROAD_Y + 0.4, Z);
    stage.add(loader, tipper, muckPile);

    // rock bolts fan into the crown, centre-out stagger
    boltSlots = crownSlots(CYCLES * 2, 9, FACE_START - ADV, ADV / 2, Z, 1.35);
    bolts = makeInstanced(GEO.bolt, mat.steel, boltSlots);
    stage.add(bolts);

    // shotcrete shell sweeps forward behind the face
    // BackSide: the camera lives INSIDE the bore — front faces of an
    // open-ended cylinder are invisible from in there (the whole shotcrete
    // beat rendered nothing)
    shotcreteMat = new MeshLambertMaterial({
      color: PALETTE.shotcrete,
      transparent: true,
      opacity: 0.95,
      side: BackSide,
    });
    shotcreteShell = new Mesh(new CylinderGeometry(1.42, 1.42, 1, 14, 1, true), shotcreteMat);
    shotcreteShell.rotation.z = Math.PI / 2;
    shotcreteShell.position.set(FACE_START - ADV, ROAD_Y + 0.9, Z);
    shotcreteShell.scale.y = 1e-3;
    stage.add(shotcreteShell);

    blastLight = new PointLight(0xffd9a0, 0, 40, 1.6);
    blastLight.position.set(faceX(0), ROAD_Y + 1.4, Z);
    stage.add(blastLight);

    // headlamps so the tunnel is never pitch black in grey-box
    const work = new PointLight(0xffe6c4, 280, 90, 2);
    work.position.set(FACE_START - 10, ROAD_Y + 2.4, Z);
    const work2 = new PointLight(0xffe6c4, 220, 80, 2);
    work2.position.set(FACE_START + 18, ROAD_Y + 2.4, Z);
    stage.add(work, work2);

    ctx.particles.ensure('s5_sparks', 'drillSparks', faceX(0), ROAD_Y + 1.6, Z, 0.8);
    ctx.particles.ensure('s5_dust', 'dust', faceX(0), ROAD_Y + 1.2, Z, 2.0);
    ctx.particles.ensure('s5_debris', 'blastDebris', faceX(0), ROAD_Y + 1.2, Z, 1.2);
    baseNoiseAmp = ctx.rig.noiseAmp;
    return stage;
  },
  update(localT, _dt, ctx): void {
    const drive = window01(localT, 0.04, 0.92); // total advance window
    const cycleF = drive * CYCLES;
    const cycle = Math.min(CYCLES - 1, Math.floor(cycleF));
    const ph = cycleF - cycle; // phase within current cycle, 0..1
    const fx = faceX(cycle + easeOutCubic(window01(ph, 0.3, 0.42))); // face jumps at blast

    face.position.x = fx + 0.4;
    blastLight.position.x = fx - 0.5;

    // (1) drill 0–0.30: jumbo at face, sparks
    const drilling = ph < 0.3;
    jumbo.position.x = fx - (drilling ? 4.6 : lerp(4.6, 10, window01(ph, 0.3, 0.4)));
    ctx.particles.ensure('s5_sparks', 'drillSparks', 0, 0, 0).points.position.set(fx - faceX(0), 0, 0);
    ctx.particles.scrub('s5_sparks', drilling ? (ph / 0.3) % 1 : 0);

    // (2) blast 0.30–0.42: flash + dust + debris + camera shake
    const blastK = window01(ph, 0.3, 0.42);
    const blastPulse = blastK > 0 && blastK < 1 ? Math.sin(blastK * Math.PI) : 0;
    blastLight.intensity = blastPulse * 160;
    ctx.particles.ensure('s5_debris', 'blastDebris', 0, 0, 0).points.position.set(fx - faceX(0), 0, 0);
    ctx.particles.scrub('s5_debris', blastK);
    ctx.particles.ensure('s5_dust', 'dust', 0, 0, 0).points.position.set(fx - faceX(0), 0, 0);
    ctx.particles.scrub('s5_dust', window01(ph, 0.32, 0.75));
    ctx.rig.noiseAmp = baseNoiseAmp + blastPulse * 0.5;

    // (3) muck: the pile is CREATED by the blast (0.34–0.42), then cleared
    // 0.42–0.65 — rubble must not exist before the explosion that makes it
    const muckK = window01(ph, 0.42, 0.65);
    const muckSize = window01(ph, 0.34, 0.42) * (1 - muckK);
    muckPile.position.x = fx - 2;
    muckPile.scale.set(3 * muckSize + 0.01, 1.4 * muckSize + 0.01, 2.4 * muckSize + 0.01);
    muckPile.visible = muckSize > 0.02;
    const shuttle = Math.abs(((muckK * 3) % 2) - 1); // 3 round trips
    loader.position.x = lerp(fx - 3.5, fx - 14, shuttle);
    tipper.position.x = fx - 17;

    // (4) bolts 0.65–0.80: fire into the crown, centre-out (spread≈each:0.04)
    const boltProgress = (cycle + window01(ph, 0.65, 0.8)) / CYCLES;
    revealInstances(bolts, boltSlots, boltProgress, { spread: 0.12 });

    // (5) shotcrete 0.80–1.0: shell sweeps up to the face
    const shotK = (cycle + window01(ph, 0.8, 1)) / CYCLES;
    const shellLen = Math.max(1e-3, shotK * CYCLES * ADV);
    shotcreteShell.scale.y = shellLen;
    shotcreteShell.position.x = FACE_START - ADV + shellLen / 2;
    _c2.setHex(0x9a9aa0);
    _c1.setHex(PALETTE.shotcrete).lerp(_c2, shotK * 0.4);
    shotcreteMat.color.copy(_c1);

    // HUD: live meters advanced (long-tube drive, representational)
    hudStore.getState().setFrame({ metersAdvanced: Math.floor(drive * 8920) });
  },
  exit(ctx): void {
    ctx.rig.noiseAmp = baseNoiseAmp;
  },
};
