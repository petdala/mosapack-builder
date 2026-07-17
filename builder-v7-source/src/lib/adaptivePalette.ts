import { deltaE00, hexToRgb, rgbToLab } from './color'
import type { Lab, RGB } from './color'
import type { FineTune, MosaicResult, Saliency, StylePreset } from './mosaic'
import { PALETTE } from './palette'

export type AdaptivePaletteRole = 'anchor-neutral' | 'anchor-skin' | 'derived'
export type PaletteMode = 'fixed' | 'adaptive'

export interface AdaptivePaletteColor extends Lab {
  hex: string
  role: AdaptivePaletteRole
}

export interface AdaptivePaletteOptions {
  seed?: number | string
  skinMask?: ArrayLike<number>
  restarts?: number
  maxIterations?: number
  minSeparation?: number
  gamutProfileId?: string
}

export interface AdaptivePaletteResult {
  colors: AdaptivePaletteColor[]
  seed: string
  gamut_profile_id: string
}

export interface AdaptiveGridSample {
  labTiles: Lab[]
  weights: Float32Array
  skinMask: Uint8Array
  seed: string
  gridSize: number
}

export interface AdaptiveMosaicPreview {
  mosaic: MosaicResult
  palette: AdaptivePaletteResult
  sample: AdaptiveGridSample
  adaptiveError: number
  fixedError: number
  improvementPct: number
  usedFixedFallback: boolean
}

interface Candidate extends Lab {
  role: AdaptivePaletteRole
  pinned?: boolean
}

interface ClusterRun {
  centroids: Candidate[]
  error: number
}

const DEFAULT_GAMUT_PROFILE_ID = 'srgb-print-safe-v1'
const DEFAULT_MIN_SEPARATION = 8
const NEUTRAL_HEX = ['#1B1B1B', '#F4F4F4', '#7A838C'] as const
const SKIN_FALLBACK_HEX = ['#CC8E68', '#E7C6B1'] as const

function fnv1a(values: Iterable<number>): number {
  let hash = 0x811c9dc5
  for (const value of values) {
    hash ^= value & 0xff
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash || 0x9e3779b9
}

function hashLabs(labs: readonly Lab[]): number {
  const bytes: number[] = []
  for (const lab of labs) {
    const values = [Math.round(lab.L * 100), Math.round((lab.a + 160) * 100), Math.round((lab.b + 160) * 100)]
    for (const value of values) {
      bytes.push(value, value >>> 8, value >>> 16, value >>> 24)
    }
  }
  return fnv1a(bytes)
}

function parseSeed(seed: number | string | undefined, labs: readonly Lab[]): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) return (seed >>> 0) || 1
  if (typeof seed === 'string') return fnv1a(new TextEncoder().encode(seed))
  return hashLabs(labs)
}

function seedHex(seed: number): string {
  return seed.toString(16).padStart(8, '0')
}

function seededRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000
  }
}

function labDistanceSq(a: Lab, b: Lab): number {
  const dL = a.L - b.L
  const da = a.a - b.a
  const db = a.b - b.b
  return dL * dL + da * da + db * db
}

function fromHex(hex: string, role: AdaptivePaletteRole, pinned = true): Candidate {
  return { ...rgbToLab(hexToRgb(hex)), role, pinned }
}

function labToRgbUnclamped(lab: Lab): RGB {
  const fy = (lab.L + 16) / 116
  const fx = fy + lab.a / 500
  const fz = fy - lab.b / 200
  const inverse = (value: number) => {
    const cube = value * value * value
    return cube > 0.008856 ? cube : (value - 16 / 116) / 7.787
  }
  const x = 0.95047 * inverse(fx)
  const y = inverse(fy)
  const z = 1.08883 * inverse(fz)
  const linear = {
    r: x * 3.2404542 + y * -1.5371385 + z * -0.4985314,
    g: x * -0.969266 + y * 1.8760108 + z * 0.041556,
    b: x * 0.0556434 + y * -0.2040259 + z * 1.0572252,
  }
  const encode = (value: number) => 255 * (value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055)
  return { r: encode(linear.r), g: encode(linear.g), b: encode(linear.b) }
}

function inRgbGamut(rgb: RGB): boolean {
  return rgb.r >= 0 && rgb.r <= 255 && rgb.g >= 0 && rgb.g <= 255 && rgb.b >= 0 && rgb.b <= 255
}

function printableLab(lab: Lab, _gamutProfileId: string): Lab {
  const L = Math.max(3, Math.min(97, lab.L))
  let chromaScale = 1
  for (let step = 0; step < 32; step++) {
    const candidate = { L, a: lab.a * chromaScale, b: lab.b * chromaScale }
    const rgb = labToRgbUnclamped(candidate)
    if (inRgbGamut(rgb)) {
      return rgbToLab({ r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b) })
    }
    chromaScale *= 0.9
  }
  return rgbToLab({ r: Math.round(L * 2.55), g: Math.round(L * 2.55), b: Math.round(L * 2.55) })
}

function labToHex(lab: Lab): string {
  const rgb = labToRgbUnclamped(lab)
  const channel = (value: number) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`.toUpperCase()
}

function weightedChoice(scores: readonly number[], rng: () => number): number {
  let total = 0
  for (const score of scores) total += Math.max(0, score)
  if (total <= 1e-12) return Math.floor(rng() * scores.length)
  let target = rng() * total
  for (let i = 0; i < scores.length; i++) {
    target -= Math.max(0, scores[i])
    if (target <= 0) return i
  }
  return scores.length - 1
}

function skinAnchors(labs: readonly Lab[], weights: readonly number[], skinMask: ArrayLike<number> | undefined): Candidate[] {
  if (!skinMask || skinMask.length !== labs.length) return []
  const skin: Array<{ lab: Lab; weight: number }> = []
  for (let i = 0; i < labs.length; i++) {
    if (skinMask[i] > 0 && weights[i] > 0) skin.push({ lab: labs[i], weight: weights[i] })
  }
  if (!skin.length) return []
  return SKIN_FALLBACK_HEX.map((hex) => fromHex(hex, 'anchor-skin'))
}

function initializeCentroids(
  labs: readonly Lab[],
  weights: readonly number[],
  count: number,
  pinned: readonly Candidate[],
  rng: () => number,
): Candidate[] {
  const centroids = pinned.map((color) => ({ ...color }))
  while (centroids.length < count) {
    const scores = labs.map((lab, index) => {
      let nearest = Infinity
      for (const center of centroids) nearest = Math.min(nearest, labDistanceSq(lab, center))
      return weights[index] * (Number.isFinite(nearest) ? nearest : 1)
    })
    const picked = labs[weightedChoice(scores, rng)]
    centroids.push({ ...picked, role: 'derived' })
  }
  return centroids
}

function clusterOnce(
  labs: readonly Lab[],
  weights: readonly number[],
  count: number,
  pinned: readonly Candidate[],
  rng: () => number,
  maxIterations: number,
): ClusterRun {
  const centroids = initializeCentroids(labs, weights, count, pinned, rng)
  const assignments = new Int16Array(labs.length)
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const sums = centroids.map(() => ({ L: 0, a: 0, b: 0, weight: 0 }))
    let changed = false
    for (let i = 0; i < labs.length; i++) {
      let best = 0
      let bestDistance = Infinity
      for (let c = 0; c < centroids.length; c++) {
        const distance = labDistanceSq(labs[i], centroids[c])
        if (distance < bestDistance) { bestDistance = distance; best = c }
      }
      if (assignments[i] !== best) changed = true
      assignments[i] = best
      const weight = weights[i]
      sums[best].L += labs[i].L * weight
      sums[best].a += labs[i].a * weight
      sums[best].b += labs[i].b * weight
      sums[best].weight += weight
    }
    let moved = false
    for (let c = pinned.length; c < centroids.length; c++) {
      const sum = sums[c]
      if (sum.weight <= 1e-12) continue
      const next = { L: sum.L / sum.weight, a: sum.a / sum.weight, b: sum.b / sum.weight }
      if (labDistanceSq(next, centroids[c]) > 1e-6) moved = true
      centroids[c] = { ...next, role: 'derived' }
    }
    if (!changed || !moved) break
  }
  let error = 0
  for (let i = 0; i < labs.length; i++) {
    let nearest = Infinity
    for (const center of centroids) nearest = Math.min(nearest, deltaE00(labs[i], center))
    error += nearest * weights[i]
  }
  return { centroids, error }
}

function gamutCandidates(profileId: string): Candidate[] {
  const candidates: Candidate[] = []
  for (const L of [12, 26, 40, 54, 68, 82, 94]) {
    for (const chroma of [18, 36, 54, 72]) {
      for (let hue = 0; hue < 360; hue += 30) {
        const radians = hue * Math.PI / 180
        const lab = printableLab({ L, a: Math.cos(radians) * chroma, b: Math.sin(radians) * chroma }, profileId)
        candidates.push({ ...lab, role: 'derived' })
      }
    }
  }
  return candidates
}

function enforceConstraints(
  labs: readonly Lab[],
  weights: readonly number[],
  count: number,
  pinned: readonly Candidate[],
  runs: readonly ClusterRun[],
  minSeparation: number,
  profileId: string,
): Candidate[] {
  const chosen = pinned.map((color) => ({ ...printableLab(color, profileId), role: color.role, pinned: true }))
  const pool: Candidate[] = []
  for (const run of runs) {
    for (let i = pinned.length; i < run.centroids.length; i++) {
      pool.push({ ...printableLab(run.centroids[i], profileId), role: 'derived' })
    }
  }
  const stride = Math.max(1, Math.ceil(labs.length / 256))
  for (let i = 0; i < labs.length; i += stride) pool.push({ ...printableLab(labs[i], profileId), role: 'derived' })
  pool.push(...gamutCandidates(profileId))

  const evaluationStride = Math.max(1, Math.ceil(labs.length / 512))
  while (chosen.length < count) {
    let bestIndex = -1
    let bestGain = -Infinity
    for (let candidateIndex = 0; candidateIndex < pool.length; candidateIndex++) {
      const candidate = pool[candidateIndex]
      if (chosen.some((color) => deltaE00(color, candidate) < minSeparation)) continue
      let gain = 0
      for (let i = 0; i < labs.length; i += evaluationStride) {
        let current = Infinity
        for (const color of chosen) current = Math.min(current, deltaE00(labs[i], color))
        gain += weights[i] * Math.max(0, current - deltaE00(labs[i], candidate))
      }
      if (gain > bestGain + 1e-9) { bestGain = gain; bestIndex = candidateIndex }
    }
    if (bestIndex < 0) throw new Error(`Unable to produce ${count} colors at ΔE00 ${minSeparation}.`)
    chosen.push(pool[bestIndex])
    pool.splice(bestIndex, 1)
  }
  return chosen
}

export function generateAdaptivePalette(
  labTiles: readonly Lab[],
  weights: ArrayLike<number> | undefined,
  N: number,
  opts: AdaptivePaletteOptions = {},
): AdaptivePaletteResult {
  if (!Number.isInteger(N) || N < 3) throw new Error('Adaptive palette size must be an integer of at least 3.')
  if (!labTiles.length) throw new Error('Adaptive palette requires at least one Lab tile.')
  if (weights && weights.length !== labTiles.length) throw new Error('Adaptive palette weights must match the Lab tile count.')
  const normalizedWeights = labTiles.map((_, index) => Math.max(0, Number(weights?.[index] ?? 1)))
  if (!normalizedWeights.some((weight) => weight > 0)) normalizedWeights.fill(1)
  const seed = parseSeed(opts.seed, labTiles)
  const profileId = opts.gamutProfileId ?? DEFAULT_GAMUT_PROFILE_ID
  const pinned: Candidate[] = [
    ...NEUTRAL_HEX.map((hex) => fromHex(hex, 'anchor-neutral')),
    ...skinAnchors(labTiles, normalizedWeights, opts.skinMask),
  ]
  if (N < pinned.length) throw new Error(`Adaptive palette size ${N} cannot contain ${pinned.length} required anchors.`)
  const restarts = Math.max(1, Math.min(20, Math.round(opts.restarts ?? 10)))
  const maxIterations = Math.max(1, Math.min(100, Math.round(opts.maxIterations ?? 32)))
  const runs: ClusterRun[] = []
  for (let restart = 0; restart < restarts; restart++) {
    const restartSeed = (seed ^ Math.imul(restart + 1, 0x9e3779b1)) >>> 0
    runs.push(clusterOnce(labTiles, normalizedWeights, N, pinned, seededRng(restartSeed), maxIterations))
  }
  runs.sort((a, b) => a.error - b.error)
  const colors = enforceConstraints(
    labTiles,
    normalizedWeights,
    N,
    pinned,
    runs,
    opts.minSeparation ?? DEFAULT_MIN_SEPARATION,
    profileId,
  ).map((color) => ({ ...color, hex: labToHex(color), role: color.role }))
  return { colors, seed: seedHex(seed), gamut_profile_id: profileId }
}

function isSkinRgb(rgb: RGB): boolean {
  const max = Math.max(rgb.r, rgb.g, rgb.b)
  const min = Math.min(rgb.r, rgb.g, rgb.b)
  return rgb.r > 90 && rgb.r > rgb.g && rgb.g > rgb.b && max - min > 18 && max - min < 150
}

function styledGrid(
  source: HTMLCanvasElement,
  gridSize: number,
  style: StylePreset,
  tune: FineTune,
  saliency: Saliency,
  subjectMask?: ImageData,
): { labs: Lab[]; weights: Float32Array; skinMask: Uint8Array } {
  const small = document.createElement('canvas')
  small.width = gridSize
  small.height = gridSize
  const context = small.getContext('2d', { willReadFrequently: true })!
  context.drawImage(source, 0, 0, gridSize, gridSize)
  const data = context.getImageData(0, 0, gridSize, gridSize).data
  let subjectData: Uint8ClampedArray | null = null
  if (subjectMask) {
    const maskSource = document.createElement('canvas')
    maskSource.width = subjectMask.width
    maskSource.height = subjectMask.height
    maskSource.getContext('2d')!.putImageData(subjectMask, 0, 0)
    const maskTarget = document.createElement('canvas')
    maskTarget.width = gridSize
    maskTarget.height = gridSize
    const maskContext = maskTarget.getContext('2d', { willReadFrequently: true })!
    maskContext.drawImage(maskSource, 0, 0, gridSize, gridSize)
    subjectData = maskContext.getImageData(0, 0, gridSize, gridSize).data
  }
  let lo = 255
  let hi = 0
  for (let i = 0; i < gridSize * gridSize; i++) {
    const luma = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
    lo = Math.min(lo, luma)
    hi = Math.max(hi, luma)
  }
  const range = Math.max(40, hi - lo)
  const brightness = style.brightness + tune.brightness * 18
  const contrast = style.contrast * (1 + tune.contrast * 0.16)
  const backgroundStrength = Math.max(0, Math.min(1.6, style.bgSimplify * (1 + tune.background * 0.35)))
  const subjectWeights = new Float32Array(gridSize * gridSize)
  const raw: RGB[] = new Array(gridSize * gridSize)
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const index = y * gridSize + x
      let r = ((data[index * 4] - lo) / range) * 255
      let g = ((data[index * 4 + 1] - lo) / range) * 255
      let b = ((data[index * 4 + 2] - lo) / range) * 255
      const luma = 0.299 * r + 0.587 * g + 0.114 * b
      r = luma + (r - luma) * style.saturation
      g = luma + (g - luma) * style.saturation
      b = luma + (b - luma) * style.saturation
      raw[index] = {
        r: Math.max(0, Math.min(255, (r - 128) * contrast + 128 + brightness + style.warmth)),
        g: Math.max(0, Math.min(255, (g - 128) * contrast + 128 + brightness + style.warmth * 0.35)),
        b: Math.max(0, Math.min(255, (b - 128) * contrast + 128 + brightness - style.warmth)),
      }
      if (subjectData) {
        subjectWeights[index] = subjectData[index * 4] / 255
      } else {
        const distance = Math.hypot(x / gridSize - saliency.cx, y / gridSize - saliency.cy)
        subjectWeights[index] = Math.max(0, Math.min(1, 1.15 - distance / (saliency.spread * 1.9)))
      }
    }
  }
  const smoothed: RGB[] = new Array(raw.length)
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const index = y * gridSize + x
      const mix = (1 - subjectWeights[index]) * backgroundStrength
      if (mix < 0.05) { smoothed[index] = raw[index]; continue }
      let r = 0
      let g = 0
      let b = 0
      let count = 0
      const radius = mix > 0.8 ? 2 : 1
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const yy = y + dy
          const xx = x + dx
          if (yy < 0 || xx < 0 || yy >= gridSize || xx >= gridSize) continue
          const color = raw[yy * gridSize + xx]
          r += color.r
          g += color.g
          b += color.b
          count++
        }
      }
      const amount = Math.min(1, mix)
      smoothed[index] = {
        r: raw[index].r + (r / count - raw[index].r) * amount,
        g: raw[index].g + (g / count - raw[index].g) * amount,
        b: raw[index].b + (b / count - raw[index].b) * amount,
      }
    }
  }
  const labs = smoothed.map((rgb) => {
    if (!style.mono) return rgbToLab(rgb)
    const luma = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b
    return rgbToLab({ r: luma, g: luma, b: luma })
  })
  const weights = new Float32Array(subjectWeights.length)
  const skinMask = new Uint8Array(subjectWeights.length)
  for (let i = 0; i < weights.length; i++) {
    weights[i] = 1 + subjectWeights[i] * 0.75
    if (labs[i].L < 24) weights[i] *= 0.2
    if (subjectWeights[i] > 0.35 && isSkinRgb(smoothed[i])) {
      skinMask[i] = 1
      weights[i] *= 4
    }
  }
  return { labs, weights, skinMask }
}

export function sampleAdaptiveGrid(
  source: HTMLCanvasElement,
  gridSize: number,
  style: StylePreset,
  tune: FineTune,
  saliency: Saliency,
  subjectMask?: ImageData,
): AdaptiveGridSample {
  const sampled = styledGrid(source, gridSize, style, tune, saliency, subjectMask)
  const seed = seedHex(hashLabs(sampled.labs))
  return { labTiles: sampled.labs, weights: sampled.weights, skinMask: sampled.skinMask, seed, gridSize }
}

function nearestPaletteIndex(lab: Lab, palette: readonly AdaptivePaletteColor[]): number {
  let best = 0
  let distance = Infinity
  for (let i = 0; i < palette.length; i++) {
    const candidate = deltaE00(lab, palette[i])
    if (candidate < distance) { distance = candidate; best = i }
  }
  return best
}

function twoNearestPaletteIndices(lab: Lab, palette: readonly AdaptivePaletteColor[]): [number, number, number] {
  let first = 0
  let second = 0
  let firstDistance = Infinity
  let secondDistance = Infinity
  for (let index = 0; index < palette.length; index++) {
    const distance = deltaE00(lab, palette[index])
    if (distance < firstDistance) {
      secondDistance = firstDistance
      second = first
      firstDistance = distance
      first = index
    } else if (distance < secondDistance) {
      secondDistance = distance
      second = index
    }
  }
  return [first, second, firstDistance / (firstDistance + secondDistance + 1e-9)]
}

function renderAdaptiveGrid(
  sample: AdaptiveGridSample,
  palette: AdaptivePaletteResult,
  tilePx: number,
): MosaicResult {
  let randomState = 12345
  const random = () => ((randomState = (randomState * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  const grid = sample.labTiles.map((lab, index) => {
    const subjectWeight = Math.max(0, Math.min(1, (sample.weights[index] - 1) / 0.75))
    if (subjectWeight <= 0.45) return nearestPaletteIndex(lab, palette.colors)
    const [first, second, secondWeight] = twoNearestPaletteIndices(lab, palette.colors)
    return secondWeight > 0.42 && random() < secondWeight * 0.55 ? second : first
  })
  const counts: Record<string, number> = {}
  for (const index of grid) {
    const key = palette.colors[index].hex
    counts[key] = (counts[key] ?? 0) + 1
  }
  const clean = document.createElement('canvas')
  clean.width = sample.gridSize * tilePx
  clean.height = sample.gridSize * tilePx
  const cleanContext = clean.getContext('2d')!
  for (let y = 0; y < sample.gridSize; y++) {
    for (let x = 0; x < sample.gridSize; x++) {
      cleanContext.fillStyle = palette.colors[grid[y * sample.gridSize + x]].hex
      cleanContext.fillRect(x * tilePx, y * tilePx, tilePx, tilePx)
    }
  }
  const gap = Math.max(1, Math.round(tilePx * 0.09))
  const display = document.createElement('canvas')
  display.width = clean.width
  display.height = clean.height
  const context = display.getContext('2d')!
  context.fillStyle = '#e9e7e2'
  context.fillRect(0, 0, display.width, display.height)
  for (let y = 0; y < sample.gridSize; y++) {
    for (let x = 0; x < sample.gridSize; x++) {
      const x0 = x * tilePx + gap / 2
      const y0 = y * tilePx + gap / 2
      const size = tilePx - gap
      context.fillStyle = palette.colors[grid[y * sample.gridSize + x]].hex
      context.fillRect(x0, y0, size, size)
      context.fillStyle = 'rgba(255,255,255,0.16)'
      context.fillRect(x0, y0, size, Math.max(1, Math.round(size * 0.14)))
      context.fillStyle = 'rgba(0,0,0,0.10)'
      context.fillRect(x0, y0 + size - Math.max(1, Math.round(size * 0.1)), size, Math.max(1, Math.round(size * 0.1)))
    }
  }
  return { canvas: clean, displayCanvas: display, counts, grid, gridSize: sample.gridSize }
}

export function createAdaptiveMosaicPreview(
  source: HTMLCanvasElement,
  gridSize: number,
  style: StylePreset,
  tune: FineTune,
  saliency: Saliency,
  tilePx: number,
  paletteCount: number,
  includeSkinAnchors: boolean,
  subjectMask?: ImageData,
): AdaptiveMosaicPreview {
  const sample = sampleAdaptiveGrid(source, gridSize, style, tune, saliency, subjectMask)
  const palette = generateAdaptivePalette(sample.labTiles, sample.weights, paletteCount, {
    seed: sample.seed,
    skinMask: includeSkinAnchors ? sample.skinMask : undefined,
  })
  const fixedColors: AdaptivePaletteColor[] = PALETTE.slice(0, paletteCount).map((color, index) => ({
    ...rgbToLab(hexToRgb(color.hex)),
    hex: color.hex,
    role: index < 3 ? 'anchor-neutral' : 'derived',
  }))
  const adaptiveError = totalPaletteDeltaE(sample.labTiles, palette.colors, sample.weights)
  const fixedError = totalPaletteDeltaE(sample.labTiles, fixedColors, sample.weights)
  const improvementPct = fixedError > 0 ? ((fixedError - adaptiveError) / fixedError) * 100 : 0
  return {
    mosaic: renderAdaptiveGrid(sample, palette, tilePx),
    palette,
    sample,
    adaptiveError,
    fixedError,
    improvementPct,
    usedFixedFallback: false,
  }
}

export function totalPaletteDeltaE(
  labs: readonly Lab[],
  palette: readonly Pick<AdaptivePaletteColor, 'L' | 'a' | 'b'>[],
  weights?: ArrayLike<number>,
): number {
  let total = 0
  for (let i = 0; i < labs.length; i++) {
    let nearest = Infinity
    for (const color of palette) nearest = Math.min(nearest, deltaE00(labs[i], color))
    total += nearest * Math.max(0, Number(weights?.[i] ?? 1))
  }
  return total
}
