import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Undo2, X } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Stepper } from '@/components/Stepper'
import { UploadStep } from '@/components/UploadStep'
import { OptimizeStep, OptimizeControls } from '@/components/OptimizeStep'
import { PreviewStep, FORMATS, SIZES, CATEGORIES } from '@/components/PreviewStep'
import { CropDialog } from '@/components/CropDialog'
import { RequestDialog } from '@/components/RequestDialog'
import { SuccessView } from '@/components/SuccessView'
import { TrustLine } from '@/components/TrustLine'
import {
  loadImage, computeSaliency, autoCrop, renderCrop, renderMosaic,
  STYLES, CropState, FineTune, MosaicResult, Saliency,
} from '@/lib/mosaic'
import { track, submitProofRequest } from '@/lib/api'
import { PALETTE, TIERS, PRICES, PANEL_SIZE_TILES, kitPrice } from '@/lib/palette'
import { optimizeForBuild, OptimizeResult } from '@/lib/optimize'
import { createAdaptiveMosaicPreview } from '@/lib/adaptivePalette'
import type { AdaptiveMosaicPreview, PaletteMode } from '@/lib/adaptivePalette'
import { CURATED_VARIANTS, curatedVariantStyle } from '@/lib/magicResults'
import { renderPhysicalTiles } from '@/lib/tileRenderer'
import type { GroutTone } from '@/lib/tileRenderer'
import {
  actualSizeTierPrice,
  edgeBlendStrength,
  estimateBuildMinutes,
  expandHybridPlanToSingles,
  featureAwareDownscale,
  GALLERY_TIER,
  createQualityAdaptiveMosaicPreview,
  isQualityPipelineEnabled,
  qualityPaletteTiers,
  QUALITY_BOARD_PITCH_IN,
  QUALITY_CELL_SIZE_IN,
  selectQualityGeometry,
  subjectCoverage,
  suppressIsolatedTiles,
} from '@/lib/qualityPipeline'
import { renderQualityTiles } from '@/lib/qualityRenderer'
import { applyQualityIntelligence, isQualityIntelligenceEnabled } from '@/lib/qualityIntelligence'

type Stage = 'upload' | 'optimize' | 'preview' | 'done'
const GRID_FOR_SIZE: Record<number, number> = { 6: 1, 12: 2, 18: 3, 24: 4 }
const DRAFT_KEY = 'mosapack.builder.draft.v1'
const MAX_DRAFT_PHOTO_BYTES = 2 * 1024 * 1024

interface BuilderDraft {
  crop: CropState
  styleId: string
  tierId: string
  sizeIn: number
  format: string
  category: string
  photoDataUrl?: string
}

interface UndoSnapshot {
  crop: CropState
  styleId: string
  tierId: string
  tune: FineTune
}

function readDraft(): BuilderDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as BuilderDraft
    if (!draft.crop || !draft.photoDataUrl) return null
    const original = JSON.stringify(draft)
    if (draft.sizeIn === 16) draft.sizeIn = 18
    if (!GRID_FOR_SIZE[draft.sizeIn]) draft.sizeIn = 12
    if (PRICES[draft.sizeIn]?.[draft.tierId] == null) draft.tierId = 'balanced'
    if (JSON.stringify(draft) !== original) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    return draft
  } catch {
    return null
  }
}

function clearDraft() {
  try { window.localStorage.removeItem(DRAFT_KEY) } catch { /* storage optional */ }
}

export default function App() {
  const [qualityEnabled] = useState(() => isQualityPipelineEnabled())
  const [qualityIntelligenceEnabled] = useState(() => isQualityIntelligenceEnabled())
  const [paletteMode] = useState<PaletteMode>(() => (
    new URLSearchParams(window.location.search).get('paletteMode') === 'fixed'
      ? 'fixed'
      : 'adaptive'
  ))
  const [classicBannerVisible, setClassicBannerVisible] = useState(() => new URLSearchParams(window.location.search).has('classic'))
  const [stage, setStage] = useState<Stage>('upload')
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [crop, setCrop] = useState<CropState | null>(null)
  const [autoCropped, setAutoCropped] = useState(false)
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [styleId, setStyleId] = useState('true_color')
  const [tune, setTune] = useState<FineTune>({ brightness: 0, contrast: 0, background: 0 })
  const [format, setFormat] = useState<string>(FORMATS[0].id)
  const [sizeIn, setSizeIn] = useState<number>(12)
  const [tierId, setTierId] = useState<string>(() => (
    new URLSearchParams(window.location.search).get('paletteMode') === 'fixed' ? 'balanced' : GALLERY_TIER.id
  ))
  const [grout, setGrout] = useState<GroutTone>('grey')
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('')
  const [resumeDraft, setResumeDraft] = useState<BuilderDraft | null>(null)
  const undoStack = useRef<UndoSnapshot[]>([])
  const [undoDepth, setUndoDepth] = useState(0)
  const [mosaic, setMosaic] = useState<MosaicResult | null>(null)
  const [rendering, setRendering] = useState(false)
  const [adaptivePreview, setAdaptivePreview] = useState<AdaptiveMosaicPreview | null>(null)
  const [adaptiveRendering, setAdaptiveRendering] = useState(false)
  const [adaptivePreviewFailed, setAdaptivePreviewFailed] = useState(false)
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null)
  const [optimizeLoading, setOptimizeLoading] = useState(false)
  const [optimizeError, setOptimizeError] = useState<string | null>(null)
  const [optimizeApplied, setOptimizeApplied] = useState(true)
  const [optimizeControls, setOptimizeControls] = useState<OptimizeControls>({ bgMode: 'flatten', brightness: 0, zoom: 0 })
  const optimizeSeq = useRef(0)
  const [styleThumbs, setStyleThumbs] = useState<Record<string, string>>({})
  const [cropOpen, setCropOpen] = useState(false)
  const [reqOpen, setReqOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState<{
    ref: string
    email: string
    simulated: boolean
    mosaicSrc: string
    previewSrc: string
    tileMap: number[]
    gridSize: number
    panelGrid: number
    panelSizeTiles: number
    paletteCount: number
  } | null>(null)

  useEffect(() => {
    track('builder_view')
    setResumeDraft(readDraft())
  }, [])

  useEffect(() => {
    if (!crop || !photoDataUrl || stage === 'done') return
    const draft: BuilderDraft = {
      crop,
      styleId,
      tierId,
      sizeIn,
      format,
      category,
    }
    if (photoDataUrl.length <= MAX_DRAFT_PHOTO_BYTES) draft.photoDataUrl = photoDataUrl
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch { /* storage optional */ }
  }, [crop, styleId, tierId, sizeIn, format, category, photoDataUrl, stage])

  // cropped source + saliency of the crop (drives subject weighting)
  const cropped = useMemo(() => {
    if (!img || !crop) return null
    return renderCrop(img, crop, 640)
  }, [img, crop])
  const optimizationInput = useMemo(() => {
    if (!img || !crop) return null
    const sourceSide = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height)
    return renderCrop(img, crop, Math.min(1600, Math.max(640, sourceSide)))
  }, [img, crop])
  const style = STYLES.find((s) => s.id === styleId) ?? STYLES[0]
  const baselineSourceCanvas = optimizeApplied && optimizeResult ? optimizeResult.canvas : cropped
  const qualityGeometry = useMemo(() => selectQualityGeometry({
    preferredSizeIn: sizeIn,
    sourceWidth: baselineSourceCanvas?.width ?? 640,
    sourceHeight: baselineSourceCanvas?.height ?? 640,
    faces: optimizeResult?.report.faces ?? 0,
    subjectCoverage: subjectCoverage(optimizeApplied ? optimizeResult?.subjectMask : undefined),
  }), [sizeIn, baselineSourceCanvas, optimizeResult, optimizeApplied])
  const basePanelGrid = GRID_FOR_SIZE[sizeIn] ?? 2
  const gridSize = qualityEnabled ? qualityGeometry.gridSize : basePanelGrid * PANEL_SIZE_TILES
  const intelligenceResult = useMemo(() => {
    if (!qualityIntelligenceEnabled || !optimizeApplied || !optimizeResult || !baselineSourceCanvas) return null
    try {
      return applyQualityIntelligence(baselineSourceCanvas, {
          subjectMask: optimizeResult.subjectMask,
          faceAnalysis: optimizeResult.faceAnalysis,
          report: optimizeResult.report,
          gridSize,
        })
    } catch (error) {
      console.warn('Quality intelligence unavailable; using the conservative optimized source.', error)
      return null
    }
  }, [qualityIntelligenceEnabled, optimizeApplied, optimizeResult, baselineSourceCanvas, gridSize])
  const sourceCanvas = intelligenceResult?.canvas ?? baselineSourceCanvas
  const sourceSal: Saliency = useMemo(
    () => (sourceCanvas ? computeSaliency(sourceCanvas) : { cx: 0.5, cy: 0.5, spread: 0.35 }),
    [sourceCanvas]
  )
  const croppedSrc = useMemo(() => sourceCanvas?.toDataURL('image/jpeg', 0.9) ?? '', [sourceCanvas])
  const originalCroppedSrc = useMemo(() => optimizationInput?.toDataURL('image/jpeg', 0.9) ?? '', [optimizationInput])
  const optimizedSrc = useMemo(() => optimizeResult?.canvas.toDataURL('image/jpeg', 0.9) ?? '', [optimizeResult])
  const panelGrid = qualityEnabled ? gridSize / PANEL_SIZE_TILES : basePanelGrid
  const paletteTiers = useMemo(() => qualityPaletteTiers(
    TIERS.filter((tier) => PRICES[sizeIn]?.[tier.id] != null),
    qualityEnabled && qualityGeometry.galleryEligible,
    paletteMode === 'adaptive',
  ), [sizeIn, qualityEnabled, qualityGeometry.galleryEligible, paletteMode])
  const paletteCount = paletteTiers.find((tier) => tier.id === tierId)?.colors ?? 12
  const fixedPaletteCount = Math.min(PALETTE.length, paletteCount)
  const finishedSizeIn = qualityEnabled
    ? qualityGeometry.finishedSizeIn
    : Number((gridSize * QUALITY_BOARD_PITCH_IN).toFixed(2))
  const price = actualSizeTierPrice(finishedSizeIn, tierId, kitPrice(sizeIn, tierId))
  const pipelineSource = useMemo(() => {
    if (!qualityEnabled || !sourceCanvas) return sourceCanvas
    try {
      return featureAwareDownscale(sourceCanvas, gridSize, optimizeApplied ? optimizeResult?.subjectMask : undefined)
    } catch (error) {
      console.warn('Feature-aware downscale unavailable; using the conservative source.', error)
      return sourceCanvas
    }
  }, [qualityEnabled, sourceCanvas, gridSize, optimizeApplied, optimizeResult])
  const adaptiveWeightMask = intelligenceResult?.paletteWeightMask
    ?? (optimizeApplied ? optimizeResult?.subjectMask : undefined)
  const adaptiveReadyForVariants = paletteMode !== 'adaptive' || adaptivePreview !== null
  const approvedPaletteMode: PaletteMode = paletteMode === 'adaptive' && adaptivePreview ? 'adaptive' : 'fixed'
  const approvedMosaic = approvedPaletteMode === 'adaptive' ? adaptivePreview?.mosaic ?? null : mosaic
  const approvedPalette = approvedPaletteMode === 'adaptive'
    ? adaptivePreview?.palette.colors ?? []
    : PALETTE.slice(0, fixedPaletteCount)
  const singlesPlan = useMemo(() => approvedMosaic
    ? expandHybridPlanToSingles(
        approvedMosaic,
        qualityEnabled && optimizeApplied ? optimizeResult?.subjectMask : undefined,
      )
    : null, [approvedMosaic, qualityEnabled, optimizeApplied, optimizeResult])
  const orderedColorCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const paletteIndex of singlesPlan?.tileMap ?? []) {
      const hex = approvedPalette[paletteIndex]?.hex
      if (hex) counts[hex] = (counts[hex] ?? 0) + 1
    }
    return counts
  }, [singlesPlan, approvedPalette])
  const stickerCount = singlesPlan?.tileMap.length ?? gridSize * gridSize
  const buildMinutes = estimateBuildMinutes(stickerCount)
  const paletteResolved = paletteMode === 'fixed' || adaptivePreview !== null || adaptivePreviewFailed
  const proofRequestEnabled = Boolean(paletteResolved && approvedMosaic && !rendering && !adaptiveRendering)
  const customerPreviewThumb = useMemo(() => {
    if (!approvedMosaic) return ''
    const tilePx = Math.max(8, Math.floor(672 / approvedMosaic.gridSize))
    try {
      return (qualityEnabled
        ? renderQualityTiles(approvedMosaic, approvedPalette, {
          tilePx,
          grout,
          subjectMask: optimizeApplied ? optimizeResult?.subjectMask : undefined,
          edgeBlend: edgeBlendStrength(styleId),
          fulfillmentMode: 'singles',
        }).canvas
        : renderPhysicalTiles(approvedMosaic, approvedPalette, { tilePx, grout })
      ).toDataURL('image/png')
    } catch (error) {
      console.warn('Quality tile render unavailable; using the faithful singles renderer.', error)
      return renderPhysicalTiles(approvedMosaic, approvedPalette, { tilePx, grout }).toDataURL('image/png')
    }
  }, [approvedMosaic, approvedPalette, qualityEnabled, grout, optimizeApplied, optimizeResult, styleId])

  useEffect(() => {
    if (!optimizationInput || (stage !== 'optimize' && stage !== 'preview') || !optimizeApplied) return
    const seq = ++optimizeSeq.current
    setOptimizeLoading(true)
    setOptimizeError(null)
    optimizeForBuild(optimizationInput, sizeIn, optimizeControls)
      .then((result) => {
        if (seq !== optimizeSeq.current) return
        setOptimizeResult(result)
        setOptimizeLoading(false)
        track('photo_optimized', { size_in: sizeIn, bg_mode: result.bgMode, fixes: result.appliedFixes.length })
      })
      .catch(() => {
        if (seq !== optimizeSeq.current) return
        setOptimizeError('optimize_failed')
        setOptimizeLoading(false)
      })
  }, [optimizationInput, sizeIn, optimizeControls, optimizeApplied, stage])

  useEffect(() => {
    if (!paletteTiers.some((tier) => tier.id === tierId)) setTierId('balanced')
  }, [paletteTiers, tierId])

  const pushUndo = useCallback(() => {
    if (!crop) return
    const snapshot: UndoSnapshot = { crop, styleId, tierId, tune }
    const last = undoStack.current[undoStack.current.length - 1]
    if (
      last &&
      last.styleId === snapshot.styleId &&
      last.tierId === snapshot.tierId &&
      last.tune.brightness === snapshot.tune.brightness &&
      last.tune.contrast === snapshot.tune.contrast &&
      last.tune.background === snapshot.tune.background &&
      last.crop.cx === snapshot.crop.cx &&
      last.crop.cy === snapshot.crop.cy &&
      last.crop.scale === snapshot.crop.scale &&
      last.crop.rotation === snapshot.crop.rotation
    ) return
    undoStack.current.push(snapshot)
    setUndoDepth(undoStack.current.length)
  }, [crop, styleId, tierId, tune])

  const invalidateAdaptivePreview = useCallback(() => {
    if (paletteMode !== 'adaptive') return
    setAdaptivePreview(null)
    setAdaptivePreviewFailed(false)
  }, [paletteMode])

  const undoLast = useCallback(() => {
    const snapshot = undoStack.current.pop()
    if (!snapshot) return
    setCrop(snapshot.crop)
    setStyleId(snapshot.styleId)
    setTierId(snapshot.tierId)
    setTune(snapshot.tune)
    setAutoCropped(false)
    setMosaic(null)
    invalidateAdaptivePreview()
    setStyleThumbs({})
    setUndoDepth(undoStack.current.length)
  }, [invalidateAdaptivePreview])

  const changeCrop = useCallback((next: CropState) => {
    pushUndo()
    invalidateAdaptivePreview()
    setCrop(next)
    setAutoCropped(false)
  }, [invalidateAdaptivePreview, pushUndo])

  const changeStyle = useCallback((next: string) => {
    if (next === styleId) return
    pushUndo()
    invalidateAdaptivePreview()
    setStyleId(next)
  }, [invalidateAdaptivePreview, pushUndo, styleId])

  const changeTier = useCallback((next: string) => {
    if (next === tierId) return
    pushUndo()
    invalidateAdaptivePreview()
    setTierId(next)
  }, [invalidateAdaptivePreview, pushUndo, tierId])

  const changeSize = useCallback((next: number) => {
    invalidateAdaptivePreview()
    setSizeIn(next)
    track('size_changed', {
      size_in: next,
      panel_grid: GRID_FOR_SIZE[next] ?? 2,
      panel_size_tiles: PANEL_SIZE_TILES,
    })
  }, [invalidateAdaptivePreview])

  const changeTune = useCallback((next: FineTune) => {
    if (
      next.brightness === tune.brightness &&
      next.contrast === tune.contrast &&
      next.background === tune.background
    ) return
    pushUndo()
    invalidateAdaptivePreview()
    setTune(next)
  }, [invalidateAdaptivePreview, pushUndo, tune])

  const changeOptimizeControls = useCallback((next: OptimizeControls) => {
    invalidateAdaptivePreview()
    setOptimizeControls(next)
  }, [invalidateAdaptivePreview])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undoLast()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undoLast])

  // main mosaic render — deferred a tick so the UI never blocks
  const renderSeq = useRef(0)
  useEffect(() => {
    if (!pipelineSource) return
    const seq = ++renderSeq.current
    setRendering(true)
    const t = setTimeout(() => {
      if (seq !== renderSeq.current) return
      const rendered = renderMosaic(pipelineSource, gridSize, style, tune, sourceSal, Math.max(10, Math.round(672 / gridSize)), fixedPaletteCount)
      const m = qualityEnabled ? suppressIsolatedTiles(rendered, PALETTE.slice(0, fixedPaletteCount)) : rendered
      if (seq !== renderSeq.current) return
      setMosaic(m)
      setRendering(false)
      track('preview_rendered', { style: style.id, grid: gridSize, quality_pipeline: qualityEnabled })
    }, 30)
    return () => clearTimeout(t)
  }, [pipelineSource, gridSize, style, tune, sourceSal, fixedPaletteCount, qualityEnabled])

  useEffect(() => {
    if (paletteMode !== 'adaptive' || !pipelineSource || stage !== 'preview') {
      setAdaptivePreview(null)
      setAdaptiveRendering(false)
      setAdaptivePreviewFailed(false)
      return
    }
    let cancelled = false
    setAdaptiveRendering(true)
    setAdaptivePreviewFailed(false)
    const timeout = setTimeout(() => {
      try {
        const preview = (qualityEnabled ? createQualityAdaptiveMosaicPreview : createAdaptiveMosaicPreview)(
          pipelineSource,
          gridSize,
          style,
          tune,
          sourceSal,
          Math.max(10, Math.round(672 / gridSize)),
          paletteCount,
          Boolean(optimizeResult?.report.skinRgb),
          adaptiveWeightMask,
        )
        if (qualityEnabled) {
          preview.mosaic = suppressIsolatedTiles(preview.mosaic, preview.palette.colors)
        }
        if (!cancelled) setAdaptivePreview(preview)
      } catch (error) {
        console.warn('Adaptive palette preview unavailable; keeping fixed preview.', error)
        if (!cancelled) {
          setAdaptivePreview(null)
          setAdaptivePreviewFailed(true)
        }
      } finally {
        if (!cancelled) setAdaptiveRendering(false)
      }
    }, 40)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [paletteMode, pipelineSource, stage, gridSize, style, tune, sourceSal, paletteCount, optimizeResult, qualityEnabled, adaptiveWeightMask])

  // Curated finished looks render sequentially to keep mobile interaction responsive.
  useEffect(() => {
    if (!pipelineSource || stage !== 'preview' || !adaptiveReadyForVariants) return
    const thumbs: Record<string, string> = {}
    const thumbnailGridSize = Math.min(20, gridSize)
    const thumbnailTilePx = Math.max(6, Math.floor(240 / thumbnailGridSize))
    const thumbnailPaletteCount = qualityEnabled ? Math.min(12, paletteCount) : paletteCount
    let cancelled = false
    const run = (i: number) => {
      if (cancelled || i >= CURATED_VARIANTS.length) return
      const variant = CURATED_VARIANTS[i]
      const variantStyle = curatedVariantStyle(variant.id)
      try {
        if (paletteMode === 'adaptive') {
          const preview = (qualityEnabled ? createQualityAdaptiveMosaicPreview : createAdaptiveMosaicPreview)(
            pipelineSource,
            thumbnailGridSize,
            variantStyle,
            { brightness: 0, contrast: 0, background: 0 },
            sourceSal,
            thumbnailTilePx,
            thumbnailPaletteCount,
            Boolean(optimizeResult?.report.skinRgb),
            adaptiveWeightMask,
          )
          const variantMosaic = qualityEnabled
            ? suppressIsolatedTiles(preview.mosaic, preview.palette.colors)
            : preview.mosaic
          thumbs[variant.id] = (qualityEnabled
            ? renderQualityTiles(variantMosaic, preview.palette.colors, {
                tilePx: thumbnailTilePx,
                subjectMask: optimizeApplied ? optimizeResult?.subjectMask : undefined,
                edgeBlend: edgeBlendStrength(variant.id),
                fulfillmentMode: 'singles',
              }).canvas
            : renderPhysicalTiles(variantMosaic, preview.palette.colors, { tilePx: thumbnailTilePx })
          ).toDataURL('image/png')
        } else {
          const rendered = renderMosaic(
            pipelineSource,
            thumbnailGridSize,
            variantStyle,
            { brightness: 0, contrast: 0, background: 0 },
            sourceSal,
            thumbnailTilePx,
            thumbnailPaletteCount,
          )
          const fixed = qualityEnabled ? suppressIsolatedTiles(rendered, PALETTE.slice(0, thumbnailPaletteCount)) : rendered
          thumbs[variant.id] = (qualityEnabled
            ? renderQualityTiles(fixed, PALETTE.slice(0, thumbnailPaletteCount), {
                tilePx: thumbnailTilePx,
                subjectMask: optimizeApplied ? optimizeResult?.subjectMask : undefined,
                edgeBlend: edgeBlendStrength(variant.id),
                fulfillmentMode: 'singles',
              }).canvas
            : renderPhysicalTiles(fixed, PALETTE.slice(0, thumbnailPaletteCount), { tilePx: thumbnailTilePx })
          ).toDataURL('image/png')
        }
      } catch {
        const fixed = renderMosaic(
          pipelineSource,
          thumbnailGridSize,
          variantStyle,
          { brightness: 0, contrast: 0, background: 0 },
          sourceSal,
          thumbnailTilePx,
          thumbnailPaletteCount,
        )
        thumbs[variant.id] = (qualityEnabled
          ? renderQualityTiles(fixed, PALETTE.slice(0, thumbnailPaletteCount), {
              tilePx: thumbnailTilePx,
              subjectMask: optimizeApplied ? optimizeResult?.subjectMask : undefined,
              edgeBlend: edgeBlendStrength(variant.id),
              fulfillmentMode: 'singles',
            }).canvas
          : renderPhysicalTiles(fixed, PALETTE.slice(0, thumbnailPaletteCount), { tilePx: thumbnailTilePx })
        ).toDataURL('image/png')
      }
      setStyleThumbs({ ...thumbs })
      setTimeout(() => run(i + 1), 16)
    }
    const start = setTimeout(() => run(0), 120)
    return () => { cancelled = true; clearTimeout(start) }
  }, [pipelineSource, sourceSal, gridSize, paletteCount, paletteMode, optimizeApplied, optimizeResult, stage, adaptiveReadyForVariants, qualityEnabled, adaptiveWeightMask])

  const onPhoto = useCallback(async (src: string) => {
    try {
      const im = await loadImage(src)
      const sal = computeSaliency(im)
      const c = autoCrop(im, sal)
      setImg(im)
      setCrop(c)
      setPhotoDataUrl(src.length <= MAX_DRAFT_PHOTO_BYTES ? src : '')
      setAutoCropped(true)
      setMosaic(null)
      setAdaptivePreview(null)
      setStyleThumbs({})
      setOptimizeResult(null)
      setOptimizeError(null)
      setOptimizeApplied(true)
      setOptimizeControls({ bgMode: 'flatten', brightness: 0, zoom: 0 })
      undoStack.current = []
      setUndoDepth(0)
      setStage('optimize')
      track('crop_confirmed', { mode: 'auto' })
      window.scrollTo({ top: 0 })
    } catch {
      // corrupt file — stay on upload; the dropzone shows format guidance
    }
  }, [])

  const continueDraft = useCallback(async () => {
    if (!resumeDraft?.photoDataUrl) return
    try {
      const im = await loadImage(resumeDraft.photoDataUrl)
      setImg(im)
      setCrop(resumeDraft.crop)
      setPhotoDataUrl(resumeDraft.photoDataUrl)
      setStyleId(resumeDraft.styleId)
      setTierId(resumeDraft.tierId)
      setSizeIn(resumeDraft.sizeIn)
      setFormat(resumeDraft.format)
      setCategory(resumeDraft.category)
      setAutoCropped(false)
      setMosaic(null)
      setAdaptivePreview(null)
      setStyleThumbs({})
      setOptimizeResult(null)
      setOptimizeError(null)
      setOptimizeApplied(true)
      setOptimizeControls({ bgMode: 'flatten', brightness: 0, zoom: 0 })
      undoStack.current = []
      setUndoDepth(0)
      setResumeDraft(null)
      setStage('optimize')
      window.scrollTo({ top: 0 })
    } catch {
      clearDraft()
      setResumeDraft(null)
    }
  }, [resumeDraft])

  const dismissDraft = () => {
    clearDraft()
    setResumeDraft(null)
  }

  const approveOptimization = () => {
    if (!optimizeResult || optimizeLoading) return
    setOptimizeApplied(true)
    setStage('preview')
    track('optimize_approved', { bg_mode: optimizeResult.bgMode, fixes: optimizeResult.appliedFixes.length })
    window.scrollTo({ top: 0 })
  }

  const useOriginal = () => {
    optimizeSeq.current++
    setOptimizeLoading(false)
    setOptimizeApplied(false)
    setOptimizeError(null)
    setStage('preview')
    track('optimize_original_used')
    window.scrollTo({ top: 0 })
  }

  const openRequest = () => {
    if (!proofRequestEnabled) return
    setServerError(null)
    setReqOpen(true)
    track('proof_modal_opened')
  }

  const submit = async (name: string, email: string) => {
    if (!proofRequestEnabled || !approvedMosaic || !singlesPlan || !croppedSrc || !customerPreviewThumb) return
    setSubmitting(true)
    setServerError(null)
    const proofMosaic = approvedMosaic
    const proofPalette = approvedPalette.map((color, index) => ({
      name: 'name' in color ? color.name : `Color ${index + 1}`,
      hex: color.hex,
    }))
    const mosaicSrc = customerPreviewThumb
    const proofPreviewSrc = customerPreviewThumb
    const res = await submitProofRequest({
      name, email,
      photoCategory: category,
      formatInterest: format,
      formatLabel: FORMATS.find((f) => f.id === format)?.label ?? format,
      preferredSizeIn: sizeIn,
      preferredSizeLabel: SIZES.find((s) => s.in === sizeIn)?.label ?? `${sizeIn}"`,
      styleId: style.id,
      styleLabel: style.label,
      paletteTier: tierId,
      paletteColors: proofPalette.length,
      quotedPriceUsd: price,
      gridSize,
      cellSizeIn: qualityEnabled ? qualityGeometry.cellSizeIn : QUALITY_CELL_SIZE_IN,
      finishedSizeIn,
      panelGrid,
      panelSizeTiles: PANEL_SIZE_TILES,
      fineTune: tune,
      croppedSourceDataUrl: croppedSrc,
      previewImageDataUrl: proofPreviewSrc,
      colorCounts: orderedColorCounts,
      tileMap: singlesPlan.tileMap,
      palette: proofPalette,
      paletteMode: approvedPaletteMode,
      adaptivePalette: approvedPaletteMode === 'adaptive' ? adaptivePreview?.palette.colors : undefined,
      paletteSeed: approvedPaletteMode === 'adaptive' ? adaptivePreview?.palette.seed : undefined,
      gamutProfileId: approvedPaletteMode === 'adaptive' ? adaptivePreview?.palette.gamut_profile_id : undefined,
      fulfillmentTileMode: 'singles_v1',
      groutTone: grout,
      optimizeApplied,
      optimizeFixes: optimizeApplied ? optimizeResult?.appliedFixes ?? [] : [],
      bgMode: optimizeApplied ? optimizeResult?.bgMode ?? 'flatten' : 'keep',
      issueReport: optimizeResult?.report ?? null,
    })
    setSubmitting(false)
    if (res.ok) {
      track('proof_confirmed', { ref: res.proofRef, simulated: res.simulated })
      clearDraft()
      setReqOpen(false)
      setDone({
        ref: res.proofRef,
        email,
        simulated: res.simulated,
        mosaicSrc,
        previewSrc: proofPreviewSrc,
        tileMap: [...singlesPlan.tileMap],
        gridSize: proofMosaic.gridSize,
        panelGrid,
        panelSizeTiles: PANEL_SIZE_TILES,
        paletteCount: proofPalette.length,
      })
      setStage('done')
      window.scrollTo({ top: 0 })
    } else {
      setServerError(
        'We couldn’t reach our server just now. Please try again in a moment — or email hello@mosapack.com and we’ll take it from there.'
      )
    }
  }

  const restart = () => {
    setStage('upload')
    setImg(null); setCrop(null); setMosaic(null); setAdaptivePreview(null); setStyleThumbs({})
    optimizeSeq.current++
    setOptimizeResult(null); setOptimizeLoading(false); setOptimizeError(null); setOptimizeApplied(true)
    setOptimizeControls({ bgMode: 'flatten', brightness: 0, zoom: 0 })
    setPhotoDataUrl('')
    undoStack.current = []
    setUndoDepth(0)
    setTune({ brightness: 0, contrast: 0, background: 0 })
    setStyleId('true_color'); setCategory(CATEGORIES[0]); setFormat(FORMATS[0].id); setSizeIn(12); setTierId('balanced')
    setDone(null)
    window.scrollTo({ top: 0 })
  }

  const goTo = (i: number) => {
    if (i === 0) restart()
    if (i === 1 && img) setStage(optimizeResult ? 'preview' : 'optimize')
  }

  const anyDialog = cropOpen || reqOpen
  const stepIndex = stage === 'upload' ? 0 : stage === 'done' ? 2 : 1

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-ink antialiased">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a href="/" className="flex min-h-[44px] items-center gap-2.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark" aria-label="MosaPack home">
            <Logo />
            <span className="text-lg font-extrabold tracking-tight">MosaPack</span>
          </a>
          <div className="flex items-center gap-2">
            <Stepper current={stepIndex} onGoTo={goTo} />
            <button
              type="button"
              onClick={undoLast}
              disabled={undoDepth === 0}
              aria-label="Undo last builder change"
              title="Undo"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-700 transition-colors hover:border-neutral-300 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
            >
              <Undo2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* pb clears the mobile sticky bar (audit C1) */}
      <main className="mx-auto max-w-6xl px-4 pb-32 pt-8 sm:px-6 md:pb-16">
        {classicBannerVisible && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-brand/30 bg-brand-pale px-4 py-3 text-sm text-brand-deep" role="status">
            <p><span className="font-bold">Pre-made kits are coming soon.</span> You can still make a custom mosaic from your own photo today.</p>
            <button
              type="button"
              onClick={() => setClassicBannerVisible(false)}
              aria-label="Dismiss pre-made kit notice"
              title="Dismiss"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-brand-deep hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        {stage === 'upload' && <UploadStep onPhoto={onPhoto} />}
        {stage === 'upload' && resumeDraft && (
          <div className="mt-6 rounded-xl border border-brand bg-brand-pale p-4">
            <p className="text-sm font-bold text-ink">Continue where you left off?</p>
            <p className="mt-1 text-sm text-neutral-600">Restore your last crop, style, colors, size, format, and photo.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={continueDraft}
                className="min-h-[44px] rounded-full bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={dismissDraft}
                className="min-h-[44px] rounded-full border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-700 hover:border-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {stage === 'optimize' && optimizationInput && (
          <OptimizeStep
            originalSrc={originalCroppedSrc}
            optimizedSrc={optimizedSrc}
            loading={optimizeLoading}
            error={optimizeError}
            result={optimizeResult}
            controls={optimizeControls}
            onControls={changeOptimizeControls}
            onApprove={approveOptimization}
            onUseOriginal={useOriginal}
          />
        )}
        {stage === 'preview' && crop && (
          <PreviewStep
            photoSrc={croppedSrc}
            mosaic={mosaic}
            rendering={rendering}
            adaptivePreview={adaptivePreview}
            adaptiveRendering={adaptiveRendering}
            adaptiveFailed={adaptivePreviewFailed}
            paletteMode={approvedPaletteMode}
            customerPreviewSrc={customerPreviewThumb}
            grout={grout}
            onGrout={setGrout}
            qualityEnabled={qualityEnabled}
            qualityIntelligence={intelligenceResult}
            qualityGeometry={qualityGeometry}
            subjectMask={optimizeApplied ? optimizeResult?.subjectMask : undefined}
            paletteTiers={paletteTiers}
            proofRequestEnabled={proofRequestEnabled}
            styleThumbs={styleThumbs}
            styleId={styleId}
            onStyle={changeStyle}
            tune={tune}
            onTune={changeTune}
            category={category}
            onCategory={setCategory}
            format={format}
            onFormat={setFormat}
            sizeIn={sizeIn}
            onSize={changeSize}
            tierId={tierId}
            onTier={changeTier}
            price={price}
            finishedSizeIn={finishedSizeIn}
            stickerCount={stickerCount}
            buildMinutes={buildMinutes}
            panelGrid={panelGrid}
            onAdjustCrop={() => setCropOpen(true)}
            optimizeControls={optimizeControls}
            onOptimizeControls={changeOptimizeControls}
            onRequest={openRequest}
            autoCropped={autoCropped}
          />
        )}
        {stage === 'done' && done && (
          <SuccessView
            mosaicSrc={done.mosaicSrc}
            previewSrc={done.previewSrc}
            proofRef={done.ref}
            email={done.email}
            simulated={done.simulated}
            tileMap={done.tileMap}
            gridSize={done.gridSize}
            panelGrid={done.panelGrid}
            panelSizeTiles={done.panelSizeTiles}
            paletteCount={done.paletteCount}
            onRestart={restart}
          />
        )}
      </main>

      {/* mobile sticky CTA: opaque, bordered, under dialogs, hidden while a dialog is open (audit C1) */}
      {stage === 'preview' && proofRequestEnabled && !anyDialog && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white px-4 pt-3 md:hidden" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              {finishedSizeIn}″ square · {stickerCount.toLocaleString()} stickers · {panelGrid * panelGrid === 1 ? '1 panel' : `${panelGrid * panelGrid} panels`}
            </span>
            <span className="text-base font-extrabold tabular-nums">${price}.00</span>
          </div>
          <button
            type="button"
            onClick={openRequest}
            className="w-full rounded-full bg-pop py-3.5 text-base font-bold text-white shadow-md transition-colors hover:bg-pop-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pop-dark"
          >
            Get my free proof
          </button>
          <TrustLine className="mt-1.5 text-center" />
        </div>
      )}

      {/* legal chrome (audit C6) */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-[13px] text-neutral-500 sm:px-6">
          <span>© 2026 MosaPack · Turn your photo into a custom mosaic</span>
          <nav aria-label="Legal" className="flex gap-5">
            <a href="/privacy" className="flex min-h-[44px] items-center hover:text-brand-deep">Privacy</a>
            <a href="/terms" className="flex min-h-[44px] items-center hover:text-brand-deep">Terms</a>
            <a href="mailto:hello@mosapack.com" className="flex min-h-[44px] items-center hover:text-brand-deep">Contact</a>
          </nav>
        </div>
      </footer>

      <CropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        img={img}
        crop={crop ?? { cx: 0, cy: 0, scale: 1, rotation: 0 }}
        onApply={(c) => { changeCrop(c); track('crop_confirmed', { mode: 'manual' }) }}
      />
      <RequestDialog
        open={reqOpen}
        onOpenChange={setReqOpen}
        summary={{
          thumb: proofRequestEnabled ? customerPreviewThumb : '',
          category,
          formatLabel: FORMATS.find((f) => f.id === format)?.label ?? '',
          sizeLabel: SIZES.find((s) => s.in === sizeIn)?.label ?? '',
          finishedSizeLabel: `${finishedSizeIn}″ × ${finishedSizeIn}″`,
          stickerCount,
          buildMinutes,
          styleLabel: style.label,
        }}
        submitting={submitting}
        serverError={serverError}
        onSubmit={submit}
      />
    </div>
  )
}
