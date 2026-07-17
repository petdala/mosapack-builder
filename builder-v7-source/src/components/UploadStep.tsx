import { useEffect, useRef, useState } from 'react'
import { DEMOS } from '@/lib/demos'
import { loadImage, computeSaliency, autoCrop, renderCrop, renderMosaic, STYLES } from '@/lib/mosaic'
import { track } from '@/lib/api'
import { PALETTE } from '@/lib/palette'
import { renderPhysicalTiles } from '@/lib/tileRenderer'
import { TrustLine } from './TrustLine'

const MAX_MB = 20

export function UploadStep({ onPhoto }: { onPhoto: (src: string, demo?: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pair, setPair] = useState<{ before: string; after: string } | null>(null)

  // live before/after example (audit §10.2) — proves the algorithm on load
  useEffect(() => {
    let on = true
    ;(async () => {
      try {
        const img = await loadImage(DEMOS[0].src)
        const sal = computeSaliency(img)
        const crop = autoCrop(img, sal)
        const src = renderCrop(img, crop, 320)
        const m = renderMosaic(src, 40, STYLES[0], { brightness: 0, contrast: 0, background: 0 }, computeSaliency(src), 8)
        if (on) setPair({
          before: src.toDataURL('image/jpeg', 0.85),
          after: renderPhysicalTiles(m, PALETTE, { tilePx: 8 }).toDataURL('image/png'),
        })
      } catch { /* example strip is decorative — never block upload */ }
    })()
    return () => { on = false }
  }, [])

  const takeFile = (f: File | undefined | null) => {
    setErr(null)
    if (!f) return
    if (!/^image\//.test(f.type)) {
      setErr('That file type won’t work — please choose a photo (JPG or PNG is safest).')
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setErr(`That photo is over ${MAX_MB}MB — a smaller export of the same photo will work great.`)
      return
    }
    const rd = new FileReader()
    rd.onload = () => {
      const src = rd.result as string
      // validate by decoding, not by MIME string — HEIC works where the browser
      // supports it (Safari/iPhone) and fails with guidance where it doesn't
      const probe = new Image()
      probe.onload = () => {
        track('photo_uploaded', { source: 'upload' })
        onPhoto(src)
      }
      probe.onerror = () =>
        setErr('That photo format didn’t load in this browser — exporting it as JPG or PNG will work.')
      probe.src = src
    }
    rd.readAsDataURL(f)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[32px]">
          See your photo as a mosaic — free
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-neutral-600">
          Upload a photo, preview your mosaic instantly, and get a free design check by email. No
          payment, no signup.
        </p>

        {/* Dropzone — drag copy is desktop-only (audit C3) */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); takeFile(e.dataTransfer.files?.[0]) }}
          className={`mt-6 rounded-xl border-2 border-dashed bg-white p-6 text-center transition-colors sm:p-10 ${
            drag ? 'border-brand bg-brand-pale' : 'border-neutral-300'
          }`}
        >
          <p className="text-lg font-bold text-ink">
            <span className="hidden sm:inline">Drag a photo here, or choose one</span>
            <span className="sm:hidden">Choose a photo</span>
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            JPG or PNG · up to {MAX_MB}MB · clear faces, pets and portraits work best
          </p>
          <p className="mx-auto mt-3 max-w-md text-xs leading-5 text-neutral-500">
            Upload photos you took or have the right to use. We can&apos;t print copyrighted
            characters, logos, or artwork you don&apos;t own.{' '}
            <a href="/terms/#content" className="font-semibold text-brand-deep underline underline-offset-2">
              learn more
            </a>
          </p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-5 inline-flex min-h-[48px] items-center rounded-full bg-brand px-8 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
          >
            Choose a photo
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Choose a photo"
            onChange={(e) => takeFile(e.target.files?.[0])}
          />
          {err && (
            <p role="alert" className="mt-4 text-sm font-medium text-red-700">
              {err}
            </p>
          )}
        </div>

        {/* Demo photos — real photographic inputs (audit C4) */}
        <div className="mt-6">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
            Or try an example
          </p>
          <div className="mt-3 flex gap-3">
            {DEMOS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => { track('photo_uploaded', { source: 'demo', demo: d.id }); onPhoto(d.src, d.id) }}
                className="group overflow-hidden rounded-lg border border-neutral-200 bg-white text-left transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
              >
                <img src={d.src} alt={`${d.label} example photo`} className="h-20 w-20 object-cover sm:h-24 sm:w-24" />
                <span className="block px-2 py-1.5 text-xs font-semibold text-neutral-700 group-hover:text-brand-dark">
                  {d.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <TrustLine className="mt-6" />
      </div>

      {/* Context rail — each message appears exactly once (audit U11, V7) */}
      <aside className="space-y-4 lg:pt-14" aria-label="Tips and process">
        {pair && (
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-sm font-bold text-ink">What you’ll get</p>
            <div className="mt-3 flex items-center gap-2">
              <img src={pair.before} alt="Example photo before conversion" className="h-[104px] w-[104px] rounded-md object-cover" />
              <span className="text-lg text-neutral-400" aria-hidden="true">→</span>
              <img src={pair.after} alt="The same photo as a buildable tile mosaic" className="h-[104px] w-[104px] rounded-md object-cover" />
            </div>
            <p className="mt-2 text-xs text-neutral-500">Every tile is a real color from our kit.</p>
          </div>
        )}
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-bold text-ink">Photo tips</p>
          <p className="mt-2 text-[13px] leading-5 text-neutral-600">
            <span className="font-semibold text-neutral-800">Best:</span> good lighting · close-up ·
            one main subject.
          </p>
          <p className="mt-1 text-[13px] leading-5 text-neutral-600">
            <span className="font-semibold text-neutral-800">Avoid:</span> tiny or distant subjects ·
            blurry or very dark photos.
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-bold text-ink">What happens next</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-[13px] leading-5 text-neutral-600">
            <li>Upload — we center your photo automatically.</li>
            <li>Preview your mosaic and pick a style.</li>
            <li>A person checks your design.</li>
            <li>Your proof arrives by email within 1 business day.</li>
          </ol>
        </div>
      </aside>
    </div>
  )
}
