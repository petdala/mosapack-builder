import { expect, test } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const CORPUS = '/Users/dereksolas/Developer/mosapack-qa-private/b1-5-mixed-photo-set'
const CHILD = '/Users/dereksolas/Downloads/qa-child-photo.jpg'

test('memorial skin protection blocks prototype-style red and chroma drift', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { applyQualityIntelligence } = await import('/src/lib/qualityIntelligence.ts')
    const canvas = document.createElement('canvas')
    canvas.width = 96
    canvas.height = 96
    const context = canvas.getContext('2d')!
    const gradient = context.createLinearGradient(0, 0, 96, 96)
    gradient.addColorStop(0, '#9b654f')
    gradient.addColorStop(0.5, '#c88f72')
    gradient.addColorStop(1, '#e0b092')
    context.fillStyle = gradient
    context.fillRect(0, 0, 96, 96)
    context.fillStyle = 'rgba(150,20,20,0.18)'
    for (let x = 1; x < 96; x += 4) context.fillRect(x, 0, 1, 96)
    const mask = new ImageData(96, 96)
    for (let index = 0; index < mask.data.length; index += 4) {
      mask.data[index] = 255
      mask.data[index + 3] = 255
    }
    const faceAnalysis = {
      boxes: [{ x: 10, y: 8, width: 76, height: 82 }],
      primaryFace: { x: 10, y: 8, width: 76, height: 82 },
      landmarks: [
        { x: 32, y: 38, label: 'right-eye' as const },
        { x: 64, y: 38, label: 'left-eye' as const },
        { x: 48, y: 64, label: 'mouth' as const },
      ],
    }
    const output = applyQualityIntelligence(canvas, {
      gridSize: 48,
      categoryOverride: 'memorial',
      subjectMask: mask,
      faceAnalysis,
      report: { faces: 1, bgBusy: false, blurry: true, lowContrast: true, lowResFor24: true },
    })
    return {
      category: output.category,
      vibrance: output.recipe.vibrance,
      redArtifacts: output.metrics.redArtifactPixels,
      aDrift: output.metrics.skinAStarDrift,
      chromaDrift: output.metrics.skinChromaDrift,
      guardrail: output.guardrail,
    }
  })

  expect(result.category).toBe('memorial')
  expect(result.vibrance).toBe(0)
  expect(result.redArtifacts).toBe(0)
  expect(result.aDrift).toBeLessThanOrEqual(0.45)
  expect(result.chromaDrift).toBeLessThanOrEqual(0.7)
  expect(['accepted', 'limited', 'reverted']).toContain(result.guardrail)
})

test('category recipes, uncertainty fallback, and face-grid alignment stay deterministic', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { classifyPhotoCategory, computeGridAlignment, isQualityIntelligenceEnabled, recipeForCategory } = await import('/src/lib/qualityIntelligence.ts')
    const base = {
      meanSaturation: 0.2,
      meanLuma: 128,
      sepiaShare: 0.1,
      monochromeShare: 0.1,
      edgeDensity: 0.2,
      colorBins: 80,
      subjectCoverage: 0.5,
    }
    const faceAnalysis = {
      boxes: [{ x: 20, y: 18, width: 60, height: 70 }],
      primaryFace: { x: 20, y: 18, width: 60, height: 70 },
      landmarks: [
        { x: 36.2, y: 41.1, label: 'right-eye' as const },
        { x: 63.6, y: 40.8, label: 'left-eye' as const },
        { x: 50.2, y: 68.4, label: 'mouth' as const },
      ],
    }
    const first = computeGridAlignment(96, 96, 48, faceAnalysis)
    const second = computeGridAlignment(96, 96, 48, faceAnalysis)
    return {
      couple: classifyPhotoCategory({ ...base, faces: 2 }).category,
      family: classifyPhotoCategory({ ...base, faces: 4 }).category,
      memorial: classifyPhotoCategory({ ...base, faces: 1, meanSaturation: 0.08, monochromeShare: 0.55, edgeDensity: 0.05 }).category,
      kids: classifyPhotoCategory({ ...base, faces: 1, meanSaturation: 0.38, meanLuma: 150 }).category,
      pet: classifyPhotoCategory({ ...base, faces: 0 }).category,
      uncertain: classifyPhotoCategory({ ...base, faces: 1, edgeDensity: 0.02 }).confidence,
      memorialRecipe: recipeForCategory('memorial'),
      kidsRecipe: recipeForCategory('baby-kids'),
      alignment: first,
      deterministic: JSON.stringify(first) === JSON.stringify(second),
      defaultOn: isQualityIntelligenceEnabled(''),
      pipelineOptOut: isQualityIntelligenceEnabled('?qualityPipeline=0'),
      intelligenceOptOut: isQualityIntelligenceEnabled('?qualityIntelligence=0'),
    }
  })

  expect(result.couple).toBe('couple')
  expect(result.family).toBe('family')
  expect(result.memorial).toBe('memorial')
  expect(result.kids).toBe('baby-kids')
  expect(result.pet).toBe('pet')
  expect(result.uncertain).toBeLessThan(0.6)
  expect(result.memorialRecipe.vibrance).toBe(0)
  expect(result.memorialRecipe.restore).toBeLessThan(result.kidsRecipe.restore)
  expect(result.memorialRecipe.background).toBe(0)
  expect(result.alignment.scoreAfter).toBeGreaterThanOrEqual(result.alignment.scoreBefore)
  expect(result.deterministic).toBe(true)
  expect(result.defaultOn).toBe(true)
  expect(result.pipelineOptOut).toBe(false)
  expect(result.intelligenceOptOut).toBe(false)
})

test('smart background is gated by scene busyness and remains deterministic', async ({ page }) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { applyQualityIntelligence } = await import('/src/lib/qualityIntelligence.ts')
    const canvas = document.createElement('canvas')
    canvas.width = 96
    canvas.height = 96
    const context = canvas.getContext('2d')!
    for (let y = 0; y < 96; y += 6) {
      for (let x = 0; x < 96; x += 6) {
        context.fillStyle = (x / 6 + y / 6) % 2 ? '#326f45' : '#d7c83a'
        context.fillRect(x, y, 6, 6)
      }
    }
    context.fillStyle = '#8c5b3f'
    context.fillRect(28, 18, 40, 68)
    const mask = new ImageData(96, 96)
    for (let y = 0; y < 96; y++) {
      for (let x = 0; x < 96; x++) {
        const offset = (y * 96 + x) * 4
        const subject = x >= 26 && x <= 70 && y >= 16 && y <= 88
        mask.data[offset] = subject ? 255 : 0
        mask.data[offset + 3] = 255
      }
    }
    const options = {
      gridSize: 48,
      categoryOverride: 'pet' as const,
      subjectMask: mask,
      report: { faces: 0, bgBusy: true, blurry: false, lowContrast: false, lowResFor24: false },
    }
    const first = applyQualityIntelligence(canvas, options)
    const second = applyQualityIntelligence(canvas, options)
    const clean = applyQualityIntelligence(canvas, { ...options, report: { ...options.report, bgBusy: false } })
    return {
      deterministic: first.canvas.toDataURL() === second.canvas.toDataURL(),
      busyApplied: first.applied.includes('softened a busy background'),
      cleanApplied: clean.applied.includes('softened a busy background'),
      redArtifacts: first.metrics.redArtifactPixels,
      withinLimit: first.metrics.meanDeltaE <= first.recipe.maxMeanDeltaE,
    }
  })

  expect(result.deterministic).toBe(true)
  expect(result.busyApplied).toBe(true)
  expect(result.cleanApplied).toBe(false)
  expect(result.redArtifacts).toBe(0)
  expect(result.withinLimit).toBe(true)
})

test('full mixed-photo corpus and real child photo satisfy no-harm and memorial gates', async ({ page }) => {
  test.skip(!existsSync(CORPUS) || !existsSync(CHILD), 'Private mixed-photo QA corpus is not connected.')
  await page.goto('/')
  const files = [
    'baby-kids-01.jpg', 'baby-kids-02.jpg', 'baby-kids-03.jpg',
    'couple-01.jpg', 'couple-02.jpg', 'couple-03.jpg',
    'family-01.jpg', 'family-02.jpg', 'family-03.jpg',
    'memorial-01.jpg', 'memorial-02.jpg', 'memorial-03.jpg',
    'pet-01.jpg', 'pet-02.jpg', 'pet-03.jpg', 'pet-04.jpg', 'pet-05.jpg',
    'other-01.jpg', 'other-02.jpg', 'other-03.jpg',
    CHILD,
  ]
  const categoryFor = (name: string) => {
    if (name.includes('baby-kids') || name === basename(CHILD)) return 'baby-kids'
    if (name.includes('couple')) return 'couple'
    if (name.includes('family')) return 'family'
    if (name.includes('memorial')) return 'memorial'
    if (name.includes('pet')) return 'pet'
    return 'other'
  }

  for (const file of files) {
    const path = file.startsWith('/') ? file : join(CORPUS, file)
    const category = categoryFor(basename(path))
    const base64 = readFileSync(path).toString('base64')
    const result = await page.evaluate(async ({ base64, category }) => {
      const { applyQualityIntelligence } = await import('/src/lib/qualityIntelligence.ts')
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image()
        element.onload = () => resolve(element)
        element.onerror = reject
        element.src = `data:image/jpeg;base64,${base64}`
      })
      const canvas = document.createElement('canvas')
      canvas.width = 192
      canvas.height = 192
      canvas.getContext('2d')!.drawImage(image, 0, 0, 192, 192)
      const mask = new ImageData(192, 192)
      for (let index = 0; index < mask.data.length; index += 4) {
        mask.data[index] = 255
        mask.data[index + 3] = 255
      }
      const faceCount = category === 'family' ? 3 : category === 'couple' ? 2 : category === 'baby-kids' || category === 'memorial' ? 1 : 0
      const face = faceCount ? { x: 38, y: 24, width: 116, height: 138 } : null
      const faceAnalysis = {
        boxes: face ? [face] : [],
        primaryFace: face,
        landmarks: face ? [
          { x: 72, y: 78, label: 'right-eye' as const },
          { x: 120, y: 78, label: 'left-eye' as const },
          { x: 96, y: 126, label: 'mouth' as const },
        ] : [],
      }
      const options = {
        gridSize: 48,
        categoryOverride: category as 'baby-kids' | 'couple' | 'family' | 'memorial' | 'pet' | 'other',
        subjectMask: mask,
        faceAnalysis,
        report: { faces: faceCount, bgBusy: true, blurry: true, lowContrast: false, lowResFor24: false },
      }
      const first = applyQualityIntelligence(canvas, options)
      const second = applyQualityIntelligence(canvas, options)
      return {
        deterministic: first.canvas.toDataURL() === second.canvas.toDataURL(),
        category: first.category,
        meanDeltaE: first.metrics.meanDeltaE,
        maxMeanDeltaE: first.recipe.maxMeanDeltaE,
        skinA: first.metrics.skinAStarDrift,
        maxSkinA: first.recipe.maxSkinAStarDrift,
        skinChroma: first.metrics.skinChromaDrift,
        maxSkinChroma: first.recipe.maxSkinChromaDrift,
        redArtifacts: first.metrics.redArtifactPixels,
      }
    }, { base64, category })
    expect(result.deterministic, basename(path)).toBe(true)
    expect(result.category, basename(path)).toBe(category)
    expect(result.meanDeltaE, basename(path)).toBeLessThanOrEqual(result.maxMeanDeltaE)
    expect(result.skinA, basename(path)).toBeLessThanOrEqual(result.maxSkinA)
    expect(result.skinChroma, basename(path)).toBeLessThanOrEqual(result.maxSkinChroma)
    expect(result.redArtifacts, basename(path)).toBe(0)
  }
})
