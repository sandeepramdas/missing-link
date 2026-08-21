/**
 * AssetRegistry — Draco/KTX2/meshopt glTF loading with procedural fallbacks.
 * Phase 1 (grey-box) uses ONLY procedural builders; the loader plumbing is in
 * place so Phase 2 swaps real models in per-section without touching sections:
 * a section asks for `get(name)` and receives either the loaded glTF scene or
 * the registered procedural fallback. The build must always run (build
 * prompt §1) — a missing/failed asset silently resolves to its fallback.
 */
import { Group, LoadingManager } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

type ProceduralBuilder = () => Group;

export class AssetRegistry {
  readonly manager = new LoadingManager();
  private gltf: GLTFLoader;
  private fallbacks = new Map<string, ProceduralBuilder>();
  private urls = new Map<string, string>();
  private cache = new Map<string, Group>();

  constructor(renderer?: THREE.WebGLRenderer) {
    this.gltf = new GLTFLoader(this.manager);
    const draco = new DRACOLoader(this.manager);
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    this.gltf.setDRACOLoader(draco);
    if (renderer) {
      const ktx2 = new KTX2Loader(this.manager);
      ktx2.setTranscoderPath('/basis/');
      ktx2.detectSupport(renderer);
      this.gltf.setKTX2Loader(ktx2);
    }
  }

  /** Register an asset: optional URL (Phase 2) + mandatory procedural fallback. */
  register(name: string, fallback: ProceduralBuilder, url?: string): void {
    this.fallbacks.set(name, fallback);
    if (url) this.urls.set(name, url);
  }

  async get(name: string): Promise<Group> {
    const cached = this.cache.get(name);
    if (cached) return cached;
    const url = this.urls.get(name);
    if (url) {
      try {
        const g = await this.gltf.loadAsync(url);
        this.cache.set(name, g.scene);
        return g.scene;
      } catch (err) {
        if (import.meta.env.DEV) console.warn(`[assets] ${name} failed, using fallback`, err);
      }
    }
    const builder = this.fallbacks.get(name);
    if (!builder) throw new Error(`AssetRegistry: no fallback registered for "${name}"`);
    const g = builder();
    this.cache.set(name, g);
    return g;
  }

  /** Preload section N+1 while N is active (grey-box: no-op unless URLs set). */
  preload(names: string[]): void {
    for (const n of names) if (this.urls.has(n) && !this.cache.has(n)) void this.get(n);
  }
}

// three's namespace type for the optional renderer arg without importing the class
import type * as THREE from 'three';
