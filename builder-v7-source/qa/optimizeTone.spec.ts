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

test('bright faces stay modeled while dark faces are rescued without clipping', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { optimizeForBuild } = await import('/src/lib/optimize.ts')
    const side = 256
    const face = { x: 64, y: 48, width: 128, height: 144 }
    const run = async (value: number, highlightValue?: number) => {
      const makeFixture = () => {
        const canvas = document.createElement('canvas')
        canvas.width = side
        canvas.height = side
        const context = canvas.getContext('2d')!
        if (highlightValue != null) {
          let block = 0
          for (let y = 0; y < side; y += 16) {
            for (let x = 0; x < side; x += 16) {
              const sample = block++ % 4 === 0 ? highlightValue : value
              context.fillStyle = `rgb(${sample},${sample},${sample})`
              context.fillRect(x, y, 16, 16)
            }
          }
        } else {
          context.fillStyle = `rgb(${value},${value},${value})`
          context.fillRect(0, 0, side, side)
        }
        const mask = new ImageData(side, side)
        for (let index = 0; index < side * side; index++) {
          mask.data[index * 4] = 255
          mask.data[index * 4 + 1] = 255
          mask.data[index * 4 + 2] = 255
          mask.data[index * 4 + 3] = 255
        }
        return { canvas, mask }
      }
      const firstFixture = makeFixture()
      const secondFixture = makeFixture()
      const options = (mask: ImageData) => ({
        bgMode: 'keep' as const,
        analysisOverride: { mask, face, faces: 1 },
      })
      const first = await optimizeForBuild(firstFixture.canvas, 12, options(firstFixture.mask))
      const second = await optimizeForBuild(secondFixture.canvas, 12, options(secondFixture.mask))
      const pixels = first.canvas.getContext('2d', { willReadFrequently: true })!
        .getImageData(0, 0, first.canvas.width, first.canvas.height).data
      const outputFace = first.faceAnalysis.primaryFace!
      const x0 = Math.max(0, Math.floor(outputFace.x))
      const y0 = Math.max(0, Math.floor(outputFace.y))
      const x1 = Math.min(first.canvas.width, Math.ceil(outputFace.x + outputFace.width))
      const y1 = Math.min(first.canvas.height, Math.ceil(outputFace.y + outputFace.height))
      let faceLuma = 0
      let facePixels = 0
      let clippedAfter = 0
      for (let y = 0; y < first.canvas.height; y++) {
        for (let x = 0; x < first.canvas.width; x++) {
          const offset = (y * first.canvas.width + x) * 4
          const luma = 0.299 * pixels[offset] + 0.587 * pixels[offset + 1] + 0.114 * pixels[offset + 2]
          if (luma > 250) clippedAfter++
          if (x >= x0 && x < x1 && y >= y0 && y < y1) {
            faceLuma += luma
            facePixels++
          }
        }
      }
      return {
        inputLuma: highlightValue == null ? value : (value * 3 + highlightValue) / 4,
        outputFaceLuma: faceLuma / facePixels,
        clippedBefore: highlightValue != null && highlightValue > 250
          ? first.canvas.width * first.canvas.height / 4
          : value > 250 ? first.canvas.width * first.canvas.height : 0,
        clippedAfter,
        brightened: first.appliedFixes.includes('brightened the face'),
        deterministic: first.canvas.toDataURL() === second.canvas.toDataURL(),
      }
    }
    return {
      bright: await run(126, 255),
      dark: await run(71),
      highKey: await run(204),
    }
  })

  expect(Math.abs(result.bright.outputFaceLuma - result.bright.inputLuma)).toBeLessThan(2)
  expect(result.bright.clippedAfter).toBeLessThanOrEqual(result.bright.clippedBefore)
  expect(result.bright.brightened).toBe(false)
  expect(result.dark.outputFaceLuma).toBeGreaterThanOrEqual(result.dark.inputLuma + 15)
  expect(result.dark.brightened).toBe(true)
  expect(result.dark.clippedAfter).toBeLessThanOrEqual(result.dark.clippedBefore)
  expect(result.highKey.clippedAfter).toBeLessThanOrEqual(result.highKey.clippedBefore)
  expect(result.highKey.brightened).toBe(false)
  expect([result.bright, result.dark, result.highKey].every((entry) => entry.deterministic)).toBe(true)
})

test('canonical child face stays below the pre-change clipping floor', async ({ page }) => {
  test.skip(!existsSync(CHILD), 'Canonical child photo is not connected.')
  await serveLocalModels(page)
  await page.goto('/')
  const base64 = readFileSync(CHILD).toString('base64')
  const result = await page.evaluate(async (encoded) => {
    const { optimizeForBuild } = await import('/src/lib/optimize.ts')
    const response = await fetch(`data:image/jpeg;base64,${encoded}`)
    const bitmap = await createImageBitmap(await response.blob())
    const optimized = await optimizeForBuild(bitmap, 18)
    bitmap.close()
    const face = optimized.faceAnalysis.primaryFace
    if (!face) throw new Error('Expected the canonical child face to be detected.')
    const pixels = optimized.canvas.getContext('2d', { willReadFrequently: true })!
      .getImageData(0, 0, optimized.canvas.width, optimized.canvas.height).data
    const x0 = Math.max(0, Math.floor(face.x))
    const y0 = Math.max(0, Math.floor(face.y))
    const x1 = Math.min(optimized.canvas.width, Math.ceil(face.x + face.width))
    const y1 = Math.min(optimized.canvas.height, Math.ceil(face.y + face.height))
    let luma = 0
    let clipped = 0
    let count = 0
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const offset = (y * optimized.canvas.width + x) * 4
        const value = 0.299 * pixels[offset] + 0.587 * pixels[offset + 1] + 0.114 * pixels[offset + 2]
        luma += value
        if (Math.max(pixels[offset], pixels[offset + 1], pixels[offset + 2]) > 250) clipped++
        count++
      }
    }
    return {
      faceLuma: luma / count,
      clippedFraction: clipped / count,
    }
  }, base64)

  // Any-channel >250 fraction measured from main@8a0535c with the same image, models, crop, and face box.
  const PRE_CHANGE_CLIPPED_FRACTION = 0.03584943487958299
  expect(result.clippedFraction).toBeLessThanOrEqual(PRE_CHANGE_CLIPPED_FRACTION * 0.5)
  expect(result.faceLuma).toBeGreaterThanOrEqual(140)
  expect(result.faceLuma).toBeLessThanOrEqual(215)
})
