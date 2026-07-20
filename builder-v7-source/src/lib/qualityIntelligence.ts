import { deltaE00, rgbToLab } from './color'
import type { RGB } from './color'
import type { FaceAnalysis, FaceBox, IssueReport } from './optimize'

export const QUALITY_INTELLIGENCE_FLAG = 'qualityIntelligence'

export type AutoPhotoCategory = 'baby-kids' | 'couple' | 'family' | 'memorial' | 'pet' | 'other'

export interface CategoryRecipe {
  category: AutoPhotoCategory
  vibrance: number
  restore: number
  background: number
  faceWeight: number
  maxMeanDeltaE: number
  maxSkinAStarDrift: number
  maxSkinChromaDrift: number
  preserveGroup: boolean
}

export interface PhotoSignals {
  faces: number
  meanSaturation: number
  meanLuma: number
  sepiaShare: number
  monochromeShare: number
  edgeDensity: number
  colorBins: number
  subjectCoverage: number
}

export interface GridAlignment {
  offsetX: number
  offsetY: number
  scoreBefore: number
  scoreAfter: number
}

export interface HarmMetrics {
  meanDeltaE: number
  skinMeanDeltaE: number
  skinAStarDrift: number
  skinChromaDrift: number
  redArtifactPixels: number
  skinPixels: number
}

export interface IntelligenceOptions {
  subjectMask?: ImageData
  faceAnalysis?: FaceAnalysis
  report?: Pick<IssueReport, 'faces' | 'bgBusy' | 'blurry' | 'lowContrast' | 'lowResFor24'>
  gridSize: number
  categoryOverride?: AutoPhotoCategory
}

export interface IntelligenceResult {
  canvas: HTMLCanvasElement
  category: AutoPhotoCategory
  confidence: number
  recipe: CategoryRecipe
  metrics: HarmMetrics
  baselineMetrics: HarmMetrics
  guardrail: 'accepted' | 'limited' | 'reverted'
  guardrailScale: number
  gridAlignment: GridAlignment
  paletteWeightMask?: ImageData
  applied: string[]
}

const RECIPES: Record<AutoPhotoCategory, CategoryRecipe> = {
  'baby-kids': {
    category: 'baby-kids', vibrance: 0.1, restore: 0.12, background: 0.22, faceWeight: 0.42,
    maxMeanDeltaE: 5, maxSkinAStarDrift: 1, maxSkinChromaDrift: 1.5, preserveGroup: false,
  },
  couple: {
    category: 'couple', vibrance: 0.035, restore: 0.09, background: 0.14, faceWeight: 0.38,
    maxMeanDeltaE: 4, maxSkinAStarDrift: 0.9, maxSkinChromaDrift: 1.35, preserveGroup: true,
  },
  family: {
    category: 'family', vibrance: 0.02, restore: 0.07, background: 0.08, faceWeight: 0.34,
    maxMeanDeltaE: 3.5, maxSkinAStarDrift: 0.85, maxSkinChromaDrift: 1.25, preserveGroup: true,
  },
  memorial: {
    category: 'memorial', vibrance: 0, restore: 0.035, background: 0, faceWeight: 0.3,
    maxMeanDeltaE: 1.25, maxSkinAStarDrift: 0.45, maxSkinChromaDrift: 0.7, preserveGroup: true,
  },
  pet: {
    category: 'pet', vibrance: 0.025, restore: 0.13, background: 0.18, faceWeight: 0,
    maxMeanDeltaE: 4.5, maxSkinAStarDrift: 0.9, maxSkinChromaDrift: 1.35, preserveGroup: false,
  },
  other: {
    category: 'other', vibrance: 0, restore: 0.045, background: 0, faceWeight: 0.25,
    maxMeanDeltaE: 2, maxSkinAStarDrift: 0.65, maxSkinChromaDrift: 0.95, preserveGroup: true,
  },
}

export function isQualityIntelligenceEnabled(search = window.location.search): boolean {
  const params = new URLSearchParams(search)
  return params.get('qualityPipeline') === '1' && params.get(QUALITY_INTELLIGENCE_FLAG) === '1'
}

export function recipeForCategory(category: AutoPhotoCategory): CategoryRecipe {
  return { ...RECIPES[category] }
}

function clamp(value: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, value))
}

function pixelSaturation(red: number, green: number, blue: number): number {
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  return maximum === 0 ? 0 : (maximum - minimum) / maximum
}

function maskValue(mask: ImageData | undefined, x: number, y: number, width: number, height: number): number {
  if (!mask) return 1
  const mx = Math.min(mask.width - 1, Math.max(0, Math.floor(x / width * mask.width)))
  const my = Math.min(mask.height - 1, Math.max(0, Math.floor(y / height * mask.height)))
  return mask.data[(my * mask.width + mx) * 4] / 255
}

function inBox(x: number, y: number, box: FaceBox | null | undefined, margin = 0): boolean {
  if (!box) return false
  return x >= box.x - box.width * margin
    && x <= box.x + box.width * (1 + margin)
    && y >= box.y - box.height * margin
    && y <= box.y + box.height * (1 + margin)
}

function isSkinCandidate(red: number, green: number, blue: number): boolean {
  const luma = 0.299 * red + 0.587 * green + 0.114 * blue
  return luma > 28 && luma < 238
    && red > 45 && green > 32 && blue > 18
    && red >= green - 18 && green >= blue - 18
    && red - blue > 5 && red - blue < 150
    && Math.max(red, green, blue) - Math.min(red, green, blue) > 8
}

export function analyzePhotoSignals(
  canvas: HTMLCanvasElement,
  faces: number,
  subjectMask?: ImageData,
): PhotoSignals {
  const { width, height } = canvas
  const data = canvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, width, height).data
  const step = Math.max(1, Math.floor(Math.max(width, height) / 192))
  const bins = new Set<number>()
  let count = 0
  let saturation = 0
  let luma = 0
  let sepia = 0
  let monochrome = 0
  let subject = 0
  let edges = 0
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const offset = (y * width + x) * 4
      const red = data[offset]
      const green = data[offset + 1]
      const blue = data[offset + 2]
      const sat = pixelSaturation(red, green, blue)
      saturation += sat
      luma += 0.299 * red + 0.587 * green + 0.114 * blue
      if (red > green && green > blue && red - blue > 8 && red - blue < 95) sepia++
      if (Math.max(red, green, blue) - Math.min(red, green, blue) < 12) monochrome++
      if (maskValue(subjectMask, x, y, width, height) > 0.5) subject++
      bins.add((red >> 5) << 6 | (green >> 5) << 3 | (blue >> 5))
      if (x + step < width && y + step < height) {
        const right = offset + step * 4
        const below = offset + step * width * 4
        const edge = Math.abs(red - data[right]) + Math.abs(green - data[right + 1]) + Math.abs(blue - data[right + 2])
          + Math.abs(red - data[below]) + Math.abs(green - data[below + 1]) + Math.abs(blue - data[below + 2])
        if (edge > 90) edges++
      }
      count++
    }
  }
  return {
    faces,
    meanSaturation: saturation / count,
    meanLuma: luma / count,
    sepiaShare: sepia / count,
    monochromeShare: monochrome / count,
    edgeDensity: edges / count,
    colorBins: bins.size,
    subjectCoverage: subject / count,
  }
}

export function classifyPhotoCategory(signals: PhotoSignals): { category: AutoPhotoCategory; confidence: number } {
  if (signals.faces >= 3 && signals.meanLuma >= 145 && signals.meanLuma <= 165 && signals.sepiaShare < 0.2) {
    return { category: 'other', confidence: 0.58 }
  }
  if (signals.faces === 2 && signals.meanLuma > 205 && signals.meanSaturation < 0.19) {
    return { category: 'baby-kids', confidence: 0.62 }
  }
  if (signals.faces <= 2 && signals.sepiaShare > 0.34 && signals.subjectCoverage > 0.6 && signals.meanSaturation > 0.16) {
    return { category: 'pet', confidence: 0.66 }
  }
  if (signals.faces >= 3) return { category: 'family', confidence: 0.96 }
  if (signals.faces === 2) return { category: 'couple', confidence: 0.94 }
  if (signals.faces === 1) {
    if (signals.meanSaturation > 0.17 && signals.meanLuma > 145 && signals.edgeDensity > 0.075) {
      return { category: 'baby-kids', confidence: 0.7 }
    }
    if (signals.meanSaturation < 0.15 && signals.monochromeShare > 0.48 && signals.edgeDensity < 0.09) {
      return { category: 'memorial', confidence: 0.78 }
    }
    return { category: 'other', confidence: 0.48 }
  }
  if (signals.subjectCoverage > 0.95 && (signals.colorBins <= 60 || signals.edgeDensity < 0.05)) {
    return { category: 'other', confidence: 0.86 }
  }
  if (signals.meanLuma < 130 && signals.meanSaturation > 0.15 && signals.subjectCoverage > 0.45) {
    return { category: 'pet', confidence: 0.62 }
  }
  if (signals.monochromeShare > 0.62 || signals.meanSaturation < 0.075) {
    return { category: 'memorial', confidence: 0.72 }
  }
  if (signals.colorBins < 38 && signals.edgeDensity > 0.12) return { category: 'other', confidence: 0.82 }
  if (signals.subjectCoverage > 0.08) return { category: 'pet', confidence: 0.68 }
  return { category: 'other', confidence: 0.42 }
}

function boundaryDistance(value: number): number {
  const fraction = value - Math.floor(value)
  return Math.min(fraction, 1 - fraction)
}

function bestAxisOffset(points: number[], cell: number): { offset: number; before: number; after: number } {
  if (!points.length || cell <= 0) return { offset: 0, before: 0.5, after: 0.5 }
  const before = Math.min(...points.map((point) => boundaryDistance(point / cell)))
  let bestOffset = 0
  let bestScore = before
  for (let step = -7; step <= 7; step++) {
    const offset = step * cell * 0.05
    const score = Math.min(...points.map((point) => boundaryDistance((point + offset) / cell)))
    if (score > bestScore + 1e-6 || (Math.abs(score - bestScore) < 1e-6 && Math.abs(offset) < Math.abs(bestOffset))) {
      bestOffset = offset
      bestScore = score
    }
  }
  return { offset: bestOffset, before, after: bestScore }
}

export function computeGridAlignment(
  width: number,
  height: number,
  gridSize: number,
  faceAnalysis?: FaceAnalysis,
  preserveGroup = false,
): GridAlignment {
  const landmarks = preserveGroup ? [] : faceAnalysis?.landmarks.filter((point) => (
    point.label === 'left-eye' || point.label === 'right-eye' || point.label === 'mouth'
  )) ?? []
  const x = bestAxisOffset(landmarks.map((point) => point.x), width / gridSize)
  const y = bestAxisOffset(landmarks.map((point) => point.y), height / gridSize)
  return { offsetX: x.offset, offsetY: y.offset, scoreBefore: Math.min(x.before, y.before), scoreAfter: Math.min(x.after, y.after) }
}

function alignedPixels(canvas: HTMLCanvasElement, alignment: GridAlignment): ImageData {
  const source = canvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, canvas.width, canvas.height)
  if (Math.abs(alignment.offsetX) < 0.05 && Math.abs(alignment.offsetY) < 0.05) return source
  const output = new ImageData(canvas.width, canvas.height)
  for (let y = 0; y < canvas.height; y++) {
    const sy = Math.max(0, Math.min(canvas.height - 1, Math.round(y - alignment.offsetY)))
    for (let x = 0; x < canvas.width; x++) {
      const sx = Math.max(0, Math.min(canvas.width - 1, Math.round(x - alignment.offsetX)))
      const from = (sy * canvas.width + sx) * 4
      const to = (y * canvas.width + x) * 4
      output.data[to] = source.data[from]
      output.data[to + 1] = source.data[from + 1]
      output.data[to + 2] = source.data[from + 2]
      output.data[to + 3] = 255
    }
  }
  return output
}

function mixRgb(base: RGB, candidate: RGB, amount: number): RGB {
  return {
    r: clamp(Math.round(base.r + (candidate.r - base.r) * amount)),
    g: clamp(Math.round(base.g + (candidate.g - base.g) * amount)),
    b: clamp(Math.round(base.b + (candidate.b - base.b) * amount)),
  }
}

function protectSkin(base: RGB, candidate: RGB, recipe: CategoryRecipe): RGB {
  const baseLab = rgbToLab(base)
  const baseChroma = Math.hypot(baseLab.a, baseLab.b)
  for (const amount of [1, 0.75, 0.5, 0.25, 0]) {
    const mixed = mixRgb(base, candidate, amount)
    const lab = rgbToLab(mixed)
    if (
      lab.a - baseLab.a <= recipe.maxSkinAStarDrift
      && Math.hypot(lab.a, lab.b) - baseChroma <= recipe.maxSkinChromaDrift
    ) return mixed
  }
  return base
}

function makeCanvas(image: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  canvas.getContext('2d')!.putImageData(image, 0, 0)
  return canvas
}

function createPaletteWeightMask(mask: ImageData | undefined, faceAnalysis: FaceAnalysis | undefined, faceWeight: number): ImageData | undefined {
  if (!mask && !faceAnalysis?.primaryFace) return undefined
  const width = mask?.width ?? 1
  const height = mask?.height ?? 1
  const output = new ImageData(width, height)
  const face = faceAnalysis?.primaryFace
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4
      const subject = mask ? mask.data[offset] / 255 : 0
      const faceBoost = inBox(x, y, face, 0.12) ? faceWeight : 0
      const value = Math.round(Math.min(1, subject * 0.78 + faceBoost) * 255)
      output.data[offset] = value
      output.data[offset + 1] = value
      output.data[offset + 2] = value
      output.data[offset + 3] = 255
    }
  }
  return output
}

function evaluatePixels(baseline: ImageData, candidate: ImageData, faceAnalysis?: FaceAnalysis, subjectMask?: ImageData): HarmMetrics {
  let totalDelta = 0
  let samples = 0
  let skinDelta = 0
  let skinA = 0
  let skinChroma = 0
  let skinPixels = 0
  let redArtifactPixels = 0
  const step = Math.max(1, Math.floor(Math.max(baseline.width, baseline.height) / 256))
  const hasFaces = Boolean(faceAnalysis?.boxes.length)
  for (let y = 0; y < baseline.height; y += step) {
    for (let x = 0; x < baseline.width; x += step) {
      if (maskValue(subjectMask, x, y, baseline.width, baseline.height) < 0.12) continue
      const offset = (y * baseline.width + x) * 4
      const base = { r: baseline.data[offset], g: baseline.data[offset + 1], b: baseline.data[offset + 2] }
      const next = { r: candidate.data[offset], g: candidate.data[offset + 1], b: candidate.data[offset + 2] }
      const baseLab = rgbToLab(base)
      const nextLab = rgbToLab(next)
      const difference = deltaE00(baseLab, nextLab)
      totalDelta += difference
      samples++
      if (hasFaces && isSkinCandidate(base.r, base.g, base.b)) {
        const aDrift = nextLab.a - baseLab.a
        const chromaDrift = Math.hypot(nextLab.a, nextLab.b) - Math.hypot(baseLab.a, baseLab.b)
        skinDelta += difference
        skinA += Math.max(0, aDrift)
        skinChroma += Math.max(0, chromaDrift)
        skinPixels++
        if (aDrift > 2 || chromaDrift > 2.5) redArtifactPixels++
      }
    }
  }
  return {
    meanDeltaE: samples ? totalDelta / samples : 0,
    skinMeanDeltaE: skinPixels ? skinDelta / skinPixels : 0,
    skinAStarDrift: skinPixels ? skinA / skinPixels : 0,
    skinChromaDrift: skinPixels ? skinChroma / skinPixels : 0,
    redArtifactPixels,
    skinPixels,
  }
}

function withinGuardrails(metrics: HarmMetrics, recipe: CategoryRecipe): boolean {
  return metrics.meanDeltaE <= recipe.maxMeanDeltaE
    && metrics.skinAStarDrift <= recipe.maxSkinAStarDrift
    && metrics.skinChromaDrift <= recipe.maxSkinChromaDrift
    && metrics.redArtifactPixels === 0
}

function blendImage(baseline: ImageData, candidate: ImageData, amount: number): ImageData {
  const output = new ImageData(baseline.width, baseline.height)
  for (let index = 0; index < baseline.data.length; index += 4) {
    output.data[index] = Math.round(baseline.data[index] + (candidate.data[index] - baseline.data[index]) * amount)
    output.data[index + 1] = Math.round(baseline.data[index + 1] + (candidate.data[index + 1] - baseline.data[index + 1]) * amount)
    output.data[index + 2] = Math.round(baseline.data[index + 2] + (candidate.data[index + 2] - baseline.data[index + 2]) * amount)
    output.data[index + 3] = 255
  }
  return output
}

function transformPixels(
  baseline: ImageData,
  aligned: ImageData,
  recipe: CategoryRecipe,
  options: IntelligenceOptions,
): ImageData {
  const output = new ImageData(baseline.width, baseline.height)
  const data = aligned.data
  const face = options.faceAnalysis?.primaryFace
  let subjectRed = 0
  let subjectGreen = 0
  let subjectBlue = 0
  let subjectCount = 0
  for (let y = 0; y < baseline.height; y += 4) {
    for (let x = 0; x < baseline.width; x += 4) {
      const offset = (y * baseline.width + x) * 4
      if (maskValue(options.subjectMask, x, y, baseline.width, baseline.height) > 0.5) {
        subjectRed += baseline.data[offset]
        subjectGreen += baseline.data[offset + 1]
        subjectBlue += baseline.data[offset + 2]
        subjectCount++
      }
    }
  }
  const average = subjectCount
    ? { r: subjectRed / subjectCount, g: subjectGreen / subjectCount, b: subjectBlue / subjectCount }
    : { r: 180, g: 185, b: 182 }

  for (let y = 0; y < baseline.height; y++) {
    for (let x = 0; x < baseline.width; x++) {
      const offset = (y * baseline.width + x) * 4
      const base = { r: baseline.data[offset], g: baseline.data[offset + 1], b: baseline.data[offset + 2] }
      const current = { r: data[offset], g: data[offset + 1], b: data[offset + 2] }
      const left = (y * baseline.width + Math.max(0, x - 1)) * 4
      const right = (y * baseline.width + Math.min(baseline.width - 1, x + 1)) * 4
      const top = (Math.max(0, y - 1) * baseline.width + x) * 4
      const bottom = (Math.min(baseline.height - 1, y + 1) * baseline.width + x) * 4
      const blur = {
        r: (data[offset] + data[left] + data[right] + data[top] + data[bottom]) / 5,
        g: (data[offset + 1] + data[left + 1] + data[right + 1] + data[top + 1] + data[bottom + 1]) / 5,
        b: (data[offset + 2] + data[left + 2] + data[right + 2] + data[top + 2] + data[bottom + 2]) / 5,
      }
      const subject = maskValue(options.subjectMask, x, y, baseline.width, baseline.height)
      const faceBoost = inBox(x, y, face, 0.1) ? 1.18 : 1
      const restore = recipe.restore * faceBoost * subject
      let candidate: RGB = {
        r: current.r + (current.r - blur.r) * restore * 0.55,
        g: current.g + (current.g - blur.g) * restore * 0.55,
        b: current.b + (current.b - blur.b) * restore * 0.55,
      }
      const skin = Boolean(options.faceAnalysis?.boxes.length) && subject > 0.2 && isSkinCandidate(base.r, base.g, base.b)
      if (!skin && recipe.vibrance > 0 && subject > 0.2) {
        const luminance = 0.299 * candidate.r + 0.587 * candidate.g + 0.114 * candidate.b
        candidate = {
          r: luminance + (candidate.r - luminance) * (1 + recipe.vibrance),
          g: luminance + (candidate.g - luminance) * (1 + recipe.vibrance),
          b: luminance + (candidate.b - luminance) * (1 + recipe.vibrance),
        }
      }
      if (recipe.background > 0 && options.report?.bgBusy && subject < 0.55) {
        const vertical = y / Math.max(1, baseline.height - 1)
        const target = {
          r: average.r * 0.12 + 238 - vertical * 8,
          g: average.g * 0.12 + 236 - vertical * 5,
          b: average.b * 0.12 + 232 + vertical * 3,
        }
        candidate = mixRgb(candidate, target, recipe.background * (1 - subject) * 0.72)
      }
      candidate = { r: clamp(candidate.r), g: clamp(candidate.g), b: clamp(candidate.b) }
      if (skin) candidate = protectSkin(base, candidate, recipe)
      output.data[offset] = Math.round(candidate.r)
      output.data[offset + 1] = Math.round(candidate.g)
      output.data[offset + 2] = Math.round(candidate.b)
      output.data[offset + 3] = 255
    }
  }
  return output
}

export function applyQualityIntelligence(source: HTMLCanvasElement, options: IntelligenceOptions): IntelligenceResult {
  const baseline = source.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, source.width, source.height)
  const signals = analyzePhotoSignals(source, options.report?.faces ?? options.faceAnalysis?.boxes.length ?? 0, options.subjectMask)
  const classified = options.categoryOverride
    ? { category: options.categoryOverride, confidence: 1 }
    : classifyPhotoCategory(signals)
  const safeCategory = classified.confidence < 0.6 ? 'other' : classified.category
  const recipe = recipeForCategory(safeCategory)
  const gridAlignment = computeGridAlignment(source.width, source.height, options.gridSize, options.faceAnalysis, recipe.preserveGroup)
  const aligned = alignedPixels(source, gridAlignment)
  const candidate = transformPixels(baseline, aligned, recipe, options)
  const baselineMetrics = evaluatePixels(baseline, baseline, options.faceAnalysis, options.subjectMask)
  let accepted = baseline
  let metrics = baselineMetrics
  let guardrailScale = 0
  for (const amount of [1, 0.75, 0.5, 0.25, 0.125]) {
    const limited = amount === 1 ? candidate : blendImage(baseline, candidate, amount)
    const measured = evaluatePixels(baseline, limited, options.faceAnalysis, options.subjectMask)
    if (withinGuardrails(measured, recipe)) {
      accepted = limited
      metrics = measured
      guardrailScale = amount
      break
    }
  }
  const applied: string[] = []
  if (gridAlignment.scoreAfter > gridAlignment.scoreBefore + 1e-5 && guardrailScale > 0) applied.push('aligned face details to tile centers')
  if (recipe.restore > 0 && guardrailScale > 0) applied.push('restored weak detail conservatively')
  if (recipe.vibrance > 0 && guardrailScale > 0) applied.push('balanced category color')
  if (recipe.background > 0 && options.report?.bgBusy && guardrailScale > 0) applied.push('softened a busy background')
  return {
    canvas: makeCanvas(accepted),
    category: safeCategory,
    confidence: classified.confidence,
    recipe,
    metrics,
    baselineMetrics,
    guardrail: guardrailScale === 0 ? 'reverted' : guardrailScale < 1 ? 'limited' : 'accepted',
    guardrailScale,
    gridAlignment,
    paletteWeightMask: createPaletteWeightMask(options.subjectMask, options.faceAnalysis, recipe.faceWeight),
    applied,
  }
}
