import { expect, test } from '@playwright/test'

test('physical tile centers preserve the exact tile-map palette colors', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { renderPhysicalTiles, renderFramedMockup } = await import('/src/lib/tileRenderer.ts')
    const palette = [{ hex: '#123456' }, { hex: '#ABCDEF' }, { hex: '#C40000' }, { hex: '#589E61' }]
    const mosaic = { grid: [0, 1, 2, 3], gridSize: 2 }
    const rendered = renderPhysicalTiles(mosaic, palette, { tilePx: 24, grout: 'grey' })
    const context = rendered.getContext('2d')!
    const pixel = (x: number, y: number) => Array.from(context.getImageData(x, y, 1, 1).data).slice(0, 3)
    const framed = renderFramedMockup(rendered)
    return {
      centers: [pixel(12, 12), pixel(36, 12), pixel(12, 36), pixel(36, 36)],
      dimensions: [rendered.width, rendered.height],
      framedDimensions: [framed.width, framed.height],
    }
  })

  expect(result.centers).toEqual([
    [0x12, 0x34, 0x56],
    [0xAB, 0xCD, 0xEF],
    [0xC4, 0x00, 0x00],
    [0x58, 0x9E, 0x61],
  ])
  expect(result.dimensions).toEqual([48, 48])
  expect(result.framedDimensions).toEqual([960, 720])
})

test('curated variants are deterministic and distinct', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { CURATED_VARIANTS, curatedVariantStyle } = await import('/src/lib/magicResults.ts')
    const { computeSaliency, renderMosaic } = await import('/src/lib/mosaic.ts')
    const source = document.createElement('canvas')
    source.width = 192
    source.height = 192
    const context = source.getContext('2d')!
    const gradient = context.createLinearGradient(0, 0, 192, 192)
    gradient.addColorStop(0, '#0BA7A5')
    gradient.addColorStop(0.35, '#F04E78')
    gradient.addColorStop(0.7, '#F3A127')
    gradient.addColorStop(1, '#182B4D')
    context.fillStyle = gradient
    context.fillRect(0, 0, 192, 192)
    context.fillStyle = '#E7C6B1'
    context.fillRect(56, 42, 80, 104)
    const saliency = computeSaliency(source)
    const render = (id: string) => renderMosaic(
      source,
      32,
      curatedVariantStyle(id),
      { brightness: 0, contrast: 0, background: 0 },
      saliency,
      8,
      25,
    ).grid.join(',')
    const first = CURATED_VARIANTS.map((variant) => render(variant.id))
    const second = CURATED_VARIANTS.map((variant) => render(variant.id))
    return { first, second }
  })

  expect(result.first).toEqual(result.second)
  expect(new Set(result.first).size).toBe(4)
})

test('selecting a curated variant updates the adaptive hero and framed view', async ({ page }) => {
  await page.goto('/')
  const imageDataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext('2d')!
    const gradient = context.createLinearGradient(0, 0, 512, 512)
    gradient.addColorStop(0, '#08A6A6')
    gradient.addColorStop(0.35, '#F04E78')
    gradient.addColorStop(0.7, '#F3A127')
    gradient.addColorStop(1, '#182B4D')
    context.fillStyle = gradient
    context.fillRect(0, 0, 512, 512)
    context.fillStyle = '#E7C6B1'
    context.fillRect(150, 100, 212, 292)
    return canvas.toDataURL('image/png')
  })
  await page.setInputFiles('input[type="file"]', {
    name: 'variant-fixture.png',
    mimeType: 'image/png',
    buffer: Buffer.from(imageDataUrl.split(',')[1], 'base64'),
  })
  await expect(page.getByRole('heading', { name: 'Your photo is ready to build' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Use original' }).click()

  const hero = page.getByTestId('real-tile-hero')
  await expect(hero).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-testid="curated-variants"] img')).toHaveCount(4, { timeout: 60_000 })
  const initialSrc = await hero.getAttribute('src')
  await page.getByTestId('variant-bright_pop').click()
  await expect(hero).toHaveAttribute('data-variant', 'bright_pop')
  await expect.poll(() => hero.getAttribute('src'), { timeout: 30_000 }).not.toBe(initialSrc)

  await page.getByRole('button', { name: 'On your wall' }).click()
  await expect(page.getByTestId('framed-mockup')).toBeVisible()
})
