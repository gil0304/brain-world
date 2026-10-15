// Uniforms shared by every custom shader in the scene.
export const globalUniforms = {
  uTime: { value: 0 },
  /** drawingBufferHeight / (2 * tan(fov / 2)) — converts world size to point size in px */
  uPixelScale: { value: 600 },
}
