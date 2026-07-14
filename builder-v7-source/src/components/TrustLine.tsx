// Single trust row — one instance per screen (audit U11), with the 24-hour promise (audit U9).
export function TrustLine({ className = '' }: { className?: string }) {
  return (
    <p className={`text-[13px] leading-5 text-neutral-600 ${className}`}>
      Free · a person checks every design · we reply within{' '}
      <span className="font-semibold text-neutral-800">1 business day</span>
    </p>
  )
}
