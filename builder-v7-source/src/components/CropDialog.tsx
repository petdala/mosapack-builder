import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { CropState, clampCrop, renderCrop } from '@/lib/mosaic'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  img: HTMLImageElement | null
  crop: CropState
  onApply: (c: CropState) => void
}

/** Optional crop adjustment — auto-crop makes this an escape hatch, not a gate (audit U2). */
export function CropDialog({ open, onOpenChange, img, crop, onApply }: Props) {
  const [local, setLocal] = useState<CropState>(crop)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)
  const [feedback, setFeedback] = useState<{ centered: boolean; contrast: boolean }>({ centered: true, contrast: true })

  useEffect(() => { if (open) setLocal(crop) }, [open, crop])

  const paint = useCallback(() => {
    const cv = canvasRef.current
    if (!cv || !img) return
    const out = renderCrop(img, local, 480)
    const ctx = cv.getContext('2d')!
    cv.width = 480; cv.height = 480
    ctx.drawImage(out, 0, 0)
    // rule-of-thirds guides
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1
    for (const t of [1 / 3, 2 / 3]) {
      ctx.beginPath(); ctx.moveTo(480 * t, 0); ctx.lineTo(480 * t, 480); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, 480 * t); ctx.lineTo(480, 480 * t); ctx.stroke()
    }
    // live feedback chips (kept from current builder — audit "what works well")
    const d = ctx.getImageData(0, 0, 480, 480).data
    let lo = 255, hi = 0, cxw = 0, cyw = 0, sw = 0
    for (let y = 0; y < 480; y += 12)
      for (let x = 0; x < 480; x += 12) {
        const i = (y * 480 + x) * 4
        const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        if (l < lo) lo = l
        if (l > hi) hi = l
        const e = Math.abs(l - 128)
        cxw += x * e; cyw += y * e; sw += e
      }
    const cx = sw ? cxw / sw / 480 : 0.5
    const cy = sw ? cyw / sw / 480 : 0.5
    setFeedback({ centered: Math.hypot(cx - 0.5, cy - 0.5) < 0.22, contrast: hi - lo > 70 })
  }, [img, local])

  useEffect(() => {
    if (!open) return
    // Radix mounts DialogContent after `open` flips — paint on the next frame
    const raf = requestAnimationFrame(() => paint())
    return () => cancelAnimationFrame(raf)
  }, [open, paint])

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, cx: local.cx, cy: local.cy }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d || !img) return
    const side = Math.min(img.naturalWidth, img.naturalHeight) / local.scale
    const k = side / 480
    setLocal((p) => clampCrop(img, { ...p, cx: d.cx - (e.clientX - d.x) * k, cy: d.cy - (e.clientY - d.y) * k }))
  }
  const onPointerUp = () => { dragRef.current = null }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-4 rounded-xl p-5">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-lg font-bold text-ink">Adjust your crop</DialogTitle>
          <DialogDescription className="text-sm text-neutral-600">
            Drag to move · pinch or use the slider to zoom.
          </DialogDescription>
        </DialogHeader>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="w-full max-w-[480px] cursor-grab touch-none rounded-lg active:cursor-grabbing"
          aria-label="Crop preview — drag to reposition"
        />
        <div className="flex flex-wrap gap-2" aria-live="polite">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${feedback.centered ? 'bg-brand-pale text-brand-deep' : 'bg-amber-100 text-amber-900'}`}>
            {feedback.centered ? '✓ Subject is centered' : 'Tip: drag your subject to the middle'}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${feedback.contrast ? 'bg-brand-pale text-brand-deep' : 'bg-amber-100 text-amber-900'}`}>
            {feedback.contrast ? '✓ Good contrast for mosaic' : 'Tip: low contrast — a person will double-check it'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="zoom" className="text-sm font-semibold text-neutral-700">Zoom</label>
          <Slider
            id="zoom"
            min={1}
            max={3}
            step={0.02}
            value={[local.scale]}
            onValueChange={([v]) => img && setLocal((p) => clampCrop(img, { ...p, scale: v }))}
            className="flex-1"
            aria-label="Zoom"
          />
          <button
            type="button"
            onClick={() => setLocal((p) => ({ ...p, rotation: (p.rotation + 90) % 360 }))}
            className="min-h-[44px] rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-700 hover:border-brand hover:text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
          >
            Rotate 90°
          </button>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="min-h-[44px] rounded-full border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-700 hover:border-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onApply(local); onOpenChange(false) }}
            className="min-h-[44px] rounded-full bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
          >
            Use this crop
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
