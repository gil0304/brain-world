import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { glow, std } from '../materials'
import { createParticles } from '../particles'
import { browserScreenTexture, circuitTexture, phoneScreenTexture, windowsTexture } from '../textures'
import { mulberry32 } from '../utils'
import { beginArea, figure } from './common'

// プログラミング — a miniature dev city on a circuit board.

const BLUE = '#58b6ff'
const CYAN = '#3ff2ff'
const SIZE = 2.9

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

function phone(kind: 'ios' | 'android') {
  const g = new THREE.Group()
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(0.46, 0.92, 0.07, 4, 0.06),
    kind === 'ios'
      ? std('#dfe3ec', { metalness: 0.75, roughness: 0.22 })
      : std('#1f3b30', { metalness: 0.35, roughness: 0.35 }),
  )
  g.add(body)
  const tex = phoneScreenTexture(kind)
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.84),
    new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.25, 1.25, 1.25), toneMapped: false }),
  )
  screen.position.z = 0.036
  g.add(screen)
  if (kind === 'ios') {
    const island = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.06, 4, 8), std('#050507'))
    island.rotation.z = Math.PI / 2
    island.position.set(0, 0.38, 0.04)
    g.add(island)
  } else {
    const cam = new THREE.Mesh(new THREE.CircleGeometry(0.016, 16), std('#050507'))
    cam.position.set(0, 0.39, 0.038)
    g.add(cam)
  }
  return g
}

export function buildProgramming() {
  const A = beginArea('programming')
  const { group } = A
  const rnd = mulberry32(31)

  /* ---------------------------------------------------- circuit platform */
  const { texture: circuit, paths } = circuitTexture()
  circuit.repeat.set(1 / SIZE, 1 / SIZE)
  circuit.offset.set(0.5, 0.5)
  const shape = roundedRectShape(SIZE, SIZE, 0.55)
  const platGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 })
  platGeo.rotateX(-Math.PI / 2)
  const plat = new THREE.Mesh(platGeo, [
    std('#ffffff', { map: circuit, emissiveMap: circuit, emissive: BLUE, emissiveIntensity: 1.1, roughness: 0.45, metalness: 0.2 }),
    std('#0d1838', { roughness: 0.6, metalness: 0.3 }),
  ])
  group.add(plat)
  const edgePts: THREE.Vector3[] = shape.getSpacedPoints(160).map((p) => new THREE.Vector3(p.x, 0.125, -p.y))
  const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(edgePts), new THREE.LineBasicMaterial({ color: new THREE.Color(CYAN).multiplyScalar(2.2), toneMapped: false }))
  edge.userData.fx = true
  group.add(edge)

  // data pulses following the traces drawn on the board
  const top = 0.13
  const polylines = paths.map((pl) => pl.map(([u, v]) => new THREE.Vector3((u - 0.5) * SIZE, top, (v - 0.5) * SIZE)))
  const lengths = polylines.map((pl) => {
    const cum = [0]
    for (let i = 1; i < pl.length; i++) cum.push(cum[i - 1] + pl[i].distanceTo(pl[i - 1]))
    return cum
  })
  const PULSES = 34
  const pulses = createParticles({ mode: 'static', count: PULSES, color: CYAN, intensity: 3.5, size: 0.07, seed: 4 })
  group.add(pulses)
  const pulseState = Array.from({ length: PULSES }, (_, i) => ({ path: i % polylines.length, off: rnd(), speed: 0.35 + rnd() * 0.5 }))
  const pulsePos = pulses.geometry.attributes.position as THREE.BufferAttribute

  /* --------------------------------------------------- WebS — server tower */
  const webs = A.item('webs', -0.72, 0.12, -0.62)
  const unitMat = std('#18223f', { metalness: 0.6, roughness: 0.35 })
  const ledA = glow('#7dff9a', 3, { shared: false })
  const ledB = glow('#3ff2ff', 3, { shared: false })
  for (let i = 0; i < 5; i++) {
    const u = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.27, 0.52, 2, 0.02), unitMat)
    u.position.y = 0.14 + i * 0.29
    webs.add(u)
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.025, 0.01), glow(BLUE, 2.6))
    strip.position.set(-0.03, 0.14 + i * 0.29, 0.262)
    webs.add(strip)
    for (let k = 0; k < 3; k++) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.01), (i + k) % 2 ? ledA : ledB)
      led.position.set(0.18 + k * 0.0, 0.14 + i * 0.29 + (k - 1) * 0.06, 0.262)
      if (k === 1) led.position.x = 0.2
      webs.add(led)
    }
  }
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 8), std('#c9d3ea', { metalness: 0.9, roughness: 0.25 }))
  antenna.position.y = 1.6
  webs.add(antenna)
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), glow(CYAN, 4))
  tip.position.y = 1.82
  webs.add(tip)
  const signals = [0, 1, 2].map((i) => {
    const m = glow(CYAN, 2.4, { transparent: true, shared: false })
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 64), m)
    r.rotation.x = Math.PI / 2
    r.position.y = 1.82
    r.userData.phase = i / 3
    r.userData.fx = true
    webs.add(r)
    return r
  })

  /* --------------------------------------------------- WebD — big monitor */
  const webd = A.item('webd', 0.72, 0.12, -0.66)
  webd.rotation.y = -0.18
  const dark = std('#10131f', { metalness: 0.5, roughness: 0.35 })
  const standBase = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.04, 0.26, 2, 0.015), dark)
  standBase.position.y = 0.02
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.44, 0.05), dark)
  neck.position.set(0, 0.24, -0.04)
  const bezel = new THREE.Mesh(new RoundedBoxGeometry(1.12, 0.72, 0.06, 3, 0.03), dark)
  bezel.position.y = 0.78
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.04, 0.64),
    new THREE.MeshBasicMaterial({ map: browserScreenTexture(), color: new THREE.Color(1.3, 1.3, 1.3), toneMapped: false }),
  )
  screen.position.set(0, 0.78, 0.032)
  webd.add(standBase, neck, bezel, screen)
  const cards = ['#ff6fd8', '#ffd86a', '#7de1b0'].map((c, i) => {
    const card = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.14, 0.015, 2, 0.02), std('#ffffff', { emissive: c, emissiveIntensity: 1.2, roughness: 0.4 }))
    card.userData.base = new THREE.Vector3(i === 1 ? 0.68 : -0.66 + i * 1.32, 0.5 + i * 0.32, 0.18)
    webd.add(card)
    return card
  })

  /* ----------------------------------------------------------- phones */
  const iphone = A.item('iphone', -0.62, 0.12, 0.66)
  const ip = phone('ios')
  ip.position.y = 0.52
  ip.rotation.x = -0.1
  iphone.add(ip)
  const ipStand = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 32), std('#e8ebf2', { metalness: 0.4, roughness: 0.3 }))
  ipStand.position.y = 0.025
  iphone.add(ipStand)
  const ipRing = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.008, 6, 48), glow('#ffffff', 2.2))
  ipRing.rotation.x = Math.PI / 2
  ipRing.position.y = 0.05
  iphone.add(ipRing)

  const android = A.item('android', 0.62, 0.12, 0.66)
  const ad = phone('android')
  ad.position.y = 0.52
  ad.rotation.x = -0.1
  android.add(ad)
  const adStand = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 32), std('#1d3a2e', { metalness: 0.3, roughness: 0.4 }))
  adStand.position.y = 0.025
  android.add(adStand)
  const adRing = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.008, 6, 48), glow('#3ddc84', 2.4))
  adRing.rotation.x = Math.PI / 2
  adRing.position.y = 0.05
  android.add(adRing)
  // little droid head peeking over the phone
  const droid = new THREE.Group()
  droid.position.set(0, 1.0, 0)
  const green = std('#3ddc84', { roughness: 0.45 })
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.13, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), green)
  const eyeMat = std('#0b1a12')
  for (const x of [-0.05, 0.05]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), eyeMat)
    eye.position.set(x, 0.06, 0.11)
    droid.add(eye)
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.08, 6), green)
    ant.position.set(x * 1.4, 0.15, 0)
    ant.rotation.z = -x * 6
    droid.add(ant)
  }
  droid.add(dome)
  android.add(droid)

  /* ------------------------------------------------------ city fillers */
  const winTex = windowsTexture()
  const towers: [number, number, number, number][] = [
    [-1.12, -1.12, 0.26, 0.75],
    [1.15, -1.15, 0.24, 0.95],
    [-1.18, 0.02, 0.22, 0.48],
    [1.2, 0.0, 0.22, 0.58],
    [0.02, -1.2, 0.3, 0.38],
    [0.0, 0.05, 0.18, 0.22],
  ]
  for (const [x, z, w, h] of towers) {
    const b = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, w),
      std('#ffffff', { map: winTex, emissiveMap: winTex, emissive: '#9fd8ff', emissiveIntensity: 1.3, roughness: 0.4, metalness: 0.3 }),
    )
    b.position.set(x, 0.12 + h / 2, z)
    group.add(b)
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.05, 0.02, w * 1.05), glow(BLUE, 2))
    roof.position.set(x, 0.12 + h + 0.01, z)
    group.add(roof)
  }
  const dev = figure('#58b6ff')
  dev.position.set(0.05, 0.12, 0.25)
  dev.rotation.y = -0.4
  group.add(dev)

  const light = new THREE.PointLight(BLUE, 5, 4.5, 1.8)
  light.position.set(0, 1.6, 0.4)
  group.add(light)

  /* ------------------------------------------------------------- labels */
  A.label('programming', group, new THREE.Vector3(0, 1.75, -0.15), 0.85)
  A.label('webs', webs, new THREE.Vector3(0, 1.9, 0), 0.15)
  A.label('webd', webd, new THREE.Vector3(0, 1.16, 0), 0.18)
  A.label('iphone', iphone, new THREE.Vector3(0, 1.0, 0), 0.15)
  A.label('android', android, new THREE.Vector3(0, 1.2, 0), 0.12)

  /* ---------------------------------------------------------- animation */
  A.onUpdate((t) => {
    pulseState.forEach((p, i) => {
      const pl = polylines[p.path]
      const cum = lengths[p.path]
      const total = cum[cum.length - 1]
      const d = ((t * p.speed + p.off * total) % total + total) % total
      let k = 1
      while (k < cum.length - 1 && cum[k] < d) k++
      const seg = (d - cum[k - 1]) / Math.max(1e-6, cum[k] - cum[k - 1])
      const a = pl[k - 1]
      const b = pl[k]
      pulsePos.setXYZ(i, a.x + (b.x - a.x) * seg, top, a.z + (b.z - a.z) * seg)
    })
    pulsePos.needsUpdate = true
    const blink = Math.sin(t * 5) > 0
    ledA.color.set('#7dff9a').multiplyScalar(blink ? 3 : 0.4)
    ledB.color.set('#3ff2ff').multiplyScalar(blink ? 0.5 : 3)
    signals.forEach((s) => {
      const life = (t * 0.45 + s.userData.phase) % 1
      s.scale.setScalar(0.05 + life * 0.55)
      ;(s.material as THREE.MeshBasicMaterial).opacity = (1 - life) * 0.9
    })
    cards.forEach((c, i) => {
      const b = c.userData.base as THREE.Vector3
      c.position.set(b.x, b.y + Math.sin(t * 1.3 + i * 2) * 0.05, b.z)
      c.rotation.y = Math.sin(t * 0.8 + i) * 0.3
    })
    droid.rotation.z = Math.sin(t * 2) * 0.12
    droid.position.y = 1.0 + Math.abs(Math.sin(t * 2)) * 0.03
  })

  return A.finish()
}
