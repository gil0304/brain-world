import * as THREE from 'three'
import { getArea, nodeIndex, type AreaData } from '../../data/brainWorldData'
import { LAYOUT } from '../layout'
import { glow, std } from '../materials'

export type LabelKind = 'area' | 'item' | 'sub'

export interface LabelSpec {
  id: string
  text: string
  sub?: string
  kind: LabelKind
  color: string
  anchor: THREE.Object3D
  /** local point on the anchor the leader line points to */
  point: THREE.Vector3
  /** world units between the point and the label */
  lift: number
}

export interface AreaBuild {
  id: string
  area: AreaData
  group: THREE.Group
  /** pickable item groups by node id */
  items: Record<string, THREE.Object3D>
  labels: LabelSpec[]
  update(t: number, dt: number): void
}

type Updater = (t: number, dt: number) => void

export function beginArea(id: string) {
  const area = getArea(id)
  const group = new THREE.Group()
  group.name = `area:${id}`
  group.position.copy(LAYOUT[id].center)
  group.userData.pickId = id
  const items: Record<string, THREE.Object3D> = {}
  const labels: LabelSpec[] = []
  const updaters: Updater[] = []

  const ctx = {
    area,
    group,
    items,
    labels,
    /** Creates a pickable group for an item / subitem. */
    item(itemId: string, x: number, y: number, z: number, parent: THREE.Object3D = group) {
      const g = new THREE.Group()
      g.name = `item:${itemId}`
      g.userData.pickId = itemId
      g.position.set(x, y, z)
      parent.add(g)
      items[itemId] = g
      return g
    },
    label(nodeId: string, anchor: THREE.Object3D, point: THREE.Vector3, lift = 0.25) {
      const entry = nodeIndex.get(nodeId)!
      const kind: LabelKind = entry.node.type === 'area' ? 'area' : entry.node.type === 'subitem' ? 'sub' : 'item'
      labels.push({
        id: nodeId,
        text: entry.node.label,
        sub: entry.node.type === 'area' ? area.en : undefined,
        kind,
        color: area.color,
        anchor,
        point,
        lift,
      })
    },
    onUpdate(fn: Updater) {
      updaters.push(fn)
    },
    finish(): AreaBuild {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh && !o.userData.fx) {
          const m = o.material as THREE.Material
          if (m instanceof THREE.MeshStandardMaterial && !m.transparent) {
            o.castShadow = true
            o.receiveShadow = true
          }
        }
      })
      return {
        id,
        area,
        group,
        items,
        labels,
        update(t, dt) {
          for (const u of updaters) u(t, dt)
        },
      }
    },
  }
  return ctx
}

/* -------------------------------------------------------- tiny shared bits */

const capsule = new THREE.CapsuleGeometry(0.034, 0.075, 4, 10)
const head = new THREE.SphereGeometry(0.032, 14, 10)

/** A tiny miniature person (~0.19 tall). */
export function figure(color: THREE.ColorRepresentation, scale = 1) {
  const g = new THREE.Group()
  const body = new THREE.Mesh(capsule, std(color, { roughness: 0.6 }))
  body.position.y = 0.072
  const h = new THREE.Mesh(head, std('#f1d2b8', { roughness: 0.7 }))
  h.position.y = 0.165
  g.add(body, h)
  g.scale.setScalar(scale)
  return g
}

/** Flat ring lying on the XZ plane. */
export function flatRing(radius: number, tube: number, color: THREE.ColorRepresentation, intensity = 2.2) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, Math.max(48, Math.round(radius * 90))), glow(color, intensity))
  m.rotation.x = Math.PI / 2
  m.userData.fx = true
  return m
}

/** Simple round tree. */
export function roundTree(scale = 1, leaf = '#3f9b6b', trunk = '#6b4a35') {
  const g = new THREE.Group()
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.22, 6), std(trunk, { roughness: 0.9 }))
  t.position.y = 0.11
  g.add(t)
  const leafMat = std(leaf, { flat: true, roughness: 0.8 })
  const ico = new THREE.IcosahedronGeometry(1, 1)
  ;[
    [0, 0.3, 0, 0.16],
    [0.08, 0.38, 0.03, 0.11],
    [-0.07, 0.36, -0.02, 0.12],
  ].forEach(([x, y, z, s]) => {
    const b = new THREE.Mesh(ico, leafMat)
    b.position.set(x, y, z)
    b.scale.setScalar(s)
    g.add(b)
  })
  g.scale.setScalar(scale)
  return g
}

/** Pine tree, optionally snowy. */
export function pineTree(scale = 1, snowy = false) {
  const g = new THREE.Group()
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.1, 6), std('#5b4030'))
  t.position.y = 0.05
  g.add(t)
  const green = std('#2f6e55', { flat: true, roughness: 0.85 })
  const snow = std('#eef3ff', { flat: true, roughness: 0.7 })
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.13 - i * 0.03, 0.18, 7), snowy && i === 2 ? snow : green)
    c.position.y = 0.14 + i * 0.09
    g.add(c)
  }
  g.scale.setScalar(scale)
  return g
}

/** Additive cone of light (spotlights, holograms). */
export function lightCone(color: THREE.ColorRepresentation, radius: number, height: number, intensity = 1.2) {
  const geo = new THREE.CylinderGeometry(0.01, radius, height, 32, 1, true)
  geo.translate(0, -height / 2, 0)
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color).multiplyScalar(intensity) }, uH: { value: height } },
    vertexShader: /* glsl */ `
      varying float vY; varying vec3 vN; varying vec3 vV;
      uniform float uH;
      void main() {
        vY = -position.y / uH;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying float vY; varying vec3 vN; varying vec3 vV;
      void main() {
        float edge = pow(abs(dot(normalize(vN), vV)), 1.5);
        float a = (1.0 - vY) * 0.55 * edge * smoothstep(0.0, 0.08, vY);
        gl_FragColor = vec4(uColor, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
  const m = new THREE.Mesh(geo, mat)
  m.userData.fx = true
  m.renderOrder = 6
  return m
}
