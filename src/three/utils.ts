import * as THREE from 'three'

export function mulberry32(seed: number): () => number {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

export function v3(x = 0, y = 0, z = 0) {
  return new THREE.Vector3(x, y, z)
}

/** Places a mesh/group in one call and returns it. */
export function place<T extends THREE.Object3D>(
  obj: T,
  x = 0,
  y = 0,
  z = 0,
  ry = 0,
  parent?: THREE.Object3D,
): T {
  obj.position.set(x, y, z)
  obj.rotation.y = ry
  parent?.add(obj)
  return obj
}

export function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[],
  parent?: THREE.Object3D,
): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material)
  parent?.add(m)
  return m
}

/** Builds a curve through points as a thin tube. */
export function tubeAlong(points: THREE.Vector3[], radius: number, segments = 64, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal')
  return { curve, geometry: new THREE.TubeGeometry(curve, segments, radius, 8, closed) }
}
