import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Undo2, X } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Stepper } from '@/components/Stepper'
import { UploadStep } from '@/components/UploadStep'
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

type Stage = 'upload' | 'preview' | 'done'
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
  const [tierId, setTierId] = useState<string>('balanced')
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('')
  const [resumeDraft, setResumeDraft] = useState<BuilderDraft | null>(null)
  const undoStack = useRef<UndoSnapshot[]>([])
  const [undoDepth, setUndoDepth] = useState(0)
  const [mosaic, setMosaic] = useState<MosaicResult | null>(null)
  const [rendering, setRendering] = useState(false)
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
  const croppedSal: Saliency = useMemo(
    () => (cropped ? computeSaliency(cropped) : { cx: 0.5, cy: 0.5, spread: 0.35 }),
    [cropped]
  )
  const croppedSrc = useMemo(() => cropped?.toDataURL('image/jpeg', 0.9) ?? '', [cropped])

  const style = STYLES.find((s) => s.id === styleId) ?? STYLES[0]
  const panelGrid = GRID_FOR_SIZE[sizeIn] ?? 2
  const gridSize = panelGrid * PANEL_SIZE_TILES
  const paletteCount = TIERS.find((t) => t.id === tierId)?.colors ?? 12
  const price = kitPrice(sizeIn, tierId)

  useEffect(() => {
    if (PRICES[sizeIn]?.[tierId] == null) setTierId('balanced')
  }, [sizeIn, tierId])

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

  const undoLast = useCallback(() => {
    const snapshot = undoStack.current.pop()
    if (!snapshot) return
    setCrop(snapshot.crop)
    setStyleId(snapshot.styleId)
    setTierId(snapshot.tierId)
    setTune(snapshot.tune)
    setAutoCropped(false)
    setMosaic(null)
    setStyleThumbs({})
    setUndoDepth(undoStack.current.length)
  }, [])

  const changeCrop = useCallback((next: CropState) => {
    pushUndo()
    setCrop(next)
    setAutoCropped(false)
  }, [pushUndo])

  const changeStyle = useCallback((next: string) => {
    if (next === styleId) return
    pushUndo()
    setStyleId(next)
  }, [pushUndo, styleId])

  const changeTier = useCallback((next: string) => {
    if (next === tierId) return
    pushUndo()
    setTierId(next)
  }, [pushUndo, tierId])

  const changeSize = useCallback((next: number) => {
    setSizeIn(next)
    track('size_changed', {
      size_in: next,
      panel_grid: GRID_FOR_SIZE[next] ?? 2,
      panel_size_tiles: PANEL_SIZE_TILES,
    })
  }, [])

  const changeTune = useCallback((next: FineTune) => {
    if (
      next.brightness === tune.brightness &&
      next.contrast === tune.contrast &&
      next.background === tune.background
    ) return
    pushUndo()
    setTune(next)
  }, [pushUndo, tune])

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
    if (!cropped) return
    const seq = ++renderSeq.current
    setRendering(true)
    const t = setTimeout(() => {
      if (seq !== renderSeq.current) return
      const m = renderMosaic(cropped, gridSize, style, tune, croppedSal, Math.max(10, Math.round(672 / gridSize)), paletteCount)
      if (seq !== renderSeq.current) return
      setMosaic(m)
      setRendering(false)
      track('preview_rendered', { style: style.id, grid: gridSize })
    }, 30)
    return () => clearTimeout(t)
  }, [cropped, gridSize, style, tune, croppedSal, paletteCount])

  // style thumbnails: mosaic of a subject-zoomed crop, so styles are tellable apart (audit U4)
  useEffect(() => {
    if (!cropped) return
    const zoom = document.createElement('canvas')
    const Z = 240
    zoom.width = Z; zoom.height = Z
    const zctx = zoom.getContext('2d')!
    const half = 640 / (2 * 1.8)
    const cx = Math.max(half, Math.min(640 - half, croppedSal.cx * 640))
    const cy = Math.max(half, Math.min(640 - half, croppedSal.cy * 640))
    zctx.drawImage(cropped, cx - half, cy - half, half * 2, half * 2, 0, 0, Z, Z)
    const zsal = computeSaliency(zoom)
    const thumbs: Record<string, string> = {}
    let cancelled = false
    const run = (i: number) => {
      if (cancelled || i >= STYLES.length) return
      const s = STYLES[i]
      const m = renderMosaic(zoom, 26, s, { brightness: 0, contrast: 0, background: 0 }, zsal, 5, paletteCount)
      thumbs[s.id] = m.displayCanvas.toDataURL('image/png')
      setStyleThumbs({ ...thumbs })
      setTimeout(() => run(i + 1), 16)
    }
    run(0)
    return () => { cancelled = true }
  }, [cropped, croppedSal, paletteCount])

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
      setStyleThumbs({})
      undoStack.current = []
      setUndoDepth(0)
      setStage('preview')
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
      setStyleThumbs({})
      undoStack.current = []
      setUndoDepth(0)
      setResumeDraft(null)
      setStage('preview')
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

  const openRequest = () => {
    setServerError(null)
    setReqOpen(true)
    track('proof_modal_opened')
  }

  const submit = async (name: string, email: string) => {
    if (!mosaic || !croppedSrc) return
    setSubmitting(true)
    setServerError(null)
    const mosaicSrc = mosaic.canvas.toDataURL('image/png')
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
      paletteColors: paletteCount,
      quotedPriceUsd: price,
      gridSize,
      panelGrid,
      panelSizeTiles: PANEL_SIZE_TILES,
      fineTune: tune,
      croppedSourceDataUrl: croppedSrc,
      previewImageDataUrl: mosaicSrc,
      colorCounts: mosaic.counts,
      tileMap: mosaic.grid,
      palette: PALETTE.slice(0, paletteCount),
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
        tileMap: [...mosaic.grid],
        gridSize: mosaic.gridSize,
        panelGrid,
        panelSizeTiles: PANEL_SIZE_TILES,
        paletteCount,
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
    setImg(null); setCrop(null); setMosaic(null); setStyleThumbs({})
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
    if (i === 1 && img) setStage('preview')
  }

  const anyDialog = cropOpen || reqOpen
  const stepIndex = stage === 'upload' ? 0 : stage === 'preview' ? 1 : 2

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
        {stage === 'preview' && crop && (
          <PreviewStep
            photoSrc={croppedSrc}
            mosaic={mosaic}
            rendering={rendering}
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
            panelGrid={panelGrid}
            onAdjustCrop={() => setCropOpen(true)}
            onRequest={openRequest}
            autoCropped={autoCropped}
          />
        )}
        {stage === 'done' && done && (
          <SuccessView
            mosaicSrc={done.mosaicSrc}
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
      {stage === 'preview' && !anyDialog && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-white px-4 pt-3 md:hidden" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              {sizeIn}″ kit · {paletteCount} colors · {panelGrid * panelGrid === 1 ? '1 panel' : `${panelGrid * panelGrid} panels`}
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
          thumb: mosaic?.displayCanvas.toDataURL('image/png') ?? '',
          category,
          formatLabel: FORMATS.find((f) => f.id === format)?.label ?? '',
          sizeLabel: SIZES.find((s) => s.in === sizeIn)?.label ?? '',
          styleLabel: style.label,
        }}
        submitting={submitting}
        serverError={serverError}
        onSubmit={submit}
      />
    </div>
  )
}
