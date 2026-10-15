import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { nodeIndex } from '../../data/brainWorldData'
import { glow, std } from '../materials'
import { createParticles } from '../particles'
import { paintingTexture, qrTexture, radialGlowTexture } from '../textures'
import { globalUniforms } from '../uniforms'
import { beginArea, figure, flatRing } from './common'

// 好きなこと / ものづくり — the brightest spot, in the middle of the brain.

const GOLD = '#ffd86a'

function glassMaterial(color: THREE.ColorRepresentation) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), vV)), 2.0);
        gl_FragColor = vec4(uColor * (0.9 + f * 2.6), 0.2 + f * 0.65);
      }
    `,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  })
}

function textPlate(text: string, color: string) {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#16122a'
  ctx.beginPath()
  ctx.roundRect(0, 0, 256, 128, 22)
  ctx.fill()
  ctx.strokeStyle = color
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.roundRect(8, 8, 240, 112, 16)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.font = '700 78px Outfit, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 70)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function buildMaking() {
  const A = beginArea('making')
  const { group } = A

  /* ------------------------------------------------------------ plateau */
  const marble = std('#eeeae4', { roughness: 0.42, metalness: 0.05 })
  const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(1.74, 1.84, 0.24, 72), marble)
  tier1.position.y = 0.12
  const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.14, 0.16, 64), marble)
  tier2.position.y = 0.32
  group.add(tier1, tier2)
  const r1 = flatRing(1.79, 0.022, GOLD, 2.6)
  r1.position.y = 0.245
  const r2 = flatRing(1.11, 0.018, GOLD, 2.6)
  r2.position.y = 0.405
  group.add(r1, r2)
  // inlay ring on tier 1
  const inlay = flatRing(1.45, 0.008, '#fff4c9', 1.8)
  inlay.position.y = 0.242
  group.add(inlay)
  // front steps
  for (let i = 0; i < 2; i++) {
    const h = 0.08 * (i + 1)
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.56, h, 0.14), marble)
    s.position.set(0, h / 2, 1.98 - i * 0.12)
    group.add(s)
  }

  /* ------------------------------------------------- ものづくり (pedestal + bulb) */
  const mono = A.item('monozukuri', 0, 0.4, 0)
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.34, 48), std('#f7f3ea', { roughness: 0.35 }))
  pedestal.position.y = 0.17
  mono.add(pedestal)
  const turntable = new THREE.Group()
  turntable.position.y = 0.34
  mono.add(turntable)
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.04, 48), std('#c9a24a', { metalness: 0.9, roughness: 0.25 }))
  disc.position.y = 0.02
  turntable.add(disc)
  for (let i = 0; i < 12; i++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.06), glow(GOLD, 3))
    const a = (i / 12) * Math.PI * 2
    tick.position.set(Math.cos(a) * 0.28, 0.045, Math.sin(a) * 0.28)
    tick.rotation.y = -a
    turntable.add(tick)
  }

  const bulb = new THREE.Group()
  bulb.position.y = 1.2
  mono.add(bulb)
  const glass = glassMaterial('#ffe9a8')
  const bulbGlass = new THREE.Mesh(new THREE.SphereGeometry(0.34, 40, 28), glass)
  bulbGlass.renderOrder = 8
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.2, 32, 1, true), glass)
  neck.position.y = -0.36
  neck.renderOrder = 8
  bulb.add(bulbGlass, neck)
  // screw base (lathe)
  const prof: THREE.Vector2[] = []
  for (let i = 0; i <= 10; i++) prof.push(new THREE.Vector2(0.15 + (i % 2 ? 0.012 : 0), -0.46 - i * 0.018))
  prof.push(new THREE.Vector2(0.06, -0.66))
  prof.push(new THREE.Vector2(0.0, -0.67))
  const base = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), std('#d7b25a', { metalness: 1, roughness: 0.3 }))
  bulb.add(base)
  const filament = new THREE.Mesh(new THREE.TorusKnotGeometry(0.1, 0.014, 96, 8, 2, 5), glow('#fff0b3', 8))
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), glow('#fff7dc', 9))
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), glow('#ffcf5a', 0.9, { additive: true, opacity: 0.35 }))
  const aura = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: radialGlowTexture('rgba(255,214,120,1)', 'rgba(255,190,80,0)'), color: new THREE.Color(1.4, 1.2, 0.8), blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55, toneMapped: false }),
  )
  aura.scale.setScalar(2.1)
  aura.userData.fx = true
  bulb.add(filament, core, halo, aura)
  const bulbLight = new THREE.PointLight('#ffe2a8', 7, 6, 1.7)
  bulb.add(bulbLight)

  // orbiting rings with tiny "works" riding on them
  const orbits: THREE.Group[] = []
  const works = [
    { geo: new THREE.BoxGeometry(0.07, 0.07, 0.07), col: '#ff6fd8' },
    { geo: new THREE.SphereGeometry(0.045, 16, 12), col: '#58b6ff' },
    { geo: new THREE.ConeGeometry(0.045, 0.09, 12), col: '#7de1b0' },
    { geo: new THREE.TorusGeometry(0.035, 0.014, 8, 20), col: '#af8cff' },
    { geo: new THREE.OctahedronGeometry(0.05), col: '#ff9a57' },
  ]
  ;[
    { r: 0.62, tilt: 0.45, yaw: 0.2 },
    { r: 0.78, tilt: -0.35, yaw: 1.4 },
  ].forEach((o, k) => {
    const g = new THREE.Group()
    g.rotation.set(o.tilt, o.yaw, 0)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(o.r, 0.006, 6, 128), glow(GOLD, 2.2))
    ring.rotation.x = Math.PI / 2
    ring.userData.fx = true
    g.add(ring)
    const spin = new THREE.Group()
    g.add(spin)
    works.forEach((w, i) => {
      if ((i + k) % 2 && k === 1) return
      const m = new THREE.Mesh(w.geo, std(w.col, { roughness: 0.35, emissive: w.col, emissiveIntensity: 0.6 }))
      const a = (i / works.length) * Math.PI * 2 + k
      m.position.set(Math.cos(a) * o.r, 0, Math.sin(a) * o.r)
      spin.add(m)
    })
    g.userData.spin = spin
    bulb.add(g)
    orbits.push(g)
  })

  const sparks = createParticles({
    mode: 'rise',
    count: 110,
    color: GOLD,
    intensity: 3,
    size: 0.055,
    origin: new THREE.Vector3(0, 0.45, 0),
    radius: 1.15,
    height: 2.8,
    speed: 0.12,
    swirl: 2.2,
    spread: -0.4,
    seed: 3,
  })
  group.add(sparks)

  /* --------------------------------------------------------- 前期60 tower */
  const tower = A.item('term60', -1.22, 0.24, 0.92)
  const towerBase = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.06, 0.5, 2, 0.02), std('#2a2440', { roughness: 0.5 }))
  towerBase.position.y = 0.03
  tower.add(towerBase)
  const blockGeo = new THREE.BoxGeometry(0.36, 0.082, 0.085)
  const glowAttr = new THREE.InstancedBufferAttribute(new Float32Array(60), 1)
  blockGeo.setAttribute('aGlow', glowAttr)
  const blockMat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 })
  blockMat.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aGlow;\nvarying float vGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;')
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGlow;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vGlow * 2.6;')
  }
  const blocks = new THREE.InstancedMesh(blockGeo, blockMat, 60)
  const palette = ['#ff6fd8', '#58b6ff', '#ff9a57', '#7de1b0', '#af8cff', '#ffd86a']
  const dummy = new THREE.Object3D()
  const col = new THREE.Color()
  for (let i = 0; i < 60; i++) {
    const layer = Math.floor(i / 4)
    const k = i % 4
    const along = (k - 1.5) * 0.09
    const twist = layer * 0.09
    dummy.position.set(0, 0.06 + 0.041 + layer * 0.089, 0)
    dummy.rotation.set(0, (layer % 2 ? Math.PI / 2 : 0) + twist, 0)
    dummy.translateZ(along)
    dummy.updateMatrix()
    blocks.setMatrixAt(i, dummy.matrix)
    col.set(palette[(layer + k) % palette.length]).lerp(new THREE.Color('#ffffff'), 0.18)
    blocks.setColorAt(i, col)
  }
  blocks.castShadow = true
  blocks.receiveShadow = true
  tower.add(blocks)
  const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), glow(GOLD, 4))
  crown.position.y = 0.06 + 15 * 0.089 + 0.16
  tower.add(crown)
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshBasicMaterial({ map: textPlate('60', GOLD), toneMapped: false }))
  plate.position.set(0, 0.11, 0.26)
  plate.rotation.x = -0.35
  tower.add(plate)

  /* ------------------------------------------------------------ QR gate */
  const qrUrl = nodeIndex.get('qr')!.node.url!
  const gate = A.item('qr', 1.22, 0.24, 0.92)
  gate.rotation.y = -0.18
  const gateBase = new THREE.Mesh(new RoundedBoxGeometry(0.82, 0.07, 0.3, 2, 0.02), std('#2a2440', { roughness: 0.5 }))
  gateBase.position.y = 0.035
  gate.add(gateBase)
  const goldMetal = std('#d9b45c', { metalness: 1, roughness: 0.28 })
  for (const x of [-0.34, 0.34]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.86, 0.09), goldMetal)
    post.position.set(x, 0.5, 0)
    gate.add(post)
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 10, 40, Math.PI), goldMetal)
  arch.position.y = 0.93
  gate.add(arch)
  const archGlow = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.01, 6, 40, Math.PI), glow(GOLD, 3.2))
  archGlow.position.y = 0.93
  gate.add(archGlow)
  // portal veil
  const veilMat = new THREE.ShaderMaterial({
    uniforms: { uTime: globalUniforms.uTime },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec2 vUv;
      void main(){
        vec2 p = vUv - 0.5;
        float r = length(p * vec2(1.0, 0.6));
        float a = atan(p.y, p.x);
        float swirl = 0.5 + 0.5 * sin(a * 3.0 + r * 18.0 - uTime * 2.0);
        vec3 col = mix(vec3(1.0, 0.75, 0.3), vec3(1.0, 0.95, 0.8), swirl) * (1.2 + swirl);
        gl_FragColor = vec4(col, (0.18 + 0.25 * swirl) * smoothstep(0.55, 0.1, r));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2), veilMat)
  veil.position.set(0, 0.68, -0.03)
  veil.userData.fx = true
  gate.add(veil)
  const panel = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.48, 0.03, 2, 0.02), std('#141020'))
  panel.position.set(0, 0.6, 0.02)
  gate.add(panel)
  const qr = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.42),
    new THREE.MeshBasicMaterial({ map: qrTexture(qrUrl), color: new THREE.Color(1.6, 1.45, 1.2), toneMapped: false }),
  )
  qr.position.set(0, 0.6, 0.037)
  gate.add(qr)
  const gateSparks = createParticles({
    mode: 'rise',
    count: 30,
    color: '#fff1c2',
    intensity: 3,
    size: 0.04,
    origin: new THREE.Vector3(0, 0.1, 0),
    radius: 0.42,
    height: 1.2,
    speed: 0.25,
    seed: 8,
  })
  gate.add(gateSparks)

  /* ------------------------------------------------------- workbenches */
  const wood = std('#b98b5e', { roughness: 0.7 })
  const bench = (x: number, z: number, ry: number) => {
    const b = new THREE.Group()
    b.position.set(x, 0.24, z)
    b.rotation.y = ry
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.035, 0.3), wood)
    top.position.y = 0.2
    b.add(top)
    for (const [lx, lz] of [
      [-0.24, -0.11],
      [0.24, -0.11],
      [-0.24, 0.11],
      [0.24, 0.11],
    ]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.03), wood)
      leg.position.set(lx, 0.1, lz)
      b.add(leg)
    }
    group.add(b)
    return b
  }
  const b1 = bench(-0.95, -1.12, 0.5)
  // mini robot
  const robot = new THREE.Group()
  robot.position.set(-0.1, 0.22, 0)
  const rb = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.1, 0.09, 2, 0.02), std('#9fb4d9', { metalness: 0.6, roughness: 0.3 }))
  rb.position.y = 0.06
  const rh = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.08, 0.08, 2, 0.02), std('#c8d6ef', { metalness: 0.5, roughness: 0.3 }))
  rh.position.y = 0.15
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.014, 0.005), glow('#3ff2ff', 3))
  eye.position.set(0, 0.155, 0.041)
  const ant = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), glow('#ff6fd8', 3))
  ant.position.y = 0.22
  robot.add(rb, rh, eye, ant)
  b1.add(robot)
  const tool = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), std('#ff9a57'))
  tool.rotation.z = Math.PI / 2
  tool.position.set(0.15, 0.23, 0.04)
  b1.add(tool)

  const b2 = bench(0.95, -1.12, -0.5)
  const easel = new THREE.Group()
  easel.position.set(0.04, 0.22, 0)
  const legMat = std('#7a5638')
  for (const lx of [-0.07, 0.07]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.3, 0.014), legMat)
    l.position.set(lx, 0.14, 0)
    l.rotation.x = -0.15
    easel.add(l)
  }
  const canvasMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.16, 0.01),
    [legMat, legMat, legMat, legMat, std('#ffffff', { map: paintingTexture(), roughness: 0.8 }), legMat],
  )
  canvasMesh.position.set(0, 0.2, 0.03)
  canvasMesh.rotation.x = -0.15
  easel.add(canvasMesh)
  b2.add(easel)

  // a maker at work
  const maker = figure('#ffd86a')
  maker.position.set(-0.55, 0.24, -0.82)
  maker.rotation.y = 2.4
  group.add(maker)

  /* ------------------------------------------------------------- labels */
  A.label('making', group, new THREE.Vector3(0, 0.18, 2.02), 0.32)
  A.label('monozukuri', mono, new THREE.Vector3(0, 1.65, 0), 0.22)
  A.label('term60', tower, new THREE.Vector3(0, 1.62, 0), 0.22)
  A.label('qr', gate, new THREE.Vector3(0, 1.32, 0), 0.22)

  /* ---------------------------------------------------------- animation */
  const glowArr = glowAttr.array as Float32Array
  A.onUpdate((t) => {
    turntable.rotation.y = t * 0.5
    bulb.position.y = 1.2 + Math.sin(t * 1.2) * 0.05
    bulb.rotation.y = t * 0.25
    filament.rotation.y = -t * 0.8
    const flicker = 1 + Math.sin(t * 7.3) * 0.03 + Math.sin(t * 13.1) * 0.02
    bulbLight.intensity = 7 * flicker
    aura.material.opacity = 0.5 + Math.sin(t * 1.7) * 0.08
    halo.scale.setScalar(1 + Math.sin(t * 2) * 0.06)
    orbits.forEach((o, i) => {
      ;(o.userData.spin as THREE.Group).rotation.y = t * (i ? -0.35 : 0.5)
    })
    // a glow wave climbing the 60-block tower
    const head = (t * 5.5) % 26
    for (let i = 0; i < 60; i++) {
      const layer = Math.floor(i / 4)
      const d = layer - head
      glowArr[i] = 0.12 + Math.exp(-(d * d) / 3) * 0.9
    }
    glowAttr.needsUpdate = true
    crown.rotation.y = t * 1.5
    crown.position.y = 0.06 + 15 * 0.089 + 0.16 + Math.sin(t * 2) * 0.02
    robot.rotation.y = Math.sin(t * 0.8) * 0.5
    ant.scale.setScalar(1 + Math.sin(t * 6) * 0.3)
  })

  return A.finish()
}
