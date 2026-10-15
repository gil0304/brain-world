import * as THREE from 'three'
import type { LabelSpec } from './areas/common'

// Labels are drawn on a 2D canvas instead of in WebGL so they stay crisp, never
// get bloomed / tone-mapped, and the exact same routine renders them into the
// saved PNG.

export const LABEL_FONT_LATIN = 'Outfit'
export const LABEL_FONT_JP = 'Zen Maru Gothic'
const FAMILY = `"${LABEL_FONT_LATIN}", "${LABEL_FONT_JP}", system-ui, sans-serif`

export interface LabelDrawOptions {
  /** size unit multiplier (1 ≈ 820px short side) */
  unit: number
  alpha: number
  hoverId?: string | null
  selectedId?: string | null
  /** ease label offsets between frames (live view) */
  smooth?: boolean
  /** narrow screens: drop the english sub text of area labels */
  compact?: boolean
  /** screen rects labels must stay clear of (title, header…) */
  avoid?: { x: number; y: number; w: number; h: number }[]
}

interface Placed {
  id: string
  x: number
  y: number
  w: number
  h: number
}

function hexToRgb(hex: string) {
  const c = new THREE.Color(hex)
  return `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`
}

/** Unit size for a viewport/image of the given size. */
export function labelUnit(width: number, height: number, live = true) {
  const u = Math.min(width, height) / 820
  return live ? THREE.MathUtils.clamp(u, width < 520 ? 0.68 : 0.8, 1.2) : u
}

export class LabelLayer {
  private specs: LabelSpec[]
  private rects: Placed[] = []
  private offsets = new Map<string, [number, number]>()
  private tmp = new THREE.Vector3()
  private tmp2 = new THREE.Vector3()

  constructor(specs: LabelSpec[]) {
    // items first, so area labels (which float higher anyway) yield to them
    const rank = { sub: 0, item: 1, area: 2 } as const
    this.specs = [...specs].sort((a, b) => rank[a.kind] - rank[b.kind])
  }

  /** Label rect under the given CSS-pixel position, if any. */
  hit(x: number, y: number): string | null {
    for (let i = this.rects.length - 1; i >= 0; i--) {
      const r = this.rects[i]
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.id
    }
    return null
  }

  draw(ctx: CanvasRenderingContext2D, camera: THREE.Camera, width: number, height: number, o: LabelDrawOptions) {
    const u = o.unit
    this.rects = []
    if (o.alpha <= 0.001) return
    const placed: Placed[] = (o.avoid ?? []).map((r) => ({ id: '', ...r }))
    const pending: {
      spec: LabelSpec
      ax: number
      ay: number
      x: number
      y: number
      w: number
      h: number
      depth: number
      main: string
      sub?: string
      mainFont: string
      subFont: string
      mainW: number
      subW: number
      pad: number
      dot: number
    }[] = []

    for (const spec0 of this.specs) {
      const spec = o.compact && spec0.sub ? { ...spec0, sub: undefined } : spec0
      const anchor = spec.anchor.localToWorld(this.tmp.copy(spec.point))
      const top = this.tmp2.copy(anchor)
      top.y += spec.lift
      const a = anchor.clone().project(camera)
      const p = top.project(camera)
      if (p.z > 1 || a.z > 1) continue
      const ax = (a.x * 0.5 + 0.5) * width
      const ay = (-a.y * 0.5 + 0.5) * height
      const px = (p.x * 0.5 + 0.5) * width
      const py = (-p.y * 0.5 + 0.5) * height

      const isArea = spec.kind === 'area'
      const size = isArea ? 14 * u : spec.kind === 'sub' ? 11.5 * u : 12.5 * u
      const mainFont = `${isArea ? 700 : 500} ${size}px ${FAMILY}`
      const subFont = `600 ${8.5 * u}px ${FAMILY}`
      ctx.font = mainFont
      const mainW = ctx.measureText(spec.text).width
      let subW = 0
      if (spec.sub) {
        ctx.font = subFont
        setSpacing(ctx, `${1.6 * u}px`)
        subW = ctx.measureText(spec.sub).width
        setSpacing(ctx, '0px')
      }
      const pad = isArea ? 11 * u : 8.5 * u
      const dot = isArea ? 9 * u : 7 * u
      const h = isArea ? 27 * u : 21 * u
      const w = pad * 2 + dot + mainW + (spec.sub ? 7 * u + subW : 0)
      pending.push({ spec, ax, ay, x: px - w / 2, y: py - h, w, h, depth: p.z, main: spec.text, sub: spec.sub, mainFont, subFont, mainW, subW, pad, dot })
    }

    // greedy de-overlap: each label takes the nearest free spot among a few
    // candidates (up first, then sideways), so it stays close to its anchor
    const margin = 3 * u
    const edge = 6 * u
    const overlaps = (x: number, y: number, w: number, h: number) =>
      placed.some((r) => x < r.x + r.w + margin && x + w + margin > r.x && y < r.y + r.h + margin && y + h + margin > r.y)
    for (const L of pending) {
      const stepY = (L.h + margin) * 0.5
      let best: [number, number] = [0, 0]
      let bestCost = Infinity
      for (let k = 0; k <= 10; k++) {
        for (const fx of [0, -0.55, 0.55, -1.05, 1.05]) {
          const dx = fx * (L.w + margin)
          const dy = -k * stepY
          const x = L.x + dx
          const y = L.y + dy
          let cost = Math.abs(dx) * 1.3 + Math.abs(dy)
          if (x < edge || x + L.w > width - edge || y < edge) cost += 400 * u
          if (cost >= bestCost || overlaps(x, y, L.w, L.h)) continue
          best = [dx, dy]
          bestCost = cost
        }
      }
      let [dx, dy] = [best[0] / u, best[1] / u]
      if (o.smooth) {
        const prev = this.offsets.get(L.spec.id) ?? [dx, dy]
        dx = prev[0] + (dx - prev[0]) * 0.2
        dy = prev[1] + (dy - prev[1]) * 0.2
      }
      this.offsets.set(L.spec.id, [dx, dy])
      L.x += dx * u
      L.y += dy * u
      placed.push({ id: L.spec.id, x: L.x, y: L.y, w: L.w, h: L.h })
    }

    // draw back to front (area labels on top)
    ctx.save()
    ctx.globalAlpha = o.alpha
    ctx.textBaseline = 'middle'
    // leader lines first so pills always sit on top of them
    for (const L of pending) {
      const { spec } = L
      const active = spec.id === o.hoverId || spec.id === o.selectedId
      const isArea = spec.kind === 'area'
      const rgb = hexToRgb(spec.color)
      const cx = L.x + L.w / 2
      const bottom = L.y + L.h
      ctx.strokeStyle = `rgba(255,255,255,${active ? 0.75 : 0.38})`
      ctx.lineWidth = Math.max(1, 1 * u)
      ctx.beginPath()
      ctx.moveTo(cx, bottom)
      ctx.lineTo(L.ax, L.ay)
      ctx.stroke()
      ctx.fillStyle = `rgba(${rgb},0.95)`
      ctx.beginPath()
      ctx.arc(L.ax, L.ay, (isArea ? 2.6 : 2.1) * u, 0, Math.PI * 2)
      ctx.fill()
    }

    for (const L of pending) {
      const { spec } = L
      const active = spec.id === o.hoverId || spec.id === o.selectedId
      const isArea = spec.kind === 'area'
      const rgb = hexToRgb(spec.color)
      const cx = L.x + L.w / 2
      const bottom = L.y + L.h

      // pill
      ctx.save()
      const s = active ? 1.07 : 1
      ctx.translate(cx, bottom)
      ctx.scale(s, s)
      ctx.translate(-cx, -bottom)
      ctx.shadowColor = `rgba(${rgb},${active ? 0.55 : 0.28})`
      ctx.shadowBlur = (active ? 16 : 10) * u
      ctx.fillStyle = active ? 'rgba(26,20,52,0.9)' : isArea ? 'rgba(10,10,28,0.72)' : 'rgba(8,10,26,0.62)'
      ctx.beginPath()
      ctx.roundRect(L.x, L.y, L.w, L.h, L.h / 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.lineWidth = (isArea ? 1.3 : 1) * u
      ctx.strokeStyle = active ? `rgba(${rgb},1)` : isArea ? `rgba(${rgb},0.85)` : `rgba(${rgb},0.42)`
      ctx.stroke()

      // color dot
      const midY = L.y + L.h / 2
      let x = L.x + L.pad
      ctx.fillStyle = spec.color
      ctx.shadowColor = spec.color
      ctx.shadowBlur = 6 * u
      ctx.beginPath()
      if (spec.kind === 'sub') {
        const r = L.dot * 0.32
        ctx.moveTo(x + L.dot * 0.35, midY - r)
        ctx.lineTo(x + L.dot * 0.35 + r, midY)
        ctx.lineTo(x + L.dot * 0.35, midY + r)
        ctx.lineTo(x + L.dot * 0.35 - r, midY)
      } else {
        ctx.arc(x + L.dot * 0.35, midY, (isArea ? 3.4 : 2.6) * u, 0, Math.PI * 2)
      }
      ctx.fill()
      ctx.shadowBlur = 0
      x += L.dot

      // text
      ctx.font = L.mainFont
      ctx.fillStyle = isArea ? '#ffffff' : 'rgba(255,255,255,0.94)'
      ctx.fillText(L.main, x, midY + 0.5 * u)
      if (L.sub) {
        x += L.mainW + 7 * u
        ctx.font = L.subFont
        setSpacing(ctx, `${1.6 * u}px`)
        ctx.fillStyle = `rgba(${rgb},0.95)`
        ctx.fillText(L.sub, x, midY + 0.5 * u)
        setSpacing(ctx, '0px')
      }
      ctx.restore()
      this.rects.push({ id: spec.id, x: L.x, y: L.y, w: L.w, h: L.h })
    }
    ctx.restore()
  }
}

function setSpacing(ctx: CanvasRenderingContext2D, v: string) {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
  if ('letterSpacing' in c) c.letterSpacing = v
}
