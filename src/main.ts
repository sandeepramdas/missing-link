/**
 * Boot: capability gate → App (WebGL experience) or Fallback (static
 * narrative). Reduced-motion users and no-WebGL2 devices get the complete
 * story; capable reduced-motion users get an explicit opt-in (PRD §7.2).
 */
import './styles/main.css';

function hasWebGL2(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const webgl2 = hasWebGL2();
/** QA switch: ?fallback forces the static narrative on any device. */
const forceFallback = new URLSearchParams(location.search).has('fallback');

async function bootApp(reduced: boolean): Promise<void> {
  const [{ ScrollEngine }, { SceneDirector }, { HUD }, { buildSectionList }, { hudStore, track }] =
    await Promise.all([
      import('./core/ScrollEngine'),
      import('./core/SceneDirector'),
      import('./ui/HUD'),
      import('./sections/index'),
      import('./core/HUDBridge'),
    ]);

  const canvas = document.getElementById('stage-canvas') as HTMLCanvasElement;
  const trackEl = document.getElementById('scroll-track') as HTMLElement;
  const hudRoot = document.getElementById('hud-root') as HTMLElement;

  const scroll = new ScrollEngine(trackEl);
  const director = new SceneDirector(canvas, scroll, reduced);
  const sections = buildSectionList();
  director.addSections(sections);
  new HUD(hudRoot, (t) => scroll.seekTo(t), sections.map((s) => ({ id: s.id, t: s.range[0] })));

  // wire scroll velocity into HUD store lazily via director frame loop
  void hudStore;
  director.start();
  if (import.meta.env.DEV || new URLSearchParams(location.search).has('debug')) {
    (window as unknown as Record<string, unknown>).__ml = { director, scroll };
  }

  const loader = document.getElementById('loader');
  if (loader) {
    const ring = loader.querySelector('#loader-ring') as SVGPathElement | null;
    if (ring) ring.style.strokeDashoffset = '0';
    // grey-box has no network-bound assets — resolve on next frame
    requestAnimationFrame(() => {
      loader.classList.add('done');
      track('hero_loaded', true);
    });
  }
}

async function bootFallback(): Promise<void> {
  const { mountFallback } = await Promise.all([import('./fallback/StaticNarrative')]).then(
    (m) => m[0]
  );
  const trackEl = document.getElementById('scroll-track') as HTMLElement;
  const canvas = document.getElementById('stage-canvas') as HTMLElement;
  trackEl.style.display = 'none';
  canvas.style.display = 'none';
  document.getElementById('loader')?.classList.add('done');
  const root = document.getElementById('fallback') as HTMLElement;
  mountFallback(root, {
    canPlay3D: webgl2,
    onPlay3D: () => {
      root.hidden = true;
      root.replaceChildren();
      trackEl.style.display = '';
      canvas.style.display = '';
      void bootApp(true); // keep camera noise off — the user opted in from reduced-motion
      window.scrollTo(0, 0);
    },
  });
}

if (!webgl2 || reducedMotion || forceFallback) void bootFallback();
else void bootApp(false);
