# Missing Link: Carving Through the Sahyadris

Scroll-driven Three.js construction experience for the Mumbai–Pune Expressway
**Missing Link** (MSRDC · Package 1 tunnels: Navayuga Engineering · Package 2
viaducts: Afcons Infrastructure). Scrolling **is** building: 14 cinematic
scenes take raw Sahyadri terrain to opening day.

**Status: Phase 1 (grey-box) complete.** All 14 scenes run on one damped-scrub
master timeline with primitives, the HUD is fully wired to `projectData`, the
fact-verification gate is live, and the reduced-motion fallback carries the
complete story.

## Run

```bash
npm install
npm run dev            # http://localhost:5183
npm run build:staging  # QA build — ⟨VERIFY⟩ badges visible
npm run build          # PRODUCTION — blocked until all bound facts verified
npm run verify-gate    # audit bound facts without building
```

QA switches: `?fallback` forces the static narrative; `?debug` exposes
`window.__ml = { director, scroll }`.

## Deploy

`.github/workflows/deploy-pages.yml` publishes to GitHub Pages on every push to
`main`. It runs **`npm run build:staging`**, not `npm run build` — the accuracy
gate below still blocks production while bound facts are unverified, so the live
site shows a visible `⟨VERIFY⟩` badge beside every unverified figure instead of
presenting it as confirmed. Flip that one line to `npm run build` once all 25
bound facts carry `verified:true` and a source URL.

`vite.config.ts` sets `base: './'` so the bundle is path-agnostic and works from
the Pages project subpath, from `vite preview`, and after a repo rename.

## The accuracy gate (do not remove)

Every number on screen binds to `src/data/projectData.ts` via a fact path
registered in `src/data/bindings.ts`. `scripts/verify-gate.mjs` **fails the
production build** while any bound fact is `verified:false`. To clear a fact:
confirm it against the PRD §0 priority sources (MSRDC, CMO/PIB, NBM&CW, trade
press, TunnelTalk, contractor sites), then set `verified:true` and add the
`source` URL. Never route copy around the gate.

Post-PRD corrections are already applied: 4 lanes/tube (4+4 corridor),
Khalapur toll plaza → Kusgaon endpoints, combined-tunnel stat, water-mist +
fire-cladding beat (S10), and the neutral S12 status variant (no inauguration
claim until `overview.currentStatus` is verified open).

## Architecture

```
src/
├─ main.ts               boot: WebGL2/reduced-motion gate → App or Fallback
├─ core/
│  ├─ SceneDirector.ts   renderer, damped follower, section lifecycle, mood grading
│  ├─ CameraRig.ts       Dolly→Truck→Boom→Head→Camera, damped focusTarget, noise
│  ├─ ScrollEngine.ts    Lenis + one ScrollTrigger, keyboard nav, chip seek
│  ├─ AssetRegistry.ts   glTF/Draco/KTX2 plumbing + procedural fallbacks
│  ├─ QualityManager.ts  GPU tier, silent DPR/particle step-down
│  └─ HUDBridge.ts       zustand store (t, section, stats) + analytics events
├─ world/                Alignment (chainage↔world spine) + Terrain heightfield
├─ sections/             S00…S12 + S04b (Section interface, scrub-safe update)
├─ particles/            pooled point emitters, analytic scrub (reversible)
├─ materials/            greybox kit + Phase-2 shader contracts (shaders.ts)
├─ ui/HUD.ts             stat card, tunnel-profile progress, chainage rail, chips
├─ data/                 projectData (source of truth), bindings, narrative copy
└─ fallback/             static narrative (posters + full copy + stats)
```

Conventions that must survive future phases:

- **1 world unit = 10 m.** Chainage CH 0+000 → 13+300 maps to x 0 → 1330.
- `update(localT)` must be a pure function of localT (scrub both directions).
- No `new` in per-frame code — use `utils/scratch.ts`.
- `box()` stores dimensions in `scale`; progress code multiplies stored dims.
- All text in DOM, never in WebGL.

## Swapping placeholders for real glTF (Phase 2)

Register the model with the same name the section requests:
`assets.register('jumbo', proceduralJumbo, '/models/jumbo.glb')` — sections
receive the loaded scene or the procedural fallback transparently. Pipe models
through `gltf-transform` (Draco + meshopt) and textures through `basisu`
(KTX2, 2K hero / 1K secondary); put transcoders in `public/basis/`.

## Budgets (measured, grey-box)

Draw calls ~29 (≤150 desktop) · ~59k tris (≤3M) · JS ~195 kB gz (≤3.5 MB
initial). QualityManager steps DPR 1.5→1.25→1.0 then halves particles after
2 s under 50 FPS, silently.

## Phase roadmap

1. ✅ Grey-box — story reads end-to-end, HUD wired, gate live.
2. Art pass — terrainTriplanar/rockFace/water shaders (contracts in
   `materials/shaders.ts`), HDRI moods, real glTFs, instanced hero elements,
   GPU particle integration in vertex shaders.
3. Polish — EffectComposer (SSAO, selective bloom, DoF, grain), mobile tuning,
   analytics transport, cross-browser, Lighthouse (a11y ≥95, SEO ≥95),
   fact-check sign-off → production build unlocks.
