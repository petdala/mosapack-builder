import { expect, test } from '@playwright/test'

test('palette worker is bit-identical to inline math at Gallery and thumbnail scales', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { packLabs } = await import('/src/lib/paletteJob.ts')
    const { runAdaptivePaletteInline, runAdaptivePaletteWorker } = await import('/src/lib/workerBridge.ts')
    const { rgbToLab } = await import('/src/lib/color.ts')

    const fixture = (gridSize: number, paletteSize: number) => {
      const labs = Array.from({ length: gridSize * gridSize }, (_, index) => {
        const x = index % gridSize
        const y = Math.floor(index / gridSize)
        return rgbToLab({
          r: (x * 17 + y * 3 + 31) % 256,
          g: (x * 5 + y * 19 + 73) % 256,
          b: (x * 11 + y * 7 + 127) % 256,
        })
      })
      const weights = Float32Array.from(labs, (_, index) => 1 + (index % 7) * 0.125)
      const paletteLabs = paletteSize > 25
        ? labs.filter((_, index) => index % Math.ceil(labs.length / 256) === 0).slice(0, 256)
        : labs
      const paletteWeights = paletteSize > 25
        ? Float32Array.from(paletteLabs, (_, index) => 1 + (index % 7) * 0.125)
        : weights
      const skinMask = Uint8Array.from(paletteLabs, (_, index) => index % 13 < 3 ? 1 : 0)
      const make = () => ({
        gridLabs: packLabs(labs),
        gridWeights: Float32Array.from(weights),
        paletteLabs: packLabs(paletteLabs),
        paletteWeights: Float32Array.from(paletteWeights),
        skinMask: Uint8Array.from(skinMask),
        paletteCount: paletteSize,
        options: {
          seed: `worker-${gridSize}-${paletteSize}`,
          restarts: paletteSize > 25 ? 1 : 3,
          maxIterations: paletteSize > 25 ? 10 : 18,
        },
      })
      return { make }
    }

    const cases = []
    for (const [gridSize, paletteSize] of [[48, 52], [20, 12]] as const) {
      const { make } = fixture(gridSize, paletteSize)
      const inline = runAdaptivePaletteInline(make())
      const worker = await runAdaptivePaletteWorker(make())
      const repeated = await runAdaptivePaletteWorker(make())
      cases.push({
        inlinePalette: inline.palette,
        workerPalette: worker.palette,
        repeatedPalette: repeated.palette,
        inlineGrid: Array.from(inline.grid),
        workerGrid: Array.from(worker.grid),
        repeatedGrid: Array.from(repeated.grid),
      })
    }
    return cases
  })

  for (const entry of result) {
    expect(entry.workerPalette).toEqual(entry.inlinePalette)
    expect(entry.workerGrid).toEqual(entry.inlineGrid)
    expect(entry.repeatedPalette).toEqual(entry.workerPalette)
    expect(entry.repeatedGrid).toEqual(entry.workerGrid)
  }
  expect(await page.evaluate(() => window.__MOSAPACK_PALETTE_SCHEDULER__)).toBe('worker')
})

test('worker palette generation stays below the main-thread long-task budget', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { packLabs } = await import('/src/lib/paletteJob.ts')
    const { runAdaptivePaletteWorker } = await import('/src/lib/workerBridge.ts')
    const labs = Array.from({ length: 256 }, (_, index) => ({
      L: 12 + (index * 37) % 82,
      a: -65 + (index * 29) % 130,
      b: -70 + (index * 43) % 140,
    }))
    const longTasks: number[] = []
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) longTasks.push(entry.duration)
    })
    observer.observe({ type: 'longtask', buffered: true })
    const paletteLabs = packLabs(labs)
    const started = performance.now()
    const output = await runAdaptivePaletteWorker({
      gridLabs: Float64Array.from(paletteLabs),
      gridWeights: Float32Array.from(labs, () => 1),
      paletteLabs,
      paletteWeights: Float32Array.from(labs, () => 1),
      paletteCount: 52,
      options: { seed: 'long-task-budget', restarts: 1, maxIterations: 10 },
    })
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    observer.disconnect()
    return {
      colors: output.palette.colors.length,
      elapsed: performance.now() - started,
      longest: Math.max(0, ...longTasks),
    }
  })

  expect(result.colors).toBe(52)
  expect(result.longest).toBeLessThanOrEqual(250)
  expect(result.elapsed).toBeLessThan(5_000)
})

test('vision assets preload before a file is selected', async ({ page }) => {
  const requested: string[] = []
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (path.startsWith('/models/')) requested.push(path)
  })
  await page.goto('/')
  await expect.poll(() => new Set(requested).size, { timeout: 10_000 }).toBeGreaterThanOrEqual(3)
  expect(requested).toContain('/models/wasm/vision_wasm_internal.wasm')
  expect(requested).toContain('/models/selfie_segmenter.tflite')
  expect(requested).toContain('/models/blaze_face_short_range.tflite')
  expect(await page.locator('input[type="file"]').evaluate((input) => (input as HTMLInputElement).files?.length ?? 0)).toBe(0)
})

test('unchanged optimize inputs execute pixel passes exactly once', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { optimizeForBuild } = await import('/src/lib/optimize.ts')
    const canvas = document.createElement('canvas')
    canvas.width = 96
    canvas.height = 96
    const context = canvas.getContext('2d')!
    context.fillStyle = '#777777'
    context.fillRect(0, 0, 96, 96)
    const maskData = new Uint8ClampedArray(96 * 96 * 4)
    for (let index = 0; index < 96 * 96; index++) {
      maskData[index * 4] = 255
      maskData[index * 4 + 1] = 255
      maskData[index * 4 + 2] = 255
      maskData[index * 4 + 3] = 255
    }
    const mask = new ImageData(maskData, 96, 96)
    const options = {
      bgMode: 'flatten' as const,
      brightness: 0,
      zoom: 0,
      analysisOverride: { mask, face: null, faces: 0 },
    }
    window.__MOSAPACK_OPTIMIZE_PIXEL_PASSES__ = 0
    const first = await optimizeForBuild(canvas, 12, options)
    const second = await optimizeForBuild(canvas, 12, options)
    return {
      passes: window.__MOSAPACK_OPTIMIZE_PIXEL_PASSES__,
      sameResult: first === second,
    }
  })
  expect(result).toEqual({ passes: 1, sameResult: true })
})
