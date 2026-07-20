import { expect, test } from '@playwright/test'

test('hybrid plans cover every grid cell exactly once', async ({ page }) => {
  await page.goto('/')
  const results = await page.evaluate(async () => {
    const { expandHybridPlanToSingles, planHybridTiles } = await import('/src/lib/qualityPipeline.ts')

    const fixtures = [
      {
        name: 'flat-4',
        gridSize: 4,
        grid: Array.from({ length: 16 }, () => 0),
        mask: new ImageData(4, 4),
      },
      {
        name: 'offset-7',
        gridSize: 7,
        grid: Array.from({ length: 49 }, (_, index) => Math.floor(index / 7) === 3 ? 1 : 0),
        mask: new ImageData(7, 7),
      },
      {
        name: 'subject-48',
        gridSize: 48,
        grid: Array.from({ length: 48 * 48 }, (_, index) => {
          const x = index % 48
          const y = Math.floor(index / 48)
          if (x >= 14 && x < 34 && y >= 8 && y < 42) return (x + Math.floor(y / 3)) % 4
          return Math.floor(x / 12) % 2
        }),
        mask: (() => {
          const mask = new ImageData(48, 48)
          for (let y = 0; y < 48; y++) {
            for (let x = 0; x < 48; x++) {
              const index = (y * 48 + x) * 4
              const subject = x >= 12 && x < 36 && y >= 6 && y < 44
              mask.data[index] = subject ? 255 : 0
              mask.data[index + 3] = 255
            }
          }
          return mask
        })(),
      },
    ]

    return fixtures.map((fixture) => {
      const plan = planHybridTiles({ grid: fixture.grid, gridSize: fixture.gridSize }, fixture.mask)
      const expanded = expandHybridPlanToSingles({ grid: fixture.grid, gridSize: fixture.gridSize }, fixture.mask)
      const coverage = new Uint16Array(fixture.gridSize * fixture.gridSize)
      let area = 0
      let outOfBounds = 0
      for (const tile of plan.tiles) {
        area += tile.width * tile.height
        for (let dy = 0; dy < tile.height; dy++) {
          for (let dx = 0; dx < tile.width; dx++) {
            const x = tile.x + dx
            const y = tile.y + dy
            if (x < 0 || y < 0 || x >= fixture.gridSize || y >= fixture.gridSize) {
              outOfBounds++
            } else {
              coverage[y * fixture.gridSize + x]++
            }
          }
        }
      }
      return {
        name: fixture.name,
        area,
        expectedArea: fixture.gridSize ** 2,
        gaps: Array.from(coverage).filter((count) => count === 0).length,
        overlaps: Array.from(coverage).filter((count) => count > 1).length,
        outOfBounds,
        tileCount: plan.tileCount,
        mergedBlocks: plan.mergedBlocks,
        expandedLength: expanded.tileMap.length,
        expandedMatches: expanded.tileMap.every((value, index) => value === fixture.grid[index]),
      }
    })
  })

  for (const result of results) {
    expect(result.area, result.name).toBe(result.expectedArea)
    expect(result.gaps, result.name).toBe(0)
    expect(result.overlaps, result.name).toBe(0)
    expect(result.outOfBounds, result.name).toBe(0)
    expect(result.tileCount, result.name).toBe(result.expectedArea - 3 * result.mergedBlocks)
    expect(result.expandedLength, result.name).toBe(result.expectedArea)
    expect(result.expandedMatches, result.name).toBe(true)
  }
})

test('quality geometry, feature sampling, coherence, and hybrid planning are deterministic', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const {
      boxSampleSource,
      featureAwareDownscale,
      featureEnergy,
      planHybridTiles,
      selectQualityGeometry,
      suppressIsolatedTiles,
    } = await import('/src/lib/qualityPipeline.ts')

    const source = document.createElement('canvas')
    source.width = 128
    source.height = 128
    const context = source.getContext('2d')!
    context.fillStyle = '#202020'
    context.fillRect(0, 0, 128, 128)
    context.fillStyle = '#F4F4F4'
    context.fillRect(63, 12, 2, 104)
    context.fillRect(12, 63, 104, 2)
    const mask = new ImageData(128, 128)
    mask.data.fill(255)
    const awareA = featureAwareDownscale(source, 32, mask)
    const awareB = featureAwareDownscale(source, 32, mask)
    const box = boxSampleSource(source, 32)

    const flatMosaic = {
      grid: Array.from({ length: 16 }, () => 0),
      gridSize: 4,
      canvas: document.createElement('canvas'),
      displayCanvas: document.createElement('canvas'),
      counts: { '#101010': 16 },
    }
    const backgroundMask = new ImageData(4, 4)
    const subjectMask = new ImageData(4, 4)
    for (let i = 0; i < subjectMask.data.length; i += 4) {
      subjectMask.data[i] = 255
      subjectMask.data[i + 3] = 255
    }
    const backgroundPlan = planHybridTiles(flatMosaic, backgroundMask)
    const subjectPlan = planHybridTiles(flatMosaic, subjectMask)

    const noisyGrid = Array.from({ length: 25 }, () => 0)
    noisyGrid[12] = 1
    const noisyCanvas = document.createElement('canvas')
    noisyCanvas.width = 50
    noisyCanvas.height = 50
    const coherent = suppressIsolatedTiles({
      grid: noisyGrid,
      gridSize: 5,
      canvas: noisyCanvas,
      displayCanvas: noisyCanvas,
      counts: { '#101010': 24, '#F0F0F0': 1 },
    }, [{ hex: '#101010' }, { hex: '#F0F0F0' }])

    return {
      geometry: selectQualityGeometry({
        preferredSizeIn: 12,
        sourceWidth: 1365,
        sourceHeight: 1365,
        faces: 1,
        subjectCoverage: 0.42,
      }),
      deterministicPixels: awareA.toDataURL() === awareB.toDataURL(),
      featureEnergy: featureEnergy(awareA),
      boxEnergy: featureEnergy(box),
      backgroundTiles: backgroundPlan.tileCount,
      backgroundMerged: backgroundPlan.mergedBlocks,
      subjectTiles: subjectPlan.tileCount,
      coherentCenter: coherent.grid[12],
    }
  })

  expect(result.geometry).toEqual({
    gridSize: 48,
    cellSizeIn: 0.375,
    finishedSizeIn: 19.2,
    galleryEligible: true,
    reason: 'portrait-detail',
  })
  expect(result.deterministicPixels).toBe(true)
  expect(result.featureEnergy).toBeGreaterThanOrEqual(result.boxEnergy)
  expect(result.backgroundTiles).toBe(4)
  expect(result.backgroundMerged).toBe(4)
  expect(result.subjectTiles).toBe(16)
  expect(result.coherentCenter).toBe(0)
})

test('quality renderer preserves tile centers and reports exact hybrid count', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { renderQualityTiles } = await import('/src/lib/qualityRenderer.ts')
    const palette = [{ hex: '#123456' }, { hex: '#ABCDEF' }, { hex: '#C40000' }, { hex: '#589E61' }]
    const mosaic = { grid: [0, 1, 2, 3], gridSize: 2 }
    const mask = new ImageData(2, 2)
    for (let i = 0; i < mask.data.length; i += 4) {
      mask.data[i] = 255
      mask.data[i + 3] = 255
    }
    const first = renderQualityTiles(mosaic, palette, { tilePx: 32, subjectMask: mask, edgeBlend: 0.3 })
    const second = renderQualityTiles(mosaic, palette, { tilePx: 32, subjectMask: mask, edgeBlend: 0.3 })
    const context = first.canvas.getContext('2d')!
    const pixel = (x: number, y: number) => Array.from(context.getImageData(x, y, 1, 1).data).slice(0, 3)
    return {
      deterministic: first.canvas.toDataURL() === second.canvas.toDataURL(),
      centers: [pixel(16, 16), pixel(48, 16), pixel(16, 48), pixel(48, 48)],
      tileCount: first.hybrid.tileCount,
      edgeBlend: first.edgeBlend,
      physicalOutput: first.physicalOutput,
    }
  })

  expect(result.deterministic).toBe(true)
  expect(result.centers).toEqual([
    [0x12, 0x34, 0x56],
    [0xAB, 0xCD, 0xEF],
    [0xC4, 0x00, 0x00],
    [0x58, 0x9E, 0x61],
  ])
  expect(result.tileCount).toBe(4)
  expect(result.edgeBlend).toBe(0.3)
  expect(result.physicalOutput).toBe('single-stickers')
})

test('customer renderer keeps grout seams inside visually mergeable 2x2 blocks', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { renderQualityTiles } = await import('/src/lib/qualityRenderer.ts')
    const mask = new ImageData(2, 2)
    for (let index = 0; index < mask.data.length; index += 4) mask.data[index + 3] = 255
    const rendered = renderQualityTiles(
      { grid: [0, 0, 0, 0], gridSize: 2 },
      [{ hex: '#C40000' }],
      { tilePx: 32, subjectMask: mask, fulfillmentMode: 'singles' },
    )
    const context = rendered.canvas.getContext('2d')!
    const pixel = (x: number, y: number) => Array.from(context.getImageData(x, y, 1, 1).data).slice(0, 3)
    return {
      mergedBlocks: rendered.hybrid.mergedBlocks,
      physicalOutput: rendered.physicalOutput,
      tileCenter: pixel(16, 16),
      internalVerticalSeam: pixel(32, 16),
      internalHorizontalSeam: pixel(16, 32),
    }
  })

  expect(result.mergedBlocks).toBe(1)
  expect(result.physicalOutput).toBe('single-stickers')
  expect(result.tileCenter).toEqual([0xC4, 0x00, 0x00])
  expect(result.internalVerticalSeam).not.toEqual(result.tileCenter)
  expect(result.internalHorizontalSeam).not.toEqual(result.tileCenter)
})

test('default portrait preview auto-selects adaptive Gallery-52 at 48 grid', async ({ page }) => {
  await page.goto('/')
  const imageDataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 768
    canvas.height = 768
    const context = canvas.getContext('2d')!
    const gradient = context.createLinearGradient(0, 0, 768, 768)
    gradient.addColorStop(0, '#13A7A0')
    gradient.addColorStop(0.35, '#F2B495')
    gradient.addColorStop(0.65, '#BD2D6F')
    gradient.addColorStop(1, '#1A263E')
    context.fillStyle = gradient
    context.fillRect(0, 0, 768, 768)
    context.fillStyle = '#E7C6B1'
    context.fillRect(220, 150, 330, 410)
    return canvas.toDataURL('image/png')
  })
  await page.setInputFiles('input[type="file"]', {
    name: 'quality-portrait.png',
    mimeType: 'image/png',
    buffer: Buffer.from(imageDataUrl.split(',')[1], 'base64'),
  })
  await expect(page.getByRole('heading', { name: 'Your photo is ready to build' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Use original' }).click()
  const preview = page.locator('[data-quality-pipeline="p2a"]')
  await expect(preview).toBeVisible({ timeout: 60_000 })
  await expect(preview).toHaveAttribute('data-grid-size', '48', { timeout: 60_000 })
  await expect(preview).toHaveAttribute('data-cell-size-in', '0.375')
  await expect(preview).toHaveAttribute('data-finished-size-in', '19.2')
  await expect(preview).toHaveAttribute('data-palette-count', '52', { timeout: 60_000 })
  await expect(preview).toHaveAttribute('data-hybrid-tile-count', /\d+/, { timeout: 60_000 })
  await expect(page.locator('[data-palette-mode="adaptive"]')).toBeVisible()
  await expect(page.getByText('Gallery · 52')).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('button', { name: 'Get my free proof' }).first()).toBeVisible()
})
