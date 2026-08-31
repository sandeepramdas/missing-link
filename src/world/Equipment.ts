/**
 * Equipment — procedural construction plant & roadside furniture, the
 * art-pass replacement for the grey-box placeholder blocks (same pattern as
 * Vehicles.ts: each machine is ONE merged geometry with baked vertex colours,
 * shared materials, instancing-friendly).
 *
 * Authoring frame: nose/work-face along +X, ground plane at y = 0 (machines
 * grow up out of the ground when instance-revealed). Representational scale
 * (~1:10 exaggerated) per PRD NG1 — matches the vehicle fleet.
 */
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PALETTE } from '../materials/greybox';

/** lit plant — flat-shaded lambert, vertex colours carry the livery */
export const equipMat = new MeshLambertMaterial({ vertexColors: true, flatShading: true });
/** unlit furniture (survey flags, sign faces) — must read at any light level */
export const equipGlowMat = new MeshBasicMaterial({ vertexColors: true });

const ORANGE = PALETTE.safetyOrange;
const STEEL = PALETTE.basaltLight;
const DARK = 0x1c1c20; // tracks, tyres, counterweights
const GLASS = 0x232b38;
const CONCRETE = PALETTE.concrete;
const SIGN_GREEN = 0x1f5f3f;
const WHITE = 0xe8e8ea;

function bake(geo: BufferGeometry, hex: number): BufferGeometry {
  const c = new Color(hex);
  const n = geo.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new Float32BufferAttribute(arr, 3));
  return geo;
}

function part(w: number, h: number, d: number, x: number, y: number, z: number, hex: number) {
  const g = new BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return bake(g, hex);
}

/** box rotated about Z (pitch in the XY plane) then translated — booms, braces */
function barZ(
  len: number, th: number, dep: number,
  x: number, y: number, z: number,
  pitch: number, hex: number
) {
  const g = new BoxGeometry(len, th, dep);
  g.rotateZ(pitch);
  g.translate(x, y, z);
  return bake(g, hex);
}

/** box rotated about X (roll in the ZY plane) — inclined girder webs */
function barX(
  len: number, th: number, dep: number,
  x: number, y: number, z: number,
  roll: number, hex: number
) {
  const g = new BoxGeometry(len, th, dep);
  g.rotateX(roll);
  g.translate(x, y, z);
  return bake(g, hex);
}

function cylPart(
  rTop: number, rBot: number, h: number, seg: number,
  x: number, y: number, z: number, hex: number,
  open = false
) {
  const g = new CylinderGeometry(rTop, rBot, h, seg, 1, open);
  g.translate(x, y, z);
  return bake(g, hex);
}

// ---------------------------------------------------------------------------
// Tracked excavator — twin tracks, slew ring, cab + engine house,
// counterweight, articulated boom/stick/bucket reaching toward +X.
// Footprint ≈ 3.6 × 2.0, height ≈ 2.9.
// ---------------------------------------------------------------------------
export function excavatorGeometry(): BufferGeometry {
  return mergeGeometries([
    // tracks: pads + drive sprocket hint front/rear
    part(2.6, 0.5, 0.55, 0, 0.25, 0.75, DARK),
    part(2.6, 0.5, 0.55, 0, 0.25, -0.75, DARK),
    part(2.2, 0.18, 1.7, 0, 0.55, 0, STEEL), // track frame
    cylPart(0.55, 0.55, 0.25, 10, 0, 0.72, 0, DARK), // slew ring
    // house: engine deck + counterweight at rear, cab offset left-front
    part(2.2, 0.75, 1.5, -0.25, 1.22, 0, ORANGE),
    part(0.6, 0.7, 1.5, -1.35, 1.2, 0, DARK), // counterweight
    part(0.75, 0.8, 0.7, 0.55, 1.65, 0.45, GLASS), // cab
    part(0.8, 0.35, 1.3, -0.55, 1.78, 0, ORANGE), // engine hood
    cylPart(0.06, 0.06, 0.5, 6, -1.0, 2.1, 0.5, STEEL), // exhaust stack
    // boom: up-forward, then stick down-forward, bucket at the tip
    barZ(2.2, 0.3, 0.34, 1.6, 2.1, 0, 0.62, ORANGE),
    barZ(1.7, 0.2, 0.26, 3.2, 1.75, 0, -0.95, ORANGE),
    part(0.55, 0.45, 0.7, 3.85, 0.55, 0, STEEL), // bucket
    barZ(1.1, 0.09, 0.1, 2.3, 2.35, 0, 0.2, STEEL), // boom hydraulic ram
  ]);
}

// ---------------------------------------------------------------------------
// Crawler borehole drill rig — tracks, deck, control cab, tall mast with
// cross-braces and crown sheave at +X end. Mast axis at local x = +1.1.
// Height ≈ 5.6.
// ---------------------------------------------------------------------------
export const RIG_MAST_X = 1.1;
export function drillRigGeometry(): BufferGeometry {
  const mastX = RIG_MAST_X;
  const parts = [
    part(2.4, 0.45, 0.5, -0.2, 0.22, 0.65, DARK),
    part(2.4, 0.45, 0.5, -0.2, 0.22, -0.65, DARK),
    part(2.3, 0.35, 1.6, -0.2, 0.62, 0, ORANGE), // deck
    part(0.9, 0.75, 0.85, -0.85, 1.15, 0.3, GLASS), // control cab
    part(0.9, 0.6, 0.9, -0.85, 1.05, -0.45, ORANGE), // power pack
    // mast: two rails + top sheave block
    part(0.14, 5.2, 0.14, mastX - 0.22, 3.2, 0, STEEL),
    part(0.14, 5.2, 0.14, mastX + 0.22, 3.2, 0, STEEL),
    part(0.6, 0.45, 0.45, mastX, 5.75, 0, ORANGE), // crown block
    barZ(1.6, 0.1, 0.1, 0.35, 3.6, 0, 1.15, STEEL), // back stay
  ];
  for (let y = 1.2; y < 5.4; y += 0.8) parts.push(part(0.5, 0.09, 0.12, mastX, y, 0, STEEL));
  return mergeGeometries(parts);
}

// ---------------------------------------------------------------------------
// Survey marker — ranging-rod post with an orange target flag (unlit:
// pair with equipGlowMat). Height ≈ 3.
// ---------------------------------------------------------------------------
export function surveyMarkerGeometry(): BufferGeometry {
  return mergeGeometries([
    part(0.5, 0.14, 0.5, 0, 0.07, 0, CONCRETE), // base plinth
    part(0.07, 3.0, 0.07, 0, 1.5, 0, 0x2a2a30), // rod
    part(0.06, 0.8, 0.9, 0, 2.55, 0.45, ORANGE), // target flag
    part(0.09, 0.09, 0.09, 0, 3.05, 0, WHITE), // tip bead
  ]);
}

// ---------------------------------------------------------------------------
// NATM drill jumbo — wheeled carrier: deck, canopy cab, power pack; the two
// feed booms are a separate geometry so sections can aim them at the face.
// ---------------------------------------------------------------------------
export function jumboCarrierGeometry(): BufferGeometry {
  const wheels: BufferGeometry[] = [];
  for (const [x, z] of [[0.85, 0.62], [0.85, -0.62], [-0.85, 0.62], [-0.85, -0.62]] as const) {
    const w = new CylinderGeometry(0.3, 0.3, 0.22, 8);
    w.rotateX(Math.PI / 2);
    w.translate(x, 0.3, z);
    wheels.push(bake(w, DARK));
  }
  return mergeGeometries([
    part(2.6, 0.42, 1.1, 0, 0.62, 0, ORANGE), // chassis deck
    part(0.9, 0.65, 1.0, -0.55, 1.15, 0, GLASS), // canopy cab
    part(0.24, 0.1, 1.0, -0.55, 1.55, 0, ORANGE), // FOPS canopy roof edge
    part(0.9, 0.5, 1.05, -1.55, 1.05, 0, ORANGE), // power pack / hose reels
    part(0.5, 0.3, 0.9, 0.9, 0.95, 0, STEEL), // boom carrier turret
    ...wheels,
  ]);
}

/** one feed boom: arm from the turret + feed rail + drifter, pivot at origin */
export function jumboBoomGeometry(): BufferGeometry {
  return mergeGeometries([
    barZ(1.5, 0.16, 0.16, 0.7, 0.12, 0, 0.16, ORANGE), // boom arm
    part(2.6, 0.1, 0.14, 2.4, 0.38, 0, STEEL), // feed rail
    part(0.5, 0.2, 0.2, 1.6, 0.5, 0, ORANGE), // drifter (rides the rail)
    part(0.05, 0.05, 0.05, 3.7, 0.38, 0, WHITE), // bit tip
  ]);
}

// ---------------------------------------------------------------------------
// Wheel loader — articulated body, big tyres, lift arms + wide muck bucket.
// ---------------------------------------------------------------------------
export function wheelLoaderGeometry(): BufferGeometry {
  const wheels: BufferGeometry[] = [];
  for (const [x, z] of [[0.7, 0.6], [0.7, -0.6], [-0.75, 0.6], [-0.75, -0.6]] as const) {
    const w = new CylinderGeometry(0.34, 0.34, 0.26, 8);
    w.rotateX(Math.PI / 2);
    w.translate(x, 0.34, z);
    wheels.push(bake(w, DARK));
  }
  return mergeGeometries([
    part(1.1, 0.6, 0.95, -0.75, 0.85, 0, ORANGE), // rear engine unit
    part(0.65, 0.62, 0.8, -0.1, 1.35, 0, GLASS), // cab
    part(0.9, 0.5, 0.9, 0.55, 0.75, 0, ORANGE), // front frame
    barZ(1.2, 0.14, 0.14, 1.1, 0.95, 0.32, -0.32, STEEL), // lift arm L
    barZ(1.2, 0.14, 0.14, 1.1, 0.95, -0.32, -0.32, STEEL), // lift arm R
    part(0.5, 0.55, 1.35, 1.75, 0.5, 0, STEEL), // bucket
    part(0.08, 0.3, 1.35, 1.98, 0.72, 0, DARK), // bucket lip
    ...wheels,
  ]);
}

// ---------------------------------------------------------------------------
// Articulated dump truck (tipper) — cab, tipper body with raised tail.
// ---------------------------------------------------------------------------
export function dumpTruckGeometry(): BufferGeometry {
  const wheels: BufferGeometry[] = [];
  for (const [x, z] of [
    [1.05, 0.6], [1.05, -0.6], [-0.25, 0.6], [-0.25, -0.6], [-1.05, 0.6], [-1.05, -0.6],
  ] as const) {
    const w = new CylinderGeometry(0.32, 0.32, 0.26, 8);
    w.rotateX(Math.PI / 2);
    w.translate(x, 0.32, z);
    wheels.push(bake(w, DARK));
  }
  return mergeGeometries([
    part(0.85, 0.62, 1.0, 1.05, 0.95, 0, GLASS), // cab
    part(0.85, 0.3, 1.0, 1.05, 0.5, 0, ORANGE), // cab base
    part(2.1, 0.35, 1.1, -0.45, 0.62, 0, STEEL), // frame
    // tipper body: floor + flared sides + raised tail
    part(2.0, 0.16, 1.1, -0.5, 0.9, 0, ORANGE),
    part(2.0, 0.5, 0.12, -0.5, 1.2, 0.55, ORANGE),
    part(2.0, 0.5, 0.12, -0.5, 1.2, -0.55, ORANGE),
    part(0.14, 0.55, 1.1, 0.45, 1.22, 0, ORANGE), // headboard
    barZ(0.9, 0.14, 1.05, -1.35, 1.15, 0, 0.18, ORANGE), // tail kick-up
  ]);
}

// ---------------------------------------------------------------------------
// Precast box-girder segment — top slab with cantilever wings, inclined
// webs, bottom slab. Length 5.6 along X, base at y = 0, height 2.25.
// ---------------------------------------------------------------------------
export function girderSegmentGeometry(): BufferGeometry {
  const webRoll = Math.atan2(0.7, 1.6); // (1.6−0.9) out over 1.6 up
  return mergeGeometries([
    part(5.6, 0.3, 1.8, 0, 0.15, 0, CONCRETE), // bottom slab
    barX(5.6, 1.75, 0.22, 0, 1.1, 1.22, -webRoll, CONCRETE),
    barX(5.6, 1.75, 0.22, 0, 1.1, -1.22, webRoll, CONCRETE),
    part(5.6, 0.35, 3.2, 0, 2.07, 0, CONCRETE), // top slab + wings
  ]);
}

// ---------------------------------------------------------------------------
// Form traveler — the balanced-cantilever gantry: truss frame straddling the
// deck, front cantilever beams, hangers and a suspended formwork platform
// below deck level. Origin at the DECK TOP plane, working face toward +X.
// ---------------------------------------------------------------------------
export function formTravelerGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const PW = 2.9; // half-width of the truss (deck is ±2.7)
  // corner posts
  for (const sx of [-1.6, 1.6]) {
    for (const sz of [-PW, PW]) parts.push(part(0.22, 2.3, 0.22, sx, 1.15, sz, ORANGE));
  }
  for (const sz of [-PW, PW]) {
    parts.push(part(3.9, 0.24, 0.24, 0, 2.35, sz, ORANGE)); // top chords
    parts.push(barZ(3.9, 0.1, 0.1, 0, 1.25, sz, 0.535, STEEL)); // diagonal ↗
    parts.push(barZ(3.9, 0.1, 0.1, 0, 1.25, sz, -0.535, STEEL)); // diagonal ↘
    parts.push(part(1.9, 0.2, 0.2, 2.55, 2.35, sz, ORANGE)); // front cantilever
    parts.push(part(0.09, 3.9, 0.09, 3.35, 0.4, sz, STEEL)); // hanger bar
  }
  for (const sx of [-1.6, 1.6]) parts.push(part(0.24, 0.24, PW * 2, sx, 2.35, 0, ORANGE)); // cross beams
  parts.push(part(2.0, 0.4, 4.4, -0.4, 2.65, 0, ORANGE)); // machinery/anchor deck
  parts.push(part(0.6, 0.5, 1.1, 0.7, 2.6, 0, STEEL)); // hydraulic power pack
  // suspended formwork: soffit platform + side form panels, below deck level
  parts.push(part(1.6, 0.18, PW * 2 + 0.4, 3.2, -1.5, 0, STEEL));
  for (const sz of [-PW - 0.1, PW + 0.1]) parts.push(part(1.6, 1.3, 0.1, 3.2, -0.75, sz, ORANGE));
  return mergeGeometries(parts);
}

// ---------------------------------------------------------------------------
// Roadside sign — twin posts + green board with white legend bars (unlit:
// pair with equipGlowMat). Base at y = 0, board faces along ±X. Height ≈ 2.5.
// ---------------------------------------------------------------------------
export function signGeometry(): BufferGeometry {
  return mergeGeometries([
    part(0.09, 1.6, 0.09, 0, 0.8, 0.7, 0x3a3a40),
    part(0.09, 1.6, 0.09, 0, 0.8, -0.7, 0x3a3a40),
    part(0.1, 1.1, 2.0, 0, 1.95, 0, SIGN_GREEN), // board
    part(0.12, 0.12, 1.5, 0, 2.2, 0, WHITE), // legend bar 1
    part(0.12, 0.1, 1.1, 0, 1.9, 0, WHITE), // legend bar 2
    part(0.12, 0.08, 1.3, 0, 1.62, 0, WHITE), // legend bar 3
  ]);
}

// ---------------------------------------------------------------------------
// Jet fan — silencer shroud with end rings + crown mount (static) and a
// bladed rotor (spun by the section). Axis along local Y, like unitCyl,
// centered at the origin; length 2.2, radius 0.45.
// ---------------------------------------------------------------------------
export function jetFanShroudGeometry(): BufferGeometry {
  return mergeGeometries([
    bake(new CylinderGeometry(0.42, 0.42, 2.2, 10, 1, true), STEEL),
    cylPart(0.5, 0.5, 0.3, 10, 0, 1.0, 0, DARK, true), // silencer ring A
    cylPart(0.5, 0.5, 0.3, 10, 0, -1.0, 0, DARK, true), // silencer ring B
    part(0.3, 0.25, 0.4, 0, 0, 0.55, STEEL), // crown mount bracket
  ]);
}

export function jetFanRotorGeometry(): BufferGeometry {
  const parts = [cylPart(0.1, 0.1, 0.5, 6, 0, 0.85, 0, ORANGE)];
  for (let i = 0; i < 3; i++) {
    const blade = new BoxGeometry(0.06, 0.05, 0.62);
    blade.rotateZ(0.5); // blade pitch
    blade.rotateY((i * Math.PI * 2) / 3);
    blade.translate(0, 0.85, 0);
    parts.push(bake(blade, ORANGE));
  }
  return mergeGeometries(parts);
}

// ---------------------------------------------------------------------------
// Rail-mounted portal gantry crane (casting yard). Group builder — sections
// position/animate it. Origin at ground level, girder spans local Z.
// ---------------------------------------------------------------------------
export function makeGantryCrane(halfSpan = 6.2, height = 3.2): Group {
  const parts: BufferGeometry[] = [];
  for (const sz of [-halfSpan, halfSpan]) {
    // A-frame legs: two inclined posts meeting under the girder
    parts.push(barZ(height + 0.3, 0.18, 0.18, 0.55, height / 2, sz, Math.PI / 2 - 0.32, ORANGE));
    parts.push(barZ(height + 0.3, 0.18, 0.18, -0.55, height / 2, sz, Math.PI / 2 + 0.32, ORANGE));
    parts.push(part(2.2, 0.22, 0.3, 0, 0.25, sz, STEEL)); // bogie beam
    for (const wx of [-0.8, 0.8]) {
      const w = new CylinderGeometry(0.16, 0.16, 0.2, 8);
      w.rotateX(Math.PI / 2);
      w.translate(wx, 0.16, sz);
      parts.push(bake(w, DARK));
    }
    parts.push(part(6.0, 0.1, 0.16, 0, 0.04, sz, DARK)); // rail
  }
  parts.push(part(0.45, 0.55, halfSpan * 2 + 1.2, 0, height + 0.28, 0, ORANGE)); // main girder
  parts.push(part(0.7, 0.5, 0.9, 0, height - 0.15, -1.2, STEEL)); // hoist trolley
  parts.push(part(0.05, 1.6, 0.05, 0, height - 1.2, -1.2, DARK)); // hoist rope
  parts.push(part(0.35, 0.22, 0.35, 0, height - 2.05, -1.2, ORANGE)); // hook block
  const g = new Group();
  g.add(new Mesh(mergeGeometries(parts), equipMat));
  return g;
}

// ---------------------------------------------------------------------------
// Cable-stay pylon — DIAMOND form (⟨VERIFY⟩ Doka: diamond-shaped pylons,
// tallest ~181.77 m): legs splay from a single foundation to their widest
// at deck level, converge to a needle above the deck, then a single anchor
// spine at z = 0 that the stay cables terminate into. Origin at the BASE
// (valley floor); total height `h`. Group so sections can grow it with
// scale.y.
// ---------------------------------------------------------------------------
export function makePylon(h: number, deckClearY: number): Group {
  const parts: BufferGeometry[] = [];
  const Z_BASE = 1.3; // leg half-spread at the pile cap
  const Z_DECK = 3.6; // widest point — deck passes between the legs here
  const Z_NECK = 0.5; // where the legs merge into the spine
  const yMerge = h * 0.86;
  // inclined leg segment between (y0,z0)→(y1,z1), z = across-deck axis
  const leg = (y0: number, z0: number, y1: number, z1: number, th: number) => {
    const g = new BoxGeometry(th, Math.hypot(y1 - y0, z1 - z0), th * 1.15);
    g.rotateX(Math.atan2(z1 - z0, y1 - y0));
    g.translate(0, (y0 + y1) / 2, (z0 + z1) / 2);
    parts.push(bake(g, CONCRETE));
  };
  parts.push(part(2.4, 1.6, 5.8, 0, 0.8, 0, CONCRETE)); // pile cap / plinth
  for (const s of [1, -1]) {
    leg(0.5, s * Z_BASE, deckClearY, s * Z_DECK, 1.05); // lower diamond half
    leg(deckClearY, s * Z_DECK, yMerge, s * Z_NECK, 0.9); // upper half, converging
  }
  parts.push(part(1.8, 1.1, 7.6, 0, deckClearY - 1.15, 0, CONCRETE)); // tie beam under deck
  parts.push(part(1.2, h * 0.3, 1.3, 0, h * 0.85, 0, CONCRETE)); // anchor spine (cables land here)
  parts.push(part(1.35, 0.5, 1.5, 0, h - 0.25, 0, STEEL)); // anchor head cap
  const g = new Group();
  g.add(new Mesh(mergeGeometries(parts), equipMat));
  return g;
}

// ---------------------------------------------------------------------------
// Viaduct pier kit — tapered octagonal shaft geometry (unit height, scaled
// per-instance) and a hammerhead crosshead for the pier top.
// ---------------------------------------------------------------------------
export function pierShaftGeometry(): CylinderGeometry {
  return new CylinderGeometry(0.5, 0.64, 1, 8);
}

/** world-scale hammerhead: 3.2 along X, 5.0 across Z, centered at origin */
export function crossheadGeometry(): BufferGeometry {
  return mergeGeometries([
    part(3.2, 0.7, 5.0, 0, 0.25, 0, CONCRETE), // head block
    barX(3.0, 0.6, 1.6, 0, -0.35, 1.35, 0.45, CONCRETE), // tapered haunch +z
    barX(3.0, 0.6, 1.6, 0, -0.35, -1.35, -0.45, CONCRETE), // tapered haunch −z
    part(0.5, 0.25, 4.4, 0.9, 0.72, 0, STEEL), // bearing line A
    part(0.5, 0.25, 4.4, -0.9, 0.72, 0, STEEL), // bearing line B
  ]);
}
