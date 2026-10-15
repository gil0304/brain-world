import * as THREE from 'three'

/**
 * Top-down layout of the island (x → right, z → toward the camera).
 *
 *            [ anime ]           (back, on a cliff)
 *   [ music ]          [ programming ]
 *             [ making ]         (center, brightest)
 *   [ sports ]          [ hobby ]
 */
export const LAYOUT: Record<string, { center: THREE.Vector3; radius: number }> = {
  making: { center: new THREE.Vector3(0, 0, 0.35), radius: 1.85 },
  music: { center: new THREE.Vector3(-3.05, 0, -2.25), radius: 1.75 },
  programming: { center: new THREE.Vector3(3.05, 0, -2.25), radius: 1.75 },
  sports: { center: new THREE.Vector3(-2.75, 0, 2.85), radius: 2.1 },
  hobby: { center: new THREE.Vector3(2.85, 0, 3.0), radius: 1.75 },
  anime: { center: new THREE.Vector3(0, 0, -5.0), radius: 2.2 },
}

/** Island outline: an egg-shaped oval slightly inside the brain's equator. */
export const ISLAND = { rx: 5.5, front: 6.35, back: 6.95 }

export function islandPoint(theta: number, inset = 0): THREE.Vector2 {
  const x = Math.cos(theta)
  const z = Math.sin(theta)
  const rz = z >= 0 ? ISLAND.front : ISLAND.back
  return new THREE.Vector2(x * (ISLAND.rx - inset), z * (rz - inset))
}

/** Half width of the island at depth z (used to keep things on the ground). */
export function islandHalfWidth(z: number) {
  const rz = z >= 0 ? ISLAND.front : ISLAND.back
  const t = Math.min(1, Math.abs(z) / rz)
  return ISLAND.rx * Math.sqrt(1 - t * t)
}
