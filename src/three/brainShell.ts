import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import { globalUniforms } from './uniforms'
import { mulberry32, smoothstep } from './utils'

/**
 * Brain dimensions (world units). The island sits on the y = 0 plane, i.e. the
 * widest cross-section of the brain. The "front" of the brain faces +z (camera).
 */
export const BRAIN = { A: 6.15, UP: 5.6, DOWN: 3.6, FRONT: 7.0, BACK: 7.7 }

/** Radius of the smooth brain envelope in direction d (unit vector). */
function envelope(dx: number, dy: number, dz: number) {
  const b = dy >= 0 ? BRAIN.UP : BRAIN.DOWN
  const c = dz >= 0 ? BRAIN.FRONT : BRAIN.BACK
  let r = 1 / Math.sqrt((dx / BRAIN.A) ** 2 + (dy / b) ** 2 + (dz / c) ** 2)
  // each hemisphere bulges a little on top
  r *= 1 + 0.055 * Math.exp(-((Math.abs(dx) - 0.42) ** 2) / 0.05) * smoothstep(0.0, 0.6, dy)
  // frontal lobe slopes down at the very front, occipital is rounder
  r *= 1 - 0.05 * smoothstep(0.55, 0.95, dz) * smoothstep(-0.2, 0.5, dy)
  // tuck the underside in like the base of the brain
  r *= 1 - 0.08 * smoothstep(-0.2, -0.85, dy) * (1 - Math.abs(dx))
  return r
}

export interface BrainShell {
  group: THREE.Group
  /** sampled silhouette points (local space) used to frame the camera */
  framePoints: THREE.Vector3[]
  setReveal(v: number): void
  uniforms: Record<string, THREE.IUniform>
}

export function createBrainShell(): BrainShell {
  // Poles on ±x so the longitudinal fissure (x = 0 plane) runs through the
  // evenly tessellated "equator" of the sphere.
  const geo = new THREE.SphereGeometry(1, 380, 260)
  geo.rotateZ(Math.PI / 2)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const count = pos.count
  const aM = new Float32Array(count)
  const aF = new Float32Array(count)
  const rnd = mulberry32(2024)
  const n3 = createNoise3D(rnd)
  const warp3 = createNoise3D(rnd)
  const d = new THREE.Vector3()
  const framePoints: THREE.Vector3[] = []

  for (let i = 0; i < count; i++) {
    d.fromBufferAttribute(pos, i).normalize()
    let r = envelope(d.x, d.y, d.z)
    // longitudinal fissure (between hemispheres)
    const fiss = Math.exp(-(d.x * d.x) / (2 * 0.034 * 0.034)) * smoothstep(0.05, 0.42, d.y)
    // world-ish position for noise
    const px = d.x * r
    const py = d.y * r
    const pz = d.z * r
    const wx = warp3(px * 0.16, py * 0.16, pz * 0.16)
    const wy = warp3(px * 0.16 + 31, py * 0.16 + 17, pz * 0.16 - 9)
    const wz = warp3(px * 0.16 - 21, py * 0.16 + 5, pz * 0.16 + 13)
    // gyri: contour lines of a domain-warped noise field
    const f = 0.34
    // mirror x so both hemispheres look like (imperfect) twins
    const sx = Math.abs(px) + 0.4
    const m = n3(sx * f + wx * 0.9, py * f + wy * 0.9, pz * f + wz * 0.9) * 2.4
    const s = Math.abs(m - Math.round(m))
    const sulcus = 1 - smoothstep(0.0, 0.2, s)
    const gyrus = smoothstep(0.2, 0.5, s)
    const depthMask = 1 - fiss
    r += (-0.24 * sulcus + 0.06 * gyrus) * depthMask
    r *= 1 - 0.19 * fiss
    pos.setXYZ(i, d.x * r, d.y * r, d.z * r)
    aM[i] = m
    aF[i] = fiss
    if (i % 97 === 0) framePoints.push(new THREE.Vector3(d.x * r, d.y * r, d.z * r))
  }
  geo.setAttribute('aM', new THREE.BufferAttribute(aM, 1))
  geo.setAttribute('aF', new THREE.BufferAttribute(aF, 1))
  geo.computeVertexNormals()
  geo.computeBoundingSphere()

  const uniforms = {
    uTime: globalUniforms.uTime,
    uReveal: { value: 1 },
    uColorA: { value: new THREE.Color('#d7a6ff') },
    uColorB: { value: new THREE.Color('#6fc9ff') },
    uColorC: { value: new THREE.Color('#ff8fd6') },
    uSide: { value: 1 },
    uBottom: { value: -BRAIN.DOWN },
    uTop: { value: BRAIN.UP },
  }

  const vertexShader = /* glsl */ `
    attribute float aM;
    attribute float aF;
    varying float vM;
    varying float vF;
    varying vec3 vN;
    varying vec3 vView;
    varying vec3 vLocal;
    void main() {
      vM = aM;
      vF = aF;
      vLocal = position;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vN = normalize(mat3(modelMatrix) * normal);
      vView = cameraPosition - wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `
  const fragmentShader = /* glsl */ `
    uniform float uTime;
    uniform float uReveal;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;
    uniform float uSide;
    uniform float uBottom;
    uniform float uTop;
    varying float vM;
    varying float vF;
    varying vec3 vN;
    varying vec3 vView;
    varying vec3 vLocal;
    void main() {
      vec3 N = normalize(vN);
      vec3 V = normalize(vView);
      if (!gl_FrontFacing) N = -N;
      float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);
      float fres = pow(1.0 - ndv, 2.4);

      float h = clamp((vLocal.y - uBottom) / (uTop - uBottom), 0.0, 1.0);
      vec3 base = mix(uColorB, uColorA, smoothstep(0.25, 0.85, h));
      base = mix(base, uColorC, 0.35 * smoothstep(0.2, 1.0, -vLocal.z / 7.0) * smoothstep(0.4, 0.9, h));

      // sulci: crisp contour lines of the interpolated noise field
      float s = abs(vM - floor(vM + 0.5));
      float fw = fwidth(vM);
      float line = 1.0 - smoothstep(fw * 0.6, fw * 0.6 + 0.045, s);
      float fissLine = smoothstep(0.55, 0.95, vF);

      // slow "thought" waves travelling over the cortex
      float w1 = sin(dot(vLocal, vec3(0.32, 0.55, 0.21)) * 0.9 - uTime * 0.8);
      float w2 = sin(dot(vLocal, vec3(-0.41, 0.18, 0.47)) * 1.3 - uTime * 0.55 + 1.7);
      float pulse = pow(max(w1, 0.0), 14.0) + 0.6 * pow(max(w2, 0.0), 18.0);

      vec3 L = normalize(vec3(-0.45, 0.85, 0.55));
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), 70.0);
      float diff = max(dot(N, L), 0.0);

      // keep the face pointing at the camera clear so the diorama reads;
      // folds show up towards the silhouette like engraved glass
      float rimMask = smoothstep(0.05, 0.75, fres);
      float under = mix(0.5, 1.0, smoothstep(-2.2, 0.4, vLocal.y));
      float lineA = line * (0.012 + 0.28 * rimMask + 0.22 * pulse * (0.3 + rimMask));
      float alpha = (0.006 + 0.3 * fres + lineA + fissLine * 0.08 * rimMask + spec * 0.22) * under;
      vec3 col = base * (0.12 + 1.0 * fres)
               + base * line * (0.15 + 1.05 * rimMask + 2.2 * pulse)
               + uColorA * fissLine * 0.45
               + vec3(1.0) * spec * 1.1;
      col *= under;

      // reveal sweep (intro)
      float rv = uReveal * 1.3 - h;
      if (rv < 0.0) discard;
      float edge = 1.0 - smoothstep(0.0, 0.1, rv);
      col += base * edge * 3.0;
      alpha += edge * 0.45;

      gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0) * uSide);
    }
  `

  const makeMat = (side: THREE.Side, sideAlpha: number) =>
    new THREE.ShaderMaterial({
      uniforms: { ...uniforms, uSide: { value: sideAlpha } },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side,
      toneMapped: false,
    })

  const back = new THREE.Mesh(geo, makeMat(THREE.BackSide, 0.42))
  back.renderOrder = 1
  const front = new THREE.Mesh(geo, makeMat(THREE.FrontSide, 1))
  front.renderOrder = 20
  const group = new THREE.Group()
  group.name = 'brain-shell'
  group.add(back, front)
  group.traverse((o) => (o.userData.fx = true))

  return {
    group,
    framePoints,
    uniforms,
    setReveal(v: number) {
      ;(back.material as THREE.ShaderMaterial).uniforms.uReveal.value = v
      ;(front.material as THREE.ShaderMaterial).uniforms.uReveal.value = v
    },
  }
}
