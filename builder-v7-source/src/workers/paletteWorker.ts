/// <reference lib="webworker" />

import { mapPackedAdaptiveGrid, runAdaptivePaletteJob } from '../lib/paletteJob'
import type { AdaptivePaletteJobInput } from '../lib/paletteJob'

interface WorkerRequest {
  id: number
  input: AdaptivePaletteJobInput
}

const paletteCache = new Map<string, ReturnType<typeof runAdaptivePaletteJob>['palette']>()

function cacheKey(input: AdaptivePaletteJobInput): string {
  let skinHash = 0x811c9dc5
  for (const value of input.skinMask ?? []) {
    skinHash ^= value
    skinHash = Math.imul(skinHash, 0x01000193) >>> 0
  }
  return JSON.stringify([
    input.options.seed,
    input.paletteCount,
    input.options.restarts,
    input.options.maxIterations,
    input.options.minSeparation,
    input.options.gamutProfileId,
    skinHash,
  ])
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, input } = event.data
  try {
    const key = cacheKey(input)
    const cachedPalette = paletteCache.get(key)
    const result = cachedPalette
      ? {
          palette: cachedPalette,
          grid: mapPackedAdaptiveGrid(input.gridLabs, input.gridWeights, cachedPalette),
        }
      : runAdaptivePaletteJob(input)
    if (!cachedPalette) paletteCache.set(key, result.palette)
    self.postMessage({ id, result }, { transfer: [result.grid.buffer] })
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
