import { useEffect, useState } from 'react'
import { Check, Image as ImageIcon, Sparkles } from 'lucide-react'
import type { BackgroundMode, OptimizeResult } from '@/lib/optimize'

export interface OptimizeControls {
  bgMode: BackgroundMode
  brightness: number
  zoom: number
}

interface Props {
  originalSrc: string
  optimizedSrc: string
  loading: boolean
  error: string | null
  result: OptimizeResult | null
  controls: OptimizeControls
  onControls: (controls: OptimizeControls) => void
  onApprove: () => void
  onUseOriginal: () => void
}

function RangeControl({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block py-3">
      <span className="flex items-center justify-between text-sm font-semibold text-ink">
        {label}
        <span className="text-xs font-bold tabular-nums text-neutral-500">{value === 0 ? 'Auto' : value > 0 ? `+${value}` : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-2 w-full cursor-pointer accent-brand"
      />
    </label>
  )
}

export function OptimizeStep({
  originalSrc,
  optimizedSrc,
  loading,
  error,
  result,
  controls,
  onControls,
  onApprove,
  onUseOriginal,
}: Props) {
  const [comparison, setComparison] = useState<'original' | 'optimized'>('optimized')
  useEffect(() => { if (optimizedSrc) setComparison('optimized') }, [optimizedSrc])
  const view = comparison === 'optimized' && optimizedSrc && !error ? optimizedSrc : originalSrc

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]" data-testid="optimize-step">
      <div>
        <div className="flex items-center gap-2 text-brand-deep">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-bold">Optimize for build</span>
        </div>
        <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[30px]">
          {loading ? 'Optimizing your photo…' : 'Your photo is ready to build'}
        </h1>
        <p className="mt-1 text-[15px] text-neutral-600">
          We prepare the subject, lighting, and framing before mapping it to tiles.
        </p>

        <div className="relative mt-5 aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-white" data-testid="optimize-preview">
          {view ? <img src={view} alt="Build-optimized photo preview" className="h-full w-full object-contain" /> : null}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/85" aria-live="polite">
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-brand-pale border-t-brand" aria-hidden="true" />
              <span className="text-sm font-semibold text-neutral-700">Finding the subject and balancing the photo…</span>
            </div>
          )}
        </div>

        {!loading && !error && optimizedSrc && (
          <div className="mt-3 flex gap-2" role="group" aria-label="Photo comparison">
            <button
              type="button"
              aria-pressed={comparison === 'original'}
              onClick={() => setComparison('original')}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-md border px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark ${
                comparison === 'original' ? 'border-ink bg-ink text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400'
              }`}
            >
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
              Original
            </button>
            <button
              type="button"
              aria-pressed={comparison === 'optimized'}
              onClick={() => setComparison('optimized')}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-md border px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark ${
                comparison === 'optimized' ? 'border-ink bg-ink text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400'
              }`}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Optimized
            </button>
          </div>
        )}
      </div>

      <aside aria-label="Optimization details" className="lg:pt-10">
        {error ? (
          <div className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
            <p className="font-bold">We could not optimize this photo in your browser.</p>
            <p className="mt-1">Your original crop is still ready for a mosaic.</p>
          </div>
        ) : (
          <>
            <section aria-labelledby="improvements-heading">
              <h2 id="improvements-heading" className="text-sm font-bold text-ink">What we improved</h2>
              <div className="mt-3 flex flex-wrap gap-2" aria-live="polite" data-testid="optimize-fixes">
                {(result?.appliedFixes ?? []).map((fix) => (
                  <span key={fix} className="inline-flex items-center gap-1.5 rounded-full bg-brand-pale px-3 py-1.5 text-xs font-semibold text-brand-deep">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    {fix}
                  </span>
                ))}
              </div>
            </section>

            {(result?.flags.length ?? 0) > 0 && (
              <div className="mt-5 space-y-2" data-testid="optimize-flags">
                {result?.flags.map((flag) => (
                  <p key={flag} className="border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900">
                    {flag}
                  </p>
                ))}
              </div>
            )}

            <details className="mt-6 border-y border-neutral-200 py-1" data-testid="optimize-adjust">
              <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between text-sm font-bold text-brand-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark">
                Adjust
                <span aria-hidden="true">▾</span>
              </summary>
              <div className="divide-y divide-neutral-100 pb-2">
                <div className="py-3">
                  <p className="text-sm font-semibold text-ink">Background</p>
                  <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label="Background treatment">
                    {(['flatten', 'keep'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={controls.bgMode === mode}
                        onClick={() => onControls({ ...controls, bgMode: mode })}
                        className={`min-h-[42px] rounded-md border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-dark ${
                          controls.bgMode === mode
                            ? 'border-brand bg-brand-pale text-brand-deep'
                            : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400'
                        }`}
                      >
                        {mode === 'flatten' ? 'Flatten' : 'Keep'}
                      </button>
                    ))}
                  </div>
                </div>
                <RangeControl
                  label="Brightness"
                  min={-2}
                  max={2}
                  value={controls.brightness}
                  onChange={(brightness) => onControls({ ...controls, brightness })}
                />
                <RangeControl
                  label="Zoom"
                  min={-2}
                  max={2}
                  value={controls.zoom}
                  onChange={(zoom) => onControls({ ...controls, zoom })}
                />
              </div>
            </details>
          </>
        )}

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={onApprove}
            disabled={loading || Boolean(error) || !optimizedSrc}
            className="min-h-[50px] rounded-full bg-pop px-6 text-base font-bold text-white shadow-md transition-colors hover:bg-pop-dark disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pop-dark"
          >
            Use optimized photo
          </button>
          <button
            type="button"
            onClick={onUseOriginal}
            className="min-h-[46px] rounded-full border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-700 hover:border-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
          >
            Use original
          </button>
        </div>
      </aside>
    </div>
  )
}
