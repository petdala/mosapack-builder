// Success screen keeps the excitement warm during the wait (audit U10).
interface Props {
  mosaicSrc: string
  proofRef: string
  email: string
  simulated: boolean
  onRestart: () => void
}

export function SuccessView({ mosaicSrc, proofRef, email, simulated, onRestart }: Props) {
  const download = () => {
    const a = document.createElement('a')
    a.href = mosaicSrc
    a.download = `mosapack-preview-${proofRef}.png`
    a.click()
  }
  const copyRef = async () => {
    try { await navigator.clipboard.writeText(proofRef) } catch { /* clipboard optional */ }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[30px]">
        Your mosaic is with our team
      </h1>
      <p className="mt-2 text-[15px] text-neutral-600">
        We’ll email your proof to <span className="font-semibold text-ink">{email}</span> within{' '}
        <span className="font-semibold text-ink">1 business day</span>. Nothing is made or charged
        today.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <img src={mosaicSrc} alt="Your mosaic preview" className="block w-full" style={{ imageRendering: 'pixelated' }} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={download}
          className="min-h-[48px] rounded-full bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
        >
          Download preview PNG
        </button>
        <button
          type="button"
          onClick={copyRef}
          className="min-h-[48px] rounded-full border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-700 hover:border-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
        >
          Copy reference · {proofRef}
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="min-h-[48px] text-sm font-semibold text-brand-deep underline decoration-brand/40 underline-offset-4 hover:decoration-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
        >
          Create another
        </button>
      </div>

      <ol className="mt-8 grid gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
        <li><span className="font-bold text-brand-dark">Now</span> — a person reviews your design and color mapping.</li>
        <li><span className="font-bold text-brand-dark">Within 1 business day</span> — your proof arrives by email with exact pricing.</li>
        <li><span className="font-bold text-brand-dark">Only if you love it</span> — you approve, and we make your kit.</li>
      </ol>

      {simulated && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Preview environment: this request was simulated — no email was sent. On mosapack.com it
          submits to your Netlify function.
        </p>
      )}
    </div>
  )
}
