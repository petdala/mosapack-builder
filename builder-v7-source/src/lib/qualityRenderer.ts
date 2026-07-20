import type { MosaicResult } from './mosaic'
import type { GroutTone, TilePaletteColor } from './tileRenderer'
import { planHybridTiles } from './qualityPipeline'
import type { HybridPlan, HybridTile } from './qualityPipeline'

export interface QualityRenderOptions {
  tilePx?: number
  grout?: GroutTone
  subjectMask?: ImageData
  edgeBlend?: number
}

export interface QualityRenderResult {
  canvas: HTMLCanvasElement
  hybrid: HybridPlan
  edgeBlend: number
  physicalOutput: 'printed-blend-tiles-required'
}

const GROUT: Record<GroutTone, string> = { grey: '#D7D9D8', warm: '#EEE8DC' }

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.lineTo(x + width - r, y)
  context.quadraticCurveTo(x + width, y, x + width, y + r)
  context.lineTo(x + width, y + height - r)
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  context.lineTo(x + r, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - r)
  context.lineTo(x, y + r)
  context.quadraticCurveTo(x, y, x + r, y)
  context.closePath()
}

function neighborColor(
  mosaic: Pick<MosaicResult, 'grid' | 'gridSize'>,
  palette: readonly TilePaletteColor[],
  tile: HybridTile,
  side: 'left' | 'right' | 'top' | 'bottom',
): string | null {
  let x = tile.x + Math.floor((tile.width - 1) / 2)
  let y = tile.y + Math.floor((tile.height - 1) / 2)
  if (side === 'left') x = tile.x - 1
  if (side === 'right') x = tile.x + tile.width
  if (side === 'top') y = tile.y - 1
  if (side === 'bottom') y = tile.y + tile.height
  if (x < 0 || y < 0 || x >= mosaic.gridSize || y >= mosaic.gridSize) return null
  const color = palette[mosaic.grid[y * mosaic.gridSize + x]]
  return color?.hex ?? null
}

function drawBoundaryBlend(
  context: CanvasRenderingContext2D,
  mosaic: Pick<MosaicResult, 'grid' | 'gridSize'>,
  palette: readonly TilePaletteColor[],
  tile: HybridTile,
  left: number,
  top: number,
  width: number,
  height: number,
  strength: number,
) {
  if (strength <= 0) return
  const bandX = Math.max(1, width * 0.22)
  const bandY = Math.max(1, height * 0.22)
  const sides = ['left', 'right', 'top', 'bottom'] as const
  for (const side of sides) {
    const color = neighborColor(mosaic, palette, tile, side)
    if (!color || color.toLowerCase() === palette[tile.paletteIndex].hex.toLowerCase()) continue
    let gradient: CanvasGradient
    if (side === 'left') gradient = context.createLinearGradient(left, 0, left + bandX, 0)
    else if (side === 'right') gradient = context.createLinearGradient(left + width, 0, left + width - bandX, 0)
    else if (side === 'top') gradient = context.createLinearGradient(0, top, 0, top + bandY)
    else gradient = context.createLinearGradient(0, top + height, 0, top + height - bandY)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.globalAlpha = strength
    context.fillStyle = gradient
    if (side === 'left') context.fillRect(left, top, bandX, height)
    else if (side === 'right') context.fillRect(left + width - bandX, top, bandX, height)
    else if (side === 'top') context.fillRect(left, top, width, bandY)
    else context.fillRect(left, top + height - bandY, width, bandY)
  }
  context.globalAlpha = 1
}

export function renderQualityTiles(
  mosaic: Pick<MosaicResult, 'grid' | 'gridSize'>,
  palette: readonly TilePaletteColor[],
  options: QualityRenderOptions = {},
): QualityRenderResult {
  const tilePx = Math.max(6, Math.round(options.tilePx ?? Math.max(8, Math.floor(672 / mosaic.gridSize))))
  const edgeBlend = Math.max(0, Math.min(0.4, options.edgeBlend ?? 0.3))
  const hybrid = planHybridTiles(mosaic, options.subjectMask)
  const canvas = document.createElement('canvas')
  canvas.width = mosaic.gridSize * tilePx
  canvas.height = mosaic.gridSize * tilePx
  const context = canvas.getContext('2d')!
  context.fillStyle = GROUT[options.grout ?? 'grey']
  context.fillRect(0, 0, canvas.width, canvas.height)
  const gap = Math.max(2, Math.round(tilePx * 0.14))
  const inset = gap / 2

  for (const tile of hybrid.tiles) {
    const color = palette[tile.paletteIndex]
    if (!color) throw new Error(`Hybrid tile references missing palette index ${tile.paletteIndex}.`)
    const left = tile.x * tilePx + inset
    const top = tile.y * tilePx + inset
    const width = tile.width * tilePx - gap
    const height = tile.height * tilePx - gap
    const radius = Math.max(1.5, Math.min(width, height) * 0.12)
    context.save()
    context.shadowColor = 'rgba(28, 30, 31, 0.25)'
    context.shadowBlur = Math.max(1, tilePx * 0.1)
    context.shadowOffsetX = Math.max(0.5, tilePx * 0.035)
    context.shadowOffsetY = Math.max(0.75, tilePx * 0.055)
    roundedRect(context, left, top, width, height, radius)
    context.fillStyle = color.hex
    context.fill()
    context.restore()

    context.save()
    roundedRect(context, left, top, width, height, radius)
    context.clip()
    drawBoundaryBlend(context, mosaic, palette, tile, left, top, width, height, edgeBlend)
    context.strokeStyle = 'rgba(255,255,255,0.44)'
    context.lineWidth = Math.max(0.7, tilePx * 0.05)
    context.strokeRect(left + context.lineWidth / 2, top + context.lineWidth / 2, width - context.lineWidth, height - context.lineWidth)
    const glossRadius = Math.max(0.7, tilePx * 0.05)
    context.beginPath()
    context.arc(left + width * 0.27, top + height * 0.25, glossRadius, 0, Math.PI * 2)
    context.fillStyle = 'rgba(255,255,255,0.58)'
    context.fill()
    context.restore()
  }

  return { canvas, hybrid, edgeBlend, physicalOutput: 'printed-blend-tiles-required' }
}
