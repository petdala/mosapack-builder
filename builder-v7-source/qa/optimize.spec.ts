import { expect, test } from '@playwright/test'

interface ScenarioResult {
  inputFill: number
  outputFillBySize: Record<string, number>
  inputFaceLuma: number
  outputFaceLuma: number
  inputGreenBias: number
  outputGreenBias: number
  holeDistanceFromBackground: number
  islandDistanceFromBackground: number
  appendageDistanceFromBackground: number
  hashes: Record<string, string>
}

test('P0 corrections and mosaic grid snapshots stay deterministic', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async (): Promise<ScenarioResult> => {
    const { optimizeForBuild } = await import('/src/lib/optimize.ts')
    const { computeSaliency, renderMosaic, STYLES } = await import('/src/lib/mosaic.ts')

    const side = 256
    const source = document.createElement('canvas')
    source.width = side
    source.height = side
    const context = source.getContext('2d', { willReadFrequently: true })!
    context.fillStyle = '#6c8f68'
    context.fillRect(0, 0, side, side)
    context.fillStyle = 'rgb(150,145,70)'
    context.fillRect(88, 52, 80, 168)
    context.fillStyle = 'rgb(72,76,52)'
    context.fillRect(100, 66, 56, 58)
    context.fillStyle = '#2c5d3f'
    context.fillRect(103, 154, 50, 46)

    const maskData = new Uint8ClampedArray(side * side * 4)
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        const offset = (y * side + x) * 4
        const subject = x >= 88 && x < 168 && y >= 52 && y < 220
        const value = subject ? 255 : 0
        maskData[offset] = value
        maskData[offset + 1] = value
        maskData[offset + 2] = value
        maskData[offset + 3] = 255
      }
    }
    const mask = new ImageData(maskData, side, side)
    const face = { x: 100, y: 66, width: 56, height: 58 }
    const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b
    const meanRegion = (canvas: HTMLCanvasElement, x0: number, y0: number, x1: number, y1: number) => {
      const data = canvas.getContext('2d', { willReadFrequently: true })!.getImageData(x0, y0, x1 - x0, y1 - y0).data
      let r = 0; let g = 0; let b = 0
      for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2] }
      const count = data.length / 4
      return [r / count, g / count, b / count]
    }
    const inputFace = meanRegion(source, 100, 66, 156, 124)
    const inputSkin = [150, 145, 70]
    const inputGreenBias = inputSkin[1] - (inputSkin[0] + inputSkin[1] + inputSkin[2]) / 3
    const inputFill = (80 * 168) / (side * side) * 100
    const outputFillBySize: Record<string, number> = {}
    const hashes: Record<string, string> = {}
    let outputFaceLuma = 0
    let outputGreenBias = 0

    for (const sizeIn of [6, 12, 18, 24]) {
      const optimized = await optimizeForBuild(source, sizeIn, {
        analysisOverride: { mask, face, faces: 1 },
      })
      const out = optimized.canvas
      const outPixels = out.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, out.width, out.height).data
      let nonBackground = 0
      for (let i = 0; i < outPixels.length; i += 4) {
        if (Math.abs(outPixels[i] - 244) + Math.abs(outPixels[i + 1] - 244) + Math.abs(outPixels[i + 2] - 244) > 18) nonBackground++
      }
      outputFillBySize[String(sizeIn)] = Math.round(nonBackground / (out.width * out.height) * 1000) / 10

      if (sizeIn === 12) {
        const center = meanRegion(out, Math.floor(out.width * 0.38), Math.floor(out.height * 0.12), Math.ceil(out.width * 0.62), Math.ceil(out.height * 0.37))
        outputFaceLuma = luma(center[0], center[1], center[2])
        const skin = meanRegion(out, Math.floor(out.width * 0.38), Math.floor(out.height * 0.42), Math.ceil(out.width * 0.62), Math.ceil(out.height * 0.62))
        outputGreenBias = skin[1] - (skin[0] + skin[1] + skin[2]) / 3
      }

      const gridSize = (sizeIn / 6) * 16
      const mosaic = renderMosaic(
        out,
        gridSize,
        STYLES[0],
        { brightness: 0, contrast: 0, background: 0 },
        computeSaliency(out),
        Math.max(10, Math.round(672 / gridSize)),
        12,
      )
      const bytes = new TextEncoder().encode(JSON.stringify(mosaic.grid))
      const digest = await crypto.subtle.digest('SHA-256', bytes)
      hashes[String(sizeIn)] = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    }

    const maskCase = document.createElement('canvas')
    maskCase.width = side
    maskCase.height = side
    const maskContext = maskCase.getContext('2d', { willReadFrequently: true })!
    maskContext.fillStyle = '#6c8f68'
    maskContext.fillRect(0, 0, side, side)
    maskContext.fillStyle = '#b71c1c'
    maskContext.fillRect(72, 20, 112, 216)
    maskContext.fillStyle = '#d09a78'
    maskContext.fillRect(56, 110, 16, 6)

    const defectMaskData = new Uint8ClampedArray(side * side * 4)
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        const offset = (y * side + x) * 4
        const main = x >= 72 && x < 184 && y >= 20 && y < 236
        const appendage = x >= 56 && x < 72 && y >= 110 && y < 116
        const hole = x >= 112 && x < 132 && y >= 160 && y < 180
        const island = x >= 28 && x < 40 && y >= 52 && y < 64
        const value = ((main || appendage || island) && !hole) ? 255 : 0
        defectMaskData[offset] = value
        defectMaskData[offset + 1] = value
        defectMaskData[offset + 2] = value
        defectMaskData[offset + 3] = 255
      }
    }
    const defectMask = new ImageData(defectMaskData, side, side)
    const defectOutput = (await optimizeForBuild(maskCase, 12, {
      analysisOverride: { mask: defectMask, face: null, faces: 0 },
    })).canvas
    const defectPixels = defectOutput.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, defectOutput.width, defectOutput.height).data
    const colorAt = (sourceX: number, sourceY: number) => {
      const x = Math.floor(sourceX / side * defectOutput.width)
      const y = Math.floor(sourceY / side * defectOutput.height)
      const offset = (y * defectOutput.width + x) * 4
      return [defectPixels[offset], defectPixels[offset + 1], defectPixels[offset + 2]]
    }
    const distanceFromBackground = (rgb: number[]) => Math.abs(rgb[0] - 253) + Math.abs(rgb[1] - 253) + Math.abs(rgb[2] - 253)

    return {
      inputFill,
      outputFillBySize,
      inputFaceLuma: luma(inputFace[0], inputFace[1], inputFace[2]),
      outputFaceLuma,
      inputGreenBias,
      outputGreenBias,
      holeDistanceFromBackground: distanceFromBackground(colorAt(122, 170)),
      islandDistanceFromBackground: distanceFromBackground(colorAt(34, 58)),
      appendageDistanceFromBackground: distanceFromBackground(colorAt(62, 113)),
      hashes,
    }
  })

  expect(Object.values(result.outputFillBySize).every((fill) => fill > result.inputFill)).toBe(true)
  expect(result.outputFaceLuma).toBeGreaterThan(result.inputFaceLuma + 20)
  expect(Math.abs(result.outputGreenBias)).toBeLessThan(Math.abs(result.inputGreenBias))
  expect(result.holeDistanceFromBackground).toBeGreaterThan(100)
  expect(result.islandDistanceFromBackground).toBeLessThan(18)
  expect(result.appendageDistanceFromBackground).toBeGreaterThan(100)
  expect(result.hashes).toEqual({
    '6': '1791ac0105a6ca4941573c5c90bd1ade30b4c07b5d390a1738e896414d91b7d3',
    '12': '982714beb3d1d942d609d0824f8b549feff74a8cc9eae1dd88e7b257fddaaea5',
    '18': '31fb58bf08fcf6343189d70612cce535664fe77acc46260837f6184b8f352878',
    '24': '4117ef903d0bc7c860c8e332f4b3a8004f08006cf0858deda3accf3c34e6797e',
  })
})
