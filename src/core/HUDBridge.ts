/**
 * HUDBridge — the single seam between WebGL time and the DOM HUD.
 * WebGL never draws text (PRD §6.7); the SceneDirector writes here each frame
 * and UI components subscribe. zustand vanilla store, throttled so HUD DOM
 * work never lands on every RAF tick.
 */
import { createStore } from 'zustand/vanilla';

export interface HUDState {
  t: number; // master timeline position 0..1
  sectionId: string; // "S00".."S12"
  percentBuilt: number; // 0..100, S2→S11 window
  chainage_m: number; // 0..13300
  metersAdvanced: number; // S5 live counter
  velocity: number; // lenis velocity (for FOV kick / HUD damping)
  webglFade: number; // 1 visible → 0 corporate handoff
  setFrame(partial: Partial<HUDState>): void;
}

export const hudStore = createStore<HUDState>((set) => ({
  t: 0,
  sectionId: 'S00',
  percentBuilt: 0,
  chainage_m: 0,
  metersAdvanced: 0,
  velocity: 0,
  webglFade: 1,
  setFrame: (partial) => set(partial),
}));

/** Analytics — PRD §7.6 event names, exactly. Transport is a stub in Phase 1:
 *  pushes to dataLayer when present, else dev console. */
const fired = new Set<string>();
export function track(event: string, once = false): void {
  if (once) {
    if (fired.has(event)) return;
    fired.add(event);
  }
  const w = window as unknown as { dataLayer?: unknown[] };
  if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event });
  else if (import.meta.env.DEV) console.debug('[analytics]', event);
}
