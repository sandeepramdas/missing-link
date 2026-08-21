/**
 * Grey-box material kit — Phase 1 only. Flat-ish lambert/standard materials in
 * the PRD palette so the narrative reads in value/hue before any art pass.
 * Phase 2 replaces these with terrainTriplanar / rockFace / water / emissive
 * shaders (stubs live alongside in this directory).
 *
 * Shared singletons: sections must NOT clone these per-object — material
 * count is part of the draw-call budget.
 */
import { Color, MeshLambertMaterial, MeshBasicMaterial, LineBasicMaterial } from 'three';

export const PALETTE = {
  basaltDark: 0x2b2b2e,
  basaltMid: 0x4a4a50,
  basaltLight: 0x6e6e76,
  monsoonGreen: 0x3e5c3a,
  sahyadriGreen: 0x6b8e5a,
  safetyOrange: 0xf26522,
  sodiumAmber: 0xffb454,
  sodiumDeep: 0xe8890c,
  skySteel: 0x8fb3c7,
  concrete: 0x9a9aa0,
  shotcrete: 0x7d7d84,
  asphalt: 0x232326,
  danger: 0xd23b2f,
  crossPassageGreen: 0x3ddc84,
} as const;

export const mat = {
  terrain: new MeshLambertMaterial({ color: PALETTE.basaltMid, flatShading: true }),
  vegetation: new MeshLambertMaterial({ color: PALETTE.monsoonGreen, flatShading: true }),
  rock: new MeshLambertMaterial({ color: PALETTE.basaltDark, flatShading: true }),
  concrete: new MeshLambertMaterial({ color: PALETTE.concrete, flatShading: true }),
  shotcrete: new MeshLambertMaterial({ color: PALETTE.shotcrete, flatShading: true }),
  asphalt: new MeshLambertMaterial({ color: PALETTE.asphalt }),
  machine: new MeshLambertMaterial({ color: PALETTE.safetyOrange, flatShading: true }),
  steel: new MeshLambertMaterial({ color: PALETTE.basaltLight, flatShading: true }),
  amberEmissive: new MeshBasicMaterial({ color: PALETTE.sodiumAmber }),
  orangeEmissive: new MeshBasicMaterial({ color: PALETTE.safetyOrange }),
  greenEmissive: new MeshBasicMaterial({ color: PALETTE.crossPassageGreen }),
  water: new MeshLambertMaterial({ color: PALETTE.skySteel, transparent: true, opacity: 0.8 }),
  ghost: new MeshBasicMaterial({ color: PALETTE.basaltLight, transparent: true, opacity: 0.25 }),
  alignmentLine: new LineBasicMaterial({ color: PALETTE.sodiumAmber }),
  hazardLine: new LineBasicMaterial({ color: PALETTE.safetyOrange }),
  cable: new LineBasicMaterial({ color: 0xd8d8de }),
};

export const col = (hex: number): Color => new Color(hex);
