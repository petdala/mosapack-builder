// Success screen keeps the excitement warm during the wait (audit U10).
import { PALETTE } from '@/lib/palette'

interface Props {
  mosaicSrc: string
  proofRef: string
  email: string
  simulated: boolean
  tileMap: number[]
  gridSize: number
  paletteCount: number
  onRestart: () => void
}

function buildMapPng(tileMap: number[], gridSize: number, paletteCount: number): string {
  const size = 2400
  const label = 128
  const gridPx = size - label - 32
  const tilePx = gridPx / gridSize
  const gap = Math.max(1, tilePx * 0.08)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#171717'
  ctx.font = '700 30px Inter, Arial, sans-serif'
  ctx.fillText('MosaPack build map', 32, 50)
  ctx.font = '500 18px Inter, Arial, sans-serif'
  ctx.fillStyle = '#737373'
  ctx.fillText(`${gridSize} x ${gridSize} tiles · ${paletteCount} colors · start at the green corner`, 32, 82)

  ctx.fillStyle = '#0bbf92'
  ctx.beginPath()
  ctx.moveTo(label - 18, label - 18)
  ctx.lineTo(label + tilePx * 2.4, label - 18)
  ctx.lineTo(label - 18, label + tilePx * 2.4)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 17px Inter, Arial, sans-serif'
  ctx.fillText('START', label - 8, label + 19)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 16px Inter, Arial, sans-serif'
  for (let i = 0; i < gridSize; i += 4) {
    const pos = label + i * tilePx + tilePx / 2
    const text = String(i + 1)
    ctx.fillStyle = '#404040'
    ctx.fillText(text, pos, label - 28)
    ctx.fillText(text, label - 28, pos)
    ctx.strokeStyle = 'rgba(23,23,23,0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pos - tilePx / 2, label)
    ctx.lineTo(pos - tilePx / 2, label + gridPx)
    ctx.moveTo(label, pos - tilePx / 2)
    ctx.lineTo(label + gridPx, pos - tilePx / 2)
    ctx.stroke()
  }

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const idx = tileMap[y * gridSize + x]
      ctx.fillStyle = PALETTE[Math.min(idx, PALETTE.length - 1)]?.hex ?? '#ffffff'
      ctx.fillRect(label + x * tilePx + gap / 2, label + y * tilePx + gap / 2, tilePx - gap, tilePx - gap)
    }
  }

  ctx.strokeStyle = '#171717'
  ctx.lineWidth = 2
  ctx.strokeRect(label, label, gridPx, gridPx)
  return canvas.toDataURL('image/png')
}

export function SuccessView({ mosaicSrc, proofRef, email, simulated, tileMap, gridSize, paletteCount, onRestart }: Props) {
  const download = () => {
    const a = document.createElement('a')
    a.href = mosaicSrc
    a.download = `mosapack-preview-${proofRef}.png`
    a.click()
  }
  const downloadBuildMap = () => {
    const a = document.createElement('a')
    a.href = buildMapPng(tileMap, gridSize, paletteCount)
    a.download = `mosapack-build-map-${proofRef}.png`
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
          onClick={downloadBuildMap}
          className="min-h-[48px] rounded-full bg-brand px-6 text-sm font-semibold text-white hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
        >
          Download build map (PDF-ready PNG)
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
