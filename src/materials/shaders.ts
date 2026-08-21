/**
 * Phase-2 shader contracts (stubs). Grey-box (Phase 1) intentionally uses
 * materials/greybox.ts everywhere; these signatures freeze the uniform
 * interfaces so sections can be wired to them in the art pass without
 * re-touching scene logic.
 *
 *  terrainTriplanar — basalt + slope/altitude Sahyadri greens, monsoon-wet
 *    variant. Uniforms: uMorph (S0 contour→3D), uWetness.
 *  rockFace — fresh basalt triplanar + fracture normal detail + wetness.
 *    Uniforms: uShotcreteMix (0→sprayed concrete), uLiningMix (→final lining).
 *    Progress uniforms are GSAP-tweened — never thousands of objects.
 *  water — two scrolling normal maps (different scale/speed), depth-fade
 *    colour, Fresnel env reflection. Lake cutaway beat.
 *  mist — volumetric-cheat layered planes / fog cards for ghat monsoon.
 *  emissive — sodium-vapor lamps + pylon aviation lights (bloom sources).
 */
export interface TerrainUniforms {
  uMorph: { value: number };
  uWetness: { value: number };
}
export interface RockFaceUniforms {
  uShotcreteMix: { value: number };
  uLiningMix: { value: number };
  uWetness: { value: number };
}

export const PHASE2_TODO = [
  'terrainTriplanar: triplanar basalt + slope-driven greens + uMorph',
  'rockFace: fracture normals + shotcreteMix/liningMix blend',
  'water: dual scrolling normals + depth fade + fresnel',
  'mist: layered fog cards for ghat monsoon',
  'emissive: lamp/aviation-light bloom sources',
] as const;
