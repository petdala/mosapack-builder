import { expect, test } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'

const CHILD = '/Users/dereksolas/Downloads/qa-child-photo.jpg'
const MODEL_ROOT = resolve(process.cwd(), '../public/models')

async function serveLocalModels(page: import('@playwright/test').Page) {
  await page.route('**/models/**', async (route) => {
    const relative = new URL(route.request().url()).pathname.slice('/models/'.length)
    const path = resolve(MODEL_ROOT, relative)
    if (!path.startsWith(`${MODEL_ROOT}/`) || !existsSync(path)) return route.abort()
    const extension = extname(path)
    const contentType = extension === '.wasm'
      ? 'application/wasm'
      : extension === '.js'
        ? 'text/javascript'
        : 'application/octet-stream'
    await route.fulfill({ body: readFileSync(path), contentType })
  })
}

test('flatten preserves enclosed low-confidence subject pockets', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { optimizeForBuild } = await import('/src/lib/optimize.ts')
    const side = 512
    const makeFixture = () => {
      const canvas = document.createElement('canvas')
      canvas.width = side
      canvas.height = side
      const context = canvas.getContext('2d')!
      context.fillStyle = '#29422F'
      context.fillRect(0, 0, side, side)
      context.fillStyle = '#4279AD'
      context.fillRect(48, 48, 416, 416)
      context.fillStyle = '#A75E48'
      context.fillRect(220, 220, 72, 72)

      const mask = new ImageData(side, side)
      for (let y = 0; y < side; y++) {
        for (let x = 0; x < side; x++) {
          const offset = (y * side + x) * 4
          let value = x >= 48 && x < 464 && y >= 48 && y < 464 ? 255 : 0
          if (x >= 128 && x < 152 && y >= 128 && y < 152) value = 140
          if (x >= 336 && x < 360 && y >= 136 && y < 160) value = 180
          if (x >= 144 && x < 168 && y >= 336 && y < 360) value = 220
          if (x >= 220 && x < 292 && y >= 220 && y < 292) value = 100
          mask.data[offset] = value
          mask.data[offset + 1] = value
          mask.data[offset + 2] = value
          mask.data[offset + 3] = 255
        }
      }
      return { canvas, mask }
    }
    const firstFixture = makeFixture()
    const secondFixture = makeFixture()
    const options = (mask: ImageData) => ({
      bgMode: 'flatten' as const,
      analysisOverride: { mask, face: null, faces: 0 },
    })
    const first = await optimizeForBuild(firstFixture.canvas, 12, options(firstFixture.mask))
    const second = await optimizeForBuild(secondFixture.canvas, 12, options(secondFixture.mask))
    const pixels = first.canvas.getContext('2d', { willReadFrequently: true })!
      .getImageData(0, 0, first.canvas.width, first.canvas.height).data
    const mask = first.subjectMask.data
    const width = first.canvas.width
    const height = first.canvas.height
    const exterior = new Uint8Array(width * height)
    const queue = new Int32Array(width * height)
    let read = 0
    let write = 0
    const enqueue = (index: number) => {
      if (exterior[index] || mask[index * 4] > 128) return
      exterior[index] = 1
      queue[write++] = index
    }
    for (let x = 0; x < width; x++) { enqueue(x); enqueue((height - 1) * width + x) }
    for (let y = 1; y < height - 1; y++) { enqueue(y * width); enqueue(y * width + width - 1) }
    while (read < write) {
      const index = queue[read++]
      const x = index % width
      const y = Math.floor(index / width)
      if (x > 0) enqueue(index - 1)
      if (x + 1 < width) enqueue(index + 1)
      if (y > 0) enqueue(index - width)
      if (y + 1 < height) enqueue(index + width)
    }
    let flatInterior = 0
    let flatExterior = 0
    const radius = 11
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x
        const offset = index * 4
        const flat = pixels[offset] === 253 && pixels[offset + 1] === 253 && pixels[offset + 2] === 253
        if (exterior[index]) {
          if (flat) flatExterior++
          continue
        }
        let safelyInterior = true
        for (let dy = -radius; dy <= radius && safelyInterior; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || nx >= width || ny < 0 || ny >= height || exterior[ny * width + nx]) {
              safelyInterior = false
              break
            }
          }
        }
        if (safelyInterior && flat) flatInterior++
      }
    }
    return {
      flatInterior,
      flatExterior,
      deterministic: first.canvas.toDataURL() === second.canvas.toDataURL(),
    }
  })

  expect(result.flatInterior).toBe(0)
  expect(result.flatExterior).toBeGreaterThan(1_000)
  expect(result.deterministic).toBe(true)
})

test('flatten preserves the existing eroded outer-boundary coverage', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { optimizeForBuild } = await import('/src/lib/optimize.ts')
    const side = 512
    const canvas = document.createElement('canvas')
    canvas.width = side
    canvas.height = side
    const context = canvas.getContext('2d')!
    context.fillStyle = '#315B3B'
    context.fillRect(0, 0, side, side)
    context.fillStyle = '#9C624D'
    context.fillRect(128, 128, 256, 256)
    const mask = new ImageData(side, side)
    for (let y = 128; y < 384; y++) {
      for (let x = 128; x < 384; x++) {
        const distance = Math.min(x - 128, 383 - x, y - 128, 383 - y)
        const value = distance < 8 ? Math.round((distance + 1) / 9 * 255) : 255
        const offset = (y * side + x) * 4
        mask.data[offset] = value
        mask.data[offset + 1] = value
        mask.data[offset + 2] = value
        mask.data[offset + 3] = 255
      }
    }
    const optimized = await optimizeForBuild(canvas, 12, {
      bgMode: 'flatten',
      analysisOverride: { mask, face: null, faces: 0 },
    })
    const pixels = optimized.canvas.getContext('2d', { willReadFrequently: true })!
      .getImageData(0, 0, optimized.canvas.width, optimized.canvas.height).data
    const outputMask = optimized.subjectMask.data
    const width = optimized.canvas.width
    const height = optimized.canvas.height
    let deepExterior = 0
    let unflattenedExterior = 0
    let flattenedSubjectBoundary = 0
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const index = y * width + x
        let outside = true
        let nearOutside = false
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const subject = outputMask[((y + dy) * width + x + dx) * 4] > 128
            outside &&= !subject
            nearOutside ||= !subject
          }
        }
        const offset = index * 4
        const flat = Math.abs(pixels[offset] - 253) <= 1
          && Math.abs(pixels[offset + 1] - 253) <= 1
          && Math.abs(pixels[offset + 2] - 253) <= 1
        if (outside) {
          deepExterior++
          if (!flat) unflattenedExterior++
        }
        if (outputMask[offset] > 200 && nearOutside && flat) flattenedSubjectBoundary++
      }
    }
    return { deepExterior, unflattenedExterior, flattenedSubjectBoundary }
  })

  expect(result.deepExterior).toBeGreaterThan(1_000)
  expect(result.unflattenedExterior).toBe(0)
  expect(result.flattenedSubjectBoundary).toBeGreaterThan(0)
})

test('child-photo flattening does not alter the enclosed eroded subject interior', async ({ page }) => {
  test.skip(!existsSync(CHILD), 'Canonical child photo is not connected.')
  await serveLocalModels(page)
  await page.goto('/')
  const base64 = readFileSync(CHILD).toString('base64')
  const result = await page.evaluate(async (encoded) => {
    const { optimizeForBuild } = await import('/src/lib/optimize.ts')
    const response = await fetch(`data:image/jpeg;base64,${encoded}`)
    const bitmap = await createImageBitmap(await response.blob())
    const flattened = await optimizeForBuild(bitmap, 18, { bgMode: 'flatten' })
    const kept = await optimizeForBuild(bitmap, 18, { bgMode: 'keep' })
    bitmap.close()
    const width = flattened.canvas.width
    const height = flattened.canvas.height
    const flatPixels = flattened.canvas.getContext('2d', { willReadFrequently: true })!
      .getImageData(0, 0, width, height).data
    const keepPixels = kept.canvas.getContext('2d', { willReadFrequently: true })!
      .getImageData(0, 0, width, height).data
    const mask = flattened.subjectMask.data
    const exterior = new Uint8Array(width * height)
    const queue = new Int32Array(width * height)
    let read = 0
    let write = 0
    const enqueue = (index: number) => {
      if (exterior[index] || mask[index * 4] > 128) return
      exterior[index] = 1
      queue[write++] = index
    }
    for (let x = 0; x < width; x++) { enqueue(x); enqueue((height - 1) * width + x) }
    for (let y = 1; y < height - 1; y++) { enqueue(y * width); enqueue(y * width + width - 1) }
    while (read < write) {
      const index = queue[read++]
      const x = index % width
      const y = Math.floor(index / width)
      if (x > 0) enqueue(index - 1)
      if (x + 1 < width) enqueue(index + 1)
      if (y > 0) enqueue(index - width)
      if (y + 1 < height) enqueue(index + width)
    }
    let changedInterior = 0
    let paintedInterior = 0
    const radius = 12
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        let interior = true
        for (let dy = -radius; dy <= radius && interior; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (exterior[(y + dy) * width + x + dx]) { interior = false; break }
          }
        }
        if (!interior) continue
        const offset = (y * width + x) * 4
        const changed = flatPixels[offset] !== keepPixels[offset]
          || flatPixels[offset + 1] !== keepPixels[offset + 1]
          || flatPixels[offset + 2] !== keepPixels[offset + 2]
        if (changed) changedInterior++
        if (flatPixels[offset] === 253 && flatPixels[offset + 1] === 253 && flatPixels[offset + 2] === 253
          && (keepPixels[offset] !== 253 || keepPixels[offset + 1] !== 253 || keepPixels[offset + 2] !== 253)) {
          paintedInterior++
        }
      }
    }
    return { changedInterior, paintedInterior }
  }, base64)

  expect(result.changedInterior).toBe(0)
  expect(result.paintedInterior).toBe(0)
})
