import * as THREE from 'three'

interface StdOptions {
  roughness?: number
  metalness?: number
  flat?: boolean
  emissive?: THREE.ColorRepresentation
  emissiveIntensity?: number
  map?: THREE.Texture | null
  emissiveMap?: THREE.Texture | null
  transparent?: boolean
  opacity?: number
  side?: THREE.Side
}

const cache = new Map<string, THREE.Material>()

/** Shared MeshStandardMaterial (cached by its parameters). */
export function std(color: THREE.ColorRepresentation, o: StdOptions = {}): THREE.MeshStandardMaterial {
  const key = `std|${new THREE.Color(color).getHexString()}|${JSON.stringify({
    ...o,
    map: o.map?.uuid,
    emissiveMap: o.emissiveMap?.uuid,
    emissive: o.emissive !== undefined ? new THREE.Color(o.emissive).getHexString() : undefined,
  })}`
  const hit = cache.get(key)
  if (hit) return hit as THREE.MeshStandardMaterial
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: o.roughness ?? 0.75,
    metalness: o.metalness ?? 0.0,
    flatShading: o.flat ?? false,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 1,
    map: o.map ?? null,
    emissiveMap: o.emissiveMap ?? null,
    transparent: o.transparent ?? false,
    opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide,
  })
  cache.set(key, m)
  return m
}

/**
 * Unlit glowing material. Colors are pushed above 1.0 so that the bloom pass
 * (luminance threshold ~1) picks them up.
 */
export function glow(
  color: THREE.ColorRepresentation,
  intensity = 2.5,
  o: { transparent?: boolean; opacity?: number; additive?: boolean; side?: THREE.Side; shared?: boolean } = {},
): THREE.MeshBasicMaterial {
  const key = `glow|${new THREE.Color(color).getHexString()}|${intensity}|${JSON.stringify(o)}`
  const shared = o.shared ?? true
  if (shared) {
    const hit = cache.get(key)
    if (hit) return hit as THREE.MeshBasicMaterial
  }
  const m = new THREE.MeshBasicMaterial({
    color: new THREE.Color(color).multiplyScalar(intensity),
    transparent: o.transparent ?? o.additive ?? false,
    opacity: o.opacity ?? 1,
    blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: !(o.additive || o.transparent),
    side: o.side ?? THREE.FrontSide,
    toneMapped: false,
  })
  m.userData.noShadow = true
  if (shared) cache.set(key, m)
  return m
}

/** Material that should never be outlined / cast shadows (helpers, fx). */
export function markFx(obj: THREE.Object3D) {
  obj.traverse((o) => {
    o.userData.fx = true
  })
  return obj
}
