import type { MosaicResult } from './mosaic'
import type { FineTune, Saliency, StylePreset } from './mosaic'
import {
  generateAdaptivePalette,
  renderAdaptiveGrid,
  sampleAdaptiveGrid,
  totalPaletteDeltaE,
} from './adaptivePalette'
import type { AdaptiveMosaicPreview, AdaptivePaletteColor } from './adaptivePalette'
import { hexToRgb, rgbToLab } from './color'
import { PALETTE } from './palette'

export const QUALITY_PIPELINE_FLAG = 'qualityPipeline'
export const QUALITY_CELL_SIZE_IN = 0.375
export const QUALITY_BOARD_PITCH_IN = 0.4

export interface QualityGeometryInput {
  preferredSizeIn: number
  sourceWidth: number
  sourceHeight: number
  faces?: number
  subjectCoverage?: number
}

export interface QualityGeometry {
  gridSize: 32 | 48 | 64
  cellSizeIn: number
  finishedSizeIn: number
  galleryEligible: boolean
  reason: 'recognizability-floor' | 'portrait-detail' | 'large-canvas'
}

export interface QualityPaletteTier {
  id: string
  label: string
  colors: number
  blurb: string
}

export interface HybridTile {
  x: number
  y: number
  width: 1 | 2
  height: 1 | 2
  paletteIndex: number
  merged: boolean
}

export interface HybridPlan {
  tiles: HybridTile[]
  tileCount: number
  uniformTileCount: number
  mergedBlocks: number
}

export const GALLERY_TIER: QualityPaletteTier = {
  id: 'gallery_52',
  label: 'Gallery',
  colors: 52,
  blurb: '52 colors chosen for your photo',
}

export function isQualityPipelineEnabled(search = window.location.search): boolean {
  return new URLSearchParams(search).get(QUALITY_PIPELINE_FLAG) === '1'
}

export function subjectCoverage(mask?: ImageData): number {
  if (!mask?.data.length) return 0
  let subject = 0
  for (let index = 0; index < mask.data.length; index += 4) subject += mask.data[index] / 255
  return subject / (mask.width * mask.height)
}

export function selectQualityGeometry(input: QualityGeometryInput): QualityGeometry {
  const shortestSourceEdge = Math.min(input.sourceWidth, input.sourceHeight)
  const portraitDetail = (input.faces ?? 0) > 0 || (input.subjectCoverage ?? 0) >= 0.16
  let gridSize: 32 | 48 | 64 = 32
  let reason: QualityGeometry['reason'] = 'recognizability-floor'

  if (input.preferredSizeIn >= 24 && shortestSourceEdge >= 768) {
    gridSize = 64
    reason = 'large-canvas'
  } else if (input.preferredSizeIn >= 18 || input.preferredSizeIn >= 12) {
    gridSize = shortestSourceEdge >= 512 ? 48 : 32
    reason = gridSize === 48 && portraitDetail ? 'portrait-detail' : gridSize === 48 ? 'large-canvas' : 'recognizability-floor'
  }

  return {
    gridSize,
    cellSizeIn: QUALITY_CELL_SIZE_IN,
    finishedSizeIn: Number((gridSize * QUALITY_BOARD_PITCH_IN).toFixed(2)),
    galleryEligible: gridSize >= 48 && input.preferredSizeIn >= 12,
    reason,
  }
}

export function qualityPaletteTiers(
  baseTiers: readonly QualityPaletteTier[],
  galleryEligible: boolean,
  adaptive: boolean,
): QualityPaletteTier[] {
  return galleryEligible && adaptive ? [...baseTiers, GALLERY_TIER] : [...baseTiers]
}

export function qualityTierPrice(preferredSizeIn: number, tierId: string, fallback: number): number {
  if (tierId !== GALLERY_TIER.id) return fallback
  if (preferredSizeIn >= 24) return 149
  if (preferredSizeIn >= 18) return 119
  return 89
}

function canvasFromPixels(width: number, height: number, pixels: Uint8ClampedArray): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.putImageData(new ImageData(pixels, width, height), 0, 0)
  return canvas
}

function maskAt(mask: ImageData | undefined, x: number, y: number, width: number, height: number): number {
  if (!mask) return 0
  const mx = Math.min(mask.width - 1, Math.max(0, Math.floor((x / width) * mask.width)))
  const my = Math.min(mask.height - 1, Math.max(0, Math.floor((y / height) * mask.height)))
  return mask.data[(my * mask.width + mx) * 4] / 255
}

function luma(data: Uint8ClampedArray, index: number): number {
  return 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2]
}

export function boxSampleSource(source: HTMLCanvasElement, gridSize: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = gridSize
  canvas.height = gridSize
  canvas.getContext('2d')!.drawImage(source, 0, 0, gridSize, gridSize)
  return canvas
}

export function featureEnergy(canvas: HTMLCanvasElement): number {
  const { width, height } = canvas
  const data = canvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, width, height).data
  let energy = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = (y * width + x) * 4
      energy += Math.abs(luma(data, index + 4) - luma(data, index - 4))
      energy += Math.abs(luma(data, index + width * 4) - luma(data, index - width * 4))
    }
  }
  return energy
}

export function featureAwareDownscale(
  source: HTMLCanvasElement,
  gridSize: number,
  mask?: ImageData,
): HTMLCanvasElement {
  const context = source.getContext('2d', { willReadFrequently: true })!
  const sourceData = context.getImageData(0, 0, source.width, source.height).data
  const output = new Uint8ClampedArray(gridSize * gridSize * 4)
  const cellWidth = source.width / gridSize
  const cellHeight = source.height / gridSize

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const x0 = Math.floor(gx * cellWidth)
      const y0 = Math.floor(gy * cellHeight)
      const x1 = Math.max(x0 + 1, Math.ceil((gx + 1) * cellWidth))
      const y1 = Math.max(y0 + 1, Math.ceil((gy + 1) * cellHeight))
      let red = 0
      let green = 0
      let blue = 0
      let count = 0
      let strongest = -1
      let featureRed = 0
      let featureGreen = 0
      let featureBlue = 0
      for (let y = y0; y < Math.min(source.height, y1); y++) {
        for (let x = x0; x < Math.min(source.width, x1); x++) {
          const index = (y * source.width + x) * 4
          red += sourceData[index]
          green += sourceData[index + 1]
          blue += sourceData[index + 2]
          count++
          const left = (y * source.width + Math.max(0, x - 1)) * 4
          const right = (y * source.width + Math.min(source.width - 1, x + 1)) * 4
          const top = (Math.max(0, y - 1) * source.width + x) * 4
          const bottom = (Math.min(source.height - 1, y + 1) * source.width + x) * 4
          const edge = Math.abs(luma(sourceData, right) - luma(sourceData, left))
            + Math.abs(luma(sourceData, bottom) - luma(sourceData, top))
          if (edge > strongest) {
            strongest = edge
            featureRed = sourceData[index]
            featureGreen = sourceData[index + 1]
            featureBlue = sourceData[index + 2]
          }
        }
      }
      const centerX = (x0 + x1) / 2
      const centerY = (y0 + y1) / 2
      const featureMix = strongest > 20 ? 0.18 + 0.22 * maskAt(mask, centerX, centerY, source.width, source.height) : 0
      const outputIndex = (gy * gridSize + gx) * 4
      output[outputIndex] = Math.round(red / count * (1 - featureMix) + featureRed * featureMix)
      output[outputIndex + 1] = Math.round(green / count * (1 - featureMix) + featureGreen * featureMix)
      output[outputIndex + 2] = Math.round(blue / count * (1 - featureMix) + featureBlue * featureMix)
      output[outputIndex + 3] = 255
    }
  }

  const aware = canvasFromPixels(gridSize, gridSize, output)
  const box = boxSampleSource(source, gridSize)
  return featureEnergy(aware) + 1e-6 >= featureEnergy(box) ? aware : box
}

function redrawMosaic(
  grid: number[],
  gridSize: number,
  palette: readonly { hex: string }[],
  tilePx: number,
): Pick<MosaicResult, 'canvas' | 'displayCanvas' | 'counts'> {
  const canvas = document.createElement('canvas')
  canvas.width = gridSize * tilePx
  canvas.height = gridSize * tilePx
  const context = canvas.getContext('2d')!
  const counts: Record<string, number> = {}
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const color = palette[grid[y * gridSize + x]]
      context.fillStyle = color.hex
      context.fillRect(x * tilePx, y * tilePx, tilePx, tilePx)
      counts[color.hex] = (counts[color.hex] ?? 0) + 1
    }
  }
  return { canvas, displayCanvas: canvas, counts }
}

export function suppressIsolatedTiles(
  mosaic: MosaicResult,
  palette: readonly { hex: string }[],
): MosaicResult {
  const grid = [...mosaic.grid]
  for (let y = 1; y < mosaic.gridSize - 1; y++) {
    for (let x = 1; x < mosaic.gridSize - 1; x++) {
      const index = y * mosaic.gridSize + x
      const frequencies = new Map<number, number>()
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const value = mosaic.grid[(y + dy) * mosaic.gridSize + x + dx]
          frequencies.set(value, (frequencies.get(value) ?? 0) + 1)
        }
      }
      const dominant = [...frequencies.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]
      if (dominant && dominant[1] >= 6 && dominant[0] !== mosaic.grid[index]) grid[index] = dominant[0]
    }
  }
  if (grid.every((value, index) => value === mosaic.grid[index])) return mosaic
  const tilePx = Math.max(1, Math.round(mosaic.canvas.width / mosaic.gridSize))
  return { ...mosaic, ...redrawMosaic(grid, mosaic.gridSize, palette, tilePx), grid }
}

export function planHybridTiles(
  mosaic: Pick<MosaicResult, 'grid' | 'gridSize'>,
  mask?: ImageData,
): HybridPlan {
  const consumed = new Uint8Array(mosaic.grid.length)
  const tiles: HybridTile[] = []
  let mergedBlocks = 0
  const maskCanvas = mask ? document.createElement('canvas') : null
  let maskData: Uint8ClampedArray | null = null
  if (maskCanvas && mask) {
    maskCanvas.width = mask.width
    maskCanvas.height = mask.height
    maskCanvas.getContext('2d')!.putImageData(mask, 0, 0)
    const target = document.createElement('canvas')
    target.width = mosaic.gridSize
    target.height = mosaic.gridSize
    target.getContext('2d')!.drawImage(maskCanvas, 0, 0, mosaic.gridSize, mosaic.gridSize)
    maskData = target.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, mosaic.gridSize, mosaic.gridSize).data
  }

  for (let y = 0; y < mosaic.gridSize; y++) {
    for (let x = 0; x < mosaic.gridSize; x++) {
      const index = y * mosaic.gridSize + x
      if (consumed[index]) continue
      const canMerge = x + 1 < mosaic.gridSize && y + 1 < mosaic.gridSize
      const indices = canMerge
        ? [index, index + 1, index + mosaic.gridSize, index + mosaic.gridSize + 1]
        : [index]
      const available = indices.every((candidate) => !consumed[candidate])
      const sameColor = indices.every((candidate) => mosaic.grid[candidate] === mosaic.grid[index])
      const subjectAverage = maskData
        ? indices.reduce((sum, candidate) => sum + maskData[candidate * 4] / 255, 0) / indices.length
        : 1
      if (canMerge && available && sameColor && subjectAverage < 0.35) {
        indices.forEach((candidate) => { consumed[candidate] = 1 })
        tiles.push({ x, y, width: 2, height: 2, paletteIndex: mosaic.grid[index], merged: true })
        mergedBlocks++
      } else {
        consumed[index] = 1
        tiles.push({ x, y, width: 1, height: 1, paletteIndex: mosaic.grid[index], merged: false })
      }
    }
  }

  return {
    tiles,
    tileCount: tiles.length,
    uniformTileCount: mosaic.grid.length,
    mergedBlocks,
  }
}

export function edgeBlendStrength(styleId: string): number {
  if (styleId === 'bold_graphic') return 0.18
  if (styleId === 'bright_pop') return 0.24
  if (styleId === 'soft_heirloom') return 0.34
  return 0.3
}

export function createQualityAdaptiveMosaicPreview(
  source: HTMLCanvasElement,
  gridSize: number,
  style: StylePreset,
  tune: FineTune,
  saliency: Saliency,
  tilePx: number,
  paletteCount: number,
  includeSkinAnchors: boolean,
  mask?: ImageData,
): AdaptiveMosaicPreview {
  const sample = sampleAdaptiveGrid(source, gridSize, style, tune, saliency, mask)
  const paletteSample = paletteCount > 25 && gridSize > 16
    ? sampleAdaptiveGrid(source, 16, style, tune, saliency, mask)
    : sample
  const palette = generateAdaptivePalette(paletteSample.labTiles, paletteSample.weights, paletteCount, {
    seed: paletteSample.seed,
    skinMask: includeSkinAnchors ? paletteSample.skinMask : undefined,
    restarts: paletteCount > 25 ? 1 : 3,
    maxIterations: paletteCount > 25 ? 10 : 18,
  })
  const fixedColors: AdaptivePaletteColor[] = PALETTE.map((color, index) => ({
    ...rgbToLab(hexToRgb(color.hex)),
    hex: color.hex,
    role: index < 3 ? 'anchor-neutral' : 'derived',
  }))
  const adaptiveError = totalPaletteDeltaE(sample.labTiles, palette.colors, sample.weights)
  const fixedError = totalPaletteDeltaE(sample.labTiles, fixedColors, sample.weights)
  return {
    mosaic: renderAdaptiveGrid(sample, palette, tilePx),
    palette,
    sample,
    adaptiveError,
    fixedError,
    improvementPct: fixedError > 0 ? ((fixedError - adaptiveError) / fixedError) * 100 : 0,
    usedFixedFallback: false,
  }
}
