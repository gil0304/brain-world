import * as THREE from 'three'
import { glow, std } from '../materials'
import { createParticles } from '../particles'
import { saunaSignTexture, woodTexture } from '../textures'
import { globalUniforms } from '../uniforms'
import { beginArea, figure, flatRing, roundTree } from './common'

// 趣味 — sauna hut, cold plunge and a quiet "totonoi" deck.

const MINT = '#7de1b0'
const WARM = '#ffb36a'

function waterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: globalUniforms.uTime },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; varying vec2 vUv;
      void main(){
        vec2 p = vUv - 0.5;
        float r = length(p);
        float rip = 0.5 + 0.5 * sin(r * 60.0 - uTime * 3.0);
        rip *= smoothstep(0.5, 0.1, r);
        vec3 deep = vec3(0.05, 0.35, 0.6);
        vec3 shallow = vec3(0.35, 0.95, 1.2);
        vec3 col = mix(deep, shallow, 0.35 + 0.4 * rip);
        col += vec3(1.0) * pow(rip, 8.0) * 0.6;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    toneMapped: false,
  })
}

export function buildHobby() {
  const A = beginArea('hobby')
  const { group } = A

  /* ----------------------------------------------------------- ground */
  const lawn = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.66, 0.08, 64), std('#2f6b4a', { roughness: 0.9 }))
  lawn.position.y = 0.04
  group.add(lawn)
  const rim = flatRing(1.63, 0.016, MINT, 2.2)
  rim.position.y = 0.08
  group.add(rim)
  const plank = woodTexture('#a8714a')
  plank.repeat.set(2, 2)

  /* ------------------------------------------------------ sauna (item) */
  const sauna = A.item('sauna', 0, 0.08, 0)

  // hut
  const hut = new THREE.Group()
  hut.position.set(0.32, 0, -0.5)
  hut.rotation.y = -0.38
  sauna.add(hut)
  const wallTex = woodTexture('#b47a4e')
  wallTex.repeat.set(1.5, 1.2)
  const wall = std('#ffffff', { map: wallTex, roughness: 0.8 })
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.62, 0.76), wall)
  body.position.y = 0.31
  hut.add(body)
  const roofShape = new THREE.Shape()
  roofShape.moveTo(-0.62, 0)
  roofShape.lineTo(0.62, 0)
  roofShape.lineTo(0, 0.4)
  roofShape.closePath()
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 0.96, bevelEnabled: false })
  roofGeo.translate(0, 0, -0.48)
  const roof = new THREE.Mesh(roofGeo, std('#3b2f35', { roughness: 0.75, flat: true }))
  roof.position.y = 0.62
  roof.scale.set(0.95, 1, 1)
  hut.add(roof)
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 1.02), std('#5a4040'))
  ridge.position.y = 1.02
  hut.add(ridge)
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.44, 0.02), std('#6e4630'))
  door.position.set(-0.16, 0.22, 0.385)
  const doorWin = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.13), glow(WARM, 2.8))
  doorWin.position.set(-0.16, 0.3, 0.397)
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), std('#d9b45c', { metalness: 1 }))
  knob.position.set(-0.07, 0.22, 0.4)
  hut.add(door, doorWin, knob)
  const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.14), glow(WARM, 2.4))
  sideWin.position.set(0.25, 0.36, 0.381)
  const sideFrame = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.015), std('#5a3a28'))
  sideFrame.position.set(0.25, 0.36, 0.376)
  hut.add(sideFrame, sideWin)
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshBasicMaterial({ map: saunaSignTexture(), toneMapped: false, color: new THREE.Color(1.15, 1.15, 1.15) }))
  sign.position.set(0, 0.76, 0.49)
  hut.add(sign)
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.34, 12), std('#8a8f9e', { metalness: 0.8, roughness: 0.35 }))
  chimney.position.set(0.28, 0.98, -0.12)
  hut.add(chimney)
  const porch = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.3), std('#ffffff', { map: plank }))
  porch.position.set(0, 0.02, 0.52)
  hut.add(porch)
  const hutLight = new THREE.PointLight(WARM, 3.5, 2.4, 1.6)
  hutLight.position.set(-0.1, 0.4, 0.75)
  hut.add(hutLight)

  // steam from the chimney and the hut
  const steam = createParticles({
    mode: 'rise',
    count: 40,
    color: '#f4f1ff',
    intensity: 1.0,
    size: 0.16,
    opacity: 0.32,
    additive: false,
    origin: new THREE.Vector3(0.28, 1.15, -0.12),
    radius: 0.04,
    height: 1.2,
    speed: 0.16,
    spread: 0.25,
    grow: 2.6,
    swirl: 1.2,
    seed: 13,
  })
  hut.add(steam)

  // cold plunge
  const bath = new THREE.Group()
  bath.position.set(-0.78, 0, 0.18)
  sauna.add(bath)
  const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.34, 0.2, 40, 1, true), std('#a9b2c6', { roughness: 0.5, side: THREE.DoubleSide }))
  tub.position.y = 0.1
  const tubRim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.025, 8, 40), std('#d6dbe6', { roughness: 0.4 }))
  tubRim.rotation.x = Math.PI / 2
  tubRim.position.y = 0.2
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.34, 40), waterMaterial())
  water.rotation.x = -Math.PI / 2
  water.position.y = 0.17
  bath.add(tub, tubRim, water)
  const mist = createParticles({
    mode: 'rise',
    count: 18,
    color: '#bff4ff',
    intensity: 1.0,
    size: 0.14,
    opacity: 0.18,
    additive: false,
    origin: new THREE.Vector3(0, 0.2, 0),
    radius: 0.3,
    height: 0.5,
    speed: 0.1,
    grow: 1.5,
    seed: 17,
  })
  bath.add(mist)
  const bathLight = new THREE.PointLight('#5fd8ff', 1.6, 1.6, 1.6)
  bathLight.position.set(0, 0.5, 0)
  bath.add(bathLight)

  // totonoi deck with two chairs
  const deck = new THREE.Group()
  deck.position.set(0.15, 0, 0.78)
  deck.rotation.y = -0.15
  sauna.add(deck)
  const deckFloor = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.52), std('#ffffff', { map: plank, roughness: 0.75 }))
  deckFloor.position.y = 0.02
  deck.add(deckFloor)
  const chairMat = std('#f3efe6', { roughness: 0.6 })
  const frameMat = std('#6b4a35')
  const chairs: THREE.Group[] = []
  for (const x of [-0.24, 0.24]) {
    const c = new THREE.Group()
    c.position.set(x, 0.04, 0)
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.3), chairMat)
    seat.position.set(0, 0.1, 0.05)
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.2), chairMat)
    back.position.set(0, 0.17, -0.15)
    back.rotation.x = 0.9
    for (const lx of [-0.08, 0.08]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.1, 0.015), frameMat)
      leg.position.set(lx, 0.05, 0.16)
      const leg2 = leg.clone()
      leg2.position.z = -0.08
      c.add(leg, leg2)
    }
    c.add(seat, back)
    deck.add(c)
    chairs.push(c)
  }
  const relaxer = figure('#7de1b0')
  relaxer.rotation.x = -1.2
  relaxer.position.set(0.24, 0.19, 0.08)
  deck.add(relaxer)
  const towel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.12), std('#ffffff'))
  towel.position.set(-0.24, 0.125, 0.08)
  deck.add(towel)

  // lantern
  const lantern = new THREE.Group()
  lantern.position.set(-0.55, 0, -0.62)
  sauna.add(lantern)
  const lpost = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.42, 8), std('#3b2f35'))
  lpost.position.y = 0.21
  const lampMat = glow(WARM, 3, { shared: false })
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.08), lampMat)
  lamp.position.y = 0.47
  const lcap = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.05, 4), std('#3b2f35'))
  lcap.position.y = 0.545
  lcap.rotation.y = Math.PI / 4
  lantern.add(lpost, lamp, lcap)
  const lanternLight = new THREE.PointLight(WARM, 2.2, 1.8, 1.6)
  lanternLight.position.y = 0.5
  lantern.add(lanternLight)

  // stepping stones
  const stone = std('#8e93a6', { roughness: 0.9, flat: true })
  ;[
    [-0.35, 0.55],
    [-0.15, 0.32],
    [-0.45, -0.05],
  ].forEach(([x, z], i) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.03, 7), stone)
    s.position.set(x, 0.015, z)
    s.rotation.y = i
    sauna.add(s)
  })

  // trees around the deck
  ;[
    [1.2, -0.15, 1.05, '#4fae74'],
    [-1.05, -0.75, 0.9, '#3f9b6b'],
    [1.0, 0.75, 0.75, '#5cbf86'],
    [-1.2, 0.55, 0.7, '#3f9b6b'],
  ].forEach(([x, z, s, c]) => {
    const tree = roundTree(s as number, c as string)
    tree.position.set(x as number, 0.08, z as number)
    group.add(tree)
  })

  /* ------------------------------------------------------------- labels */
  A.label('hobby', group, new THREE.Vector3(0.05, 1.45, -0.35), 0.75)
  A.label('sauna', hut, new THREE.Vector3(0, 1.15, 0), 0.18)

  /* ---------------------------------------------------------- animation */
  A.onUpdate((t) => {
    const f = 1 + Math.sin(t * 9.1) * 0.06 + Math.sin(t * 13.7) * 0.05
    lampMat.color.set(WARM).multiplyScalar(3 * f)
    lanternLight.intensity = 2.2 * f
    hutLight.intensity = 3.5 * (0.95 + Math.sin(t * 2.3) * 0.05)
    relaxer.position.y = 0.19 + Math.sin(t * 0.8) * 0.004
  })

  return A.finish()
}
