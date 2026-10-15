import * as THREE from 'three'
import { globalUniforms } from './uniforms'
import { mulberry32 } from './utils'

// Deep-space backdrop: gradient + faint nebula, twinkling stars and a glowing
// display base under the floating brain.

const NOISE = /* glsl */ `
  float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float vnoise(vec3 x){
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                   mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                   mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
`

export function createBackground() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: globalUniforms.uTime },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      uniform float uTime;
      ${NOISE}
      void main(){
        vec3 d = normalize(vDir);
        vec3 top = vec3(0.010, 0.014, 0.045);
        vec3 mid = vec3(0.016, 0.012, 0.042);
        vec3 bot = vec3(0.003, 0.004, 0.012);
        vec3 col = mix(bot, mid, smoothstep(-0.7, 0.05, d.y));
        col = mix(col, top, smoothstep(0.05, 0.8, d.y));
        float n1 = fbm(d * 2.2 + vec3(0.0, 0.0, uTime * 0.004));
        float n2 = fbm(d * 3.7 + 7.0);
        col += vec3(0.22, 0.10, 0.42) * pow(n1, 3.2) * 0.26;
        col += vec3(0.05, 0.16, 0.38) * pow(n2, 3.8) * 0.22;
        float g = pow(max(dot(d, normalize(vec3(0.0, 0.25, -1.0))), 0.0), 5.0);
        col += vec3(0.22, 0.13, 0.48) * g * 0.16;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 32), mat)
  mesh.renderOrder = -100
  mesh.frustumCulled = false
  mesh.userData.fx = true
  return mesh
}

export function createStars(count = 2200) {
  const rnd = mulberry32(808)
  const pos = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const u = rnd() * 2 - 1
    const th = rnd() * Math.PI * 2
    const r = Math.sqrt(1 - u * u)
    const R = 300
    pos.set([Math.cos(th) * r * R, u * R, Math.sin(th) * r * R], i * 3)
    seed[i] = rnd()
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: globalUniforms.uTime, uPixelScale: globalUniforms.uPixelScale },
    vertexShader: /* glsl */ `
      attribute float aSeed; uniform float uTime; uniform float uPixelScale; varying float vA; varying float vS;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float s = mix(0.35, 1.25, pow(aSeed, 3.0));
        gl_PointSize = max(1.0, s * uPixelScale / -mv.z);
        vA = (0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.6 + aSeed * 2.0) + aSeed * 60.0))) * mix(0.35, 1.0, aSeed);
        vS = aSeed;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vA; varying float vS;
      void main(){
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = pow(max(0.0, 1.0 - d), 2.0);
        vec3 c = mix(vec3(0.75, 0.8, 1.0), vec3(1.0, 0.85, 0.95), vS);
        gl_FragColor = vec4(c * 1.4, a * vA);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
  const pts = new THREE.Points(geo, mat)
  pts.renderOrder = -90
  pts.frustumCulled = false
  pts.userData.fx = true
  return pts
}

/** Glow pool + slowly rotating rings under the brain, like a display stand. */
export function createPedestal() {
  const group = new THREE.Group()
  group.position.y = -4.75
  const glowMat = new THREE.ShaderMaterial({
    uniforms: { uTime: globalUniforms.uTime },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec2 vUv;
      void main(){
        float r = length(vUv - 0.5) * 2.0;
        float g = pow(max(0.0, 1.0 - r), 2.4);
        float rings = 0.0;
        for (int i = 0; i < 4; i++) {
          float rr = 0.32 + float(i) * 0.14;
          rings += (1.0 - smoothstep(0.0, 0.006, abs(r - rr))) * (0.5 - float(i) * 0.1);
        }
        float a = atan(vUv.y - 0.5, vUv.x - 0.5);
        float ticks = step(0.5, fract(a * 24.0 / 6.2831 + uTime * 0.03)) * (1.0 - smoothstep(0.0, 0.004, abs(r - 0.6)));
        vec3 col = vec3(0.45, 0.32, 0.95) * g * 0.55 + vec3(0.75, 0.65, 1.0) * (rings + ticks * 0.8) * 0.38;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), glowMat)
  plane.rotation.x = -Math.PI / 2
  plane.renderOrder = -50
  group.add(plane)
  group.traverse((o) => (o.userData.fx = true))
  return group
}
