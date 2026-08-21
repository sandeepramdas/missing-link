/**
 * projectData — THE single source of truth for every on-screen number.
 *
 * RULES (PRD §3, AC2):
 *  - Every field carries { value, verified, note?, source? }.
 *  - `verified:false` fields render a ⟨VERIFY⟩ badge in dev/staging.
 *  - `scripts/verify-gate.mjs` BLOCKS a production build while any field
 *    listed in `src/data/bindings.ts` is still `verified:false`.
 *  - Swap in confirmed values + source URLs (PRD §0 priority sources) — never
 *    edit copy to route around the gate.
 *
 * POST-PRD CORRECTIONS APPLIED (build prompt §2):
 *  - lanesPerTube: 4 (8-lane corridor, 4+4) — not 3.
 *  - Endpoints: Khalapur toll plaza end → Kusgaon (Sinhgad Institute) — not "Khopoli".
 *  - combinedTunnel_km: ~10.5–10.7 km of the 13.3 km alignment (S5 HUD stat).
 *  - Water-mist firefighting system + fire-resistant cladding (S10).
 *  - S12 reads overview.currentStatus; neutral variant unless verified open.
 */

export interface Fact<T = number | string> {
  value: T;
  verified: boolean;
  note?: string;
  source?: string;
}

export const fact = <T>(value: T, verified = false, note?: string, source?: string): Fact<T> => ({
  value,
  verified,
  note,
  source,
});

export const projectData = {
  meta: {
    projectName: 'Mumbai–Pune Expressway Missing Link',
    owner: 'Maharashtra State Road Development Corporation (MSRDC)',
    location:
      'Khandala Ghat, between the Khalapur toll plaza end and Kusgaon (Sinhgad Institute), Maharashtra, India',
    region: 'Sahyadri / Western Ghats (Deccan Trap basalt)',
  },

  overview: {
    totalLength_km: fact(13.3, false, '⟨VERIFY⟩ MSRDC'),
    distanceSaved_km: fact(6, false, '⟨VERIFY⟩'),
    timeSaved_min: fact('20–30', false, '⟨VERIFY range⟩'),
    cost_croreINR: fact(6600, false, '⟨VERIFY revised figure⟩'),
    startYear: fact(2019, false, '⟨VERIFY⟩'),
    targetCompletion: fact('2025–2026', false, '⟨VERIFY⟩'),
    /** S12 status discipline: only an explicit verified "open"/"inaugurated"
     *  value renders inauguration copy; anything else → neutral variant. */
    currentStatus: fact('UNCONFIRMED', false, '⟨VERIFY open/inaugurated?⟩'),
    chainageStart: fact('CH 0+000', false, '⟨VERIFY⟩'),
    chainageEnd: fact('CH 13+300', false, '⟨VERIFY⟩'),
  },

  packages: {
    p1_tunnels: fact('Navayuga Engineering Company Ltd (NECL)', false, '⟨VERIFY⟩'),
    p2_viaducts: fact('Afcons Infrastructure Ltd', false, '⟨VERIFY⟩'),
    tunnelDesigner: fact('Amberg Engineering (Switzerland)?', false, '⟨VERIFY⟩'),
    bridgeDesigner: fact('⟨VERIFY⟩', false),
  },

  tunnels: {
    countTubes: fact(2, false, 'twin tubes ⟨VERIFY⟩'),
    shortTube_km: fact(1.75, false, '⟨VERIFY⟩'),
    longTube_km: fact(8.92, false, '⟨VERIFY 8.92/8.93⟩'),
    /** Correction §2.5 — combined tunnel length of the alignment. */
    combinedTunnel_km: fact('10.5–10.7', false, '⟨VERIFY⟩ of 13.3 km alignment'),
    width_m: fact(23.75, false, "⟨VERIFY 'widest in India'⟩"),
    /** Correction §2.1 — 4 lanes per tube (8-lane corridor, 4+4). */
    lanesPerTube: fact(4, false, '8-lane corridor, 4+4 ⟨VERIFY⟩'),
    method: fact('NATM drill-and-blast', false),
    crossPassageSpacing_m: fact(300, false, '⟨VERIFY count + spacing⟩'),
    depthBelowLake_ft: fact('500–600', false, '⟨VERIFY lake + depth⟩'),
    ventilation: fact('Saccardo nozzle / jet fan', false, '⟨VERIFY which⟩'),
    /** Correction §2.4 — reported first for Indian road tunnels. */
    fireSuppression: fact(
      'High-pressure water-mist system + fire-resistant cladding',
      false,
      '⟨VERIFY — reported first for Indian road tunnels⟩'
    ),
    // display value stays neutral; the ⟨VERIFY⟩ badge itself flags the gap
    breakthroughDate: fact('date pending', false, 'per-tube breakthrough dates ⟨VERIFY⟩'),
  },

  viaducts: {
    count: fact(2, false, '⟨VERIFY⟩'),
    viaduct1_m: fact(790, false, '⟨VERIFY⟩'),
    viaduct2_m: fact(650, false, '⟨VERIFY cable-stayed⟩'),
    pylonHeight_m: fact(182, false, "⟨VERIFY 'tallest pylon'⟩"),
    deckHeight_m: fact('100+', false, '⟨VERIFY⟩'),
    method: fact('Balanced cantilever + form travelers + stay cables', false),
  },

  records: [
    fact('Widest road tunnel in India (~23.75 m)', false, '⟨VERIFY wording + source⟩'),
    fact('Among longest expressway tunnels in India (~8.92 km)', false, '⟨VERIFY⟩'),
    fact('Tunnel beneath the Lonavala/Tungarli lake region', false, '⟨VERIFY⟩'),
    fact("One of India's tallest bridge pylons (~182 m)", false, '⟨VERIFY⟩'),
  ],

  contractor: {
    name: 'Navayuga Engineering Company Ltd',
    hq: 'Hyderabad, India',
    group: 'Navayuga Group',
    sectors: ['Tunnels', 'Bridges', 'Highways', 'Ports & Marine', 'Irrigation', 'Hydropower'],
    verified: false,
    note: '⟨VERIFY leadership + portfolio⟩',
  },

  credits: {
    line: 'Owner: MSRDC · Package 1 tunnels: Navayuga Engineering · Package 2 viaducts: Afcons Infrastructure',
    disclaimer:
      'This experience is representational; geometry is illustrative, not survey-accurate. Figures pending source verification.',
  },
} as const;

export type ProjectData = typeof projectData;

/** Resolve a dot-path ("tunnels.width_m") into a Fact. Throws on bad paths so
 *  a typo in a HUD binding fails loudly in dev instead of rendering blanks. */
export function resolveFact(path: string): Fact<string | number> {
  const parts = path.split('.');
  let node: unknown = projectData;
  for (const p of parts) {
    if (node == null || typeof node !== 'object' || !(p in (node as Record<string, unknown>))) {
      throw new Error(`projectData: unknown fact path "${path}"`);
    }
    node = (node as Record<string, unknown>)[p];
  }
  const f = node as Fact<string | number>;
  if (typeof f !== 'object' || f === null || !('value' in f) || !('verified' in f)) {
    throw new Error(`projectData: path "${path}" does not resolve to a Fact`);
  }
  return f;
}
