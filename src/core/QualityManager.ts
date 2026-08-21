/**
 * QualityManager — GPU tier detection + silent adaptive quality (PRD §7.1).
 * Rolling FPS < 50 for 2 s → step down: DPR 1.5 → 1.25 → 1.0, then
 * particles ÷2 (postFX/SSAO/shadow steps arrive with the Phase-3 composer).
 * Steps are silent — no UI, no console in prod.
 */
import type { WebGLRenderer } from 'three';
import { track } from './HUDBridge';

export type Tier = 'high' | 'med' | 'low';

export class QualityManager {
  tier: Tier;
  dpr: number;
  particleScale = 1;
  private renderer: WebGLRenderer;
  private acc = 0;
  private frames = 0;
  private slowTime = 0;
  private step = 0;
  private readonly dprLadder: number[];

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer;
    this.tier = detectTier(renderer);
    track(`quality_tier_${this.tier}`, true);
    const maxDpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dprLadder = [maxDpr, Math.min(maxDpr, 1.5), 1.25, 1.0].filter(
      (v, i, a) => a.indexOf(v) === i
    );
    if (this.tier === 'low') this.step = Math.max(0, this.dprLadder.length - 2);
    if (this.tier === 'med') this.step = Math.min(1, this.dprLadder.length - 1);
    this.dpr = this.dprLadder[this.step];
    renderer.setPixelRatio(this.dpr);
    if (this.tier !== 'high') this.particleScale = 0.5;
  }

  /** call once per frame with dt in seconds */
  tick(dt: number): void {
    this.acc += dt;
    this.frames++;
    if (this.acc < 0.5) return;
    const fps = this.frames / this.acc;
    this.acc = 0;
    this.frames = 0;
    if (fps < 50) {
      this.slowTime += 0.5;
      if (this.slowTime >= 2) {
        this.slowTime = 0;
        this.stepDown();
      }
    } else {
      this.slowTime = 0;
    }
  }

  private stepDown(): void {
    if (this.step < this.dprLadder.length - 1) {
      this.step++;
      this.dpr = this.dprLadder[this.step];
      this.renderer.setPixelRatio(this.dpr);
      track('fps_drop_event');
    } else if (this.particleScale > 0.25) {
      this.particleScale *= 0.5;
      track('fps_drop_event');
    }
  }
}

function detectTier(renderer: WebGLRenderer): Tier {
  const gl = renderer.getContext();
  let gpu = '';
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  if (ext) gpu = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
  const mobile = /android|iphone|ipad|mobile/i.test(navigator.userAgent);
  if (/(apple m\d|rtx|radeon pro|geforce)/.test(gpu)) return 'high';
  if (mobile) return /adreno 7|apple/i.test(gpu) ? 'med' : 'low';
  if (/(intel|swiftshader|llvmpipe)/.test(gpu)) return 'med';
  return 'high';
}
