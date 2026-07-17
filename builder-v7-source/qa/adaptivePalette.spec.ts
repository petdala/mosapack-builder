import { expect, test } from '@playwright/test'

test('adaptive palette is deterministic, constrained, and improves off-distribution fixtures', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { generateAdaptivePalette, totalPaletteDeltaE } = await import('/src/lib/adaptivePalette.ts')
    const { deltaE00, hexToRgb, rgbToLab } = await import('/src/lib/color.ts')
    const { PALETTE } = await import('/src/lib/palette.ts')

    const fixture = (hexes: string[], repeats: number) => {
      const labs = []
      for (let repeat = 0; repeat < repeats; repeat++) {
        for (let index = 0; index < hexes.length; index++) {
          const rgb = hexToRgb(hexes[index])
          const offset = ((repeat * 7 + index * 11) % 9) - 4
          labs.push(rgbToLab({
            r: Math.max(0, Math.min(255, rgb.r + offset)),
            g: Math.max(0, Math.min(255, rgb.g - Math.round(offset / 2))),
            b: Math.max(0, Math.min(255, rgb.b + Math.round(offset / 3))),
          }))
        }
      }
      return labs
    }
    const teal = fixture(['#08A6A6', '#22C9B7', '#0E6F7A', '#71E0CF', '#163B49', '#F2C7A5', '#F4F4F4'], 34)
    const sunset = fixture(['#FF4F00', '#F58B18', '#F9C84A', '#C52D58', '#72204B', '#341A52', '#11162F'], 34)
    const portrait = fixture(['#E7C6B1', '#CC8E68', '#D9C49F', '#7B3F00', '#4E2D1B', '#1B1B1B', '#F4F4F4', '#7A838C', '#1653A4'], 30)
    const fixed = PALETTE.map((color) => ({ ...rgbToLab(hexToRgb(color.hex)), hex: color.hex, role: 'derived' as const }))
    const weights = (length: number) => Float32Array.from({ length }, (_, index) => 1 + (index % 5) * 0.1)
    const skinMask = Uint8Array.from({ length: portrait.length }, (_, index) => index % 9 < 3 ? 1 : 0)
    const adaptiveTeal = generateAdaptivePalette(teal, weights(teal.length), 12, { seed: 'teal-fixture' })
    const adaptiveSunset = generateAdaptivePalette(sunset, weights(sunset.length), 12, { seed: 'sunset-fixture' })
    const adaptivePortrait = generateAdaptivePalette(portrait, weights(portrait.length), 25, {
      seed: 'portrait-fixture',
      skinMask,
    })
    const repeated = generateAdaptivePalette(portrait, weights(portrait.length), 25, {
      seed: 'portrait-fixture',
      skinMask,
    })
    const minSeparation = (colors: typeof adaptivePortrait.colors) => {
      let minimum = Infinity
      for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) minimum = Math.min(minimum, deltaE00(colors[i], colors[j]))
      }
      return minimum
    }
    const error = (labs: typeof portrait, palette: typeof fixed) => totalPaletteDeltaE(labs, palette)
    return {
      deterministic: JSON.stringify(adaptivePortrait) === JSON.stringify(repeated),
      counts: [adaptiveTeal.colors.length, adaptiveSunset.colors.length, adaptivePortrait.colors.length],
      minimums: [minSeparation(adaptiveTeal.colors), minSeparation(adaptiveSunset.colors), minSeparation(adaptivePortrait.colors)],
      neutralCount: adaptivePortrait.colors.filter((color) => color.role === 'anchor-neutral').length,
      skinCount: adaptivePortrait.colors.filter((color) => color.role === 'anchor-skin').length,
      seed: adaptivePortrait.seed,
      gamutProfileId: adaptivePortrait.gamut_profile_id,
      errors: {
        tealAdaptive: error(teal, adaptiveTeal.colors),
        tealFixed: error(teal, fixed),
        sunsetAdaptive: error(sunset, adaptiveSunset.colors),
        sunsetFixed: error(sunset, fixed),
        portraitAdaptive: error(portrait, adaptivePortrait.colors),
        portraitFixed: error(portrait, fixed),
      },
    }
  })

  expect(result.deterministic).toBe(true)
  expect(result.counts).toEqual([12, 12, 25])
  expect(result.minimums.every((minimum) => minimum >= 8 - 1e-6)).toBe(true)
  expect(result.neutralCount).toBe(3)
  expect(result.skinCount).toBeGreaterThanOrEqual(2)
  expect(result.seed).toMatch(/^[0-9a-f]{8}$/)
  expect(result.gamutProfileId).toBe('srgb-print-safe-v1')
  expect(result.errors.tealAdaptive).toBeLessThanOrEqual(result.errors.tealFixed)
  expect(result.errors.sunsetAdaptive).toBeLessThanOrEqual(result.errors.sunsetFixed)
  expect(result.errors.portraitAdaptive / 270).toBeLessThanOrEqual(result.errors.portraitFixed / 270 + 1)
})

test('near-monochrome input returns an exact palette and completes preview rendering', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { createAdaptiveMosaicPreview, generateAdaptivePalette } = await import('/src/lib/adaptivePalette.ts')
    const { rgbToLab } = await import('/src/lib/color.ts')
    const { computeSaliency, STYLES } = await import('/src/lib/mosaic.ts')

    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const context = canvas.getContext('2d')!
    context.fillStyle = '#777A7C'
    context.fillRect(0, 0, 64, 64)
    context.fillStyle = '#797C7E'
    context.fillRect(20, 20, 24, 24)

    const labs = Array.from({ length: 256 }, (_, index) => rgbToLab({
      r: 119 + index % 3,
      g: 122 + index % 2,
      b: 124 + index % 3,
    }))
    const palette = generateAdaptivePalette(labs, undefined, 25)
    const forcedRelaxation = generateAdaptivePalette(labs, undefined, 25, { minSeparation: 100 })
    const preview = createAdaptiveMosaicPreview(
      canvas,
      16,
      STYLES[0],
      { brightness: 0, contrast: 0, background: 0 },
      computeSaliency(canvas),
      12,
      25,
      false,
    )

    return {
      paletteCount: palette.colors.length,
      relaxedCount: forcedRelaxation.colors.length,
      previewCount: preview.palette.colors.length,
      renderedTiles: preview.mosaic.grid.length,
      canvasWidth: preview.mosaic.displayCanvas.width,
    }
  })

  expect(result).toEqual({
    paletteCount: 25,
    relaxedCount: 25,
    previewCount: 25,
    renderedTiles: 256,
    canvasWidth: 192,
  })

  await page.goto('/?paletteMode=adaptive')
  const monochromeDataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext('2d')!
    context.fillStyle = '#777A7C'
    context.fillRect(0, 0, 512, 512)
    context.fillStyle = '#797C7E'
    context.fillRect(160, 160, 192, 192)
    return canvas.toDataURL('image/png')
  })
  await page.setInputFiles('input[type="file"]', {
    name: 'near-monochrome.png',
    mimeType: 'image/png',
    buffer: Buffer.from(monochromeDataUrl.split(',')[1], 'base64'),
  })
  await expect(page.getByRole('heading', { name: 'Your photo is ready to build' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Use original' }).click()
  await expect(page.getByTestId('real-tile-hero')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Updating…')).toHaveCount(0, { timeout: 30_000 })
  await expect(page.locator('[data-palette-mode="adaptive"]')).toBeVisible()
  await expect(page.getByTestId('adaptive-palette-comparison')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Get my free proof' })).toHaveCount(0)
})
