/**
 * Sky — gradient dome (zenith → horizon). The single biggest "natural light"
 * win over a flat background color: aerials read as open air, horizons glow.
 * The SceneDirector lerps uTop/uBottom per scene mood (day / tunnel / golden).
 */
import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry } from 'three';

export class Sky {
  readonly mesh: Mesh;
  private uTop: { value: Color };
  private uBottom: { value: Color };

  constructor() {
    this.uTop = { value: new Color(0x7fb2d9) };
    this.uBottom = { value: new Color(0xe4eef4) };
    const mat = new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uTop: this.uTop, uBottom: this.uBottom },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop;
        uniform vec3 uBottom;
        varying vec3 vDir;
        void main() {
          // horizon-weighted blend with a soft shoulder so the horizon glows
          float h = clamp(vDir.y, 0.0, 1.0);
          float k = pow(1.0 - h, 2.2);
          gl_FragColor = vec4(mix(uTop, uBottom, k), 1.0);
        }`,
    });
    this.mesh = new Mesh(new SphereGeometry(2400, 24, 12), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
    this.mesh.position.set(650, 0, 0); // centred on the alignment midpoint
  }

  /** damped colour drive from the director's grade loop */
  lerpTo(top: Color, bottom: Color, k: number): void {
    this.uTop.value.lerp(top, k);
    this.uBottom.value.lerp(bottom, k);
  }
}
