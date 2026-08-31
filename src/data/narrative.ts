/**
 * narrative — per-scene titles, kicker labels, copy and HUD stat bindings.
 * Copy strings here mirror the semantic copy in index.html (SEO layer);
 * numbers are NEVER inlined — they bind via projectData fact paths so the
 * verify-gate governs everything the visitor reads.
 */

export interface StatBinding {
  label: string;
  path: string; // dot-path into projectData (must be registered in bindings.ts)
  /** printf-lite: "{v}" replaced by the fact value */
  format: string;
  /** count-up animation for numeric values */
  countUp?: boolean;
}

export interface SceneCopy {
  id: string;
  kicker: string; // stamped mono label, e.g. "CH 0+000 · SURVEY"
  title: string;
  body: string;
  chip: string; // milestone chip label
  stats: StatBinding[];
}

export const narrative: SceneCopy[] = [
  {
    id: 'S00',
    kicker: 'SAHYADRI RANGE · DECCAN TRAP BASALT',
    title: 'Carving Through the Sahyadris',
    body: 'A feat of Indian engineering — twin basalt tunnels and soaring valley viaducts replacing the Khandala Ghat. Scroll to build it.',
    chip: 'The Sahyadris',
    stats: [
      { label: 'New alignment', path: 'overview.totalLength_km', format: '{v} km', countUp: true },
    ],
  },
  {
    id: 'S01',
    kicker: 'THE PROBLEM · KHANDALA GHAT',
    title: 'The Old Ghat',
    body: 'For decades, the Khandala Ghat descent has meant steep gradients, landslide risk and monsoon congestion on the Mumbai–Pune Expressway.',
    chip: 'The Problem',
    stats: [
      { label: 'Status quo', path: 'overview.timeSaved_min', format: '{v} min lost to the ghat' },
    ],
  },
  {
    id: 'S02',
    kicker: 'ALIGNMENT · KHALAPUR TOLL PLAZA → KUSGAON',
    title: 'The Missing Link',
    body: 'MSRDC straightens the corridor from the Khalapur toll plaza end to Kusgaon (Sinhgad Institute) — under the massif, over the gorge.',
    chip: 'Alignment',
    stats: [
      { label: 'Length', path: 'overview.totalLength_km', format: '{v} km', countUp: true },
      { label: 'Distance saved', path: 'overview.distanceSaved_km', format: '−{v} km', countUp: true },
      { label: 'Time saved', path: 'overview.timeSaved_min', format: '−{v} min' },
      { label: 'Cost', path: 'overview.cost_croreINR', format: '₹{v} cr', countUp: true },
    ],
  },
  {
    id: 'S03',
    kicker: 'GEOTECHNICAL INVESTIGATION',
    title: 'Reading the Rock',
    body: 'Borehole rigs core the massif. Deccan Trap basalt — twin-tube feasibility confirmed.',
    chip: 'Investigation',
    stats: [
      { label: 'Method', path: 'tunnels.method', format: '{v}' },
    ],
  },
  {
    id: 'S04',
    kicker: 'PORTAL EXCAVATION & SLOPE STABILIZATION',
    title: 'Opening the Face',
    body: 'Bench cuts step down the hillside. Rock bolts, mesh and shotcrete pin the slopes; portal frames rise at both ends of the alignment.',
    chip: 'Portals',
    stats: [
      { label: 'Portals', path: 'overview.chainageStart', format: 'Khalapur end · {v}' },
    ],
  },
  {
    id: 'S04b',
    kicker: 'CUT-AND-COVER · APPROACHES',
    title: 'Cut and Cover',
    body: 'Open-cut approach boxes are excavated, cast and backfilled; embankments take shape while the casting yard turns out viaduct segments.',
    chip: 'Cut & Cover',
    stats: [
      { label: 'Deck method', path: 'viaducts.method', format: '{v}' },
    ],
  },
  {
    id: 'S05',
    kicker: 'NATM DRILL-AND-BLAST · 4 FACES ADVANCING',
    title: 'The NATM Cycle',
    body: 'Drill. Blast. Muck. Bolt. Shotcrete. Repeat — four faces advancing through solid basalt, metre by metre.',
    chip: 'Excavation',
    stats: [
      { label: 'Tunnel width', path: 'tunnels.width_m', format: '{v} m', countUp: true },
      { label: 'Lanes per tube', path: 'tunnels.lanesPerTube', format: '{v} lanes (4+4 corridor)' },
      { label: 'Combined tunnel', path: 'tunnels.combinedTunnel_km', format: '{v} km of alignment' },
      { label: 'Below the lake', path: 'tunnels.depthBelowLake_ft', format: '{v} ft' },
    ],
  },
  {
    id: 'S06',
    kicker: 'BREAKTHROUGH',
    title: 'Two Drives Meet',
    body: "The final veil gives way — and the other face's floodlights cut through the dust. One continuous bore, driven from both ends.",
    chip: 'Breakthrough',
    stats: [
      { label: 'Long tube', path: 'tunnels.longTube_km', format: '{v} km', countUp: true },
      { label: 'Short tube', path: 'tunnels.shortTube_km', format: '{v} km', countUp: true },
      { label: 'Breakthrough', path: 'tunnels.breakthroughDate', format: '{v}' },
    ],
  },
  {
    id: 'S07',
    kicker: 'FINAL LINING & CROSS PASSAGES',
    title: 'Lining the Bore',
    body: 'Concrete lining clads the rock; emergency cross passages link the twin tubes at regular intervals.',
    chip: 'Lining',
    stats: [
      { label: 'Cross passages', path: 'tunnels.crossPassageSpacing_m', format: 'every ~{v} m' },
    ],
  },
  {
    id: 'S08',
    kicker: 'PACKAGE 2 · VIADUCT FOUNDATIONS',
    title: 'Rising from the Gorge',
    body: 'Deep foundations set in the valley floor; piers climb toward deck level.',
    chip: 'Piers',
    stats: [
      { label: 'Deck height', path: 'viaducts.deckHeight_m', format: '{v} m above the valley' },
      { label: 'Contractor', path: 'packages.p2_viaducts', format: '{v}' },
    ],
  },
  {
    id: 'S09',
    kicker: 'PYLONS · BALANCED CANTILEVER · STAY CABLES',
    title: 'The Pylons',
    body: 'Twin cable-stayed crossings rise from the gorge — form travelers push each deck out symmetrically while stay cables install and tension, one by one.',
    chip: 'Cable Stay',
    stats: [
      { label: 'Pylon height', path: 'viaducts.pylonHeight_m', format: '{v} m', countUp: true },
      { label: 'Viaduct 1', path: 'viaducts.viaduct1_m', format: '{v} m', countUp: true },
      { label: 'Viaduct 2', path: 'viaducts.viaduct2_m', format: '{v} m', countUp: true },
    ],
  },
  {
    id: 'S10',
    kicker: 'SYSTEMS FIT-OUT',
    title: 'Bringing It Alive',
    body: 'Ventilation spins up, sodium-amber lighting cascades on, the SCADA room boots — and a high-pressure water-mist system test-fires from the crown.',
    chip: 'Systems',
    stats: [
      { label: 'Ventilation', path: 'tunnels.ventilation', format: '{v}' },
      { label: 'Fire safety', path: 'tunnels.fireSuppression', format: '{v}' },
    ],
  },
  {
    id: 'S11',
    kicker: 'SURFACING & FINISHING',
    title: 'The Final Layer',
    body: 'Asphalt sweeps forward; markings, barriers and signage snap into place.',
    chip: 'Surfacing',
    stats: [
      { label: 'Chainage', path: 'overview.chainageEnd', format: 'to {v}' },
    ],
  },
  {
    id: 'S12',
    kicker: 'THE CORRIDOR, COMPLETE',
    title: 'Ready for the Road Ahead',
    body: 'Through the widest tunnels in the country, over the gorge, past the lit pylons — the Missing Link stands ready.',
    chip: 'Opening',
    stats: [
      { label: 'New alignment', path: 'overview.totalLength_km', format: '{v} km', countUp: true },
      { label: 'Saved', path: 'overview.distanceSaved_km', format: '−{v} km', countUp: true },
      { label: 'Time saved', path: 'overview.timeSaved_min', format: '−{v} min' },
    ],
  },
];

export const sceneCopyById = new Map(narrative.map((s) => [s.id, s]));
