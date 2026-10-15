import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import {
  BlendFunction,
  BloomEffect,
  EffectComposer,
  EffectPass,
  KernelSize,
  OutlineEffect,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing'
import gsap from 'gsap'
import { nodeIndex } from '../data/brainWorldData'
import type { AreaBuild } from './areas/common'
import { buildAnime } from './areas/anime'
import { buildHobby } from './areas/hobby'
import { buildMaking } from './areas/making'
import { buildMusic } from './areas/music'
import { buildProgramming } from './areas/programming'
import { buildSports } from './areas/sports'
import { createBrainShell, type BrainShell } from './brainShell'
import { createBackground, createPedestal, createStars } from './environment'
import { createIsland, type Island } from './island'
import { LabelLayer, labelUnit, LABEL_FONT_JP, LABEL_FONT_LATIN } from './labels'
import { LAYOUT } from './layout'
import { globalUniforms } from './uniforms'

export type SaveRatio = '1:1' | '4:5' | '16:9'

export interface BrainWorldEvents {
  onSelect?: (id: string | null) => void
  onHover?: (id: string | null) => void
}

interface Frame {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

interface Pose {
  position: THREE.Vector3
  target: THREE.Vector3
}

const FOV = 30
const ELEVATION = THREE.MathUtils.degToRad(33)
const CAPTURE_SIZES: Record<SaveRatio, [number, number]> = {
  '1:1': [2160, 2160],
  '4:5': [2160, 2700],
  '16:9': [3840, 2160],
}
const CAPTURE_FRAMES: Record<SaveRatio, Frame> = {
  '1:1': { xMin: -0.88, xMax: 0.88, yMin: -0.92, yMax: 0.56 },
  '4:5': { xMin: -0.92, xMax: 0.92, yMin: -0.9, yMax: 0.6 },
  '16:9': { xMin: -0.92, xMax: 0.92, yMin: -0.9, yMax: 0.74 },
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

export class BrainWorld {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 1200)
  readonly controls: OrbitControls
  private composer: EffectComposer
  private outline: OutlineEffect
  private overlay: HTMLCanvasElement
  private overlayCtx: CanvasRenderingContext2D
  private world = new THREE.Group()
  private shell!: BrainShell
  private island!: Island
  private areas: AreaBuild[] = []
  private labels!: LabelLayer
  private background!: THREE.Mesh
  private timer = new THREE.Timer()
  private raf = 0
  private size = { w: 1, h: 1 }
  private home!: Pose
  private userMoved = false
  private labelAlpha = 0
  private paused = false
  private hoverId: string | null = null
  private selectedId: string | null = null
  private pointer = new THREE.Vector2()
  private pointerDirty = false
  private pointerInside = false
  private down: { x: number; y: number; t: number } | null = null
  private raycaster = new THREE.Raycaster()
  private ro: ResizeObserver
  private frameTimes: number[] = []
  private quality = Math.min(window.devicePixelRatio || 1, 2)
  private disposed = false
  private introTl: gsap.core.Timeline | null = null

  constructor(
    private container: HTMLElement,
    private events: BrainWorldEvents = {},
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    })
    this.renderer.setPixelRatio(this.quality)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    const gl = this.renderer.domElement
    gl.className = 'bw-gl'
    gl.setAttribute('aria-label', 'BRAIN WORLD の3D箱庭。ドラッグで回転、スクロールでズーム、クリックで詳細。')
    gl.setAttribute('role', 'img')
    container.appendChild(gl)

    this.overlay = document.createElement('canvas')
    this.overlay.className = 'bw-overlay'
    container.appendChild(this.overlay)
    this.overlayCtx = this.overlay.getContext('2d')!

    this.camera.position.set(0, 12, 22)
    this.controls = new OrbitControls(this.camera, gl)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.07
    this.controls.enablePan = false
    this.controls.rotateSpeed = 0.55
    this.controls.zoomSpeed = 0.8
    this.controls.minPolarAngle = THREE.MathUtils.degToRad(36)
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(78)
    this.controls.minAzimuthAngle = THREE.MathUtils.degToRad(-50)
    this.controls.maxAzimuthAngle = THREE.MathUtils.degToRad(50)
    this.controls.addEventListener('start', () => {
      this.userMoved = true
      gsap.killTweensOf(this.camera.position)
      gsap.killTweensOf(this.controls.target)
    })

    const samples = Math.min(4, this.renderer.capabilities.maxSamples)
    this.composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType, multisampling: samples })
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    const bloom = new BloomEffect({
      mipmapBlur: true,
      luminanceThreshold: 0.95,
      luminanceSmoothing: 0.2,
      intensity: 1.05,
      radius: 0.68,
    })
    this.outline = new OutlineEffect(this.scene, this.camera, {
      blendFunction: BlendFunction.SCREEN,
      edgeStrength: 5,
      visibleEdgeColor: 0xffffff,
      hiddenEdgeColor: 0x000000,
      blur: true,
      kernelSize: KernelSize.VERY_SMALL,
      xRay: false,
      resolutionScale: 1,
      multisampling: Math.min(2, samples),
    })
    const vignette = new VignetteEffect({ offset: 0.3, darkness: 0.62 })
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL })
    this.composer.addPass(new EffectPass(this.camera, bloom, this.outline, vignette, tone))

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(container)
    this.bindPointer()
  }

  /* ================================================================ setup */

  async init() {
    await this.loadFonts()
    this.buildScene()
    this.resize()
    await this.renderer.compileAsync(this.scene, this.camera)
    this.timer.connect(document)
    this.loop()
    this.intro()
  }

  private async loadFonts() {
    const jp = '音楽プログラミングスポーツ趣味アニメ好きなことものづくり前期バスケスノボ野球サウナ忍'
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load(`700 16px "${LABEL_FONT_LATIN}"`),
          document.fonts.load(`500 16px "${LABEL_FONT_LATIN}"`),
          document.fonts.load(`600 16px "${LABEL_FONT_LATIN}"`),
          document.fonts.load(`700 16px "${LABEL_FONT_JP}"`, jp),
          document.fonts.load(`500 16px "${LABEL_FONT_JP}"`, jp),
          document.fonts.load(`700 16px "${LABEL_FONT_JP}"`, '忍'),
        ]),
        new Promise((r) => setTimeout(r, 4000)),
      ])
    } catch {
      /* fall back to system fonts */
    }
  }

  private buildScene() {
    const { scene } = this
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.32
    pmrem.dispose()

    this.background = createBackground()
    scene.add(this.background)
    scene.add(createStars())

    scene.add(new THREE.HemisphereLight('#9fb2ff', '#1a1030', 0.75))
    const key = new THREE.DirectionalLight('#fff1e0', 2.4)
    key.position.set(-6, 13, 8)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    key.shadow.camera.left = -9
    key.shadow.camera.right = 9
    key.shadow.camera.top = 9
    key.shadow.camera.bottom = -9
    key.shadow.camera.near = 1
    key.shadow.camera.far = 40
    key.shadow.bias = -0.0004
    key.shadow.normalBias = 0.02
    key.shadow.radius = 3
    scene.add(key)
    const rimLight = new THREE.DirectionalLight('#8fb0ff', 1.1)
    rimLight.position.set(5, 6, -10)
    scene.add(rimLight)

    scene.add(createPedestal())
    scene.add(this.world)

    this.shell = createBrainShell()
    this.island = createIsland()
    this.world.add(this.island.group)
    this.areas = [buildMaking(), buildMusic(), buildProgramming(), buildSports(), buildHobby(), buildAnime()]
    for (const a of this.areas) {
      // invisible disc so clicking an area's ground selects the area itself
      // (kept below every item surface so items always win the raycast)
      const L = LAYOUT[a.id]
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(L.radius, L.radius, 0.02, 32), new THREE.MeshBasicMaterial({ visible: false }))
      hit.position.y = 0.01
      hit.userData.hitOnly = true
      a.group.add(hit)
      this.world.add(a.group)
    }
    this.world.add(this.shell.group)
    this.labels = new LabelLayer(this.areas.flatMap((a) => a.labels))
  }

  /* ================================================================ camera */

  private liveFrame(): Frame {
    const { w, h } = this.size
    if (w / h < 0.8) return { xMin: -0.95, xMax: 0.95, yMin: -0.66, yMax: 0.56 }
    if (w / h < 1.2) return { xMin: -0.92, xMax: 0.92, yMin: -0.8, yMax: 0.66 }
    return { xMin: -0.9, xMax: 0.9, yMin: -0.84, yMax: 0.78 }
  }

  /** Finds a camera pose (fixed angle) that fits the whole brain in the frame. */
  computePose(aspect: number, frame: Frame): Pose {
    const cam = new THREE.PerspectiveCamera(FOV, aspect, 0.1, 1200)
    const dir = new THREE.Vector3(0, Math.sin(ELEVATION), Math.cos(ELEVATION))
    const target = new THREE.Vector3(0, 0.4, 0)
    const pts = this.shell.framePoints
    const v = new THREE.Vector3()
    const bounds = (dist: number) => {
      cam.position.copy(target).addScaledVector(dir, dist)
      cam.lookAt(target)
      cam.updateMatrixWorld()
      let x0 = Infinity
      let x1 = -Infinity
      let y0 = Infinity
      let y1 = -Infinity
      for (const p of pts) {
        v.copy(p).project(cam)
        x0 = Math.min(x0, v.x)
        x1 = Math.max(x1, v.x)
        y0 = Math.min(y0, v.y)
        y1 = Math.max(y1, v.y)
      }
      return { x0, x1, y0, y1 }
    }
    const fw = frame.xMax - frame.xMin
    const fh = frame.yMax - frame.yMin
    let dist = 30
    for (let iter = 0; iter < 4; iter++) {
      let lo = 8
      let hi = 160
      for (let k = 0; k < 28; k++) {
        const mid = (lo + hi) / 2
        const b = bounds(mid)
        if (b.x1 - b.x0 <= fw && b.y1 - b.y0 <= fh) hi = mid
        else lo = mid
      }
      dist = hi
      const b = bounds(dist)
      const halfH = dist * Math.tan(THREE.MathUtils.degToRad(FOV / 2))
      const halfW = halfH * aspect
      const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0)
      const up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1)
      const dx = (b.x0 + b.x1) / 2 - (frame.xMin + frame.xMax) / 2
      const dy = (b.y0 + b.y1) / 2 - (frame.yMin + frame.yMax) / 2
      target.addScaledVector(right, dx * halfW).addScaledVector(up, dy * halfH)
    }
    return { position: target.clone().addScaledVector(dir, dist), target }
  }

  private applyLimits() {
    const d = this.home.position.distanceTo(this.home.target)
    this.controls.minDistance = d * 0.3
    this.controls.maxDistance = d * 1.3
  }

  resetView(duration = 1.2): Promise<void> {
    this.userMoved = false
    return this.flyTo(this.home, duration)
  }

  private flyTo(pose: Pose, duration: number): Promise<void> {
    return new Promise((resolve) => {
      gsap.killTweensOf(this.camera.position)
      gsap.killTweensOf(this.controls.target)
      if (duration <= 0 || reducedMotion()) {
        this.camera.position.copy(pose.position)
        this.controls.target.copy(pose.target)
        this.controls.update()
        resolve()
        return
      }
      gsap.to(this.controls.target, { x: pose.target.x, y: pose.target.y, z: pose.target.z, duration, ease: 'power3.inOut' })
      gsap.to(this.camera.position, {
        x: pose.position.x,
        y: pose.position.y,
        z: pose.position.z,
        duration,
        ease: 'power3.inOut',
        onComplete: () => resolve(),
      })
    })
  }

  private focusOn(id: string) {
    const obj = this.findObject(id)
    if (!obj) return
    const box = this.boundsOf(obj)
    const center = box.getCenter(new THREE.Vector3())
    const radius = box.getSize(new THREE.Vector3()).length() / 2
    const homeDist = this.home.position.distanceTo(this.home.target)
    const isArea = nodeIndex.get(id)?.node.type === 'area'
    const dist = THREE.MathUtils.clamp(radius * (isArea ? 3.6 : 5.2), homeDist * 0.36, homeDist * (isArea ? 0.7 : 0.55))
    // keep the current viewing direction, but never look from too far down
    const dir = this.camera.position.clone().sub(this.controls.target).normalize()
    if (dir.y < 0.42) dir.setY(0.42).normalize()
    this.userMoved = true
    this.flyTo({ position: center.clone().addScaledVector(dir, dist), target: center }, 1.1)
  }

  /* ============================================================== picking */

  private findObject(id: string): THREE.Object3D | null {
    for (const a of this.areas) {
      if (a.id === id) return a.group
      if (a.items[id]) return a.items[id]
    }
    return null
  }

  private boundsOf(obj: THREE.Object3D) {
    obj.updateWorldMatrix(true, true)
    const box = new THREE.Box3()
    const tmp = new THREE.Box3()
    obj.traverse((o) => {
      if (o.userData.fx || o.userData.hitOnly || !(o instanceof THREE.Mesh)) return
      if (o instanceof THREE.InstancedMesh) {
        o.computeBoundingBox()
        tmp.copy(o.boundingBox!).applyMatrix4(o.matrixWorld)
      } else {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox()
        tmp.copy(o.geometry.boundingBox!).applyMatrix4(o.matrixWorld)
      }
      box.union(tmp)
    })
    return box
  }

  private pickAt(clientX: number, clientY: number): string | null {
    const rect = this.container.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const labelHit = this.labels.hit(x, y)
    if (labelHit) return labelHit
    this.pointer.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(
      this.areas.map((a) => a.group),
      true,
    )
    for (const h of hits) {
      const o = h.object
      if (o.userData.fx || o instanceof THREE.Points || o instanceof THREE.Line) continue
      let p: THREE.Object3D | null = o
      while (p && !p.userData.pickId) p = p.parent
      if (p) return p.userData.pickId as string
    }
    return null
  }

  private bindPointer() {
    const el = this.renderer.domElement
    el.addEventListener('pointermove', (e) => {
      this.lastPointer = { x: e.clientX, y: e.clientY }
      this.pointerDirty = true
      this.pointerInside = e.pointerType === 'mouse'
    })
    el.addEventListener('pointerleave', () => {
      this.pointerInside = false
      this.setHover(null)
    })
    el.addEventListener('pointerdown', (e) => {
      this.down = { x: e.clientX, y: e.clientY, t: performance.now() }
    })
    el.addEventListener('pointerup', (e) => {
      if (!this.down) return
      const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y)
      const quick = performance.now() - this.down.t < 600
      this.down = null
      if (moved < 6 && quick) this.select(this.pickAt(e.clientX, e.clientY), true)
    })
    el.addEventListener('dblclick', () => {
      this.select(null)
      this.resetView()
    })
  }

  private lastPointer = { x: 0, y: 0 }

  private setHover(id: string | null) {
    if (id === this.hoverId) return
    this.hoverId = id
    this.renderer.domElement.style.cursor = id ? 'pointer' : ''
    this.updateHighlight()
    this.events.onHover?.(id)
  }

  /** Selects a node (area / item / subitem) or clears the selection. */
  select(id: string | null, focus = true) {
    if (id && !nodeIndex.has(id)) id = null
    this.selectedId = id
    this.updateHighlight()
    this.events.onSelect?.(id)
    if (id && focus) this.focusOn(id)
  }

  private updateHighlight() {
    const id = this.hoverId ?? this.selectedId
    const sel = this.outline.selection
    sel.clear()
    const entry = id ? nodeIndex.get(id) : null
    this.island.setAreaBoost(this.selectedId ? nodeIndex.get(this.selectedId)!.area.id : entry?.area.id ?? null)
    if (!entry || entry.node.type === 'area') return
    const obj = this.findObject(id!)
    if (!obj) return
    obj.traverse((o) => {
      if (o instanceof THREE.Mesh && !o.userData.fx && !o.userData.hitOnly && !(o.material as THREE.Material).transparent) sel.add(o)
    })
    this.outline.visibleEdgeColor.set(entry.area.color)
  }

  /* ================================================================ loop */

  private resize() {
    const w = Math.max(1, this.container.clientWidth)
    const h = Math.max(1, this.container.clientHeight)
    this.size = { w, h }
    this.renderer.setPixelRatio(this.quality)
    this.composer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.overlay.width = Math.round(w * dpr)
    this.overlay.height = Math.round(h * dpr)
    this.overlay.style.width = `${w}px`
    this.overlay.style.height = `${h}px`
    this.overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (!this.shell) return
    this.home = this.computePose(w / h, this.liveFrame())
    this.applyLimits()
    if (!this.userMoved && !gsap.isTweening(this.camera.position)) {
      this.camera.position.copy(this.home.position)
      this.controls.target.copy(this.home.target)
      this.controls.update()
    }
  }

  private loop = () => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    if (this.paused) return
    this.timer.update()
    const dt = Math.min(this.timer.getDelta(), 0.1)
    const t = this.timer.getElapsed()
    this.tick(t, dt)
    this.renderFrame(dt)
    this.trackPerformance(dt)
  }

  private tick(t: number, dt: number) {
    globalUniforms.uTime.value = t
    const calm = reducedMotion() ? 0 : 1
    this.world.position.y = Math.sin(t * 0.55) * 0.07 * calm
    this.world.rotation.y = Math.sin(t * 0.21) * 0.022 * calm
    this.island.update(t)
    for (const a of this.areas) a.update(t, dt)
    this.controls.update()
    if (this.pointerDirty && this.pointerInside && !this.down) {
      this.pointerDirty = false
      this.setHover(this.pickAt(this.lastPointer.x, this.lastPointer.y))
    }
  }

  private renderFrame(dt: number) {
    this.background.position.copy(this.camera.position)
    const h = this.renderer.getDrawingBufferSize(new THREE.Vector2()).y
    globalUniforms.uPixelScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)))
    this.composer.render(dt)
    const { w, h: ch } = this.size
    const ctx = this.overlayCtx
    ctx.clearRect(0, 0, w, ch)
    this.labels.draw(ctx, this.camera, w, ch, {
      unit: labelUnit(w, ch),
      alpha: this.labelAlpha,
      hoverId: this.hoverId,
      selectedId: this.selectedId,
      smooth: true,
      compact: w < 520,
      avoid: [{ x: 0, y: 0, w: w < 640 ? 300 : 330, h: w < 640 ? 112 : 128 }],
    })
  }

  /** Drops the pixel ratio a notch if the device can't keep up. */
  private trackPerformance(dt: number) {
    if (this.timer.getElapsed() < 4) return
    this.frameTimes.push(dt)
    if (this.frameTimes.length < 90) return
    const avg = this.frameTimes.reduce((s, v) => s + v, 0) / this.frameTimes.length
    this.frameTimes = []
    if (avg > 1 / 40 && this.quality > 1) {
      this.quality = Math.max(1, this.quality - 0.35)
      this.resize()
    }
  }

  /* ================================================================ intro */

  private intro() {
    const fast = reducedMotion()
    const start: Pose = {
      position: this.home.target.clone().add(new THREE.Vector3(0, 18, 34)),
      target: this.home.target.clone().add(new THREE.Vector3(0, 1.5, 0)),
    }
    if (fast) {
      this.shell.setReveal(1)
      this.labelAlpha = 1
      return
    }
    this.camera.position.copy(start.position)
    this.controls.target.copy(start.target)
    this.shell.setReveal(0)
    const reveal = { v: 0 }
    const tl = gsap.timeline()
    tl.to(reveal, { v: 1, duration: 2.6, ease: 'power2.inOut', onUpdate: () => this.shell.setReveal(reveal.v) }, 0)
    this.areas.forEach((a, i) => {
      a.group.scale.setScalar(0.001)
      tl.to(a.group.scale, { x: 1, y: 1, z: 1, duration: 1.1, ease: 'back.out(1.6)' }, 0.5 + i * 0.13)
    })
    tl.to(this, { labelAlpha: 1, duration: 1.2, ease: 'power1.out' }, 2.0)
    this.introTl = tl
    this.flyTo(this.home, 2.8)
  }

  /* ============================================================== capture */

  /**
   * Renders the whole world from the fixed "save" composition at high
   * resolution and returns a PNG blob. Live view is restored afterwards.
   */
  async capture(ratio: SaveRatio, title = { main: 'BRAIN WORLD', sub: 'A miniature world inside my mind.' }): Promise<Blob> {
    let [W, H] = CAPTURE_SIZES[ratio]
    const gl = this.renderer.getContext()
    const maxDim = Math.min(
      gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number,
      gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
      ...(gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array),
    )
    const k = Math.min(1, maxDim / Math.max(W, H))
    W = Math.floor(W * k)
    H = Math.floor(H * k)

    this.paused = true
    // never save a half-built world: jump the intro to its final state
    this.introTl?.progress(1)
    const prevHover = this.hoverId
    const prevSel = this.selectedId
    this.hoverId = null
    this.selectedId = null
    this.outline.selection.clear()
    this.island.setAreaBoost(null)

    const prev = {
      pos: this.camera.position.clone(),
      quat: this.camera.quaternion.clone(),
      aspect: this.camera.aspect,
      pr: this.renderer.getPixelRatio(),
    }
    const pose = this.computePose(W / H, CAPTURE_FRAMES[ratio])
    this.camera.aspect = W / H
    this.camera.updateProjectionMatrix()
    this.camera.position.copy(pose.position)
    this.camera.lookAt(pose.target)
    this.camera.updateMatrixWorld()

    const out = document.createElement('canvas')
    out.width = W
    out.height = H
    const ctx = out.getContext('2d')!
    try {
      this.renderer.setPixelRatio(1)
      this.composer.setSize(W, H, false)
      this.background.position.copy(this.camera.position)
      globalUniforms.uPixelScale.value = H / (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)))
      this.composer.render(0.016)
      ctx.drawImage(this.renderer.domElement, 0, 0, W, H)
      const titleBox = drawTitle(ctx, W, H, ratio, title, true)
      this.labels.draw(ctx, this.camera, W, H, { unit: labelUnit(W, H, false) * 1.12, alpha: 1, avoid: [titleBox] })
      drawTitle(ctx, W, H, ratio, title)
    } finally {
      this.renderer.setPixelRatio(prev.pr)
      this.composer.setSize(this.size.w, this.size.h)
      this.camera.aspect = prev.aspect
      this.camera.updateProjectionMatrix()
      this.camera.position.copy(prev.pos)
      this.camera.quaternion.copy(prev.quat)
      this.hoverId = prevHover
      this.selectedId = prevSel
      this.updateHighlight()
      this.paused = false
    }
    return new Promise((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png'))
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.timer.dispose()
    this.controls.dispose()
    this.composer.dispose()
    this.renderer.dispose()
    this.container.innerHTML = ''
  }
}

/** Draws the title block (or only measures it when measureOnly) and returns its box. */
function drawTitle(ctx: CanvasRenderingContext2D, W: number, H: number, ratio: SaveRatio, title: { main: string; sub: string }, measureOnly = false) {
  const u = Math.min(W, H) / 1000
  const left = ratio === '16:9'
  const x = left ? 64 * u : W / 2
  const y = left ? 92 * u : 120 * u
  const boxW = left ? 620 * u : 720 * u
  const box = { x: left ? 0 : W / 2 - boxW / 2, y: 0, w: boxW, h: y + 80 * u }
  if (measureOnly) return box
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
  ctx.save()
  ctx.textAlign = left ? 'left' : 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(190,150,255,0.65)'
  ctx.shadowBlur = 28 * u
  ctx.font = `600 ${left ? 46 * u : 54 * u}px "${LABEL_FONT_LATIN}", sans-serif`
  if ('letterSpacing' in c) c.letterSpacing = `${(left ? 46 : 54) * u * 0.34}px`
  ctx.fillText(title.main, x, y)
  ctx.shadowBlur = 0
  ctx.font = `300 ${left ? 19 * u : 21 * u}px "${LABEL_FONT_LATIN}", sans-serif`
  if ('letterSpacing' in c) c.letterSpacing = `${2.2 * u}px`
  ctx.fillStyle = 'rgba(225,215,255,0.72)'
  ctx.fillText(title.sub, x, y + 40 * u)
  // hairline accent
  ctx.strokeStyle = 'rgba(255,216,106,0.7)'
  ctx.lineWidth = 2 * u
  ctx.beginPath()
  const lx = left ? x : x - 18 * u
  ctx.moveTo(lx, y + 66 * u)
  ctx.lineTo(lx + 36 * u, y + 66 * u)
  ctx.stroke()
  ctx.restore()
  return box
}
