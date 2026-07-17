import type { MosaicResult } from './mosaic'

export type GroutTone = 'grey' | 'warm'

export interface TileRenderOptions {
  tilePx?: number
  grout?: GroutTone
  forceFlat?: boolean
}

export interface TilePaletteColor {
  hex: string
}

const GROUT: Record<GroutTone, string> = {
  grey: '#D7D9D8',
  warm: '#EEE8DC',
}

function roundedRectPath(
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

function shouldUseFlatRenderer(gridSize: number, forceFlat: boolean | undefined): boolean {
  if (forceFlat != null) return forceFlat
  const lowPower = typeof navigator !== 'undefined' && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2
  return gridSize > 96 || (gridSize > 64 && lowPower)
}

export function renderPhysicalTiles(
  mosaic: Pick<MosaicResult, 'grid' | 'gridSize'>,
  palette: readonly TilePaletteColor[],
  options: TileRenderOptions = {},
): HTMLCanvasElement {
  const tilePx = Math.max(4, Math.round(options.tilePx ?? Math.max(8, Math.floor(672 / mosaic.gridSize))))
  const grout = options.grout ?? 'grey'
  const flat = shouldUseFlatRenderer(mosaic.gridSize, options.forceFlat)
  const canvas = document.createElement('canvas')
  canvas.width = mosaic.gridSize * tilePx
  canvas.height = mosaic.gridSize * tilePx
  const context = canvas.getContext('2d')!
  context.fillStyle = GROUT[grout]
  context.fillRect(0, 0, canvas.width, canvas.height)

  const gap = flat ? Math.max(1, Math.round(tilePx * 0.08)) : Math.max(2, Math.round(tilePx * 0.14))
  const inset = gap / 2
  const size = tilePx - gap
  const radius = flat ? 0 : Math.max(1.5, size * 0.16)

  for (let y = 0; y < mosaic.gridSize; y++) {
    for (let x = 0; x < mosaic.gridSize; x++) {
      const paletteIndex = mosaic.grid[y * mosaic.gridSize + x]
      const color = palette[paletteIndex]
      if (!color) throw new Error(`Tile ${x},${y} references missing palette index ${paletteIndex}.`)
      const left = x * tilePx + inset
      const top = y * tilePx + inset

      if (flat) {
        context.fillStyle = color.hex
        context.fillRect(left, top, size, size)
        continue
      }

      context.save()
      context.shadowColor = 'rgba(28, 30, 31, 0.28)'
      context.shadowBlur = Math.max(1, tilePx * 0.1)
      context.shadowOffsetX = Math.max(0.5, tilePx * 0.035)
      context.shadowOffsetY = Math.max(0.75, tilePx * 0.055)
      roundedRectPath(context, left, top, size, size, radius)
      context.fillStyle = color.hex
      context.fill()
      context.restore()

      context.save()
      roundedRectPath(context, left, top, size, size, radius)
      context.clip()

      context.strokeStyle = 'rgba(255, 255, 255, 0.46)'
      context.lineWidth = Math.max(0.7, tilePx * 0.055)
      context.beginPath()
      context.moveTo(left + radius, top + context.lineWidth / 2)
      context.lineTo(left + size - radius, top + context.lineWidth / 2)
      context.moveTo(left + context.lineWidth / 2, top + radius)
      context.lineTo(left + context.lineWidth / 2, top + size - radius)
      context.stroke()

      context.strokeStyle = 'rgba(20, 20, 20, 0.24)'
      context.lineWidth = Math.max(0.8, tilePx * 0.06)
      context.beginPath()
      context.moveTo(left + radius, top + size - context.lineWidth / 2)
      context.lineTo(left + size - radius, top + size - context.lineWidth / 2)
      context.moveTo(left + size - context.lineWidth / 2, top + radius)
      context.lineTo(left + size - context.lineWidth / 2, top + size - radius)
      context.stroke()

      const glossRadius = Math.max(0.7, tilePx * 0.055)
      context.beginPath()
      context.arc(left + size * 0.29, top + size * 0.27, glossRadius, 0, Math.PI * 2)
      context.fillStyle = 'rgba(255, 255, 255, 0.62)'
      context.fill()
      context.restore()
    }
  }

  return canvas
}

export function renderFramedMockup(tileCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 960
  canvas.height = 720
  const context = canvas.getContext('2d')!

  const wall = context.createLinearGradient(0, 0, 0, canvas.height)
  wall.addColorStop(0, '#F0EFEC')
  wall.addColorStop(0.78, '#E3E0DB')
  wall.addColorStop(1, '#D3CEC7')
  context.fillStyle = wall
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(75, 66, 58, 0.10)'
  context.fillRect(0, 650, canvas.width, 2)

  const artSize = 490
  const mat = 34
  const frame = 24
  const outer = artSize + mat * 2 + frame * 2
  const x = (canvas.width - outer) / 2
  const y = 48

  context.save()
  context.shadowColor = 'rgba(40, 34, 30, 0.34)'
  context.shadowBlur = 28
  context.shadowOffsetY = 18
  context.fillStyle = '#211B18'
  context.fillRect(x, y, outer, outer)
  context.restore()
  context.strokeStyle = '#766B62'
  context.lineWidth = 2
  context.strokeRect(x + 1, y + 1, outer - 2, outer - 2)
  context.fillStyle = '#FBF8F2'
  context.fillRect(x + frame, y + frame, artSize + mat * 2, artSize + mat * 2)
  context.drawImage(tileCanvas, x + frame + mat, y + frame + mat, artSize, artSize)

  const floorShadow = context.createRadialGradient(480, 666, 20, 480, 666, 260)
  floorShadow.addColorStop(0, 'rgba(50, 43, 38, 0.16)')
  floorShadow.addColorStop(1, 'rgba(50, 43, 38, 0)')
  context.fillStyle = floorShadow
  context.fillRect(220, 635, 520, 70)

  return canvas
}
