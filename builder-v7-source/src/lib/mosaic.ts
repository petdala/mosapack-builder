// Mosaic engine — ΔE00 palette matching, saliency auto-crop,
// subject-weighted background simplification (audit fixes C5, U2).
import { PALETTE } from './palette'
import { RGB, Lab, rgbToLab, hexToRgb, deltaE00 } from './color'

export interface StylePreset {
  id: string
  label: string
  blurb: string
  saturation: number // multiplier
  contrast: number // multiplier
  brightness: number // additive -255..255
  warmth: number // additive on r / -b
  bgSimplify: number // 0..1 strength
  mono?: boolean
}

export const STYLES: StylePreset[] = [
  { id: 'true_color', label: 'True Color', blurb: 'Balanced and natural', saturation: 1.0, contrast: 1.05, brightness: 0, warmth: 0, bgSimplify: 0.7 },
  { id: 'bright_pop', label: 'Bright Pop', blurb: 'Colorful and playful', saturation: 1.45, contrast: 1.18, brightness: 10, warmth: 4, bgSimplify: 0.7 },
  { id: 'soft_heirloom', label: 'Soft Heirloom', blurb: 'Warm and gentle', saturation: 0.82, contrast: 0.95, brightness: 14, warmth: 14, bgSimplify: 0.8 },
  { id: 'bold_graphic', label: 'Bold Graphic', blurb: 'Strong contrast', saturation: 1.1, contrast: 1.45, brightness: -4, warmth: 0, bgSimplify: 0.85 },
  { id: 'calm_background', label: 'Calm Background', blurb: 'Subject stands out', saturation: 1.0, contrast: 1.08, brightness: 4, warmth: 0, bgSimplify: 1.0 },
  { id: 'mono_keepsake', label: 'Mono Keepsake', blurb: 'Simple black-and-white', saturation: 1.0, contrast: 1.22, brightness: 4, warmth: 0, bgSimplify: 0.85, mono: true },
]

export interface FineTune {
  brightness: number // -2..2 (0 = auto)
  contrast: number // -2..2
  background: number // -2..2 relative bg simplification
}

const palRgb: RGB[] = PALETTE.map((p) => hexToRgb(p.hex))
const palLab: Lab[] = palRgb.map(rgbToLab)

function nearestIdx(lab: Lab, n = palLab.length): number {
  let best = 0
  let bd = Infinity
  for (let i = 0; i < n; i++) {
    const d = deltaE00(lab, palLab[i])
    if (d < bd) { bd = d; best = i }
  }
  return best
}

/** Two nearest palette indices + normalized closeness of the 2nd (for gentle dithering). */
function twoNearest(lab: Lab, n = palLab.length): [number, number, number] {
  let b1 = 0, b2 = 0, d1 = Infinity, d2 = Infinity
  for (let i = 0; i < n; i++) {
    const d = deltaE00(lab, palLab[i])
    if (d < d1) { d2 = d1; b2 = b1; d1 = d; b1 = i }
    else if (d < d2) { d2 = d; b2 = i }
  }
  return [b1, b2, d1 / (d1 + d2 + 1e-9)]
}

// ---------- saliency: find the subject for auto-crop + weighting ----------
export interface Saliency { cx: number; cy: number; spread: number }

export function computeSaliency(img: HTMLImageElement | HTMLCanvasElement): Saliency {
  const N = 48
  const c = document.createElement('canvas')
  c.width = N; c.height = N
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0, N, N)
  const d = ctx.getImageData(0, 0, N, N).data
  const lum = new Float32Array(N * N)
  for (let i = 0; i < N * N; i++) lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]
  let sw = 0, sx = 0, sy = 0
  const w = new Float32Array(N * N)
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      const i = y * N + x
      const gx = lum[i + 1] - lum[i - 1]
      const gy = lum[i + N] - lum[i - N]
      let e = Math.hypot(gx, gy)
      // skin-tone bonus: faces matter most in this product
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2]
      if (r > 90 && r > g && g > b && r - b > 18 && r - b < 130) e *= 1.9
      // mild center prior
      const cd = Math.hypot(x / N - 0.5, y / N - 0.5)
      e *= 1 - cd * 0.7
      w[i] = e
      sw += e; sx += e * x; sy += e * y
    }
  }
  if (sw < 1e-6) return { cx: 0.5, cy: 0.5, spread: 0.35 }
  const cx = sx / sw / N
  const cy = sy / sw / N
  let sv = 0
  for (let y = 1; y < N - 1; y++)
    for (let x = 1; x < N - 1; x++)
      sv += w[y * N + x] * (Math.pow(x / N - cx, 2) + Math.pow(y / N - cy, 2))
  const spread = Math.sqrt(sv / sw)
  return { cx, cy, spread: Math.max(0.18, Math.min(0.5, spread * 1.9)) }
}

/** Square crop: center (cx, cy) in source pixels, scale ≥ 1 zooms in, rotation in degrees. */
export interface CropState { cx: number; cy: number; scale: number; rotation: number }

export function clampCrop(img: HTMLImageElement, crop: CropState): CropState {
  const side = Math.min(img.naturalWidth, img.naturalHeight) / crop.scale
  const cx = Math.max(side / 2, Math.min(img.naturalWidth - side / 2, crop.cx))
  const cy = Math.max(side / 2, Math.min(img.naturalHeight - side / 2, crop.cy))
  return { ...crop, cx, cy }
}

/** Suggested square crop centered on the subject (auto-crop, audit U2). */
export function autoCrop(img: HTMLImageElement, sal: Saliency): CropState {
  return clampCrop(img, {
    cx: sal.cx * img.naturalWidth,
    cy: sal.cy * img.naturalHeight,
    scale: 1,
    rotation: 0,
  })
}

/** Render the cropped square source at a given pixel size. */
export function renderCrop(img: HTMLImageElement, crop: CropState, out = 640): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = out; c.height = out
  const ctx = c.getContext('2d')!
  const side = Math.min(img.naturalWidth, img.naturalHeight) / crop.scale
  ctx.save()
  ctx.translate(out / 2, out / 2)
  ctx.rotate((crop.rotation * Math.PI) / 180)
  ctx.drawImage(img, crop.cx - side / 2, crop.cy - side / 2, side, side, -out / 2, -out / 2, out, out)
  ctx.restore()
  return c
}

// ---------- the mosaic itself ----------
export interface MosaicResult {
  canvas: HTMLCanvasElement
  counts: Record<string, number>
  grid: number[] // palette indices
  gridSize: number
}

export function renderMosaic(
  source: HTMLCanvasElement,
  gridSize: number,
  style: StylePreset,
  tune: FineTune,
  sal: Saliency,
  tilePx = 14,
  paletteCount = PALETTE.length
): MosaicResult {
  const N = gridSize
  const small = document.createElement('canvas')
  small.width = N; small.height = N
  const sctx = small.getContext('2d')!
  sctx.drawImage(source, 0, 0, N, N)
  const data = sctx.getImageData(0, 0, N, N).data

  // auto exposure: stretch to healthy range before styling
  let lo = 255, hi = 0
  for (let i = 0; i < N * N; i++) {
    const l = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
    if (l < lo) lo = l
    if (l > hi) hi = l
  }
  const range = Math.max(40, hi - lo)
  const bright = style.brightness + tune.brightness * 18
  const contr = style.contrast * (1 + tune.contrast * 0.16)
  const bgStrength = Math.max(0, Math.min(1.6, style.bgSimplify * (1 + tune.background * 0.35)))

  const px = (i: number): RGB => {
    let r = ((data[i * 4] - lo) / range) * 255
    let g = ((data[i * 4 + 1] - lo) / range) * 255
    let b = ((data[i * 4 + 2] - lo) / range) * 255
    // saturation around luma
    const l = 0.299 * r + 0.587 * g + 0.114 * b
    r = l + (r - l) * style.saturation
    g = l + (g - l) * style.saturation
    b = l + (b - l) * style.saturation
    // contrast + brightness + warmth
    r = (r - 128) * contr + 128 + bright + style.warmth
    g = (g - 128) * contr + 128 + bright + style.warmth * 0.35
    b = (b - 128) * contr + 128 + bright - style.warmth
    return {
      r: Math.max(0, Math.min(255, r)),
      g: Math.max(0, Math.min(255, g)),
      b: Math.max(0, Math.min(255, b)),
    }
  }

  // subject weight per cell: 1 at subject center → 0 at far background
  const subjW = new Float32Array(N * N)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dd = Math.hypot(x / N - sal.cx, y / N - sal.cy)
      subjW[y * N + x] = Math.max(0, Math.min(1, 1.15 - dd / (sal.spread * 1.9)))
    }

  // background pre-smoothing: average background cells with neighbors (calms speckle, audit C5)
  const rgbArr: RGB[] = new Array(N * N)
  for (let i = 0; i < N * N; i++) rgbArr[i] = px(i)
  const smoothed: RGB[] = new Array(N * N)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x
      const wsub = subjW[i]
      const mix = (1 - wsub) * bgStrength
      if (mix < 0.05) { smoothed[i] = rgbArr[i]; continue }
      let r = 0, g = 0, b = 0, n = 0
      const rad = mix > 0.8 ? 2 : 1
      for (let dy = -rad; dy <= rad; dy++)
        for (let dx = -rad; dx <= rad; dx++) {
          const yy = y + dy, xx = x + dx
          if (yy < 0 || xx < 0 || yy >= N || xx >= N) continue
          const p = rgbArr[yy * N + xx]
          r += p.r; g += p.g; b += p.b; n++
        }
      const av = { r: r / n, g: g / n, b: b / n }
      const p0 = rgbArr[i]
      const k = Math.min(1, mix)
      smoothed[i] = { r: p0.r + (av.r - p0.r) * k, g: p0.g + (av.g - p0.g) * k, b: p0.b + (av.b - p0.b) * k }
    }
  }

  // ΔE00 quantization; gentle dither on the subject only (detail), flat background
  const grid: number[] = new Array(N * N)
  const counts: Record<string, number> = {}
  let rndState = 12345
  const rnd = () => ((rndState = (rndState * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  for (let i = 0; i < N * N; i++) {
    let c = smoothed[i]
    if (style.mono) { const l = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b; c = { r: l, g: l, b: l } }
    const lab = rgbToLab(c)
    let idx: number
    if (subjW[i] > 0.45) {
      const [b1, b2, w2] = twoNearest(lab, paletteCount)
      idx = w2 > 0.42 && rnd() < w2 * 0.55 ? b2 : b1
    } else {
      idx = nearestIdx(lab, paletteCount)
    }
    grid[i] = idx
    const nm = PALETTE[idx].name
    counts[nm] = (counts[nm] || 0) + 1
  }

  // draw tiles with seams + glaze (physical product feel)
  const GAP = Math.max(1, Math.round(tilePx * 0.09))
  const c = document.createElement('canvas')
  c.width = N * tilePx; c.height = N * tilePx
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#e9e7e2'
  ctx.fillRect(0, 0, c.width, c.height)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const p = palRgb[grid[y * N + x]]
      const x0 = x * tilePx + GAP / 2
      const y0 = y * tilePx + GAP / 2
      const s = tilePx - GAP
      ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`
      ctx.fillRect(x0, y0, s, s)
      // glaze highlight
      ctx.fillStyle = `rgba(255,255,255,0.16)`
      ctx.fillRect(x0, y0, s, Math.max(1, Math.round(s * 0.14)))
      ctx.fillStyle = `rgba(0,0,0,0.10)`
      ctx.fillRect(x0, y0 + s - Math.max(1, Math.round(s * 0.1)), s, Math.max(1, Math.round(s * 0.1)))
    }
  }
  return { canvas: c, counts, grid, gridSize: N }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}
