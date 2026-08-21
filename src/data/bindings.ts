/**
 * bindings — the manifest of every projectData fact path bound to VISIBLE copy
 * (HUD stat cards, scene copy, fallback narrative, index.html figures).
 *
 * scripts/verify-gate.mjs reads this file and projectData.ts at build time:
 * a production build FAILS while any path listed here is `verified:false`.
 * Add a path here the moment a number appears on screen — never bind a fact
 * without registering it.
 */
export const boundFactPaths: string[] = [
  'overview.totalLength_km',
  'overview.distanceSaved_km',
  'overview.timeSaved_min',
  'overview.cost_croreINR',
  'overview.currentStatus',
  'overview.chainageStart',
  'overview.chainageEnd',
  'packages.p1_tunnels',
  'packages.p2_viaducts',
  'tunnels.shortTube_km',
  'tunnels.longTube_km',
  'tunnels.combinedTunnel_km',
  'tunnels.width_m',
  'tunnels.lanesPerTube',
  'tunnels.method',
  'tunnels.crossPassageSpacing_m',
  'tunnels.depthBelowLake_ft',
  'tunnels.ventilation',
  'tunnels.fireSuppression',
  'tunnels.breakthroughDate',
  'viaducts.viaduct1_m',
  'viaducts.viaduct2_m',
  'viaducts.pylonHeight_m',
  'viaducts.deckHeight_m',
  'viaducts.method',
];
