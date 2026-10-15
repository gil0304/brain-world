import * as THREE from 'three'
import QRCode from 'qrcode'
import { mulberry32 } from './utils'

// All textures are drawn procedurally on canvases — the project ships no image assets.

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  return { c, ctx }
}

function toTexture(c: HTMLCanvasElement, opts: { repeat?: [number, number]; srgb?: boolean } = {}) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace
  t.anisotropy = 8
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(...opts.repeat)
  }
  return t
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/* ---------------------------------------------------------------- circuit */

export interface CircuitTraces {
  texture: THREE.CanvasTexture
  /** traces in UV space (0..1), y down */
  paths: [number, number][][]
}

export function circuitTexture(size = 1024): CircuitTraces {
  const { c, ctx } = canvas(size, size)
  const rnd = mulberry32(42)
  ctx.fillStyle = '#0a1430'
  ctx.fillRect(0, 0, size, size)
  // faint grid
  ctx.strokeStyle = 'rgba(88,182,255,0.07)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 32; i++) {
    const p = (i / 32) * size
    ctx.beginPath()
    ctx.moveTo(p, 0)
    ctx.lineTo(p, size)
    ctx.moveTo(0, p)
    ctx.lineTo(size, p)
    ctx.stroke()
  }
  const paths: [number, number][][] = []
  const g = 16
  const cell = size / g
  for (let n = 0; n < 26; n++) {
    let x = Math.floor(rnd() * g)
    let y = Math.floor(rnd() * g)
    const pts: [number, number][] = [[x, y]]
    let dir = Math.floor(rnd() * 4)
    const steps = 4 + Math.floor(rnd() * 9)
    for (let s = 0; s < steps; s++) {
      if (rnd() < 0.35) dir = (dir + (rnd() < 0.5 ? 1 : 3)) % 4
      const dx = [1, 0, -1, 0][dir]
      const dy = [0, 1, 0, -1][dir]
      const diag = rnd() < 0.3
      x += dx + (diag ? dy : 0)
      y += dy + (diag ? dx : 0)
      if (x < 1 || y < 1 || x > g - 1 || y > g - 1) break
      pts.push([x, y])
    }
    if (pts.length < 3) continue
    paths.push(pts.map(([px, py]) => [(px * cell) / size, (py * cell) / size]))
    ctx.strokeStyle = 'rgba(120,220,255,0.75)'
    ctx.lineWidth = size / 300
    ctx.lineJoin = 'round'
    ctx.beginPath()
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * cell, py * cell) : ctx.moveTo(px * cell, py * cell)))
    ctx.stroke()
    for (const [px, py] of [pts[0], pts[pts.length - 1]]) {
      ctx.fillStyle = '#9ff0ff'
      ctx.beginPath()
      ctx.arc(px * cell, py * cell, size / 140, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#0a1430'
      ctx.beginPath()
      ctx.arc(px * cell, py * cell, size / 330, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // chips
  for (let i = 0; i < 7; i++) {
    const w = (0.06 + rnd() * 0.08) * size
    const h = (0.05 + rnd() * 0.06) * size
    const x = rnd() * (size - w)
    const y = rnd() * (size - h)
    ctx.fillStyle = 'rgba(20,40,80,0.9)'
    ctx.strokeStyle = 'rgba(88,182,255,0.55)'
    ctx.lineWidth = 2
    roundRect(ctx, x, y, w, h, 6)
    ctx.fill()
    ctx.stroke()
  }
  return { texture: toTexture(c), paths }
}

/* ------------------------------------------------------------------ court */

export function courtTexture() {
  const W = 512
  const H = 300
  const { c, ctx } = canvas(W, H)
  // wood
  ctx.fillStyle = '#c98a4a'
  ctx.fillRect(0, 0, W, H)
  const rnd = mulberry32(7)
  for (let y = 0; y < H; y += 12) {
    ctx.fillStyle = `rgba(${120 + rnd() * 40},${70 + rnd() * 20},${30},${0.25})`
    ctx.fillRect(0, y, W, 11)
  }
  ctx.strokeStyle = '#fff6e8'
  ctx.lineWidth = 6
  const m = 14
  ctx.strokeRect(m, m, W - m * 2, H - m * 2)
  ctx.beginPath()
  ctx.moveTo(W / 2, m)
  ctx.lineTo(W / 2, H - m)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(W / 2, H / 2, 42, 0, Math.PI * 2)
  ctx.stroke()
  // keys
  ctx.fillStyle = 'rgba(255,120,60,0.55)'
  for (const side of [0, 1]) {
    const x = side ? W - m - 96 : m
    ctx.fillRect(x, H / 2 - 48, 96, 96)
    ctx.strokeRect(x, H / 2 - 48, 96, 96)
    ctx.beginPath()
    ctx.arc(side ? W - m : m, H / 2, 150, side ? Math.PI / 2 : -Math.PI / 2, side ? Math.PI * 1.5 : Math.PI / 2)
    ctx.stroke()
  }
  return toTexture(c)
}

/* ------------------------------------------------------------------- wood */

export function woodTexture(base = '#9a6440') {
  const { c, ctx } = canvas(256, 256)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 256, 256)
  const rnd = mulberry32(3)
  for (let y = 0; y < 256; y += 32) {
    ctx.fillStyle = `rgba(255,220,180,${0.05 + rnd() * 0.08})`
    ctx.fillRect(0, y, 256, 30)
    ctx.fillStyle = 'rgba(40,20,10,0.55)'
    ctx.fillRect(0, y + 30, 256, 2)
    for (let k = 0; k < 6; k++) {
      ctx.strokeStyle = `rgba(60,30,15,${0.12 + rnd() * 0.1})`
      ctx.beginPath()
      const yy = y + 4 + rnd() * 24
      ctx.moveTo(0, yy)
      ctx.bezierCurveTo(80, yy + rnd() * 4 - 2, 170, yy + rnd() * 4 - 2, 256, yy)
      ctx.stroke()
    }
  }
  return toTexture(c, { repeat: [1, 1] })
}

/* ---------------------------------------------------------------- screens */

export function browserScreenTexture() {
  const W = 512
  const H = 340
  const { c, ctx } = canvas(W, H)
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#132a5c')
  g.addColorStop(1, '#2a1858')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  // chrome bar
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fillRect(0, 0, W, 34)
  ;['#ff6b6b', '#ffd86a', '#7de1b0'].forEach((col, i) => {
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.arc(20 + i * 20, 17, 6, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  roundRect(ctx, 90, 9, 300, 16, 8)
  ctx.fill()
  // hero
  const hg = ctx.createLinearGradient(30, 60, 300, 160)
  hg.addColorStop(0, '#58b6ff')
  hg.addColorStop(1, '#ff6fd8')
  ctx.fillStyle = hg
  roundRect(ctx, 30, 56, 280, 18, 9)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  roundRect(ctx, 30, 86, 220, 10, 5)
  ctx.fill()
  roundRect(ctx, 30, 104, 180, 10, 5)
  ctx.fill()
  ctx.fillStyle = '#3ff2ff'
  roundRect(ctx, 30, 128, 92, 24, 12)
  ctx.fill()
  // hero art
  ctx.fillStyle = 'rgba(255,111,216,0.85)'
  ctx.beginPath()
  ctx.arc(410, 110, 52, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(88,182,255,0.9)'
  roundRect(ctx, 352, 120, 80, 56, 12)
  ctx.fill()
  // cards
  const cols = ['#ffd86a', '#7de1b0', '#af8cff']
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    roundRect(ctx, 30 + i * 158, 196, 142, 118, 12)
    ctx.fill()
    ctx.fillStyle = cols[i]
    roundRect(ctx, 44 + i * 158, 210, 114, 54, 8)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    roundRect(ctx, 44 + i * 158, 276, 90, 8, 4)
    ctx.fill()
    roundRect(ctx, 44 + i * 158, 292, 64, 8, 4)
    ctx.fill()
  }
  return toTexture(c)
}

export function phoneScreenTexture(kind: 'ios' | 'android') {
  const W = 256
  const H = 512
  const { c, ctx } = canvas(W, H)
  const g = ctx.createLinearGradient(0, 0, W, H)
  if (kind === 'ios') {
    g.addColorStop(0, '#6a5cff')
    g.addColorStop(0.55, '#ff6fd8')
    g.addColorStop(1, '#ffb36a')
  } else {
    g.addColorStop(0, '#0f3d2e')
    g.addColorStop(0.6, '#1d7a55')
    g.addColorStop(1, '#3ddc84')
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const rnd = mulberry32(kind === 'ios' ? 11 : 12)
  const palette =
    kind === 'ios'
      ? ['#ffffff', '#58b6ff', '#7de1b0', '#ffd86a', '#ff6b6b', '#af8cff', '#3ff2ff', '#ff9a57']
      : ['#e8fff3', '#3ddc84', '#58b6ff', '#ffd86a', '#ff6b6b', '#ffffff', '#9ff0c8', '#ffb36a']
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = '600 44px Outfit, sans-serif'
  ctx.textAlign = 'center'
  if (kind === 'android') {
    ctx.fillText('10:24', W / 2, 110)
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    roundRect(ctx, 24, 140, W - 48, 34, 17)
    ctx.fill()
  } else {
    ctx.fillText('9:41', W / 2, 96)
  }
  const top = kind === 'android' ? 220 : 150
  for (let r = 0; r < 4; r++) {
    for (let q = 0; q < 4; q++) {
      ctx.fillStyle = palette[Math.floor(rnd() * palette.length)]
      const x = 24 + q * 56
      const y = top + r * 62
      if (kind === 'ios') {
        roundRect(ctx, x, y, 42, 42, 11)
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.arc(x + 21, y + 21, 21, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
  // dock
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  roundRect(ctx, 14, H - 86, W - 28, 66, 22)
  ctx.fill()
  for (let q = 0; q < 4; q++) {
    ctx.fillStyle = palette[(q * 3) % palette.length]
    if (kind === 'ios') {
      roundRect(ctx, 28 + q * 56, H - 74, 42, 42, 11)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.arc(49 + q * 56, H - 53, 21, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  return toTexture(c)
}

export function windowsTexture(tint = '#7fd8ff') {
  const { c, ctx } = canvas(128, 256)
  ctx.fillStyle = '#0b1530'
  ctx.fillRect(0, 0, 128, 256)
  const rnd = mulberry32(99)
  for (let y = 10; y < 250; y += 20) {
    for (let x = 10; x < 120; x += 22) {
      const on = rnd() < 0.55
      ctx.fillStyle = on ? tint : 'rgba(127,216,255,0.08)'
      ctx.globalAlpha = on ? 0.5 + rnd() * 0.5 : 1
      ctx.fillRect(x, y, 14, 10)
    }
  }
  ctx.globalAlpha = 1
  return toTexture(c)
}

/* ------------------------------------------------------------------ anime */

export function scrollTexture() {
  const W = 256
  const H = 512
  const { c, ctx } = canvas(W, H)
  ctx.fillStyle = '#efe2c4'
  ctx.fillRect(0, 0, W, H)
  const g = ctx.createLinearGradient(0, 0, W, 0)
  g.addColorStop(0, 'rgba(120,80,40,0.25)')
  g.addColorStop(0.15, 'rgba(0,0,0,0)')
  g.addColorStop(0.85, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(120,80,40,0.25)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#b5402a'
  ctx.lineWidth = 6
  ctx.strokeRect(22, 22, W - 44, H - 44)
  ctx.fillStyle = '#1e1a2e'
  ctx.font = '700 168px "Zen Maru Gothic", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('忍', W / 2, H * 0.4)
  // swirl seal
  ctx.strokeStyle = '#d4462e'
  ctx.lineWidth = 7
  ctx.beginPath()
  for (let i = 0; i <= 120; i++) {
    const a = i * 0.16
    const r = 3 + i * 0.32
    const x = W / 2 + Math.cos(a) * r
    const y = H * 0.76 + Math.sin(a) * r
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  }
  ctx.stroke()
  return toTexture(c)
}

export function saunaSignTexture() {
  const { c, ctx } = canvas(256, 128)
  ctx.fillStyle = '#4a2e1f'
  roundRect(ctx, 0, 0, 256, 128, 18)
  ctx.fill()
  ctx.strokeStyle = '#ffcf8a'
  ctx.lineWidth = 5
  roundRect(ctx, 8, 8, 240, 112, 14)
  ctx.stroke()
  // hot-spring mark, hand drawn
  ctx.strokeStyle = '#ff8a5c'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.ellipse(66, 86, 34, 14, 0, 0, Math.PI * 2)
  ctx.stroke()
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath()
    const x = 66 + i * 18
    ctx.moveTo(x, 70)
    ctx.bezierCurveTo(x - 10, 56, x + 10, 46, x, 30)
    ctx.stroke()
  }
  ctx.fillStyle = '#ffe9c9'
  ctx.font = '700 40px Outfit, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('SAUNA', 112, 66)
  return toTexture(c)
}

/* ------------------------------------------------------------------- misc */

export function qrMatrix(text: string) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  return { size: qr.modules.size, get: (x: number, y: number) => qr.modules.get(y, x) === 1 }
}

export function qrTexture(text: string) {
  const m = qrMatrix(text)
  const px = 12
  const pad = 3
  const S = (m.size + pad * 2) * px
  const { c, ctx } = canvas(S, S)
  ctx.fillStyle = '#0b0a14'
  ctx.fillRect(0, 0, S, S)
  ctx.fillStyle = '#fff6d6'
  for (let y = 0; y < m.size; y++)
    for (let x = 0; x < m.size; x++)
      if (m.get(x, y)) ctx.fillRect((x + pad) * px, (y + pad) * px, px, px)
  const t = toTexture(c)
  t.magFilter = THREE.NearestFilter
  t.minFilter = THREE.LinearMipmapLinearFilter
  return t
}

export function paintingTexture() {
  const { c, ctx } = canvas(256, 192)
  ctx.fillStyle = '#fbf6ec'
  ctx.fillRect(0, 0, 256, 192)
  const rnd = mulberry32(5)
  const cols = ['#ff6fd8', '#58b6ff', '#ffd86a', '#7de1b0', '#af8cff', '#ff9a57']
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = cols[i % cols.length]
    ctx.globalAlpha = 0.75
    ctx.beginPath()
    ctx.arc(rnd() * 256, rnd() * 192, 14 + rnd() * 34, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  return toTexture(c)
}

export function radialGlowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const { c, ctx } = canvas(256, 256)
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return toTexture(c)
}
