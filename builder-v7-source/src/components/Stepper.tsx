// 3-step progress (audit U2) — completed steps are clickable (audit U7).
const STEPS = ['Upload', 'Preview', 'Get proof']

export function Stepper({ current, onGoTo }: { current: number; onGoTo: (i: number) => void }) {
  return (
    <nav aria-label="Progress" className="flex items-center gap-1 sm:gap-2">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={label} className="flex items-center gap-1 sm:gap-2">
            {i > 0 && <div className={`h-px w-5 sm:w-10 ${done || active ? 'bg-brand' : 'bg-neutral-300'}`} />}
            <button
              type="button"
              disabled={!done}
              onClick={() => done && onGoTo(i)}
              aria-current={active ? 'step' : undefined}
              className={`flex min-h-[44px] items-center gap-2 rounded-md px-1.5 py-1 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark ${
                done ? 'cursor-pointer text-brand-dark hover:text-brand-deep' : active ? 'text-ink' : 'text-neutral-400'
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  active ? 'bg-brand text-white' : done ? 'bg-brand-pale text-brand-dark' : 'bg-neutral-200 text-neutral-500'
                }`}
                aria-hidden="true"
              >
                {done ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          </div>
        )
      })}
    </nav>
  )
}
