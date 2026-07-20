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

test('selecting a curated variant updates the fixed hero and framed view', async ({ page }) => {
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

test('fixed escape hatch preview and submitted proof use the same tile map', async ({ page }) => {
  let submitted: Record<string, unknown> | null = null
  await page.route('**/.netlify/functions/save-project', async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ project_id: 'mp7_consistency', proof_ref: 'MP-CONSISTENCY' }),
    })
  })
  await page.goto('/?paletteMode=fixed')

  const imageDataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const context = canvas.getContext('2d')!
    const gradient = context.createLinearGradient(0, 0, 512, 512)
    gradient.addColorStop(0, '#0BA7A5')
    gradient.addColorStop(0.45, '#F04E78')
    gradient.addColorStop(1, '#F3A127')
    context.fillStyle = gradient
    context.fillRect(0, 0, 512, 512)
    context.fillStyle = '#182B4D'
    context.fillRect(144, 96, 224, 320)
    return canvas.toDataURL('image/png')
  })
  await page.setInputFiles('input[type="file"]', {
    name: 'proof-consistency.png',
    mimeType: 'image/png',
    buffer: Buffer.from(imageDataUrl.split(',')[1], 'base64'),
  })
  await expect(page.getByRole('heading', { name: 'Your photo is ready to build' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Use original' }).click()

  const paletteMode = page.locator('[data-palette-mode="fixed"]')
  const hero = page.getByTestId('real-tile-hero')
  await expect(paletteMode).toBeVisible({ timeout: 30_000 })
  await expect(hero).toBeVisible()
  const heroSrc = await hero.getAttribute('src')
  expect(heroSrc).toMatch(/^data:image\/png;base64,/)

  await page.getByRole('button', { name: 'Get my free proof' }).first().click()
  const dialogPreview = page.getByRole('img', { name: 'Your mosaic preview' })
  await expect(dialogPreview).toHaveAttribute('src', heroSrc!)
  await page.getByLabel('Name').fill('Proof Consistency')
  await page.getByLabel('Email').fill('proof@example.com')
  await page.getByRole('button', { name: 'Get my free proof' }).last().click()

  await expect(page.getByRole('heading', { name: 'Your mosaic is with our team' })).toBeVisible({ timeout: 30_000 })
  const successPreview = page.getByRole('img', { name: 'Your mosaic rendered as physical tiles' })
  await expect(successPreview).toHaveAttribute('src', heroSrc!)
  expect(submitted).not.toBeNull()
  expect(submitted?.cell_size_in).toBe(0.375)
  expect(submitted?.finished_size_in).toBe(19.2)
  expect(submitted?.palette_mode).toBe('fixed')
  expect(submitted?.adaptive_palette).toBeUndefined()

  const correspondence = await page.evaluate(async ({ payload, displayedSrc }) => {
    const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = src
    })
    const rgb = (hex: string) => {
      const value = hex.replace('#', '')
      return [
        Number.parseInt(value.slice(0, 2), 16),
        Number.parseInt(value.slice(2, 4), 16),
        Number.parseInt(value.slice(4, 6), 16),
      ]
    }
    const tileMap = payload.tile_map as number[]
    const palette = payload.palette as { hex: string }[]
    const gridSize = Number.parseInt(payload.grid_size as string, 10)
    const previewSrc = payload.preview_image_data_url as string
    const displayed = await load(displayedSrc)
    const stored = await load(previewSrc)
    const sample = (image: HTMLImageElement, index: number) => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      const tilePx = image.naturalWidth / gridSize
      const x = index % gridSize
      const y = Math.floor(index / gridSize)
      return Array.from(context.getImageData(
        Math.floor((x + 0.5) * tilePx),
        Math.floor((y + 0.5) * tilePx),
        1,
        1,
      ).data).slice(0, 3)
    }
    const sampleIndices = [0, Math.floor(tileMap.length / 3), Math.floor(tileMap.length / 2), tileMap.length - 1]
    return sampleIndices.map((index) => ({
      expected: rgb(palette[tileMap[index]].hex),
      displayed: sample(displayed, index),
      stored: sample(stored, index),
    }))
  }, { payload: submitted!, displayedSrc: heroSrc! })

  for (const sample of correspondence) {
    expect(sample.displayed).toEqual(sample.expected)
    expect(sample.stored).toEqual(sample.expected)
  }
})

test('default adaptive singles design is displayed, priced, and stored identically on mobile', async ({ page }) => {
  let submitted: Record<string, unknown> | null = null
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/.netlify/functions/save-project', async (route) => {
    submitted = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ project_id: 'mp7_adaptive_default', proof_ref: 'MP-ADAPTIVE' }),
    })
  })
  await page.goto('/')
  const imageDataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 768
    canvas.height = 768
    const context = canvas.getContext('2d')!
    const gradient = context.createLinearGradient(0, 0, 768, 768)
    gradient.addColorStop(0, '#0BA7A5')
    gradient.addColorStop(0.35, '#F2B495')
    gradient.addColorStop(0.7, '#BD2D6F')
    gradient.addColorStop(1, '#1A263E')
    context.fillStyle = gradient
    context.fillRect(0, 0, 768, 768)
    context.fillStyle = '#E7C6B1'
    context.fillRect(220, 130, 330, 430)
    return canvas.toDataURL('image/png')
  })
  await page.setInputFiles('input[type="file"]', {
    name: 'adaptive-default.png',
    mimeType: 'image/png',
    buffer: Buffer.from(imageDataUrl.split(',')[1], 'base64'),
  })
  await expect(page.getByRole('heading', { name: 'Your photo is ready to build' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Use original' }).click()

  const preview = page.locator('[data-palette-mode="adaptive"]')
  await expect(preview).toBeVisible({ timeout: 90_000 })
  await expect(preview).toHaveAttribute('data-grid-size', '48')
  await expect(preview).toHaveAttribute('data-palette-count', '52')
  const scope = page.getByTestId('actual-size-price')
  await expect(scope).toHaveAttribute('data-finished-size-in', '19.2')
  await expect(scope).toHaveAttribute('data-sticker-count', '2304')
  await expect(scope).toHaveAttribute('data-build-minutes', '231')
  await expect(scope).toContainText('19.2″ × 19.2″ finished board')
  await expect(scope).toContainText('2,304 individual stickers')
  await expect(scope).toContainText('$119.00')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)

  const hero = page.getByTestId('real-tile-hero')
  const heroSrc = await hero.getAttribute('src')
  expect(heroSrc).toMatch(/^data:image\/png;base64,/)
  await page.getByRole('button', { name: 'Get my free proof' }).first().click()
  await expect(page.getByRole('img', { name: 'Your mosaic preview' })).toHaveAttribute('src', heroSrc!)
  await expect(page.getByText('19.2″ × 19.2″', { exact: true })).toBeVisible()
  await expect(page.getByText('2,304 stickers · about 3 hr 51 min', { exact: true })).toBeVisible()
  await page.getByLabel('Name').fill('Adaptive Default')
  await page.getByLabel('Email').fill('adaptive@example.com')
  await page.getByRole('button', { name: 'Get my free proof' }).last().click()

  await expect(page.getByRole('heading', { name: 'Your mosaic is with our team' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('img', { name: 'Your mosaic rendered as physical tiles' })).toHaveAttribute('src', heroSrc!)
  expect(submitted).not.toBeNull()
  const payload = submitted!
  expect(payload.palette_mode).toBe('adaptive')
  expect(payload.fulfillment_tile_mode).toBe('singles_v1')
  expect(payload.gamut_profile_id).toBe('srgb-print-safe-v1')
  expect(payload.palette_seed).toMatch(/^[0-9a-f]{8}$/)
  expect(payload.adaptive_palette).toHaveLength(52)
  expect(payload.grid_size).toBe('48x48')
  expect(payload.cell_size_in).toBe(0.375)
  expect(payload.finished_size_in).toBe(19.2)
  expect(payload.quoted_price_usd).toBe(119)
  expect(payload.preview_image_data_url).toBe(heroSrc)
  expect(payload.tile_map).toHaveLength(48 * 48)
  expect(Object.values(payload.color_counts as Record<string, number>).reduce((sum, count) => sum + count, 0)).toBe(48 * 48)
})
