import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import { glow, std } from '../materials'
import { createParticles } from '../particles'
import { scrollTexture } from '../textures'
import { globalUniforms } from '../uniforms'
import { mulberry32 } from '../utils'
import { beginArea, roundTree } from './common'

// アニメ (NARUTO) — a hidden ninja village on a cliff, told through mood rather
// than characters: gate, scroll, swirl emblem, shuriken and leaves in the wind.

const PURPLE = '#af8cff'
const VERMILION = '#e0452c'
const SWIRL = '#ff8a3d'
const TOP = 1.25

const frontZ = (x: number) => 1.15 - 0.85 * (x / 2.6) ** 2

function cliffGeometry() {
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= 40; i++) {
    const x = -2.6 + (i / 40) * 5.2
    pts.push(new THREE.Vector2(x, -frontZ(x)))
  }
  ;[
    [2.75, -0.3],
    [2.3, -1.2],
    [1.4, -1.7],
    [0, -1.86],
    [-1.4, -1.7],
    [-2.3, -1.2],
    [-2.75, -0.3],
  ].forEach(([x, z]) => pts.push(new THREE.Vector2(x, -z)))
  const shape = new THREE.Shape(pts)
  const geo = new THREE.ExtrudeGeometry(shape, { depth: TOP, bevelEnabled: false, steps: 5, curveSegments: 4 })
  geo.rotateX(-Math.PI / 2)
  const noise = createNoise3D(mulberry32(12))
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    if (y < TOP - 1e-3) {
      const k = 0.13 * (0.4 + 0.6 * (y / TOP))
      pos.setXYZ(i, x + noise(x * 1.7, y * 2.2, z * 1.7) * k, y, z + noise(x * 1.7 + 7, y * 2.2, z * 1.7 + 3) * k)
    }
  }
  geo.computeVertexNormals()
  return geo
}

function swirlGeometry() {
  const pts: THREE.Vector3[] = []
  const turns = 2.3
  for (let i = 0; i <= 160; i++) {
    const s = i / 160
    const th = s * turns * Math.PI * 2
    const r = 0.03 + s * 0.36
    pts.push(new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r, 0))
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 0.026, 8)
}

function shurikenGeometry() {
  const s = new THREE.Shape()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 2
    const r = i % 2 ? 0.05 : 0.17
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    i ? s.lineTo(x, y) : s.moveTo(x, y)
  }
  s.closePath()
  const hole = new THREE.Path()
  hole.absarc(0, 0, 0.025, 0, Math.PI * 2, true)
  s.holes.push(hole)
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 })
  g.center()
  return g
}

function leafGeometry() {
  const s = new THREE.Shape()
  s.moveTo(0, -0.045)
  s.quadraticCurveTo(0.03, 0, 0, 0.045)
  s.quadraticCurveTo(-0.03, 0, 0, -0.045)
  return new THREE.ShapeGeometry(s, 6)
}

function streakMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color('#e8dcff').multiplyScalar(2.2) } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; uniform vec3 uColor; varying vec2 vUv;
      void main(){ gl_FragColor = vec4(uColor, uOpacity * pow(vUv.x, 2.0) * (1.0 - abs(vUv.y - 0.5) * 2.0)); }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
}

function waterfallMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: globalUniforms.uTime },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec2 vUv;
      float hash(float n){ return fract(sin(n) * 43758.5453); }
      void main(){
        float col = floor(vUv.x * 9.0);
        float flow = fract(vUv.y * 3.0 + uTime * (1.2 + hash(col) * 0.8) + hash(col + 3.0));
        float streak = smoothstep(0.0, 0.5, flow) * smoothstep(1.0, 0.6, flow);
        vec3 c = mix(vec3(0.35, 0.7, 1.0), vec3(1.2, 1.4, 1.6), streak);
        float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
        gl_FragColor = vec4(c, (0.45 + 0.4 * streak) * edge);
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
}

export function buildAnime() {
  const A = beginArea('anime')
  const { group } = A
  const rnd = mulberry32(55)

  /* ------------------------------------------------------------- cliff */
  const cliff = new THREE.Mesh(cliffGeometry(), [
    std('#2e5a46', { roughness: 0.9, flat: true }),
    std('#4a3f66', { roughness: 0.92, flat: true }),
  ])
  group.add(cliff)

  // stone steps up the front
  const stoneMat = std('#8b86a3', { roughness: 0.85 })
  const STEPS = 8
  for (let i = 0; i < STEPS; i++) {
    const h = ((i + 1) / STEPS) * TOP
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.42, h, 0.11), stoneMat)
    s.position.set(0, h / 2, frontZ(0) + 0.07 + (STEPS - 1 - i) * 0.1)
    group.add(s)
  }

  // houses with red roofs + a pagoda
  const wall = std('#eadfca', { roughness: 0.8 })
  const roofMat = std('#c8452f', { roughness: 0.6, flat: true })
  const house = (x: number, z: number, s: number) => {
    const g = new THREE.Group()
    g.position.set(x, TOP, z)
    g.scale.setScalar(s)
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.28, 16), wall)
    b.position.y = 0.14
    const r = new THREE.Mesh(new THREE.ConeGeometry(0.27, 0.16, 16), roofMat)
    r.position.y = 0.36
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), glow('#ffcf8a', 2.2))
    w.position.set(0, 0.16, 0.211)
    g.add(b, r, w)
    group.add(g)
  }
  house(-1.75, -0.05, 1)
  house(-1.05, -0.8, 0.9)
  house(-0.35, -1.35, 0.8)
  house(1.85, 0.05, 0.95)
  house(0.45, -1.35, 0.75)
  const pagoda = new THREE.Group()
  pagoda.position.set(1.2, TOP, -0.85)
  const darkWood = std('#4b2e2a', { roughness: 0.7 })
  for (let i = 0; i < 3; i++) {
    const w = 0.34 - i * 0.07
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, w), i ? darkWood : wall)
    b.position.y = 0.11 + i * 0.3
    const r = new THREE.Mesh(new THREE.ConeGeometry(w * 0.95, 0.12, 4), roofMat)
    r.rotation.y = Math.PI / 4
    r.position.y = 0.27 + i * 0.3
    pagoda.add(b, r)
  }
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), std('#d9b45c', { metalness: 1 }))
  spire.position.y = 0.98
  pagoda.add(spire)
  group.add(pagoda)

  // trees
  ;[
    [-2.25, 0.25, 0.9],
    [2.25, 0.2, 0.85],
    [-1.6, -1.15, 0.8],
    [1.85, -0.95, 0.75],
    [-0.75, 0.55, 0.65],
    [0.85, 0.5, 0.6],
    [-2.0, -0.7, 0.75],
  ].forEach(([x, z, s]) => {
    const t = roundTree(s, rnd() > 0.5 ? '#3a8f5c' : '#2f7a4f')
    t.position.set(x, TOP, z)
    group.add(t)
  })

  /* --------------------------------------------------- NARUTO (item) */
  const naruto = A.item('naruto', 0, 0, 0)

  // torii-like gate at the top of the steps
  const gate = new THREE.Group()
  gate.position.set(0, TOP, frontZ(0) - 0.3)
  naruto.add(gate)
  const red = std(VERMILION, { roughness: 0.5, emissive: VERMILION, emissiveIntensity: 0.15 })
  const black = std('#24181c', { roughness: 0.6 })
  for (const x of [-0.42, 0.42]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.98, 14), red)
    p.position.set(x, 0.49, 0)
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.06, 14), black)
    foot.position.set(x, 0.03, 0)
    gate.add(p, foot)
  }
  const kasagiShape = new THREE.Shape()
  kasagiShape.moveTo(-0.68, 0.08)
  kasagiShape.quadraticCurveTo(0, -0.02, 0.68, 0.08)
  kasagiShape.lineTo(0.66, 0.13)
  kasagiShape.quadraticCurveTo(0, 0.05, -0.66, 0.13)
  kasagiShape.closePath()
  const kasagi = new THREE.Mesh(new THREE.ExtrudeGeometry(kasagiShape, { depth: 0.12, bevelEnabled: false, curveSegments: 16 }), black)
  kasagi.position.set(0, 0.92, -0.06)
  gate.add(kasagi)
  const shimaki = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.07, 0.1), red)
  shimaki.position.y = 0.96
  const nuki = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.05, 0.06), red)
  nuki.position.y = 0.74
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.03), black)
  plaque.position.set(0, 0.85, 0.03)
  const plaqueGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.1), glow('#ffd86a', 2.4))
  plaqueGlow.position.set(0, 0.85, 0.046)
  gate.add(shimaki, nuki, plaque, plaqueGlow)

  // swirl emblem floating above the gate
  const emblem = new THREE.Group()
  emblem.position.set(0, 2.95, 0.45)
  naruto.add(emblem)
  const swirlMat = glow(SWIRL, 2.7)
  const swirl = new THREE.Mesh(swirlGeometry(), swirlMat)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.026, 8, 80), swirlMat)
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.006, 6, 80), glow(PURPLE, 2.2))
  emblem.add(swirl, ring, ring2)
  const emblemLight = new THREE.PointLight(SWIRL, 3, 3.5, 1.6)
  emblem.add(emblemLight)

  // hanging scroll on the cliff face
  const scroll = new THREE.Group()
  const sx = -1.05
  scroll.position.set(sx, 0.66, frontZ(sx) + 0.14)
  scroll.rotation.y = -Math.atan((-2 * 0.85 * sx) / 2.6 ** 2)
  naruto.add(scroll)
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.8), new THREE.MeshStandardMaterial({ map: scrollTexture(), roughness: 0.9, emissive: '#ffffff', emissiveMap: scrollTexture(), emissiveIntensity: 0.35 }))
  scroll.add(paper)
  const rodMat = std('#5a3424', { roughness: 0.6 })
  const capMat = std('#d9b45c', { metalness: 1, roughness: 0.3 })
  for (const y of [0.42, -0.42]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 12), rodMat)
    rod.rotation.z = Math.PI / 2
    rod.position.y = y
    scroll.add(rod)
    for (const x of [-0.26, 0.26]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), capMat)
      cap.position.set(x, y, 0)
      scroll.add(cap)
    }
  }

  // waterfall on the right of the steps
  const fx = 1.05
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(0.3, TOP + 0.05), waterfallMaterial())
  fall.position.set(fx, TOP / 2, frontZ(fx) + 0.16)
  fall.rotation.y = -Math.atan((-2 * 0.85 * fx) / 2.6 ** 2)
  fall.userData.fx = true
  naruto.add(fall)
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), glow('#5fb8ff', 1.4))
  pool.rotation.x = -Math.PI / 2
  pool.position.set(fx, 0.012, frontZ(fx) + 0.32)
  naruto.add(pool)
  const splash = createParticles({
    mode: 'rise',
    count: 24,
    color: '#dff4ff',
    intensity: 1.4,
    size: 0.06,
    origin: new THREE.Vector3(fx, 0.02, frontZ(fx) + 0.3),
    radius: 0.18,
    height: 0.35,
    speed: 0.6,
    spread: 0.12,
    seed: 41,
  })
  naruto.add(splash)

  // floating shuriken
  const shuGeo = shurikenGeometry()
  const shuMat = std('#3a3f52', { metalness: 0.9, roughness: 0.3 })
  const shuriken = [
    [-1.45, 2.35, 0.65],
    [1.5, 2.15, 0.7],
    [-0.95, 2.95, 0.2],
  ].map(([x, y, z]) => {
    const m = new THREE.Mesh(shuGeo, shuMat)
    m.position.set(x, y, z)
    m.userData.base = y
    naruto.add(m)
    return m
  })

  // paper lanterns along the cliff edge
  const lanterns: THREE.Mesh[] = []
  for (const x of [-1.5, -0.55, 0.55, 1.6]) {
    const z = frontZ(x) - 0.12
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6), black)
    post.position.set(x, TOP + 0.15, z)
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), glow('#ff6a3d', 2.6))
    l.scale.set(1, 1.3, 1)
    l.position.set(x, TOP + 0.34, z)
    group.add(post, l)
    lanterns.push(l)
  }

  /* -------------------------------------------- wind: leaves + streaks */
  const LEAVES = 44
  const leafMat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.6, emissive: '#2b6b3a', emissiveIntensity: 0.5 })
  const leaves = new THREE.InstancedMesh(leafGeometry(), leafMat, LEAVES)
  leaves.userData.fx = true
  leaves.frustumCulled = false
  const leafCols = ['#5fcf6a', '#9be26b', '#3fae5a', '#d7e86a']
  const leafState = Array.from({ length: LEAVES }, (_, i) => {
    leaves.setColorAt(i, new THREE.Color(leafCols[i % leafCols.length]))
    return { phase: rnd(), y: rnd() * 1.6, z: rnd() * 1.4 - 0.4, speed: 0.07 + rnd() * 0.06, spin: 2 + rnd() * 4 }
  })
  group.add(leaves)
  const dummy = new THREE.Object3D()

  const streaks = Array.from({ length: 7 }, () => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.014), streakMaterial())
    m.userData = { phase: rnd() * 1.6, y: 1.6 + rnd() * 1.8, z: 0.3 + rnd() * 0.9, len: 0.6 + rnd() * 0.8, speed: 0.7 + rnd() * 0.5, fx: true }
    group.add(m)
    return m
  })

  const light = new THREE.PointLight(PURPLE, 5, 5, 1.8)
  light.position.set(0, 2.4, 1.2)
  group.add(light)

  /* ------------------------------------------------------------- labels */
  A.label('anime', group, new THREE.Vector3(-1.75, TOP + 0.45, 0.25), 0.75)
  A.label('naruto', naruto, new THREE.Vector3(0, 3.45, 0.45), 0.12)

  /* ---------------------------------------------------------- animation */
  A.onUpdate((t) => {
    swirl.rotation.z = -t * 0.6
    ring2.rotation.z = t * 0.2
    emblem.position.y = 2.95 + Math.sin(t * 0.9) * 0.05
    shuriken.forEach((s, i) => {
      s.rotation.z = t * (3 + i)
      s.rotation.y = Math.sin(t * 0.5 + i) * 0.5
      s.position.y = s.userData.base + Math.sin(t * 1.1 + i * 2) * 0.06
    })
    lanterns.forEach((l, i) => l.scale.set(1, 1.3, 1).multiplyScalar(1 + Math.sin(t * 2 + i) * 0.05))
    leafState.forEach((s, i) => {
      const u = (t * s.speed + s.phase) % 1
      const x = -2.9 + u * 5.8
      const y = 1.45 + s.y + Math.sin(u * Math.PI * 2 + s.phase * 6) * 0.35
      const z = s.z + Math.cos(u * Math.PI * 3 + s.phase * 4) * 0.45
      dummy.position.set(x, y, z)
      dummy.rotation.set(t * s.spin + i, t * s.spin * 0.7, t * 0.9 + s.phase * 6)
      dummy.scale.setScalar(Math.max(0.001, Math.sin(u * Math.PI)) * 1.3)
      dummy.updateMatrix()
      leaves.setMatrixAt(i, dummy.matrix)
    })
    leaves.instanceMatrix.needsUpdate = true
    streaks.forEach((m) => {
      const ud = m.userData
      const u = (t * ud.speed * 0.5 + ud.phase) % 1.6
      const vis = u < 1 ? Math.sin(u * Math.PI) : 0
      m.position.set(-2.4 + u * 4.8, ud.y, ud.z)
      m.scale.x = ud.len
      ;(m.material as THREE.ShaderMaterial).uniforms.uOpacity.value = vis * 0.55
    })
  })

  return A.finish()
}
