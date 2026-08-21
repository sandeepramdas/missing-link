/**
 * Static narrative fallback — served under prefers-reduced-motion, no-WebGL2
 * or low-tier mobile (PRD §7.2, AC4). The COMPLETE story: one poster block +
 * full copy + stats per scene, native scroll, zero pinning, zero motion.
 * A "Play 3D experience" opt-in appears when the device is actually capable.
 */
import { narrative } from '../data/narrative';
import { resolveFact } from '../data/projectData';
import { track } from '../core/HUDBridge';

const SHOW_VERIFY = import.meta.env.MODE !== 'production';

export function mountFallback(
  root: HTMLElement,
  opts: { canPlay3D: boolean; onPlay3D: () => void }
): void {
  track('reduced_motion_served', true);
  root.hidden = false;
  const frag = document.createDocumentFragment();

  const intro = document.createElement('section');
  intro.className = 'fb-scene';
  intro.innerHTML = `
    <div class="kicker">MSRDC · MUMBAI–PUNE EXPRESSWAY · MISSING LINK</div>
    <h2>Carving Through the Sahyadris</h2>
    <p>The full construction story, scene by scene — no motion required.</p>`;
  if (opts.canPlay3D) {
    const btn = document.createElement('button');
    btn.className = 'fb-cta';
    btn.textContent = 'PLAY 3D EXPERIENCE';
    btn.addEventListener('click', opts.onPlay3D);
    intro.append(btn);
  }
  frag.append(intro);

  for (const scene of narrative) {
    const el = document.createElement('section');
    el.className = 'fb-scene';
    el.id = `fb-${scene.id}`;
    const poster = document.createElement('div');
    poster.className = 'fb-poster';
    poster.dataset.label = scene.kicker;
    poster.setAttribute('role', 'img');
    poster.setAttribute('aria-label', `${scene.title} — concept still`);
    const kicker = document.createElement('div');
    kicker.className = 'kicker';
    kicker.textContent = scene.kicker;
    const h = document.createElement('h2');
    h.textContent = scene.title;
    const p = document.createElement('p');
    p.textContent = scene.body;
    const stats = document.createElement('div');
    stats.className = 'fb-stats';
    for (const s of scene.stats) {
      const fact = resolveFact(s.path);
      const stat = document.createElement('div');
      stat.className = 'fb-stat';
      const b = document.createElement('b');
      b.textContent =
        s.format.replace('{v}', String(fact.value)) +
        (!fact.verified && SHOW_VERIFY ? ' ⟨VERIFY⟩' : '');
      const label = document.createElement('span');
      label.textContent = s.label;
      stat.append(b, label);
      stats.append(stat);
    }
    el.append(poster, kicker, h, p, stats);
    frag.append(el);
  }
  root.append(frag);
}
