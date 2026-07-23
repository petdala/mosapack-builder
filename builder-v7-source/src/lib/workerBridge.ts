import { runAdaptivePaletteJob } from './paletteJob'
import type { AdaptivePaletteJobInput, AdaptivePaletteJobResult } from './paletteJob'

declare global {
  interface Window {
    __MOSAPACK_PALETTE_SCHEDULER__?: 'worker' | 'inline'
  }
}

interface WorkerReply {
  id: number
  result?: AdaptivePaletteJobResult
  error?: string
}

let worker: Worker | null | undefined
let nextRequestId = 1
const pending = new Map<number, {
  resolve: (result: AdaptivePaletteJobResult) => void
  reject: (error: Error) => void
}>()

function getWorker(): Worker | null {
  if (worker !== undefined) return worker
  try {
    worker = new Worker(new URL('../workers/paletteWorker.ts', import.meta.url), {
      type: 'module',
      name: 'mosapack-palette',
    })
    window.__MOSAPACK_PALETTE_SCHEDULER__ = 'worker'
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const request = pending.get(event.data.id)
      if (!request) return
      pending.delete(event.data.id)
      if (event.data.error) request.reject(new Error(event.data.error))
      else if (event.data.result) request.resolve(event.data.result)
      else request.reject(new Error('Palette worker returned no result.'))
    }
    worker.onerror = () => {
      for (const request of pending.values()) request.reject(new Error('Palette worker failed.'))
      pending.clear()
      worker?.terminate()
      worker = null
    }
  } catch {
    worker = null
    window.__MOSAPACK_PALETTE_SCHEDULER__ = 'inline'
  }
  return worker
}

export function runAdaptivePaletteInline(input: AdaptivePaletteJobInput): AdaptivePaletteJobResult {
  return runAdaptivePaletteJob(input)
}

export function runAdaptivePaletteWorker(input: AdaptivePaletteJobInput): Promise<AdaptivePaletteJobResult> {
  const activeWorker = getWorker()
  if (!activeWorker) {
    window.__MOSAPACK_PALETTE_SCHEDULER__ = 'inline'
    return Promise.resolve(runAdaptivePaletteJob(input))
  }
  const id = nextRequestId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    const transfers = [
      input.gridLabs.buffer,
      input.gridWeights.buffer,
      input.paletteLabs.buffer,
      input.paletteWeights.buffer,
      ...(input.skinMask ? [input.skinMask.buffer] : []),
    ].filter((buffer, index, all) => all.indexOf(buffer) === index)
    activeWorker.postMessage({ id, input }, {
      transfer: transfers,
    })
  })
}
