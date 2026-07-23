import {
  renderAdaptiveGrid,
  sampleAdaptiveGrid,
  totalPaletteDeltaE,
} from './adaptivePalette'
import type {
  AdaptiveMosaicPreview,
  AdaptivePaletteColor,
} from './adaptivePalette'
import { hexToRgb, rgbToLab } from './color'
import type { FineTune, Saliency, StylePreset } from './mosaic'
import { packLabs } from './paletteJob'
import { runAdaptivePaletteWorker } from './workerBridge'

export interface AdaptivePreviewWorkerOptions {
  source: HTMLCanvasElement
  gridSize: number
  style: StylePreset
  tune: FineTune
  saliency: Saliency
  tilePx: number
  paletteCount: number
  includeSkinAnchors: boolean
  subjectMask?: ImageData
  fixedPalette: readonly { hex: string }[]
  quality: boolean
}

export async function createAdaptiveMosaicPreviewWorker(
  options: AdaptivePreviewWorkerOptions,
): Promise<AdaptiveMosaicPreview> {
  const sample = sampleAdaptiveGrid(
    options.source,
    options.gridSize,
    options.style,
    options.tune,
    options.saliency,
    options.subjectMask,
  )
  const paletteSample = options.quality && options.paletteCount > 25 && options.gridSize > 16
    ? sampleAdaptiveGrid(
        options.source,
        16,
        options.style,
        options.tune,
        options.saliency,
        options.subjectMask,
      )
    : sample
  const result = await runAdaptivePaletteWorker({
    gridLabs: packLabs(sample.labTiles),
    gridWeights: Float32Array.from(sample.weights),
    paletteLabs: packLabs(paletteSample.labTiles),
    paletteWeights: Float32Array.from(paletteSample.weights),
    skinMask: options.includeSkinAnchors
      ? Uint8Array.from(paletteSample.skinMask)
      : undefined,
    paletteCount: options.paletteCount,
    options: options.quality
      ? {
          seed: paletteSample.seed,
          restarts: options.paletteCount > 25 ? 1 : 3,
          maxIterations: options.paletteCount > 25 ? 10 : 18,
        }
      : { seed: paletteSample.seed },
  })
  const fixedComparison = options.quality
    ? options.fixedPalette
    : options.fixedPalette.slice(0, options.paletteCount)
  const fixedColors: AdaptivePaletteColor[] = fixedComparison.map((color, index) => ({
    ...rgbToLab(hexToRgb(color.hex)),
    hex: color.hex,
    role: index < 3 ? 'anchor-neutral' : 'derived',
  }))
  const adaptiveError = totalPaletteDeltaE(sample.labTiles, result.palette.colors, sample.weights)
  const fixedError = totalPaletteDeltaE(sample.labTiles, fixedColors, sample.weights)
  return {
    mosaic: renderAdaptiveGrid(sample, result.palette, options.tilePx, result.grid),
    palette: result.palette,
    sample,
    adaptiveError,
    fixedError,
    improvementPct: fixedError > 0 ? ((fixedError - adaptiveError) / fixedError) * 100 : 0,
    usedFixedFallback: false,
  }
}
