import { useState } from 'react'
import { STYLES, FineTune, MosaicResult } from '@/lib/mosaic'
import { PALETTE, TIERS, PRICES } from '@/lib/palette'
import { track } from '@/lib/api'
import { TrustLine } from './TrustLine'

export const FORMATS = [
  { id: 'sticker_ready', label: 'Sticker-ready', note: 'Peel-and-place tiles' },
  { id: 'magnetic_interest', label: 'Magnets', note: 'Rearrangeable, fridge-safe' },
  { id: 'premium_display_review', label: 'Premium display', note: 'Framed brick mosaic' },
] as const

export const SIZES = [
  { in: 6, label: '6″ Mini', note: 'fridge magnet', recommended: false },
  { in: 12, label: '12″ Starter', note: 'about the width of a laptop', recommended: true },
  { in: 18, label: '18″ Gallery', note: '9 panels · a panel an evening for a week', recommended: false },
  { in: 24, label: '24″ Statement', note: 'wall-art scale', recommended: false },
] as const

export const CATEGORIES = [
  'Not sure — we’ll choose', 'Pet', 'Couple or wedding', 'Family', 'Baby or kids',
  'Memorial', 'Logo or business', 'Gift or holiday',
] as const

interface Props {
  photoSrc: string
  mosaic: MosaicResult | null
  rendering: boolean
  styleThumbs: Record<string, string>
  styleId: string
  onStyle: (id: string) => void
  tune: FineTune
  onTune: (t: FineTune) => void
  category: string
  onCategory: (c: string) => void
  format: string
  onFormat: (f: string) => void
  sizeIn: number
  onSize: (s: number) => void
  tierId: string
  onTier: (t: string) => void
  price: number
  panelGrid: number
  onAdjustCrop: () => void
  onRequest: () => void
  autoCropped: boolean
}

function PanelSeamOverlay({ panelGrid }: { panelGrid: number }) {
  if (panelGrid <= 1) return null
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {Array.from({ length: panelGrid - 1 }, (_, i) => {
        const offset = `${((i + 1) / panelGrid) * 100}%`
        return (
          <span key={i}>
            <span className="absolute bottom-0 top-0 w-px bg-white/35" style={{ left: offset }} />
            <span className="absolute left-0 right-0 h-px bg-white/35" style={{ top: offset }} />
          </span>
        )
      })}
    </div>
  )
}

function StepperControl({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-neutral-500">{hint}</p>
      </div>
      <div className="flex items-center gap-1" role="group" aria-label={label}>
        {[-2, -1, 0, 1, 2].map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={value === v}
            onClick={() => { onChange(v); track('finetune_used', { control: label.toLowerCase(), value: v }) }}
            className={`flex h-9 min-w-[40px] items-center justify-center rounded-md border text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-dark ${
              value === v
                ? 'border-brand bg-brand-pale text-brand-deep'
                : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
            }`}
          >
            {v === 0 ? 'Auto' : v > 0 ? `+${v}` : v}
          </button>
        ))}
      </div>
    </div>
  )
}

export function PreviewStep(p: Props) {
  const [view, setView] = useState<'mosaic' | 'photo'>('mosaic')
  const [tuneOpen, setTuneOpen] = useState(false)
  const availableTiers = TIERS.filter((t) => PRICES[p.sizeIn]?.[t.id] != null)
  const panelCount = p.panelGrid * p.panelGrid
  const panelCopy = panelCount === 1 ? '1 panel' : `${panelCount} panels`
  const sittingCopy = panelCount === 1 ? '1 sitting' : `${panelCount} sittings`
  const panelMetaCopy = panelCount === 9 ? '9 panels · a panel an evening for a week' : `${panelCopy} · builds in ${sittingCopy}`

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* ---- left: the product is the hero (audit §10.1) ---- */}
      <div>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[30px]">
          Here’s your mosaic
        </h1>
        <p className="mt-1 text-[15px] text-neutral-600">Every tile is a real color from our kit.</p>

        <div className="mt-4 flex items-center gap-2" role="group" aria-label="Preview view">
          <button
            type="button"
            aria-pressed={view === 'mosaic'}
            onClick={() => setView('mosaic')}
            className={`min-h-[44px] rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark ${
              view === 'mosaic' ? 'bg-ink text-white' : 'bg-white text-neutral-600 border border-neutral-300 hover:border-neutral-400'
            }`}
          >
            Mosaic
          </button>
          <button
            type="button"
            aria-pressed={view === 'photo'}
            onClick={() => setView('photo')}
            className={`min-h-[44px] rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark ${
              view === 'photo' ? 'bg-ink text-white' : 'bg-white text-neutral-600 border border-neutral-300 hover:border-neutral-400'
            }`}
          >
            Your photo
          </button>
          {p.autoCropped && (
            <span className="ml-1 hidden rounded-full bg-brand-pale px-3 py-1 text-xs font-semibold text-brand-deep sm:inline">
              ✓ Auto-centered
            </span>
          )}
        </div>

        <div className="relative mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {view === 'mosaic' ? (
            p.mosaic ? (
              <img
                src={p.mosaic.displayCanvas.toDataURL('image/png')}
                alt={`Mosaic preview, ${p.mosaic.gridSize} by ${p.mosaic.gridSize} tiles`}
                className="block w-full"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="flex aspect-square items-center justify-center text-sm text-neutral-500">
                Building your mosaic preview…
              </div>
            )
          ) : (
            <img src={p.photoSrc} alt="Your cropped photo" className="block w-full" />
          )}
          {p.rendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60" aria-live="polite">
              <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow">
                Updating…
              </span>
            </div>
          )}
          {view === 'mosaic' && p.mosaic && <PanelSeamOverlay panelGrid={p.panelGrid} />}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={p.onAdjustCrop}
            className="min-h-[44px] text-sm font-semibold text-brand-deep underline decoration-brand/40 underline-offset-4 hover:decoration-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
          >
            Adjust crop
          </button>
          <button
            type="button"
            aria-expanded={tuneOpen}
            onClick={() => setTuneOpen((v) => !v)}
            className="min-h-[44px] text-sm font-semibold text-brand-deep underline decoration-brand/40 underline-offset-4 hover:decoration-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
          >
            Fine-tune {tuneOpen ? '▴' : '▾'}
          </button>
          {p.mosaic && (
            <span className="text-xs text-neutral-500">
              {p.mosaic.gridSize}×{p.mosaic.gridSize} tiles · {Object.keys(p.mosaic.counts).length} colors · ΔE00 matched
            </span>
          )}
        </div>

        {tuneOpen && (
          <div className="mt-2 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white px-4 py-1">
            <StepperControl label="Brightness" hint="Lift or deepen the whole image" value={p.tune.brightness} onChange={(v) => p.onTune({ ...p.tune, brightness: v })} />
            <StepperControl label="Contrast" hint="Make light and dark pop more" value={p.tune.contrast} onChange={(v) => p.onTune({ ...p.tune, contrast: v })} />
            <StepperControl label="Calmer background" hint="Flatten a busy background so your subject stands out" value={p.tune.background} onChange={(v) => p.onTune({ ...p.tune, background: v })} />
          </div>
        )}

        {/* category — asked after upload, optional (audit U6) */}
        <div className="mt-6">
          <p className="text-sm font-semibold text-ink">What’s in your photo? <span className="font-normal text-neutral-500">(optional — tunes your proof)</span></p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={p.category === c}
                onClick={() => p.onCategory(c)}
                className={`min-h-[40px] rounded-md border px-3 text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-dark ${
                  p.category === c
                    ? 'border-brand bg-brand-pale text-brand-deep'
                    : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- right rail: style → options → CTA, in reading order (audit U1) ---- */}
      <aside aria-label="Style and options">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-bold text-ink">Choose a style</p>
          {/* wrapping grid, no clipped carousel (audit U3); subject-crop thumbs (audit U4) */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={p.styleId === s.id}
                onClick={() => { p.onStyle(s.id); track('style_changed', { style: s.id }) }}
                className={`rounded-lg border p-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-dark ${
                  p.styleId === s.id ? 'border-brand bg-brand-pale' : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                {p.styleThumbs[s.id] ? (
                  <img src={p.styleThumbs[s.id]} alt="" aria-hidden="true" className="w-full rounded-md" style={{ imageRendering: 'pixelated' }} />
                ) : (
                  <div className="aspect-square w-full rounded-md bg-neutral-100" aria-hidden="true" />
                )}
                <span className="mt-1.5 block text-[13px] font-bold leading-tight text-ink">{s.label}</span>
                <span className="block text-[11px] leading-tight text-neutral-500">{s.blurb}</span>
              </button>
            ))}
          </div>
        </div>

        {/* PaletteTierSelector — nested tiers, swatches from the live palette (Brick.me import) */}
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-bold text-ink">Colors in your kit</p>
          <p className="text-xs text-neutral-500">More colors = richer photo, more sticker rolls</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {availableTiers.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={p.tierId === t.id}
                onClick={() => { p.onTier(t.id); track('palette_tier_changed', { tier: t.id }) }}
                className={`rounded-lg border p-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-dark ${
                  p.tierId === t.id ? 'border-brand bg-brand-pale' : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <span className="flex items-center justify-between text-[13px] font-bold text-ink">
                  {t.label} · {t.colors}
                </span>
                <span className="mt-1 flex h-2.5 overflow-hidden rounded" aria-hidden="true">
                  {PALETTE.slice(0, t.colors).map((c) => (
                    <span key={c.hex} style={{ background: c.hex, flex: 1 }} />
                  ))}
                </span>
                <span className="mt-1 block text-[11px] leading-tight text-neutral-500">
                  {t.blurb}{t.id === 'balanced' ? ' ✓' : ''}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-bold text-ink">Format</p>
          <div className="mt-2 grid gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={p.format === f.id}
                onClick={() => p.onFormat(f.id)}
                className={`flex min-h-[48px] items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-dark ${
                  p.format === f.id ? 'border-brand bg-brand-pale' : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <span>
                  <span className="block text-sm font-bold text-ink">{f.label}</span>
                  <span className="block text-xs text-neutral-500">{f.note}</span>
                </span>
                <span className={`h-4 w-4 rounded-full border-2 ${p.format === f.id ? 'border-brand bg-brand' : 'border-neutral-300'}`} aria-hidden="true" />
              </button>
            ))}
          </div>

          <p className="mt-4 text-sm font-bold text-ink">Size</p>
          <div className="mt-2 grid gap-2">
            {SIZES.map((s) => (
              <button
                key={s.in}
                type="button"
                aria-pressed={p.sizeIn === s.in}
                onClick={() => p.onSize(s.in)}
                className={`flex min-h-[48px] items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-dark ${
                  p.sizeIn === s.in ? 'border-brand bg-brand-pale' : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <span>
                  <span className="flex items-center gap-2 text-sm font-bold text-ink">
                    {s.label}
                    {s.recommended && (
                      <span className="rounded-full bg-pop px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Recommended
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-neutral-500">{s.note}</span>
                </span>
                <span className={`h-4 w-4 rounded-full border-2 ${p.sizeIn === s.in ? 'border-brand bg-brand' : 'border-neutral-300'}`} aria-hidden="true" />
              </button>
            ))}
          </div>

        </div>

        {/* LivePriceBar — price reacts to size + tier; recorded in the proof payload */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3" aria-live="polite">
          <span className="text-xs leading-5 text-neutral-500">
            <span className="block text-sm font-bold text-ink">{p.sizeIn}″ Sticker kit</span>
            {p.mosaic ? `${p.mosaic.gridSize * p.mosaic.gridSize} tiles` : '—'} · {TIERS.find((t) => t.id === p.tierId)?.colors} colors
            <span className="block">{panelMetaCopy}</span>
          </span>
          <span className="text-right">
            <span className="block text-2xl font-extrabold tracking-tight tabular-nums">${p.price}.00</span>
            <span className="block text-[11px] font-semibold text-brand-dark">free proof first — pay only if you love it</span>
          </span>
        </div>

        {/* one action color for the entire proof chain (audit V2): pop pink */}
        <div className="mt-4 hidden md:block">
          <button
            type="button"
            onClick={p.onRequest}
            className="w-full rounded-full bg-pop py-3.5 text-base font-bold text-white shadow-md transition-colors hover:bg-pop-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pop-dark"
          >
            Get my free proof
          </button>
          <TrustLine className="mt-2 text-center" />
        </div>
      </aside>
    </div>
  )
}
