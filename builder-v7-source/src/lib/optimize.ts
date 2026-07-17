export interface FaceBox {
  x: number
  y: number
  width: number
  height: number
}

export interface IssueReport {
  resolution: string
  faces: number
  subjectFillPct: number
  faceLuma: number | null
  frameLuma: number
  backlit: boolean
  faceSharpness: number
  blurry: boolean
  clippedHiPct: number
  contrastStd: number
  lowContrast: boolean
  greenCast: boolean
  skinRgb: [number, number, number] | null
  bgBusy: boolean
  lowResFor24: boolean
}

export type BackgroundMode = 'flatten' | 'keep'

export interface OptimizeOptions {
  bgMode?: BackgroundMode
  brightness?: number
  zoom?: number
  /** Deterministic browser-test seam; production always uses the local MediaPipe models. */
  analysisOverride?: {
    mask: ImageData
    face: FaceBox | null
    faces?: number
  }
}

export interface OptimizeResult {
  canvas: HTMLCanvasElement
  report: IssueReport
  appliedFixes: string[]
  flags: string[]
  bgMode: BackgroundMode
}

interface DetectionSummary {
  face: FaceBox | null
  faces: number
}

interface SizePolicy {
  fill: number
  sharpen: number
}

const WORK_LONG_EDGE = 1024
const HARD_MASK_ERODE_RADIUS = 9
const FLAT_BACKGROUND = [244, 244, 244] as const
const POLICY: Record<number, SizePolicy> = {
  6: { fill: 0.86, sharpen: 60 },
  12: { fill: 0.78, sharpen: 90 },
  18: { fill: 0.72, sharpen: 90 },
  24: { fill: 0.64, sharpen: 100 },
}

type OptimizeSource = ImageBitmap | HTMLCanvasElement | HTMLImageElement

let visionPromise: Promise<{
  segmenter: import('@mediapipe/tasks-vision').ImageSegmenter
  faceDetector: import('@mediapipe/tasks-vision').FaceDetector
}> | null = null
const analysisCache = new WeakMap<object, Promise<{ mask: ImageData; face: FaceBox | null; faces: number }>>()

function sourceSize(source: OptimizeSource): { width: number; height: number } {
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth || source.width, height: source.naturalHeight || source.height }
  }
  return { width: source.width, height: source.height }
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

function drawWorkingCopy(source: OptimizeSource): HTMLCanvasElement {
  const size = sourceSize(source)
  const scale = Math.min(1, WORK_LONG_EDGE / Math.max(size.width, size.height))
  const canvas = makeCanvas(size.width * scale, size.height * scale)
  canvas.getContext('2d', { willReadFrequently: true })!.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

async function loadVision() {
  if (!visionPromise) {
    visionPromise = (async () => {
      const { FaceDetector, FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision')
      const fileset = await FilesetResolver.forVisionTasks('/models/wasm', false)
      const [segmenter, faceDetector] = await Promise.all([
        ImageSegmenter.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: '/models/selfie_segmenter.tflite', delegate: 'CPU' },
          runningMode: 'IMAGE',
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        }),
        FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: '/models/blaze_face_short_range.tflite', delegate: 'CPU' },
          runningMode: 'IMAGE',
          minDetectionConfidence: 0.4,
        }),
      ])
      return { segmenter, faceDetector }
    })()
  }
  return visionPromise
}

function valuesToImageData(values: Uint8ClampedArray, width: number, height: number): ImageData {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < values.length; i++) {
    const value = values[i]
    const offset = i * 4
    rgba[offset] = value
    rgba[offset + 1] = value
    rgba[offset + 2] = value
    rgba[offset + 3] = 255
  }
  return new ImageData(rgba, width, height)
}

function maskValues(mask: ImageData): Uint8ClampedArray {
  const values = new Uint8ClampedArray(mask.width * mask.height)
  for (let i = 0; i < values.length; i++) values[i] = mask.data[i * 4]
  return values
}

function resizeMask(mask: ImageData, width: number, height: number): ImageData {
  if (mask.width === width && mask.height === height) return mask
  const source = makeCanvas(mask.width, mask.height)
  source.getContext('2d')!.putImageData(mask, 0, 0)
  const target = makeCanvas(width, height)
  const context = target.getContext('2d', { willReadFrequently: true })!
  context.imageSmoothingEnabled = true
  context.drawImage(source, 0, 0, width, height)
  return context.getImageData(0, 0, width, height)
}

function minFilter(values: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
  const horizontal = new Uint8ClampedArray(values.length)
  const output = new Uint8ClampedArray(values.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 255
      const from = Math.max(0, x - radius)
      const to = Math.min(width - 1, x + radius)
      for (let xx = from; xx <= to; xx++) value = Math.min(value, values[y * width + xx])
      horizontal[y * width + x] = value
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 255
      const from = Math.max(0, y - radius)
      const to = Math.min(height - 1, y + radius)
      for (let yy = from; yy <= to; yy++) value = Math.min(value, horizontal[yy * width + x])
      output[y * width + x] = value
    }
  }
  return output
}

function maxFilter(values: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
  const inverted = new Uint8ClampedArray(values.length)
  for (let i = 0; i < values.length; i++) inverted[i] = 255 - values[i]
  const filtered = minFilter(inverted, width, height, radius)
  for (let i = 0; i < filtered.length; i++) filtered[i] = 255 - filtered[i]
  return filtered
}

function boxBlur(values: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
  const horizontal = new Float32Array(values.length)
  const output = new Uint8ClampedArray(values.length)
  for (let y = 0; y < height; y++) {
    let sum = 0
    for (let x = -radius; x <= radius; x++) sum += values[y * width + Math.max(0, Math.min(width - 1, x))]
    for (let x = 0; x < width; x++) {
      horizontal[y * width + x] = sum / (radius * 2 + 1)
      const removeX = Math.max(0, x - radius)
      const addX = Math.min(width - 1, x + radius + 1)
      sum += values[y * width + addX] - values[y * width + removeX]
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0
    for (let y = -radius; y <= radius; y++) sum += horizontal[Math.max(0, Math.min(height - 1, y)) * width + x]
    for (let y = 0; y < height; y++) {
      output[y * width + x] = Math.round(sum / (radius * 2 + 1))
      const removeY = Math.max(0, y - radius)
      const addY = Math.min(height - 1, y + radius + 1)
      sum += horizontal[addY * width + x] - horizontal[removeY * width + x]
    }
  }
  return output
}

function cleanSoftMask(raw: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const opened = maxFilter(minFilter(raw, width, height, 2), width, height, 2)
  return boxBlur(opened, width, height, 2)
}

export async function segmentSubject(bitmap: OptimizeSource): Promise<{ mask: ImageData }> {
  const work = drawWorkingCopy(bitmap)
  const { segmenter } = await loadVision()
  const result = segmenter.segment(work)
  const modelMask = result.confidenceMasks?.[0]
  if (!modelMask) {
    result.close()
    throw new Error('The subject model did not return a mask.')
  }
  const floats = modelMask.getAsFloat32Array()
  const raw = new Uint8ClampedArray(floats.length)
  for (let i = 0; i < floats.length; i++) raw[i] = Math.round(Math.max(0, Math.min(1, floats[i])) * 255)
  const clean = cleanSoftMask(raw, modelMask.width, modelMask.height)
  const mask = resizeMask(valuesToImageData(clean, modelMask.width, modelMask.height), work.width, work.height)
  result.close()
  return { mask }
}

async function detectFaces(bitmap: OptimizeSource): Promise<DetectionSummary> {
  const work = drawWorkingCopy(bitmap)
  const { faceDetector } = await loadVision()
  const detections = faceDetector.detect(work).detections
  const boxes = detections
    .map((d) => d.boundingBox)
    .filter((box): box is NonNullable<typeof box> => Boolean(box))
  const largest = boxes.sort((a, b) => b.width * b.height - a.width * a.height)[0]
  return {
    face: largest
      ? {
          x: Math.max(0, largest.originX),
          y: Math.max(0, largest.originY),
          width: Math.min(work.width - largest.originX, largest.width),
          height: Math.min(work.height - largest.originY, largest.height),
        }
      : null,
    faces: boxes.length,
  }
}

export async function detectFace(bitmap: OptimizeSource): Promise<FaceBox | null> {
  return (await detectFaces(bitmap)).face
}

function round(value: number, places = 1): number {
  const factor = 10 ** places
  return Math.round(value * factor) / factor
}

function isSkinCandidate(r: number, g: number, b: number): boolean {
  const luma = 0.299 * r + 0.587 * g + 0.114 * b
  return luma < 220
    && r > 45
    && g > 35
    && b > 20
    && r >= g - 24
    && g >= b - 12
    && r - b > 6
    && r - b < 155
    && g < r * 1.32
}

function analyzePixels(canvas: HTMLCanvasElement, mask: ImageData, face: FaceBox | null, faces: number): IssueReport {
  const { width, height } = canvas
  const pixels = canvas.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, width, height).data
  const subject = maskValues(mask)
  const total = width * height
  let subjectPixels = 0
  let frameLumaSum = 0
  let frameLumaSq = 0
  let subjectLumaSum = 0
  let subjectLumaSq = 0
  let clipped = 0
  let skinCount = 0
  let skinR = 0
  let skinG = 0
  let skinB = 0

  for (let i = 0; i < total; i++) {
    const offset = i * 4
    const r = pixels[offset]
    const g = pixels[offset + 1]
    const b = pixels[offset + 2]
    const luma = 0.299 * r + 0.587 * g + 0.114 * b
    frameLumaSum += luma
    frameLumaSq += luma * luma
    if (luma > 250) clipped++
    if (subject[i] > 127) {
      subjectPixels++
      subjectLumaSum += luma
      subjectLumaSq += luma * luma
      const x = i % width
      const y = Math.floor(i / width)
      const facePad = face ? face.height * 0.2 : 0
      const nearFace = !face || (
        x >= face.x - facePad && x <= face.x + face.width + facePad
        && y >= face.y - facePad && y <= face.y + face.height + facePad
      )
      if (nearFace && isSkinCandidate(r, g, b)) {
        skinCount++
        skinR += r
        skinG += g
        skinB += b
      }
    }
  }

  const frameLuma = frameLumaSum / total
  const contrastCount = subjectPixels > 1000 ? subjectPixels : total
  const contrastSum = subjectPixels > 1000 ? subjectLumaSum : frameLumaSum
  const contrastSq = subjectPixels > 1000 ? subjectLumaSq : frameLumaSq
  const contrastStd = Math.sqrt(Math.max(0, contrastSq / contrastCount - (contrastSum / contrastCount) ** 2))

  let faceLuma: number | null = null
  let faceSharpness = 0
  if (face && face.width > 2 && face.height > 2) {
    const x0 = Math.max(1, Math.floor(face.x))
    const y0 = Math.max(1, Math.floor(face.y))
    const x1 = Math.min(width - 1, Math.ceil(face.x + face.width))
    const y1 = Math.min(height - 1, Math.ceil(face.y + face.height))
    let count = 0
    let lumaSum = 0
    let lapSum = 0
    let lapSq = 0
    const gray = (x: number, y: number) => {
      const offset = (y * width + x) * 4
      return 0.299 * pixels[offset] + 0.587 * pixels[offset + 1] + 0.114 * pixels[offset + 2]
    }
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const center = gray(x, y)
        const lap = 4 * center - gray(x - 1, y) - gray(x + 1, y) - gray(x, y - 1) - gray(x, y + 1)
        lumaSum += center
        lapSum += lap
        lapSq += lap * lap
        count++
      }
    }
    if (count) {
      faceLuma = lumaSum / count
      faceSharpness = Math.max(0, lapSq / count - (lapSum / count) ** 2)
    }
  }

  let bgEdgeSum = 0
  let bgEdgeCount = 0
  const grayAt = (x: number, y: number) => {
    const offset = (y * width + x) * 4
    return 0.299 * pixels[offset] + 0.587 * pixels[offset + 1] + 0.114 * pixels[offset + 2]
  }
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const index = y * width + x
      if (subject[index] > 127) continue
      const lap = Math.abs(4 * grayAt(x, y) - grayAt(x - 1, y) - grayAt(x + 1, y) - grayAt(x, y - 1) - grayAt(x, y + 1))
      bgEdgeSum += lap
      bgEdgeCount++
    }
  }

  const meanSkin: [number, number, number] | null = skinCount > 300
    ? [Math.round(skinR / skinCount), Math.round(skinG / skinCount), Math.round(skinB / skinCount)]
    : null
  const meanSkinGray = meanSkin ? (meanSkin[0] + meanSkin[1] + meanSkin[2]) / 3 : 0

  return {
    resolution: `${width}x${height}`,
    faces,
    subjectFillPct: round((subjectPixels / total) * 100),
    faceLuma: faceLuma == null ? null : round(faceLuma),
    frameLuma: round(frameLuma),
    backlit: faceLuma != null && faceLuma < frameLuma - 12,
    faceSharpness: Math.round(faceSharpness),
    blurry: face != null && faceSharpness < 60,
    clippedHiPct: round((clipped / total) * 100),
    contrastStd: round(contrastStd),
    lowContrast: contrastStd < 38,
    greenCast: Boolean(meanSkin && meanSkin[1] > meanSkinGray * 1.06),
    skinRgb: meanSkin,
    bgBusy: bgEdgeCount > 0 && bgEdgeSum / bgEdgeCount > 8,
    lowResFor24: Math.min(width, height) < 1200,
  }
}

export async function analyzePhoto(bitmap: OptimizeSource): Promise<IssueReport> {
  const input = sourceSize(bitmap)
  const work = drawWorkingCopy(bitmap)
  const [{ mask }, detection] = await Promise.all([segmentSubject(work), detectFaces(work)])
  const report = analyzePixels(work, mask, detection.face, detection.faces)
  report.resolution = `${input.width}x${input.height}`
  report.lowResFor24 = Math.min(input.width, input.height) < 1200
  return report
}

function subjectBounds(mask: ImageData, threshold = 110): { x0: number; y0: number; x1: number; y1: number } | null {
  const values = maskValues(mask)
  let x0 = mask.width
  let y0 = mask.height
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (values[y * mask.width + x] <= threshold) continue
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x)
      y1 = Math.max(y1, y)
    }
  }
  return x1 >= x0 && y1 >= y0 ? { x0, y0, x1, y1 } : null
}

function portraitCrop(mask: ImageData, fill: number): { x: number; y: number; side: number } {
  const bounds = subjectBounds(mask)
  const maxSide = Math.min(mask.width, mask.height)
  if (!bounds) return { x: (mask.width - maxSide) / 2, y: (mask.height - maxSide) / 2, side: maxSide }
  const cx = (bounds.x0 + bounds.x1) / 2
  const cy = (bounds.y0 + bounds.y1) / 2
  const subjectSide = Math.max(bounds.x1 - bounds.x0 + 1, bounds.y1 - bounds.y0 + 1)
  const side = Math.max(1, Math.min(maxSide, subjectSide / fill))
  return {
    x: Math.max(0, Math.min(mask.width - side, cx - side / 2)),
    y: Math.max(0, Math.min(mask.height - side, cy - side / 2)),
    side,
  }
}

function cropMask(mask: ImageData, crop: { x: number; y: number; side: number }, size: number): ImageData {
  const source = makeCanvas(mask.width, mask.height)
  source.getContext('2d')!.putImageData(mask, 0, 0)
  const target = makeCanvas(size, size)
  const context = target.getContext('2d', { willReadFrequently: true })!
  context.imageSmoothingEnabled = true
  context.drawImage(source, crop.x, crop.y, crop.side, crop.side, 0, 0, size, size)
  return context.getImageData(0, 0, size, size)
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function correctTone(image: ImageData, softMask: Uint8ClampedArray, face: FaceBox | null, greenCast: boolean) {
  const { data, width, height } = image
  const isSubject = (index: number) => softMask[index] > 127
  const inFace = (x: number, y: number) => !face || (x >= face.x && x <= face.x + face.width && y >= face.y && y <= face.y + face.height)
  let count = 0
  const means = [0, 0, 0]

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      if (!isSubject(index) || !inFace(x, y)) continue
      const offset = index * 4
      const r = data[offset]
      const g = data[offset + 1]
      const b = data[offset + 2]
      if (isSkinCandidate(r, g, b)) {
        means[0] += r
        means[1] += g
        means[2] += b
        count++
      }
    }
  }
  if (count < 200) {
    count = 0
    means.fill(0)
    for (let i = 0; i < width * height; i++) {
      if (!isSubject(i)) continue
      const offset = i * 4
      means[0] += data[offset]
      means[1] += data[offset + 1]
      means[2] += data[offset + 2]
      count++
    }
  }
  if (count > 200) {
    const channelMeans = means.map((value) => value / count)
    const grayMean = (channelMeans[0] + channelMeans[1] + channelMeans[2]) / 3
    const spread = (Math.max(...channelMeans) - Math.min(...channelMeans)) / Math.max(1, grayMean)
    const greenExcess = Math.max(0, channelMeans[1] - (channelMeans[0] + channelMeans[2]) / 2) / Math.max(1, grayMean)
    const strength = Math.min(0.94, 0.5 + spread * 0.42 + greenExcess * 1.4 + (greenCast ? 0.16 : 0))
    const warmTargets = [grayMean * 1.04, grayMean, grayMean * 0.96]
    const correction = channelMeans.map((value, channel) => {
      const full = warmTargets[channel] / Math.max(1, value)
      return Math.max(0.78, Math.min(1.35, 1 + (full - 1) * strength))
    })
    for (let i = 0; i < width * height; i++) {
      if (!isSubject(i)) continue
      const offset = i * 4
      data[offset] = clampChannel(data[offset] * correction[0])
      data[offset + 1] = clampChannel(data[offset + 1] * correction[1])
      data[offset + 2] = clampChannel(data[offset + 2] * correction[2])
    }
  }

  let faceLuma = 1
  if (face) {
    let sum = 0
    let pixels = 0
    const x0 = Math.max(0, Math.floor(face.x))
    const y0 = Math.max(0, Math.floor(face.y))
    const x1 = Math.min(width, Math.ceil(face.x + face.width))
    const y1 = Math.min(height, Math.ceil(face.y + face.height))
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const offset = (y * width + x) * 4
        sum += (0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]) / 255
        pixels++
      }
    }
    if (pixels) faceLuma = sum / pixels
  }
  const gamma = faceLuma < 0.42 ? 0.68 : 0.8
  for (let i = 0; i < width * height; i++) {
    if (!isSubject(i)) continue
    const offset = i * 4
    const luma = Math.max(0.001, (0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]) / 255)
    const gain = Math.pow(luma, gamma) / luma
    data[offset] = clampChannel(data[offset] * gain)
    data[offset + 1] = clampChannel(data[offset + 1] * gain)
    data[offset + 2] = clampChannel(data[offset + 2] * gain)
  }

  for (let i = 0; i < width * height; i++) {
    if (!isSubject(i)) continue
    const offset = i * 4
    const r = data[offset]
    const g = data[offset + 1]
    const b = data[offset + 2]
    const luma = 0.299 * r + 0.587 * g + 0.114 * b
    if (luma <= 220 && isSkinCandidate(r, g, b)) {
      data[offset] = clampChannel(r * 1.03)
      data[offset + 2] = clampChannel(b * 0.93)
    }
  }

  if (face) {
    const pad = face.height * 0.18
    const fx0 = Math.max(0, face.x - pad)
    const fy0 = Math.max(0, face.y - pad)
    const fx1 = Math.min(width, face.x + face.width + pad)
    const fy1 = Math.min(height, face.y + face.height + pad)
    let skinLuma = 0
    let skinPixels = 0
    for (let y = Math.floor(fy0); y < Math.ceil(fy1); y++) {
      for (let x = Math.floor(fx0); x < Math.ceil(fx1); x++) {
        const index = y * width + x
        if (!isSubject(index)) continue
        const offset = index * 4
        const r = data[offset]
        const g = data[offset + 1]
        const b = data[offset + 2]
        if (isSkinCandidate(r, g, b)) {
          skinLuma += 0.299 * r + 0.587 * g + 0.114 * b
          skinPixels++
        }
      }
    }
    if (skinPixels > 150) {
      const mean = skinLuma / skinPixels
      const targetGain = mean < 185 ? Math.min(1.3, 185 / Math.max(30, mean)) : 1
      const rawWeights = new Uint8ClampedArray(width * height)
      for (let y = Math.floor(fy0); y < Math.ceil(fy1); y++) {
        for (let x = Math.floor(fx0); x < Math.ceil(fx1); x++) {
          const index = y * width + x
          if (!isSubject(index)) continue
          const offset = index * 4
          if (!isSkinCandidate(data[offset], data[offset + 1], data[offset + 2])) continue
          const edgeX = Math.min((x - fx0) / Math.max(1, pad), (fx1 - x) / Math.max(1, pad), 1)
          const edgeY = Math.min((y - fy0) / Math.max(1, pad), (fy1 - y) / Math.max(1, pad), 1)
          rawWeights[index] = Math.round(255 * Math.max(0, Math.min(edgeX, edgeY)))
        }
      }
      const gainRadius = Math.max(12, Math.min(48, Math.round(face.width * 0.2)))
      const smoothWeights = boxBlur(boxBlur(rawWeights, width, height, gainRadius), width, height, gainRadius)
      for (let y = Math.floor(fy0); y < Math.ceil(fy1); y++) {
        for (let x = Math.floor(fx0); x < Math.ceil(fx1); x++) {
          const index = y * width + x
          if (!isSubject(index)) continue
          const offset = index * 4
          const r = data[offset]
          const g = data[offset + 1]
          const b = data[offset + 2]
          const weight = smoothWeights[index] / 255
          const gain = 1 + (targetGain - 1) * weight
          data[offset] = clampChannel(r * gain)
          data[offset + 1] = clampChannel(g * (1 + (targetGain * 0.985 - 1) * weight))
          data[offset + 2] = clampChannel(b * (1 + (targetGain * 0.94 - 1) * weight))
        }
      }
    }
  }
}

function adjustContrast(image: ImageData, brightness: number) {
  const { data, width, height } = image
  const brightnessGain = 1 + Math.max(-2, Math.min(2, brightness)) * 0.05
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4
    for (let channel = 0; channel < 3; channel++) {
      data[offset + channel] = clampChannel(((data[offset + channel] * brightnessGain) - 128) * 1.08 + 128)
    }
  }
}

function fillMaskHoles(values: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const output = new Uint8ClampedArray(values.length)
  const exterior = new Uint8Array(values.length)
  const queue = new Int32Array(values.length)
  let subjectArea = 0
  for (let i = 0; i < values.length; i++) {
    if (values[i] > 127) {
      output[i] = 255
      subjectArea++
    }
  }
  let read = 0
  let write = 0
  const enqueue = (index: number) => {
    if (exterior[index] || values[index] > 127) return
    exterior[index] = 1
    queue[write++] = index
  }
  for (let x = 0; x < width; x++) {
    enqueue(x)
    enqueue((height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(y * width)
    enqueue(y * width + width - 1)
  }
  while (read < write) {
    const index = queue[read++]
    const x = index % width
    const y = Math.floor(index / width)
    if (x > 0) enqueue(index - 1)
    if (x + 1 < width) enqueue(index + 1)
    if (y > 0) enqueue(index - width)
    if (y + 1 < height) enqueue(index + width)
  }
  const maxHoleArea = Math.max(16, Math.round(subjectArea * 0.025))
  const componentSeen = exterior.slice()
  for (let start = 0; start < values.length; start++) {
    if (componentSeen[start] || values[start] > 127) continue
    read = 0
    write = 0
    componentSeen[start] = 1
    queue[write++] = start
    while (read < write) {
      const index = queue[read++]
      const x = index % width
      const y = Math.floor(index / width)
      const visit = (next: number) => {
        if (componentSeen[next] || values[next] > 127) return
        componentSeen[next] = 1
        queue[write++] = next
      }
      if (x > 0) visit(index - 1)
      if (x + 1 < width) visit(index + 1)
      if (y > 0) visit(index - width)
      if (y + 1 < height) visit(index + width)
    }
    if (write <= maxHoleArea) {
      for (let i = 0; i < write; i++) output[queue[i]] = 255
    }
  }
  return output
}

function keepMeaningfulComponents(values: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const visited = new Uint8Array(values.length)
  const queue = new Int32Array(values.length)
  const components: number[][] = []
  let largestSize = 0

  for (let start = 0; start < values.length; start++) {
    if (visited[start] || values[start] <= 127) continue
    let read = 0
    let write = 0
    const component: number[] = []
    visited[start] = 1
    queue[write++] = start
    while (read < write) {
      const index = queue[read++]
      component.push(index)
      const x = index % width
      const y = Math.floor(index / width)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue
          const next = index + dy * width + dx
          if (visited[next] || values[next] <= 127) continue
          visited[next] = 1
          queue[write++] = next
        }
      }
    }
    components.push(component)
    largestSize = Math.max(largestSize, component.length)
  }

  const output = new Uint8ClampedArray(values.length)
  const minArea = Math.max(64, Math.round(values.length * 0.001), Math.round(largestSize * 0.02))
  for (const component of components) {
    if (component.length !== largestSize && component.length < minArea) continue
    for (const index of component) output[index] = 255
  }
  return output
}

function removeLowerGreenIslands(
  values: Uint8ClampedArray,
  image: ImageData,
  width: number,
  height: number,
): Uint8ClampedArray {
  const output = values.slice()
  const visited = new Uint8Array(values.length)
  const queue = new Int32Array(values.length)
  const maxIslandSize = values.length * 0.03
  for (let start = 0; start < values.length; start++) {
    if (visited[start] || values[start] <= 127) continue
    const offset = start * 4
    const r = image.data[offset]
    const g = image.data[offset + 1]
    const b = image.data[offset + 2]
    if (!(g > 75 && g - Math.max(r, b) > 18)) continue
    let read = 0
    let write = 0
    let ySum = 0
    const component: number[] = []
    visited[start] = 1
    queue[write++] = start
    while (read < write) {
      const index = queue[read++]
      component.push(index)
      ySum += Math.floor(index / width)
      const x = index % width
      const y = Math.floor(index / width)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue
          const next = index + dy * width + dx
          if (visited[next] || values[next] <= 127) continue
          const nextOffset = next * 4
          const nr = image.data[nextOffset]
          const ng = image.data[nextOffset + 1]
          const nb = image.data[nextOffset + 2]
          if (!(ng > 75 && ng - Math.max(nr, nb) > 18)) continue
          visited[next] = 1
          queue[write++] = next
        }
      }
    }
    const centroidY = ySum / Math.max(1, component.length)
    if (component.length < maxIslandSize && centroidY > height * 0.55) {
      for (const index of component) output[index] = 0
    }
  }
  return output
}

function confidenceAwareErode(values: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const eroded = minFilter(values, width, height, HARD_MASK_ERODE_RADIUS)
  const supportedInterior = minFilter(values, width, height, 2)
  for (let i = 0; i < values.length; i++) {
    if (values[i] >= 238 && supportedInterior[i] > 128) eroded[i] = values[i]
  }
  return eroded
}

function flattenBackground(image: ImageData, hardMask: Uint8ClampedArray) {
  for (let i = 0; i < hardMask.length; i++) {
    if (hardMask[i] > 128) continue
    const offset = i * 4
    image.data[offset] = FLAT_BACKGROUND[0]
    image.data[offset + 1] = FLAT_BACKGROUND[1]
    image.data[offset + 2] = FLAT_BACKGROUND[2]
  }
}

function saturate(image: ImageData, subject: Uint8ClampedArray) {
  for (let i = 0; i < subject.length; i++) {
    if (subject[i] <= 128) continue
    const offset = i * 4
    const r = image.data[offset]
    const g = image.data[offset + 1]
    const b = image.data[offset + 2]
    const luma = 0.299 * r + 0.587 * g + 0.114 * b
    image.data[offset] = clampChannel(luma + (r - luma) * 1.06)
    image.data[offset + 1] = clampChannel(luma + (g - luma) * 1.06)
    image.data[offset + 2] = clampChannel(luma + (b - luma) * 1.06)
  }
}

function medianDenoise(image: ImageData, subject: Uint8ClampedArray) {
  const { width, height, data } = image
  const source = data.slice()
  const samples = new Array<number>(9)
  const lumaSamples = new Array<number>(9)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x
      if (subject[index] <= 128) continue
      const offset = index * 4
      const centerLuma = 0.299 * source[offset] + 0.587 * source[offset + 1] + 0.114 * source[offset + 2]
      let lumaSample = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const neighbor = ((y + dy) * width + x + dx) * 4
          lumaSamples[lumaSample++] = 0.299 * source[neighbor] + 0.587 * source[neighbor + 1] + 0.114 * source[neighbor + 2]
        }
      }
      lumaSamples.sort((a, b) => a - b)
      const neighborhoodLuma = lumaSamples[4]
      for (let channel = 0; channel < 3; channel++) {
        let sample = 0
        let min = 255
        let max = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const value = source[((y + dy) * width + x + dx) * 4 + channel]
            samples[sample++] = value
            min = Math.min(min, value)
            max = Math.max(max, value)
          }
        }
        samples.sort((a, b) => a - b)
        const median = samples[4]
        const brightTexture = centerLuma > 175
        const darkTexture = neighborhoodLuma < 190
        const maxRange = brightTexture ? 120 : 72
        const maxDelta = brightTexture ? 60 : 34
        const centerDelta = Math.abs(source[offset + channel] - median)
        const darkImpulse = darkTexture && centerLuma - neighborhoodLuma > 35 && centerDelta > 24
        if (centerLuma < 248 && (darkImpulse || (max - min <= maxRange && centerDelta <= maxDelta))) {
          data[offset + channel] = median
        }
      }
    }
  }
}

function unsharp(image: ImageData, subject: Uint8ClampedArray, amount: number) {
  const { width, height, data } = image
  const channels = [new Uint8ClampedArray(width * height), new Uint8ClampedArray(width * height), new Uint8ClampedArray(width * height)]
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4
    channels[0][i] = data[offset]
    channels[1][i] = data[offset + 1]
    channels[2][i] = data[offset + 2]
  }
  const blurred = channels.map((channel) => boxBlur(channel, width, height, 2))
  for (let i = 0; i < width * height; i++) {
    if (subject[i] <= 128) continue
    const offset = i * 4
    const luma = 0.299 * channels[0][i] + 0.587 * channels[1][i] + 0.114 * channels[2][i]
    const noiseFloor = luma < 64 ? 18 : luma < 128 ? 12 : 8
    const lumaAmount = amount * (0.25 + 0.75 * luma / 255)
    const maxStep = 12 + luma * 0.08
    for (let channel = 0; channel < 3; channel++) {
      const delta = channels[channel][i] - blurred[channel][i]
      if (Math.abs(delta) <= noiseFloor) continue
      const sharpened = channels[channel][i] + delta * lumaAmount
      data[offset + channel] = clampChannel(Math.max(
        channels[channel][i] - maxStep,
        Math.min(channels[channel][i] + maxStep, sharpened),
      ))
    }
  }
}

function issueFlags(report: IssueReport, sizeIn: number): string[] {
  const flags: string[] = []
  if (report.faceSharpness > 0 && report.faceSharpness < 25) {
    flags.push('This photo is quite blurry. A sharper photo will make the face easier to build.')
  }
  if (report.faces > 1 && sizeIn === 6) {
    flags.push('This small size may not show every face clearly. Try 12 inches or larger.')
  }
  if (report.lowResFor24 && sizeIn === 24) {
    flags.push('This photo is small for a 24-inch mosaic. A larger original will hold more detail.')
  }
  return flags
}

export async function optimizeForBuild(bitmap: OptimizeSource, sizeIn: number, opts: OptimizeOptions = {}): Promise<OptimizeResult> {
  const source = drawWorkingCopy(bitmap)
  const bgMode = opts.bgMode ?? 'flatten'
  const brightness = opts.brightness ?? 0
  const zoom = opts.zoom ?? 0
  const analysis = opts.analysisOverride
    ? { mask: opts.analysisOverride.mask, face: opts.analysisOverride.face, faces: opts.analysisOverride.faces ?? (opts.analysisOverride.face ? 1 : 0) }
    : await (() => {
        let cached = analysisCache.get(bitmap)
        if (!cached) {
          cached = Promise.all([segmentSubject(source), detectFaces(source)]).then(([{ mask }, detection]) => ({
            mask,
            face: detection.face,
            faces: detection.faces,
          }))
          analysisCache.set(bitmap, cached)
        }
        return cached
      })()

  let softMask = analysis.mask
  if (softMask.width !== source.width || softMask.height !== source.height) {
    softMask = resizeMask(softMask, source.width, source.height)
  }
  let values = maskValues(softMask)
  let subjectCount = 0
  for (const value of values) if (value > 127) subjectCount++
  if (subjectCount < values.length * 0.01) {
    values = new Uint8ClampedArray(values.length)
    values.fill(255)
    softMask = valuesToImageData(values, source.width, source.height)
  }

  const report = analyzePixels(source, softMask, analysis.face, analysis.faces)
  const input = sourceSize(bitmap)
  report.resolution = `${input.width}x${input.height}`
  report.lowResFor24 = Math.min(input.width, input.height) < 1200
  const policy = POLICY[sizeIn] ?? POLICY[12]
  const targetFill = Math.max(0.5, Math.min(0.94, policy.fill + zoom * 0.04))
  const sourceContext = source.getContext('2d', { willReadFrequently: true })!
  const sourcePixels = sourceContext.getImageData(0, 0, source.width, source.height)
  const filledMask = fillMaskHoles(values, source.width, source.height)
  const keptMask = keepMeaningfulComponents(filledMask, source.width, source.height)
  const cleanedValues = removeLowerGreenIslands(keptMask, sourcePixels, source.width, source.height)
  const cleanedMask = valuesToImageData(cleanedValues, source.width, source.height)
  const crop = portraitCrop(cleanedMask, targetFill)
  const outputSize = Math.max(640, Math.min(WORK_LONG_EDGE, Math.round(crop.side)))

  // Keep the reference order: tone the full working image, flatten its background,
  // then apply the portrait crop before contrast, saturation, and unsharp masking.
  const processingMask = cleanedValues
  const processingMaskImage = valuesToImageData(processingMask, source.width, source.height)
  const sourceHardMask = confidenceAwareErode(processingMask, source.width, source.height)
  correctTone(sourcePixels, processingMask, analysis.face, report.greenCast)
  if (bgMode === 'flatten') flattenBackground(sourcePixels, sourceHardMask)
  sourceContext.putImageData(sourcePixels, 0, 0)

  const output = makeCanvas(outputSize, outputSize)
  const context = output.getContext('2d', { willReadFrequently: true })!
  context.drawImage(source, crop.x, crop.y, crop.side, crop.side, 0, 0, outputSize, outputSize)
  const outputMask = cropMask(processingMaskImage, crop, outputSize)
  const outputRawMask = maskValues(outputMask)
  const hardMask = confidenceAwareErode(outputRawMask, outputSize, outputSize)
  const pixels = context.getImageData(0, 0, outputSize, outputSize)

  adjustContrast(pixels, brightness)
  saturate(pixels, hardMask)
  medianDenoise(pixels, hardMask)
  unsharp(pixels, hardMask, policy.sharpen / 100)
  context.putImageData(pixels, 0, 0)

  const appliedFixes: string[] = []
  if (report.skinRgb) appliedFixes.push('balanced skin tones')
  if (report.backlit || (report.faceLuma != null && report.faceLuma < 185)) appliedFixes.push('brightened the face')
  if (report.lowContrast) appliedFixes.push('improved contrast')
  if (bgMode === 'flatten') appliedFixes.push('calmed the background')
  if (crop.side < Math.min(source.width, source.height) * 0.96) appliedFixes.push('cropped in closer')
  if (report.blurry) appliedFixes.push('sharpened details')

  return {
    canvas: output,
    report,
    appliedFixes,
    flags: issueFlags(report, sizeIn),
    bgMode,
  }
}
