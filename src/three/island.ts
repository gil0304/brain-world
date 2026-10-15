import * as THREE from 'three'
import { createNoise3D } from 'simplex-noise'
import { brainWorldData } from '../data/brainWorldData'
import { ISLAND, LAYOUT, islandPoint } from './layout'
import { glow, std } from './materials'
import { createParticles } from './particles'
import { globalUniforms } from './uniforms'
import { mulberry32, tubeAlong } from './utils'

export interface Island {
  group: THREE.Group
  /** 0..1 highlight per area id (selection feedback on the ground) */
  setAreaBoost(id: string | null): void
  update(t: number): void
}

const AREA_IDS = brainWorldData.map((a) => a.id)

export function createIsland(): Island {
  const group = new THREE.Group()
  group.name = 'island'

  /* ---------------------------------------------------------- slab + ground */
  const SEG = 160
  const shape = new THREE.Shape()
  for (let i = 0; i <= SEG; i++) {
    const p = islandPoint((i / SEG) * Math.PI * 2)
    // shape y = -z so that after rotateX(-90°) the outline lands on +z correctly
    i ? shape.lineTo(p.x, -p.y) : shape.moveTo(p.x, -p.y)
  }
  const depth = 0.55
  const slabGeo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 2,
    curveSegments: SEG,
    steps: 1,
  })
  slabGeo.rotateX(-Math.PI / 2)
  slabGeo.translate(0, -depth - 0.05, 0)

  const areaUniforms = {
    uAreaPos: { value: AREA_IDS.map((id) => LAYOUT[id].center.clone()) },
    uAreaCol: { value: brainWorldData.map((a) => new THREE.Color(a.color)) },
    uAreaRad: { value: AREA_IDS.map((id) => LAYOUT[id].radius) },
    uAreaBoost: { value: AREA_IDS.map(() => 0) },
  }
  const groundMat = new THREE.MeshStandardMaterial({ color: '#141a36', roughness: 0.92, metalness: 0.05 })
  groundMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, areaUniforms, { uTime: globalUniforms.uTime })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGPos = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vGPos;
        uniform vec3 uAreaPos[6];
        uniform vec3 uAreaCol[6];
        uniform float uAreaRad[6];
        uniform float uAreaBoost[6];
        uniform float uTime;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          vec3 halo = vec3(0.0);
          for (int i = 0; i < 6; i++) {
            vec2 dv = vGPos.xz - uAreaPos[i].xz;
            float d = length(dv);
            float r = uAreaRad[i];
            float g = 1.0 - smoothstep(r * 0.1, r * 1.2, d);
            float ring = 1.0 - smoothstep(0.0, 0.03, abs(d - r));
            float ang = atan(dv.y, dv.x);
            float dash = step(0.5, fract(ang * r * 1.6 / 6.2831 - uTime * 0.04));
            float b = uAreaBoost[i];
            halo += uAreaCol[i] * (g * g * (0.12 + b * 0.35) + ring * dash * (0.35 + b * 1.6));
          }
          vec2 gp = vGPos.xz * 2.2;
          float dots = 1.0 - smoothstep(0.03, 0.06, length(fract(gp + 0.5) - 0.5));
          float top = step(-0.02, vGPos.y);
          diffuseColor.rgb += halo * 0.25 * top;
          totalEmissiveRadiance += (halo + vec3(0.55, 0.5, 0.95) * dots * 0.06) * top;
        }`,
      )
  }
  const sideMat = std('#1b1d3c', { roughness: 0.85 })
  const slab = new THREE.Mesh(slabGeo, [groundMat, sideMat])
  slab.receiveShadow = true
  slab.name = 'ground'
  group.add(slab)

  // glowing rims around the top edge and lower strata
  const rimPts = (inset: number, y: number) => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < 200; i++) {
      const p = islandPoint((i / 200) * Math.PI * 2, inset)
      pts.push(new THREE.Vector3(p.x, y, p.y))
    }
    return pts
  }
  const rim = new THREE.Mesh(tubeAlong(rimPts(-0.04, 0.0), 0.022, 400, true).geometry, glow('#e9d9ff', 2.2))
  const rim2 = new THREE.Mesh(tubeAlong(rimPts(-0.06, -0.32), 0.012, 400, true).geometry, glow('#8a6bff', 1.6))
  group.add(rim, rim2)

  /* ------------------------------------------------------ floating underside */
  const rnd = mulberry32(77)
  const noise = createNoise3D(rnd)
  const rings = [
    { y: -0.6, s: 1.0 },
    { y: -1.05, s: 0.9 },
    { y: -1.6, s: 0.72 },
    { y: -2.15, s: 0.48 },
    { y: -2.6, s: 0.24 },
  ]
  const N = 72
  const verts: number[] = []
  const ringVerts: THREE.Vector3[][] = rings.map((ring, k) =>
    Array.from({ length: N }, (_, i) => {
      const th = (i / N) * Math.PI * 2
      const p = islandPoint(th, 0.02)
      const jitter = k === 0 ? 0 : noise(Math.cos(th) * 2, ring.y, Math.sin(th) * 2) * 0.22
      const s = ring.s + jitter * 0.4
      const y = ring.y + (k === 0 ? 0 : noise(Math.cos(th) * 3 + 9, k, Math.sin(th) * 3) * 0.22)
      return new THREE.Vector3(p.x * s, y, p.y * s)
    }),
  )
  const tip = new THREE.Vector3(0.1, -3.05, -0.2)
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => verts.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
  for (let k = 0; k < ringVerts.length - 1; k++) {
    for (let i = 0; i < N; i++) {
      const a = ringVerts[k][i]
      const b = ringVerts[k][(i + 1) % N]
      const c = ringVerts[k + 1][i]
      const d = ringVerts[k + 1][(i + 1) % N]
      tri(a, c, b)
      tri(b, c, d)
    }
  }
  const last = ringVerts[ringVerts.length - 1]
  for (let i = 0; i < N; i++) tri(last[i], tip, last[(i + 1) % N])
  const underGeo = new THREE.BufferGeometry()
  underGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  underGeo.computeVertexNormals()
  const under = new THREE.Mesh(underGeo, std('#221c40', { flat: true, roughness: 0.95 }))
  group.add(under)

  // crystals growing out of the underside
  const crystalGeo = new THREE.OctahedronGeometry(1, 0)
  crystalGeo.scale(0.12, 0.42, 0.12)
  const crystalCols = ['#7fd8ff', '#c39bff', '#ff8fd6']
  for (let i = 0; i < 22; i++) {
    const k = 1 + Math.floor(rnd() * 3)
    const ring = ringVerts[k]
    const p = ring[Math.floor(rnd() * N)]
    const c = new THREE.Mesh(crystalGeo, glow(crystalCols[i % 3], 1.6 + rnd()))
    c.position.copy(p).multiplyScalar(0.98)
    c.position.y -= 0.1
    const out = new THREE.Vector3(p.x, 0, p.z).normalize()
    c.lookAt(c.position.clone().add(out.multiplyScalar(0.6)).add(new THREE.Vector3(0, -1.2, 0)))
    c.rotateX(Math.PI / 2)
    c.scale.setScalar(0.6 + rnd() * 0.9)
    group.add(c)
  }

  // neural roots hanging under the island → a little "brain stem"
  const roots = new THREE.Group()
  const rootMat = new THREE.ShaderMaterial({
    uniforms: { uTime: globalUniforms.uTime, uColor: { value: new THREE.Color('#b89bff') } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
      void main() {
        float p = fract(vUv.x * 1.5 - uTime * 0.25);
        float pulse = smoothstep(0.0, 0.05, p) * (1.0 - smoothstep(0.05, 0.22, p));
        float fade = smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.85, 1.0, vUv.x));
        gl_FragColor = vec4(uColor * (0.9 + pulse * 3.5), (0.35 + pulse * 0.6) * fade);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd() * 0.3
    const r0 = 1.4 + rnd() * 1.8
    const pts = [
      new THREE.Vector3(Math.cos(a) * r0, -0.9 - rnd() * 0.4, Math.sin(a) * r0),
      new THREE.Vector3(Math.cos(a) * r0 * 0.6, -1.9, Math.sin(a) * r0 * 0.6),
      new THREE.Vector3(Math.cos(a) * 0.35, -2.7, Math.sin(a) * 0.35),
      new THREE.Vector3(0.1, -3.35, -0.2),
    ]
    roots.add(new THREE.Mesh(tubeAlong(pts, 0.018, 48).geometry, rootMat))
  }
  group.add(roots)

  /* ----------------------------------------------------- neural pathways */
  const pathMats: THREE.ShaderMaterial[] = []
  const hub = LAYOUT.making.center
  const making = brainWorldData.find((a) => a.id === 'making')!
  brainWorldData.forEach((area, idx) => {
    if (area.id === 'making') return
    const L = LAYOUT[area.id]
    const dir = L.center.clone().sub(hub).setY(0)
    const len = dir.length()
    dir.normalize()
    const side = new THREE.Vector3(-dir.z, 0, dir.x)
    const start = hub.clone().addScaledVector(dir, LAYOUT.making.radius * 0.98)
    const end = L.center.clone().addScaledVector(dir, -L.radius * 0.92)
    const mid = start.clone().lerp(end, 0.5).addScaledVector(side, 0.25 * (idx % 2 ? 1 : -1))
    const pts = [start, mid, end].map((p) => p.clone().setY(0.025))
    if (len < 0.1) return
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: globalUniforms.uTime,
        uA: { value: new THREE.Color(making.color) },
        uB: { value: new THREE.Color(area.color) },
        uOffset: { value: idx * 0.17 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform float uOffset; varying vec2 vUv;
        void main() {
          vec3 col = mix(uA, uB, smoothstep(0.1, 0.9, vUv.x));
          float p = fract(vUv.x * 1.6 - uTime * 0.32 + uOffset);
          float pulse = smoothstep(0.0, 0.06, p) * (1.0 - smoothstep(0.06, 0.28, p));
          gl_FragColor = vec4(col * (0.7 + pulse * 3.2), 0.5 + pulse * 0.5);
        }
      `,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
    pathMats.push(mat)
    const tube = new THREE.Mesh(tubeAlong(pts, 0.03, 64).geometry, mat)
    group.add(tube)
  })

  // drifting motes above the ground
  const dust = createParticles({
    mode: 'float',
    count: 260,
    color: '#cdb8ff',
    intensity: 1.6,
    size: 0.05,
    boxMin: new THREE.Vector3(-5, 0.3, -6),
    boxMax: new THREE.Vector3(5, 4.2, 5.5),
    seed: 9,
  })
  group.add(dust)

  // underside debris rocks orbiting slowly
  const debris = new THREE.Group()
  const rockGeo = new THREE.DodecahedronGeometry(1, 0)
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2
    const r = 3.4 + rnd() * 1.4
    const rock = new THREE.Mesh(rockGeo, std('#2a2350', { flat: true, roughness: 0.9 }))
    rock.position.set(Math.cos(a) * r, -1.4 - rnd() * 1.1, Math.sin(a) * r * 1.1)
    rock.scale.setScalar(0.08 + rnd() * 0.14)
    rock.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3)
    debris.add(rock)
  }
  group.add(debris)

  group.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) {
      o.receiveShadow = true
    }
  })
  group.userData.island = ISLAND

  return {
    group,
    setAreaBoost(id) {
      areaUniforms.uAreaBoost.value = AREA_IDS.map((a) => (a === id ? 1 : 0))
    },
    update(t) {
      debris.rotation.y = t * 0.03
    },
  }
}
