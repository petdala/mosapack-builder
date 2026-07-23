import {
  generateAdaptivePalette,
  mapAdaptiveGridIndices,
} from './adaptivePalette'
import type {
  AdaptivePaletteOptions,
  AdaptivePaletteResult,
} from './adaptivePalette'
import type { Lab } from './color'

export interface AdaptivePaletteJobInput {
  gridLabs: Float64Array
  gridWeights: Float32Array
  paletteLabs: Float64Array
  paletteWeights: Float32Array
  skinMask?: Uint8Array
  paletteCount: number
  options: Omit<AdaptivePaletteOptions, 'skinMask'>
}

export interface AdaptivePaletteJobResult {
  palette: AdaptivePaletteResult
  grid: Uint16Array
}

export function packLabs(labs: readonly Lab[]): Float64Array {
  const packed = new Float64Array(labs.length * 3)
  for (let index = 0; index < labs.length; index++) {
    packed[index * 3] = labs[index].L
    packed[index * 3 + 1] = labs[index].a
    packed[index * 3 + 2] = labs[index].b
  }
  return packed
}

export function unpackLabs(packed: Float64Array): Lab[] {
  const labs: Lab[] = Array.from({ length: packed.length / 3 })
  for (let index = 0; index < labs.length; index++) {
    labs[index] = {
      L: packed[index * 3],
      a: packed[index * 3 + 1],
      b: packed[index * 3 + 2],
    }
  }
  return labs
}

export function mapPackedAdaptiveGrid(
  gridLabs: Float64Array,
  gridWeights: Float32Array,
  palette: AdaptivePaletteResult,
): Uint16Array {
  return Uint16Array.from(mapAdaptiveGridIndices(unpackLabs(gridLabs), gridWeights, palette.colors))
}

export function runAdaptivePaletteJob(input: AdaptivePaletteJobInput): AdaptivePaletteJobResult {
  const paletteLabs = unpackLabs(input.paletteLabs)
  const gridLabs = input.gridLabs === input.paletteLabs ? paletteLabs : unpackLabs(input.gridLabs)
  const palette = generateAdaptivePalette(
    paletteLabs,
    input.paletteWeights,
    input.paletteCount,
    {
      ...input.options,
      skinMask: input.skinMask,
    },
  )
  return {
    palette,
    grid: Uint16Array.from(mapAdaptiveGridIndices(gridLabs, input.gridWeights, palette.colors)),
  }
}
