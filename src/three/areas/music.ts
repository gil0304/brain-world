import * as THREE from 'three'
import { glow, std } from '../materials'
import { globalUniforms } from '../uniforms'
import { beginArea, figure, flatRing, lightCone } from './common'

// 音楽 — a tiny live venue with three stages (SUPER BEAVER / tuki. / aespa).

const PINK = '#ff6fd8'
const PURPLE = '#9b6bff'

function equalizerMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: globalUniforms.uTime },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec2 vUv;
      float hash(float n){ return fract(sin(n) * 43758.5453); }
      void main(){
        float bars = 22.0;
        float i = floor(vUv.x * bars);
        float fx = fract(vUv.x * bars);
        float h = 0.25 + 0.6 * abs(sin(uTime * (1.5 + hash(i) * 2.5) + hash(i + 7.0) * 6.0)) * (0.6 + 0.4 * sin(i * 0.5 + uTime));
        float on = step(0.18, fx) * step(fx, 0.82) * step(vUv.y, h);
        float seg = step(0.25, fract(vUv.y * 14.0));
        vec3 col = mix(vec3(0.6, 0.35, 1.0), vec3(1.0, 0.45, 0.85), vUv.y) * 2.4;
        vec3 bg = vec3(0.03, 0.02, 0.07);
        gl_FragColor = vec4(mix(bg, col, on * seg), 1.0);
      }
    `,
    toneMapped: false,
  })
}

function waveRingMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: globalUniforms.uTime, uColor: { value: new THREE.Color(PINK).multiplyScalar(2.2) } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      attribute float aAngle;
      varying float vTop;
      void main(){
        vec3 p = position;
        float a = aAngle;
        float amp = abs(sin(a * 9.0 + uTime * 2.4) * sin(a * 4.0 - uTime * 1.3)) * 0.6
                  + abs(sin(a * 23.0 - uTime * 3.7)) * 0.25;
        vTop = p.y;
        p.y *= 0.03 + amp * 0.28;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying float vTop;
      void main(){ gl_FragColor = vec4(uColor, 0.85 * (1.0 - vTop * 0.6)); }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
}

function noteGeometry() {
  const s = new THREE.Shape()
  s.absellipse(0, 0, 0.06, 0.043, 0, Math.PI * 2, false, -0.35)
  const stem = new THREE.Shape()
  stem.moveTo(0.045, 0.01)
  stem.lineTo(0.062, 0.01)
  stem.lineTo(0.062, 0.24)
  stem.lineTo(0.045, 0.24)
  const flag = new THREE.Shape()
  flag.moveTo(0.06, 0.24)
  flag.quadraticCurveTo(0.14, 0.2, 0.12, 0.1)
  flag.quadraticCurveTo(0.11, 0.17, 0.06, 0.18)
  return new THREE.ShapeGeometry([s, stem, flag], 12)
}

export function buildMusic() {
  const A = beginArea('music')
  const { group } = A

  /* ---------------------------------------------------------- platform */
  const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.76, 0.1, 64), std('#2a1840', { roughness: 0.55, metalness: 0.2 }))
  plat.position.y = 0.05
  group.add(plat)
  const rim = flatRing(1.72, 0.018, PINK, 2.4)
  rim.position.y = 0.1
  group.add(rim)

  // waveform fence around the platform
  const SEG = 256
  const wavePos: number[] = []
  const waveAngle: number[] = []
  const idx: number[] = []
  const R = 1.58
  for (let i = 0; i <= SEG; i++) {
    const a = (i / SEG) * Math.PI * 2
    wavePos.push(Math.cos(a) * R, 0, Math.sin(a) * R, Math.cos(a) * R, 1, Math.sin(a) * R)
    waveAngle.push(a, a)
    if (i < SEG) {
      const k = i * 2
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2)
    }
  }
  const waveGeo = new THREE.BufferGeometry()
  waveGeo.setAttribute('position', new THREE.Float32BufferAttribute(wavePos, 3))
  waveGeo.setAttribute('aAngle', new THREE.Float32BufferAttribute(waveAngle, 1))
  waveGeo.setIndex(idx)
  const wave = new THREE.Mesh(waveGeo, waveRingMaterial())
  wave.position.y = 0.1
  wave.userData.fx = true
  wave.frustumCulled = false
  group.add(wave)

  /* ------------------------------------------ SUPER BEAVER — main stage */
  const sb = A.item('super_beaver', -0.1, 0.1, -0.5)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.2, 0.78), std('#1c1228', { roughness: 0.6 }))
  deck.position.y = 0.1
  sb.add(deck)
  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.02, 0.02), glow(PINK, 3))
  strip.position.set(0, 0.2, 0.39)
  sb.add(strip)
  const metal = std('#9aa0b8', { metalness: 0.85, roughness: 0.35 })
  for (const x of [-0.66, 0.66]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.05, 0.045), metal)
    post.position.set(x, 0.72, -0.32)
    sb.add(post)
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.05), metal)
  beam.position.set(0, 1.25, -0.32)
  sb.add(beam)
  const beamFront = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.04), metal)
  beamFront.position.set(0, 1.25, 0.1)
  sb.add(beamFront)
  for (const x of [-0.66, 0.66]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.46), metal)
    side.position.set(x, 1.25, -0.11)
    sb.add(side)
  }
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 0.52), equalizerMaterial())
  screen.position.set(0, 0.74, -0.3)
  sb.add(screen)
  const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.58, 0.03), std('#0d0a14'))
  screenFrame.position.set(0, 0.74, -0.32)
  sb.add(screenFrame)
  // drums
  const drumMat = std('#e8e4f0', { roughness: 0.4 })
  const kick = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 20), drumMat)
  kick.rotation.x = Math.PI / 2
  kick.position.set(0, 0.29, -0.12)
  sb.add(kick)
  for (const x of [-0.12, 0.12]) {
    const cym = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.006, 20), std('#e6c25a', { metalness: 1, roughness: 0.3 }))
    cym.position.set(x, 0.46, -0.14)
    cym.rotation.z = x > 0 ? -0.2 : 0.2
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.26, 6), metal)
    stand.position.set(x, 0.33, -0.14)
    sb.add(cym, stand)
  }
  // amps
  for (const x of [-0.45, 0.45]) {
    const amp = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.15, 0.1), std('#15111c'))
    amp.position.set(x, 0.275, -0.12)
    const grill = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.1), std('#3a3346', { roughness: 0.9 }))
    grill.position.set(x, 0.275, -0.069)
    sb.add(amp, grill)
  }
  // band
  const vocal = figure('#ff6fd8')
  vocal.position.set(0, 0.2, 0.18)
  const gtr = figure('#ffffff')
  gtr.position.set(-0.36, 0.2, 0.08)
  const bass = figure('#58b6ff')
  bass.position.set(0.36, 0.2, 0.08)
  sb.add(vocal, gtr, bass)
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.2, 6), metal)
  mic.position.set(0, 0.3, 0.26)
  sb.add(mic)
  // spotlights
  const spots: THREE.Mesh[] = []
  for (const [x, c] of [
    [-0.42, PINK],
    [0.42, PURPLE],
    [0, '#ffffff'],
  ] as const) {
    const cone = lightCone(c, 0.22, 1.05, c === '#ffffff' ? 0.8 : 1.4)
    cone.position.set(x, 1.23, 0.1)
    spots.push(cone)
    sb.add(cone)
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.06, 12), glow(c, 2.5))
    head.position.set(x, 1.21, 0.1)
    sb.add(head)
  }
  // speakers
  for (const x of [-0.92, 0.92]) {
    const spk = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.56, 0.24), std('#120e18', { roughness: 0.7 }))
    spk.position.set(x, 0.38, -0.3)
    sb.add(spk)
    for (const [y, r] of [
      [0.52, 0.07],
      [0.3, 0.09],
    ]) {
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.02, 20), std('#2a2433', { roughness: 0.4, metalness: 0.4 }))
      cone.rotation.x = Math.PI / 2
      cone.position.set(x, y, -0.18)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 6, 24), glow(PINK, 2))
      ring.position.set(x, y, -0.17)
      sb.add(cone, ring)
    }
  }

  /* ----------------------------------------------- tuki. — moon stage */
  const tuki = A.item('tuki', -1.0, 0.1, 0.5)
  const tp = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.08, 40), std('#e9e6ff', { roughness: 0.35 }))
  tp.position.y = 0.04
  tuki.add(tp)
  const tring = flatRing(0.33, 0.01, '#fff2c4', 2.2)
  tring.position.y = 0.08
  tuki.add(tring)
  const singer = figure('#fff2c4')
  singer.position.set(0, 0.08, 0)
  tuki.add(singer)
  const moonShape = new THREE.Shape()
  moonShape.absarc(0, 0, 0.24, 0, Math.PI * 2, false)
  const hole = new THREE.Path()
  hole.absarc(0.1, 0.06, 0.2, 0, Math.PI * 2, true)
  moonShape.holes.push(hole)
  const moonGeo = new THREE.ExtrudeGeometry(moonShape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 48 })
  moonGeo.center()
  const moon = new THREE.Mesh(moonGeo, glow('#fff0c0', 2.4))
  moon.position.y = 0.95
  moon.rotation.z = 0.5
  tuki.add(moon)
  const stars: THREE.Mesh[] = []
  const starGeo = new THREE.OctahedronGeometry(0.03)
  ;[
    [0.3, 1.15, 0.05],
    [-0.28, 1.05, 0],
    [0.22, 0.72, 0.1],
    [-0.18, 1.32, -0.05],
    [0.05, 1.38, 0.08],
  ].forEach(([x, y, z]) => {
    const s = new THREE.Mesh(starGeo, glow('#fff6d8', 3.5))
    s.position.set(x, y, z)
    stars.push(s)
    tuki.add(s)
  })
  const moonLight = lightCone('#fff0c0', 0.3, 0.75, 0.6)
  moonLight.position.y = 0.85
  tuki.add(moonLight)

  /* ------------------------------------------- aespa — hologram stage */
  const ae = A.item('aespa', 0.95, 0.1, 0.5)
  const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.39, 0.09, 6), std('#1b2036', { metalness: 0.85, roughness: 0.25 }))
  hex.position.y = 0.045
  ae.add(hex)
  const hexRim = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.012, 6, 6), glow('#7fe8ff', 2.6))
  hexRim.rotation.x = Math.PI / 2
  hexRim.rotation.z = Math.PI / 6
  hexRim.position.y = 0.09
  ae.add(hexRim)
  const holo = lightCone('#8f7bff', 0.34, 0.85, 1.3)
  holo.rotation.x = Math.PI
  holo.position.y = 0.09
  ae.add(holo)
  const crystalGeo = new THREE.OctahedronGeometry(0.15, 0)
  crystalGeo.scale(1, 1.7, 1)
  const crystal = new THREE.Mesh(
    crystalGeo,
    new THREE.MeshStandardMaterial({ color: '#e8eeff', metalness: 1, roughness: 0.08, emissive: '#7a5cff', emissiveIntensity: 0.35, flatShading: true }),
  )
  crystal.position.y = 0.72
  ae.add(crystal)
  const aeRings: THREE.Mesh[] = []
  for (let i = 0; i < 2; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.27 + i * 0.07, 0.005, 6, 64), glow(i ? '#ff8fe9' : '#7fe8ff', 2.6))
    r.position.y = 0.72
    r.rotation.x = Math.PI / 2 + (i ? 0.5 : -0.4)
    aeRings.push(r)
    ae.add(r)
  }

  /* ------------------------------------------------- light pillars, notes */
  const pillars: THREE.MeshBasicMaterial[] = []
  ;[200, 232, 308, 340].forEach((deg, i) => {
    const a = (deg / 180) * Math.PI
    const h = 1.0 + (i % 2) * 0.35
    const mat = glow(i % 2 ? PURPLE : PINK, 2.4, { shared: false })
    pillars.push(mat)
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h, 10), mat)
    p.position.set(Math.cos(a) * 1.5, 0.1 + h / 2, Math.sin(a) * 1.5)
    group.add(p)
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.05, 12), std('#2a2033', { metalness: 0.6 }))
    cap.position.set(Math.cos(a) * 1.5, 0.12, Math.sin(a) * 1.5)
    group.add(cap)
  })

  const ng = noteGeometry()
  const notes = Array.from({ length: 6 }, (_, i) => {
    const mat = glow(i % 2 ? PURPLE : PINK, 2.6, { transparent: true, side: THREE.DoubleSide, shared: false })
    const n = new THREE.Mesh(ng, mat)
    n.userData = { phase: i / 6, x: -1.1 + (i % 3) * 1.05 + (i > 2 ? 0.4 : 0), z: -0.2 + (i % 2) * 0.5, fx: true }
    group.add(n)
    return n
  })

  const musicLight = new THREE.PointLight(PINK, 5, 4.5, 1.8)
  musicLight.position.set(0, 1.6, 0.4)
  group.add(musicLight)

  /* ------------------------------------------------------------- labels */
  A.label('music', group, new THREE.Vector3(0.05, 1.75, -0.2), 0.75)
  A.label('super_beaver', sb, new THREE.Vector3(0, 1.3, -0.1), 0.18)
  A.label('tuki', tuki, new THREE.Vector3(0, 1.3, 0), 0.15)
  A.label('aespa', ae, new THREE.Vector3(0, 1.0, 0), 0.22)

  /* ---------------------------------------------------------- animation */
  A.onUpdate((t) => {
    spots.forEach((s, i) => {
      s.rotation.z = Math.sin(t * 0.9 + i * 2) * 0.35
      s.rotation.x = Math.sin(t * 0.7 + i) * 0.2
    })
    vocal.position.y = 0.2 + Math.abs(Math.sin(t * 4)) * 0.025
    gtr.rotation.z = Math.sin(t * 4) * 0.08
    bass.rotation.z = -Math.sin(t * 4 + 1) * 0.08
    moon.position.y = 0.95 + Math.sin(t * 0.9) * 0.05
    moon.rotation.y = Math.sin(t * 0.4) * 0.4
    stars.forEach((s, i) => s.scale.setScalar(0.6 + 0.6 * Math.abs(Math.sin(t * 1.6 + i * 1.7))))
    crystal.rotation.y = t * 0.9
    crystal.position.y = 0.72 + Math.sin(t * 1.4) * 0.05
    aeRings.forEach((r, i) => (r.rotation.z = t * (i ? -1.2 : 0.9)))
    pillars.forEach((m, i) => {
      const base = new THREE.Color(i % 2 ? PURPLE : PINK)
      const k = 1.4 + 1.6 * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.3))
      m.color.copy(base).multiplyScalar(k)
    })
    notes.forEach((n) => {
      const ud = n.userData
      const life = (t * 0.18 + ud.phase) % 1
      n.position.set(ud.x + Math.sin(life * 6 + ud.phase * 10) * 0.1, 0.5 + life * 1.5, ud.z)
      n.rotation.z = Math.sin(life * 5) * 0.3
      ;(n.material as THREE.MeshBasicMaterial).opacity = Math.sin(life * Math.PI)
      n.scale.setScalar(0.8 + life * 0.5)
    })
    musicLight.intensity = 4 + Math.sin(t * 3) * 1.2
  })

  return A.finish()
}
