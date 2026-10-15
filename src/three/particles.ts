import * as THREE from 'three'
import { globalUniforms } from './uniforms'
import { mulberry32 } from './utils'

// GPU-animated point particles. Motion is computed entirely in the vertex shader
// from time + per-particle seeds, so they cost nothing on the CPU.

export type ParticleMode = 'fall' | 'rise' | 'float' | 'static'

export interface ParticleOptions {
  mode: ParticleMode
  count: number
  color: THREE.ColorRepresentation
  /** brightness multiplier (>1 blooms) */
  intensity?: number
  /** world-space size */
  size: number
  opacity?: number
  additive?: boolean
  /** fall / float: spawn box */
  boxMin?: THREE.Vector3
  boxMax?: THREE.Vector3
  /** rise: emitter origin, radius, height */
  origin?: THREE.Vector3
  radius?: number
  height?: number
  /** cycles per second */
  speed?: number
  /** rise: outward spread over life */
  spread?: number
  /** rise: size growth over life */
  grow?: number
  /** rise: swirl radians over life */
  swirl?: number
  seed?: number
  /** soft (gaussian) vs crisp disc */
  softness?: number
}

const MODES: Record<ParticleMode, number> = { fall: 0, rise: 1, float: 2, static: 3 }

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelScale;
  uniform float uSize;
  uniform vec3 uBoxMin;
  uniform vec3 uBoxMax;
  uniform vec3 uOrigin;
  uniform float uRadius;
  uniform float uHeight;
  uniform float uSpeed;
  uniform float uSpread;
  uniform float uGrow;
  uniform float uSwirl;
  attribute vec4 aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float life = 0.0;
    float size = uSize * (0.6 + aSeed.z * 0.8);
    #if MODE == 0
      life = fract(uTime * uSpeed + aSeed.w);
      p = mix(uBoxMin, uBoxMax, aSeed.xyz);
      p.y = mix(uBoxMax.y, uBoxMin.y, life);
      p.x += sin(uTime * 0.9 + aSeed.w * 23.0) * 0.06;
      p.z += cos(uTime * 0.7 + aSeed.x * 19.0) * 0.06;
      vAlpha = smoothstep(0.0, 0.12, life) * smoothstep(1.0, 0.82, life);
    #elif MODE == 1
      life = fract(uTime * uSpeed + aSeed.w);
      float a = aSeed.x * 6.28318 + life * uSwirl;
      float r = sqrt(aSeed.y) * uRadius + life * uSpread;
      p = uOrigin + vec3(cos(a) * r, life * uHeight * (0.7 + aSeed.z * 0.6), sin(a) * r);
      vAlpha = sin(life * 3.14159);
      size *= 1.0 + life * uGrow;
    #elif MODE == 2
      p = mix(uBoxMin, uBoxMax, aSeed.xyz);
      p += vec3(
        sin(uTime * 0.31 + aSeed.w * 31.0),
        sin(uTime * 0.23 + aSeed.x * 17.0),
        cos(uTime * 0.27 + aSeed.y * 23.0)
      ) * 0.18;
      vAlpha = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 1.7 + aSeed.w * 40.0));
    #else
      vAlpha = 1.0;
    #endif
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = size * uPixelScale / max(0.001, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uSoftness;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = 1.0 - smoothstep(1.0 - uSoftness, 1.0, d);
    a *= a;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a * vAlpha * uOpacity);
  }
`

export function createParticles(o: ParticleOptions): THREE.Points {
  const rnd = mulberry32(o.seed ?? 1)
  const geo = new THREE.BufferGeometry()
  const seeds = new Float32Array(o.count * 4)
  for (let i = 0; i < seeds.length; i++) seeds[i] = rnd()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(o.count * 3), 3))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
  const mat = new THREE.ShaderMaterial({
    defines: { MODE: MODES[o.mode] },
    uniforms: {
      uTime: globalUniforms.uTime,
      uPixelScale: globalUniforms.uPixelScale,
      uSize: { value: o.size },
      uColor: { value: new THREE.Color(o.color).multiplyScalar(o.intensity ?? 1) },
      uOpacity: { value: o.opacity ?? 1 },
      uSoftness: { value: o.softness ?? 1 },
      uBoxMin: { value: o.boxMin ?? new THREE.Vector3() },
      uBoxMax: { value: o.boxMax ?? new THREE.Vector3(1, 1, 1) },
      uOrigin: { value: o.origin ?? new THREE.Vector3() },
      uRadius: { value: o.radius ?? 0.2 },
      uHeight: { value: o.height ?? 1 },
      uSpeed: { value: o.speed ?? 0.2 },
      uSpread: { value: o.spread ?? 0 },
      uGrow: { value: o.grow ?? 0 },
      uSwirl: { value: o.swirl ?? 0 },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    toneMapped: false,
  })
  const pts = new THREE.Points(geo, mat)
  pts.frustumCulled = false
  pts.renderOrder = 5
  pts.userData.fx = true
  return pts
}
