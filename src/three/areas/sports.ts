import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import { glow, std } from '../materials'
import { createParticles } from '../particles'
import { courtTexture } from '../textures'
import { globalUniforms } from '../uniforms'
import { mulberry32 } from '../utils'
import { beginArea, figure, flatRing, pineTree } from './common'

// スポーツ — snowy slope, basketball court and a night-game ballpark.

const ORANGE = '#ff9a57'

function trailMaterial(color: THREE.ColorRepresentation, speed = 0.6) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: globalUniforms.uTime, uColor: { value: new THREE.Color(color) }, uSpeed: { value: speed } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uColor; uniform float uSpeed; varying vec2 vUv;
      void main(){
        float dash = step(0.45, fract(vUv.x * 28.0 - uTime * uSpeed * 4.0));
        float fade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
        gl_FragColor = vec4(uColor * 2.2, (0.25 + 0.55 * dash) * fade);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
}

function mountain(radius: number, height: number, seed: number) {
  const geo = new THREE.ConeGeometry(radius, height, 11, 6).toNonIndexed()
  geo.translate(0, height / 2, 0)
  const noise = createNoise3D(mulberry32(seed))
  const pos = geo.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    if (v.y > 0.01 && v.y < height - 0.01) {
      const n = noise(v.x * 2.2, v.y * 2.2, v.z * 2.2)
      const k = 1 + n * 0.16
      v.x *= k
      v.z *= k
      v.y += noise(v.x * 3 + 5, v.y, v.z * 3) * 0.06
    }
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  const colors = new Float32Array(pos.count * 3)
  const snow = new THREE.Color('#f2f6ff')
  const rock = new THREE.Color('#4a5072')
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i += 3) {
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3
    const n = noise(x * 4, y * 4, 1.3)
    c.copy(y / height + n * 0.18 > 0.5 ? snow : rock)
    for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (i + k) * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }))
}

export function buildSports() {
  const A = beginArea('sports')
  const { group } = A

  /* --------------------------------------------------------- snowboard */
  const snowboard = A.item('snowboard', -1.2, 0, -1.5)
  const H = 1.95
  const R = 1.0
  const peak = mountain(R, H, 5)
  snowboard.add(peak)
  const peak2 = mountain(0.62, 1.15, 9)
  peak2.position.set(0.85, 0, -0.45)
  snowboard.add(peak2)
  const snowBase = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.3, 0.05, 40), std('#e8eefc', { roughness: 0.8 }))
  snowBase.position.set(0.15, 0.025, -0.05)
  snowboard.add(snowBase)
  ;[
    [-0.95, 0.55, 0.9],
    [-0.6, 0.85, 0.75],
    [0.85, 0.55, 0.85],
    [1.15, 0.2, 0.7],
    [0.35, 0.95, 0.65],
  ].forEach(([x, z, s]) => {
    const t = pineTree(s, true)
    t.position.set(x, 0.05, z)
    snowboard.add(t)
  })
  // rider path: a descending spiral on the camera-facing side of the slope
  const ridePts: THREE.Vector3[] = []
  for (let i = 0; i <= 40; i++) {
    const s = i / 40
    const y = 0.08 + (1 - s) * (H * 0.72)
    const r = R * (1 - y / H) * 1.16 + 0.05
    const th = 0.15 * Math.PI + s * 0.95 * Math.PI
    ridePts.push(new THREE.Vector3(Math.cos(th) * r * -1, y, Math.sin(th) * r))
  }
  const rideCurve = new THREE.CatmullRomCurve3(ridePts)
  const trail = new THREE.Mesh(new THREE.TubeGeometry(rideCurve, 120, 0.012, 6), trailMaterial('#bfe8ff', 0.4))
  trail.userData.fx = true
  snowboard.add(trail)
  const rider = new THREE.Group()
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.055), std('#ff5a5a', { roughness: 0.4 }))
  const riderFig = figure('#ff9a57', 0.85)
  riderFig.rotation.y = Math.PI / 2
  riderFig.rotation.z = 0.15
  rider.add(board, riderFig)
  snowboard.add(rider)
  const snow = createParticles({
    mode: 'fall',
    count: 170,
    color: '#ffffff',
    intensity: 1.5,
    size: 0.045,
    boxMin: new THREE.Vector3(-1.4, 0.1, -1.3),
    boxMax: new THREE.Vector3(1.6, 2.6, 1.2),
    speed: 0.12,
    seed: 21,
  })
  snowboard.add(snow)

  /* --------------------------------------------------------- basketball */
  const bb = A.item('basketball', 0.78, 0, -0.52)
  bb.rotation.y = -0.32
  const court = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.76), [
    std('#b98a5a'),
    std('#b98a5a'),
    std('#ffffff', { map: courtTexture(), roughness: 0.5 }),
    std('#b98a5a'),
    std('#b98a5a'),
    std('#b98a5a'),
  ])
  court.position.y = 0.025
  bb.add(court)
  const border = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.02, 0.82), glow(ORANGE, 1.8))
  border.position.y = 0.01
  bb.add(border)
  const hoops: THREE.Vector3[] = []
  for (const side of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.46, 8), std('#3a3f52', { metalness: 0.7 }))
    pole.position.set(side * 0.72, 0.23, 0)
    const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.15, 0.22), std('#ffffff', { roughness: 0.3, emissive: '#ffffff', emissiveIntensity: 0.4 }))
    boardMesh.position.set(side * 0.7, 0.44, 0)
    const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 6, 24), glow('#ff6a2a', 2.6))
    rimMesh.rotation.x = Math.PI / 2
    rimMesh.position.set(side * 0.64, 0.4, 0)
    bb.add(pole, boardMesh, rimMesh)
    hoops.push(rimMesh.position.clone())
  }
  const shooter = figure('#ff5a5a')
  shooter.position.set(-0.1, 0.05, 0.06)
  shooter.rotation.y = Math.PI / 2
  const defender = figure('#ffffff')
  defender.position.set(0.22, 0.05, -0.08)
  defender.rotation.y = -Math.PI / 2
  bb.add(shooter, defender)
  const shotStart = new THREE.Vector3(-0.06, 0.3, 0.06)
  const shotEnd = hoops[1].clone().add(new THREE.Vector3(0, 0.03, 0))
  const shotCurve = new THREE.QuadraticBezierCurve3(shotStart, new THREE.Vector3(0.3, 1.05, 0.03), shotEnd)
  const shotTrail = new THREE.Mesh(new THREE.TubeGeometry(shotCurve, 60, 0.008, 6), trailMaterial(ORANGE))
  shotTrail.userData.fx = true
  bb.add(shotTrail)
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), std('#ff7a2a', { roughness: 0.6, emissive: '#ff5a1a', emissiveIntensity: 0.4 }))
  bb.add(ball)
  const courtLight = new THREE.PointLight(ORANGE, 2.5, 2.4, 1.6)
  courtLight.position.set(0, 0.9, 0)
  bb.add(courtLight)

  /* ----------------------------------------------------------- baseball */
  const home = new THREE.Vector3(0.18, 0, 1.72)
  const base = A.item('baseball', home.x, 0, home.z)
  const FR = 1.5
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(FR, FR, 0.06, 48, 1, false, (3 * Math.PI) / 4, Math.PI / 2), std('#3f9a5c', { roughness: 0.8 }))
  grass.position.y = 0.03
  base.add(grass)
  const stripes = new THREE.Mesh(new THREE.CylinderGeometry(FR * 0.7, FR * 0.7, 0.062, 48, 1, false, (3 * Math.PI) / 4, Math.PI / 2), std('#4aab68', { roughness: 0.8 }))
  stripes.position.y = 0.031
  base.add(stripes)
  const infield = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.066, 4), std('#c08a55', { roughness: 0.9 }))
  infield.position.set(0, 0.033, -0.42)
  base.add(infield)
  const infieldGrass = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.068, 4), std('#3f9a5c', { roughness: 0.8 }))
  infieldGrass.position.set(0, 0.034, -0.42)
  base.add(infieldGrass)
  const white = std('#ffffff', { roughness: 0.4 })
  for (const [x, z] of [
    [0, 0],
    [0.42, -0.42],
    [0, -0.84],
    [-0.42, -0.42],
  ]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.02, 0.045), white)
    b.position.set(x, 0.075, z)
    b.rotation.y = Math.PI / 4
    base.add(b)
  }
  const mound = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.04, 16), std('#c08a55'))
  mound.position.set(0, 0.08, -0.42)
  base.add(mound)
  for (const s of [-1, 1]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.01, FR), white)
    line.position.set((s * FR) / 2 / Math.SQRT2, 0.065, -FR / 2 / Math.SQRT2)
    line.rotation.y = s * (Math.PI / 4)
    base.add(line)
  }
  const fence = new THREE.Mesh(
    new THREE.CylinderGeometry(FR, FR, 0.12, 48, 1, true, (3 * Math.PI) / 4, Math.PI / 2),
    std('#1f4d36', { side: THREE.DoubleSide, roughness: 0.7 }),
  )
  fence.position.y = 0.09
  base.add(fence)
  const fenceTop = new THREE.Mesh(new THREE.TorusGeometry(FR, 0.008, 6, 48, Math.PI / 2), glow('#ffd86a', 2.4))
  fenceTop.rotation.x = Math.PI / 2
  fenceTop.rotation.z = Math.PI / 4
  fenceTop.position.y = 0.15
  base.add(fenceTop)
  // night-game light towers
  const lamps: THREE.Mesh[] = []
  for (const [x, z] of [
    [-1.1, -0.95],
    [1.1, -0.95],
    [0, -1.7],
  ]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.95, 8), std('#9aa0b8', { metalness: 0.8 }))
    pole.position.set(x, 0.475, z)
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.11, 0.03), glow('#fff4d6', 3.2))
    panel.position.set(x, 0.98, z)
    // face the infield and tilt down a little
    panel.rotation.order = 'YXZ'
    panel.rotation.y = Math.atan2(0 - x, -0.5 - z)
    panel.rotation.x = 0.45
    base.add(pole, panel)
    lamps.push(panel)
  }
  const batter = figure('#ffffff')
  batter.position.set(0.07, 0.06, 0.02)
  const pitcher = figure('#ff5a5a')
  pitcher.position.set(0, 0.09, -0.42)
  pitcher.rotation.y = Math.PI
  const fielder = figure('#ff5a5a')
  fielder.position.set(-0.55, 0.06, -1.0)
  const fielder2 = figure('#ff5a5a')
  fielder2.position.set(0.6, 0.06, -0.95)
  base.add(batter, pitcher, fielder, fielder2)
  const hrStart = new THREE.Vector3(0, 0.15, 0)
  const hrEnd = new THREE.Vector3(-0.35, 0.25, -1.75)
  const hrCurve = new THREE.QuadraticBezierCurve3(hrStart, new THREE.Vector3(-0.2, 1.7, -0.9), hrEnd)
  const hrTrail = new THREE.Mesh(new THREE.TubeGeometry(hrCurve, 80, 0.008, 6), trailMaterial('#fff4d6', 0.5))
  hrTrail.userData.fx = true
  base.add(hrTrail)
  const hrBall = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), glow('#ffffff', 3))
  base.add(hrBall)

  const sportsLight = new THREE.PointLight(ORANGE, 4, 4.5, 1.8)
  sportsLight.position.set(0.2, 1.5, 0.5)
  group.add(sportsLight)
  const zone = flatRing(0.18, 0.01, ORANGE, 2)
  zone.position.set(home.x, 0.07, home.z)
  group.add(zone)

  /* ------------------------------------------------------------- labels */
  A.label('sports', group, new THREE.Vector3(-0.15, 1.35, 0.15), 0.75)
  A.label('snowboard', snowboard, new THREE.Vector3(0, H + 0.05, 0), 0.18)
  A.label('basketball', bb, new THREE.Vector3(0.2, 1.0, 0), 0.15)
  A.label('baseball', base, new THREE.Vector3(-0.2, 1.05, -0.8), 0.2)

  /* ---------------------------------------------------------- animation */
  const tmp = new THREE.Vector3()
  const tan = new THREE.Vector3()
  A.onUpdate((t) => {
    // snowboarder
    const s = (t * 0.11) % 1
    rideCurve.getPointAt(s, tmp)
    rideCurve.getTangentAt(s, tan)
    rider.position.copy(tmp)
    rider.rotation.y = Math.atan2(-tan.z, tan.x)
    rider.rotation.z = Math.sin(t * 3) * 0.1
    const fade = Math.min(1, s * 12, (1 - s) * 12)
    rider.scale.setScalar(Math.max(0.001, fade))
    // basketball shot
    const c = (t * 0.45) % 1
    if (c < 0.75) {
      shotCurve.getPoint(c / 0.75, tmp)
      ball.position.copy(tmp)
    } else {
      const k = (c - 0.75) / 0.25
      ball.position.set(shotEnd.x, shotEnd.y - k * 0.32, shotEnd.z)
    }
    shooter.position.y = 0.05 + Math.max(0, Math.sin(c * Math.PI * 2)) * 0.06 * (c < 0.3 ? 1 : 0)
    defender.position.z = -0.08 + Math.sin(t * 2) * 0.08
    // home run
    const h = (t * 0.28) % 1
    hrCurve.getPoint(h, tmp)
    hrBall.position.copy(tmp)
    hrBall.scale.setScalar(Math.min(1, (1 - h) * 8) + 0.001)
    batter.rotation.y = h < 0.08 ? -h * 20 : -1.6 + Math.min(1.6, (h - 0.08) * 6)
    lamps.forEach((l, i) => l.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.03))
  })

  return A.finish()
}
