import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { track } from '@/lib/api'
import { formatBuildTime } from '@/lib/qualityPipeline'

interface Summary {
  thumb: string
  category: string
  formatLabel: string
  sizeLabel: string
  finishedSizeLabel: string
  stickerCount: number
  buildMinutes: number
  styleLabel: string
}

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  summary: Summary
  submitting: boolean
  serverError: string | null
  onSubmit: (name: string, email: string) => void
}

/** Two fields, no consent checkbox (audit C7), custom validation only (audit U5). */
export function RequestDialog({ open, onOpenChange, summary, submitting, serverError, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [errs, setErrs] = useState<{ name?: string; email?: string }>({})

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errs = {}
    if (!name.trim()) next.name = 'Please add your name so we can address your proof.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
      next.email = 'That email doesn’t look complete — double-check it so your proof can reach you.'
    setErrs(next)
    if (Object.keys(next).length) return
    track('proof_requested', { format: summary.formatLabel, size: summary.sizeLabel, style: summary.styleLabel })
    onSubmit(name.trim(), email.trim())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* title reserves space for the close button (audit C2) */}
      <DialogContent className="max-w-md gap-4 rounded-xl p-6">
        <DialogHeader className="pr-10 text-left">
          <DialogTitle className="text-xl font-extrabold tracking-tight text-ink">
            Get your free proof
          </DialogTitle>
          <DialogDescription className="text-sm text-neutral-600">
            A person checks your design and emails your proof within 1 business day — free.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg bg-neutral-50 p-3">
          {summary.thumb ? (
            <img src={summary.thumb} alt="Your mosaic preview" className="h-16 w-16 rounded-md" style={{ imageRendering: 'pixelated' }} />
          ) : (
            <div className="h-16 w-16 rounded-md bg-neutral-200" aria-hidden="true" />
          )}
          <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px]">
            <dt className="text-neutral-500">Style</dt><dd className="font-semibold text-ink">{summary.styleLabel}</dd>
            <dt className="text-neutral-500">Format</dt><dd className="font-semibold text-ink">{summary.formatLabel}</dd>
            <dt className="text-neutral-500">Board</dt><dd className="font-semibold text-ink">{summary.finishedSizeLabel}</dd>
            <dt className="text-neutral-500">Build</dt><dd className="font-semibold text-ink">{summary.stickerCount.toLocaleString()} stickers · {formatBuildTime(summary.buildMinutes)}</dd>
            <dt className="text-neutral-500">Photo</dt><dd className="font-semibold text-ink">{summary.category}</dd>
          </dl>
        </div>

        <form noValidate onSubmit={submit} className="grid gap-3">
          <div>
            <label htmlFor="pr-name" className="mb-1 block text-sm font-semibold text-ink">Name</label>
            <input
              id="pr-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!errs.name}
              aria-describedby={errs.name ? 'pr-name-err' : undefined}
              className={`h-12 w-full rounded-lg border px-3 text-[15px] text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 ${errs.name ? 'border-red-400' : 'border-neutral-300'}`}
            />
            {errs.name && <p id="pr-name-err" role="alert" className="mt-1 text-[13px] font-medium text-red-700">{errs.name}</p>}
          </div>
          <div>
            <label htmlFor="pr-email" className="mb-1 block text-sm font-semibold text-ink">Email</label>
            <input
              id="pr-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errs.email}
              aria-describedby={errs.email ? 'pr-email-err' : undefined}
              className={`h-12 w-full rounded-lg border px-3 text-[15px] text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 ${errs.email ? 'border-red-400' : 'border-neutral-300'}`}
            />
            {errs.email && <p id="pr-email-err" role="alert" className="mt-1 text-[13px] font-medium text-red-700">{errs.email}</p>}
          </div>

          {serverError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] font-medium text-red-800">
              {serverError}
            </p>
          )}

          <div className="mt-1 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="min-h-[48px] rounded-full border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-700 hover:border-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
            >
              Back to preview
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[48px] flex-1 rounded-full bg-pop px-6 text-base font-bold text-white shadow-md transition-colors hover:bg-pop-dark disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pop-dark"
            >
              {submitting ? 'Sending…' : 'Get my free proof'}
            </button>
          </div>

          {/* inline disclosure replaces the consent checkbox (audit C7) + privacy link (audit C6) */}
          <p className="text-center text-xs leading-5 text-neutral-500">
            By requesting, you agree we’ll email your proof. Nothing is made or charged today. We
            keep only your cropped preview — never your original photo.{' '}
            <a href="/privacy" className="font-semibold text-brand-deep underline underline-offset-2">Privacy</a>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
