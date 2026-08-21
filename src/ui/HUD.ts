/**
 * HUD — all text lives in DOM, never in WebGL (PRD §6.7). Subscribes to
 * hudStore; expensive DOM writes happen only on section change, cheap ones
 * (chainage, %/meters counters) mutate textContent with fixed-width mono
 * formatting so widths never jitter (PRD §6.4).
 */
import gsap from 'gsap';
import { hudStore } from '../core/HUDBridge';
import { narrative, sceneCopyById, type StatBinding } from '../data/narrative';
import { resolveFact } from '../data/projectData';
import { formatChainage } from '../world/Alignment';

const SHOW_VERIFY = import.meta.env.MODE !== 'production';

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text != null) el.textContent = text;
  return el;
}

function verifyBadge(): HTMLElement {
  const b = h('sup', 'hud-verify', '⟨VERIFY⟩');
  b.title = 'Figure pending source verification — blocked from production build';
  return b;
}

interface StatRow {
  valueEl: HTMLElement;
  binding: StatBinding;
  tween?: gsap.core.Tween;
}

export class HUD {
  private root: HTMLElement;
  private kicker: HTMLElement;
  private title: HTMLElement;
  private body: HTMLElement;
  private statList: HTMLElement;
  private statRows: StatRow[] = [];
  private chainageEl: HTMLElement;
  private percentEl: HTMLElement;
  private tunnelFill: SVGRectElement;
  private chips: Map<string, HTMLButtonElement> = new Map();
  private metersPanel: HTMLElement;
  private metersEl: HTMLElement;
  private schematicBars: HTMLElement[] = [];
  private hero: HTMLElement;
  private currentSection = '';
  private lastChainage = -1;
  private lastPercent = -1;
  private lastMeters = -1;

  constructor(mount: HTMLElement, onSeek: (t: number) => void, sectionStarts: { id: string; t: number }[]) {
    this.root = h('div', 'hud');
    this.root.setAttribute('aria-hidden', 'false');

    // ── hero overlay (S0) ─────────────────────────────────────────────
    this.hero = h('div', 'hud-hero');
    const heroKicker = h('div', 'hud-hero-kicker', 'MSRDC · MUMBAI–PUNE EXPRESSWAY · MISSING LINK');
    const heroTitle = h('h1', 'hud-hero-title');
    heroTitle.innerHTML = 'Carving Through<br>the Sahyadris';
    const heroSub = h('p', 'hud-hero-sub', 'Twin basalt tunnels. Soaring valley viaducts. Scroll to build it.');
    const chevron = h('div', 'hud-chevron');
    chevron.innerHTML = '<span></span><span></span>';
    this.hero.append(heroKicker, heroTitle, heroSub, chevron);

    // ── stat card (top-left) ──────────────────────────────────────────
    const card = h('aside', 'hud-card');
    this.kicker = h('div', 'hud-kicker');
    this.title = h('h2', 'hud-title');
    this.body = h('p', 'hud-body');
    this.statList = h('dl', 'hud-stats');
    card.append(this.kicker, this.title, this.body, this.statList);

    // ── tunnel-profile progress (bottom-left) ─────────────────────────
    const prog = h('div', 'hud-progress');
    prog.innerHTML = `
      <svg viewBox="0 0 48 44" width="48" height="44" aria-hidden="true">
        <defs><clipPath id="tunnelClip"><path d="M6 40 L6 22 A18 18 0 0 1 42 22 L42 40 Z"/></clipPath></defs>
        <path d="M6 40 L6 22 A18 18 0 0 1 42 22 L42 40 Z" fill="none" stroke="var(--line-strong)" stroke-width="1.5"/>
        <rect id="tunnelFillRect" x="4" y="44" width="40" height="40" fill="var(--amber)" clip-path="url(#tunnelClip)"/>
      </svg>`;
    const progText = h('div', 'hud-progress-text');
    this.percentEl = h('span', 'hud-mono', '  0%');
    const progLabel = h('span', 'hud-microlabel', 'BUILT');
    progText.append(this.percentEl, progLabel);
    prog.append(progText);
    this.tunnelFill = prog.querySelector('#tunnelFillRect') as unknown as SVGRectElement;

    // ── chainage rail + milestone chips (bottom) ──────────────────────
    const rail = h('nav', 'hud-rail');
    rail.setAttribute('aria-label', 'Construction milestones');
    this.chainageEl = h('div', 'hud-chainage hud-mono', 'CH 0+000');
    const chipTrack = h('div', 'hud-chips');
    for (const scene of narrative) {
      const start = sectionStarts.find((s) => s.id === scene.id);
      if (!start) continue;
      const chip = h('button', 'hud-chip');
      chip.type = 'button';
      chip.textContent = scene.chip;
      chip.addEventListener('click', () => onSeek(start.t + 0.002));
      chipTrack.append(chip);
      this.chips.set(scene.id, chip);
    }
    rail.append(this.chainageEl, chipTrack);

    // ── S5 meters panel + twin-tube schematic (bottom-right) ──────────
    this.metersPanel = h('aside', 'hud-meters');
    const mLabel = h('div', 'hud-microlabel', 'METERS ADVANCED · LONG TUBE');
    this.metersEl = h('div', 'hud-meters-value hud-mono', '   0 m');
    const schematic = h('div', 'hud-schematic');
    schematic.append(h('div', 'hud-microlabel', '4 FACES ADVANCING'));
    for (let i = 0; i < 4; i++) {
      const row = h('div', 'hud-schematic-row');
      const bar = h('div', 'hud-schematic-bar');
      const fill = h('div', 'hud-schematic-fill');
      bar.append(fill);
      row.append(h('span', 'hud-microlabel', ['T1·N', 'T1·S', 'T2·N', 'T2·S'][i]), bar);
      schematic.append(row);
      this.schematicBars.push(fill);
    }
    this.metersPanel.append(mLabel, this.metersEl, schematic);
    this.metersPanel.style.display = 'none';

    this.root.append(this.hero, card, prog, rail, this.metersPanel);
    mount.append(this.root);

    hudStore.subscribe((s) => this.onFrame(s.sectionId, s.percentBuilt, s.chainage_m, s.metersAdvanced, s.t, s.webglFade));
  }

  private onFrame(sectionId: string, percent: number, chainage: number, meters: number, t: number, fade: number): void {
    if (sectionId !== this.currentSection) this.setSection(sectionId);

    const ch = Math.round(chainage / 20) * 20;
    if (ch !== this.lastChainage) {
      this.lastChainage = ch;
      this.chainageEl.textContent = formatChainage(ch);
    }
    if (percent !== this.lastPercent) {
      this.lastPercent = percent;
      this.percentEl.textContent = `${String(percent).padStart(3, ' ')}%`;
      this.tunnelFill.setAttribute('y', String(44 - (40 * percent) / 100));
    }
    if (sectionId === 'S05') {
      const m = Math.round(meters / 10) * 10;
      if (m !== this.lastMeters) {
        this.lastMeters = m;
        this.metersEl.textContent = `${String(m).padStart(4, ' ')} m`;
        const k = m / 8920;
        for (let i = 0; i < 4; i++) {
          this.schematicBars[i].style.transform = `scaleX(${Math.min(1, k * (1 - i * 0.07) + 0.02)})`;
        }
      }
    }
    // hero fades out across S00
    this.hero.style.opacity = String(Math.max(0, 1 - t / 0.045));
    this.hero.style.visibility = t > 0.06 ? 'hidden' : 'visible';
    this.root.style.opacity = String(fade);
  }

  private setSection(id: string): void {
    this.currentSection = id;
    const copy = sceneCopyById.get(id);
    if (!copy) return;
    this.metersPanel.style.display = id === 'S05' ? '' : 'none';
    for (const [cid, chip] of this.chips) chip.classList.toggle('is-active', cid === id);

    this.kicker.textContent = copy.kicker;
    this.title.textContent = copy.title;
    this.body.textContent = copy.body;

    // rebuild stat rows
    for (const r of this.statRows) r.tween?.kill();
    this.statRows = [];
    this.statList.replaceChildren();
    for (const b of copy.stats) {
      const fact = resolveFact(b.path);
      const dt = h('dt', 'hud-stat-label', b.label);
      const dd = h('dd', 'hud-stat-value hud-mono');
      const finalText = b.format.replace('{v}', String(fact.value));
      const row: StatRow = { valueEl: dd, binding: b };
      if (b.countUp && typeof fact.value === 'number') {
        const target = fact.value;
        const width = finalText.length;
        const proxy = { v: 0 };
        const decimals = String(target).includes('.') ? String(target).split('.')[1].length : 0;
        row.tween = gsap.to(proxy, {
          v: target,
          duration: 0.7,
          ease: 'expo.out',
          onUpdate: () => {
            dd.textContent = b.format
              .replace('{v}', proxy.v.toFixed(decimals))
              .padStart(width, ' ');
          },
        });
      } else {
        dd.textContent = finalText;
      }
      if (!fact.verified && SHOW_VERIFY) dd.append(verifyBadge());
      this.statList.append(dt, dd);
      this.statRows.push(row);
    }
    // stat card entrance — expo.out, transform only (no layout shift)
    gsap.fromTo(
      this.statList.parentElement,
      { y: 14, opacity: 0.4 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', overwrite: true }
    );
  }
}
