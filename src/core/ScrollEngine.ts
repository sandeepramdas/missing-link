/**
 * ScrollEngine — Lenis + GSAP ScrollTrigger, ONE trigger for the whole
 * S0–S12 build (no per-section pins; the stage is position:fixed so there is
 * literally nothing to pin-jank). Scroll writes targetT; SceneDirector runs
 * the damped follower. Native scroll is NEVER modified (PRD §6.7):
 * Lenis smooths, it does not hijack wheel deltas.
 */
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { track } from './HUDBridge';

gsap.registerPlugin(ScrollTrigger);

export class ScrollEngine {
  targetT = 0;
  velocity = 0;
  private lenis: Lenis;
  private trigger: ScrollTrigger;
  private sectionStarts: { id: string; t: number }[] = [];
  private depthFired = new Set<number>();

  constructor(trackEl: HTMLElement) {
    this.lenis = new Lenis({ autoRaf: false, lerp: 0.12 });
    this.lenis.on('scroll', () => {
      this.velocity = this.lenis.velocity;
      ScrollTrigger.update();
    });
    gsap.ticker.add((time) => this.lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    this.trigger = ScrollTrigger.create({
      trigger: trackEl,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        this.targetT = self.progress;
        for (const d of [25, 50, 75, 100]) {
          if (self.progress * 100 >= d && !this.depthFired.has(d)) {
            this.depthFired.add(d);
            track(`scroll_depth_${d}`, true);
          }
        }
      },
    });

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => ScrollTrigger.refresh(), 180);
    });

    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  registerSections(starts: { id: string; t: number }[]): void {
    this.sectionStarts = starts;
  }

  /** Milestone chips / keyboard: tween scroll position to a timeline t.
   *  Tweens the SCROLL TARGET (power2.inOut, 1.2 s) — never the wheel. */
  seekTo(t: number): void {
    const st = this.trigger;
    const y = st.start + (st.end - st.start) * t;
    const proxy = { y: this.lenis.scroll };
    gsap.to(proxy, {
      y,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => this.lenis.scrollTo(proxy.y, { immediate: true }),
    });
  }

  private onKey(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const cur = this.targetT;
    const starts = this.sectionStarts;
    if (starts.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      const next = starts.find((s) => s.t > cur + 1e-4);
      if (next) {
        e.preventDefault();
        this.seekTo(next.t);
      }
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      const prev = [...starts].reverse().find((s) => s.t < cur - 1e-4);
      e.preventDefault();
      this.seekTo(prev ? prev.t : 0);
    }
  }
}
