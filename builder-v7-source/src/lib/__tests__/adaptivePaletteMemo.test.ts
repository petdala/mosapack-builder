import { expect, test } from '@playwright/test'
import { generateAdaptivePalette } from '@/lib/adaptivePalette'
import { deltaE00 } from '@/lib/color'

type Lab = { L: number; a: number; b: number }
type TestCandidate = Lab & { id: number }

const GOLDENS = [
  {
    seed: 'b49303c9',
    gamut: 'srgb-print-safe-v1',
    colors: [
      '#1B1B1B:anchor-neutral', '#F4F4F4:anchor-neutral', '#7A838C:anchor-neutral',
      '#879F40:derived', '#D26246:derived', '#094A64:derived', '#054401:derived',
      '#24C0E3:derived', '#852E6A:derived', '#FEAADC:derived', '#6A3201:derived', '#FEAF79:derived',
    ],
  },
  {
    seed: '93846260',
    gamut: 'srgb-print-safe-v1',
    colors: [
      '#1B1B1B:anchor-neutral', '#F4F4F4:anchor-neutral', '#7A838C:anchor-neutral',
      '#CC8E68:anchor-skin', '#E7C6B1:anchor-skin', '#7AAE5F:derived', '#034822:derived',
      '#742B07:derived', '#1695BC:derived', '#E796D8:derived', '#6D1567:derived', '#014358:derived',
      '#715C01:derived', '#C4E7FF:derived', '#D8DB62:derived', '#3DE3CA:derived', '#696ACB:derived',
      '#FAA0A6:derived', '#056B5D:derived', '#D35583:derived', '#5F7512:derived', '#8730DE:derived',
      '#22B6C5:derived', '#083705:derived', '#F3BF44:derived',
    ],
  },
  {
    seed: '4c9ced6d',
    gamut: 'srgb-print-safe-v1',
    colors: [
      '#1B1B1B:anchor-neutral', '#F4F4F4:anchor-neutral', '#7A838C:anchor-neutral',
      '#538336:derived', '#F28782:derived', '#014358:derived', '#4DCFFD:derived', '#752A2C:derived',
      '#86D77E:derived', '#234F04:derived', '#E186D7:derived', '#7D2589:derived', '#FAA650:derived',
      '#723E0B:derived', '#1083AD:derived', '#02B3A3:derived', '#056B5D:derived', '#89B5FB:derived',
      '#201D81:derived', '#D5C652:derived', '#8E5B7A:derived', '#E3603C:derived', '#696220:derived',
      '#FEB4F4:derived', '#5E0329:derived', '#9767D4:derived', '#750201:derived', '#F2F5B4:derived',
      '#FDB697:derived', '#B58C50:derived', '#403002:derived', '#266EBA:derived', '#3BE2F9:derived',
      '#42FB97:derived', '#0BA5E5:derived', '#41439E:derived', '#B392F3:derived', '#A24C3B:derived',
      '#C52F91:derived', '#03954C:derived', '#024927:derived', '#340658:derived', '#FB9AB0:derived',
      '#0F6683:derived', '#1B6A08:derived', '#A4B266:derived', '#D25968:derived', '#7791EF:derived',
      '#6CC313:derived', '#635A77:derived', '#B8D8FF:derived', '#82791A:derived',
    ],
  },
] as const

function makeLabs(count: number, phase: number): Lab[] {
  return Array.from({ length: count }, (_, index) => ({
    L: 8 + ((index * 37 + phase * 11) % 88),
    a: -72 + ((index * 53 + phase * 17) % 145),
    b: -76 + ((index * 61 + phase * 23) % 153),
  }))
}

function makeWeights(count: number): Float32Array {
  return Float32Array.from({ length: count }, (_, index) => 0.75 + (index % 7) * 0.125)
}

// Reference copy of the pre-memoization greedy loop. It intentionally uses
// splice and recomputes both nearest distances on every candidate evaluation.
function oldSelectionLoop(
  labs: readonly Lab[],
  weights: readonly number[],
  count: number,
  initialChosen: readonly TestCandidate[],
  initialPool: readonly TestCandidate[],
  minSeparation: number,
  deltaE00: (a: Lab, b: Lab) => number,
): number[] {
  const chosen = initialChosen.map((color) => ({ ...color }))
  const pool = initialPool.map((color) => ({ ...color }))
  const evaluationStride = Math.max(1, Math.ceil(labs.length / 512))
  const separationFloors = Array.from(new Set([
    minSeparation,
    Math.min(minSeparation, 6),
    Math.min(minSeparation, 4),
    Math.min(minSeparation, 2),
    0,
  ]))
  let separationIndex = 0
  while (chosen.length < count) {
    let bestIndex = -1
    let bestGain = -Infinity
    for (let candidateIndex = 0; candidateIndex < pool.length; candidateIndex++) {
      const candidate = pool[candidateIndex]
      if (chosen.some((color) => deltaE00(color, candidate) < separationFloors[separationIndex])) continue
      let gain = 0
      for (let i = 0; i < labs.length; i += evaluationStride) {
        let current = Infinity
        for (const color of chosen) current = Math.min(current, deltaE00(labs[i], color))
        gain += weights[i] * Math.max(0, current - deltaE00(labs[i], candidate))
      }
      if (gain > bestGain + 1e-9) { bestGain = gain; bestIndex = candidateIndex }
    }
    if (bestIndex < 0) {
      separationIndex++
      if (separationIndex < separationFloors.length) continue
      throw new Error(`Unable to produce ${count} colors after relaxing palette separation.`)
    }
    chosen.push(pool[bestIndex])
    pool.splice(bestIndex, 1)
  }
  return chosen.map((candidate) => candidate.id)
}

function memoizedSelectionLoop(
  labs: readonly Lab[],
  weights: readonly number[],
  count: number,
  chosen: TestCandidate[],
  pool: readonly TestCandidate[],
  minSeparation: number,
  deltaE00: (a: Lab, b: Lab) => number,
): number[] {
  const evaluationStride = Math.max(1, Math.ceil(labs.length / 512))
  const evaluationIndices: number[] = []
  for (let i = 0; i < labs.length; i += evaluationStride) evaluationIndices.push(i)
  const candDist = pool.map((candidate) => Float64Array.from(
    evaluationIndices,
    (labIndex) => deltaE00(labs[labIndex], candidate),
  ))
  const current = Float64Array.from(evaluationIndices, (labIndex) => {
    let nearest = Infinity
    for (const color of chosen) nearest = Math.min(nearest, deltaE00(labs[labIndex], color))
    return nearest
  })
  const candChosenMin = Float64Array.from(pool, (candidate) => {
    let nearest = Infinity
    for (const color of chosen) nearest = Math.min(nearest, deltaE00(color, candidate))
    return nearest
  })
  const alive = new Uint8Array(pool.length)
  alive.fill(1)
  const separationFloors = Array.from(new Set([
    minSeparation,
    Math.min(minSeparation, 6),
    Math.min(minSeparation, 4),
    Math.min(minSeparation, 2),
    0,
  ]))
  let separationIndex = 0
  while (chosen.length < count) {
    let bestIndex = -1
    let bestGain = -Infinity
    for (let candidateIndex = 0; candidateIndex < pool.length; candidateIndex++) {
      if (!alive[candidateIndex]) continue
      if (candChosenMin[candidateIndex] < separationFloors[separationIndex]) continue
      let gain = 0
      for (let evalIndex = 0; evalIndex < evaluationIndices.length; evalIndex++) {
        const labIndex = evaluationIndices[evalIndex]
        gain += weights[labIndex] * Math.max(0, current[evalIndex] - candDist[candidateIndex][evalIndex])
      }
      if (gain > bestGain + 1e-9) { bestGain = gain; bestIndex = candidateIndex }
    }
    if (bestIndex < 0) {
      separationIndex++
      if (separationIndex < separationFloors.length) continue
      throw new Error(`Unable to produce ${count} colors after relaxing palette separation.`)
    }
    const picked = pool[bestIndex]
    chosen.push(picked)
    alive[bestIndex] = 0
    for (let evalIndex = 0; evalIndex < evaluationIndices.length; evalIndex++) {
      current[evalIndex] = Math.min(current[evalIndex], candDist[bestIndex][evalIndex])
    }
    for (let candidateIndex = 0; candidateIndex < pool.length; candidateIndex++) {
      if (!alive[candidateIndex]) continue
      candChosenMin[candidateIndex] = Math.min(candChosenMin[candidateIndex], deltaE00(picked, pool[candidateIndex]))
    }
  }
  return chosen.map((candidate) => candidate.id)
}

test('memoized selection preserves old loop order and separation relaxation', () => {
  const labs = Array.from({ length: 73 }, (_, index) => ({
    L: 12 + (index * 31 % 82),
    a: -65 + (index * 43 % 131),
    b: -68 + (index * 47 % 137),
  }))
  const chosen = labs.slice(0, 3).map((lab, id) => ({ ...lab, id }))
  const pool = labs.slice(3).map((lab, index) => ({ ...lab, id: index + 3 }))
  const weights = labs.map((_, index) => 1 + (index % 4) * 0.2)
  const result = {
    old: oldSelectionLoop(labs, weights, 20, chosen, pool, 100, deltaE00),
    memoized: memoizedSelectionLoop(labs, weights, 20, chosen.map((color) => ({ ...color })), pool, 100, deltaE00),
  }
  expect(result.memoized).toEqual(result.old)
})

test('adaptive palette matches pre-refactor N=12, N=25, and N=52 goldens', () => {
  test.setTimeout(30_000)
  const labs12 = makeLabs(96, 3)
  const labs25 = makeLabs(128, 7)
  const labs52 = makeLabs(256, 11)
  const results = [
    generateAdaptivePalette(labs12, makeWeights(labs12.length), 12, { seed: 'memo-12', restarts: 3, maxIterations: 12 }),
    generateAdaptivePalette(labs25, makeWeights(labs25.length), 25, {
      seed: 'memo-25-skin-relax',
      skinMask: Uint8Array.from({ length: labs25.length }, (_, index) => index % 5 < 2 ? 1 : 0),
      minSeparation: 100,
      restarts: 3,
      maxIterations: 12,
    }),
    generateAdaptivePalette(labs52, makeWeights(labs52.length), 52, { seed: 'memo-52', restarts: 3, maxIterations: 12 }),
  ]
  const actual = results.map((result) => ({
    seed: result.seed,
    gamut: result.gamut_profile_id,
    colors: result.colors.map((color) => `${color.hex}:${color.role}`),
  }))
  expect(actual).toEqual(GOLDENS)
})

test('adaptive palette remains deterministic after memoization', () => {
  const labs = makeLabs(128, 19)
  const weights = makeWeights(labs.length)
  const options = { seed: 'memo-determinism', restarts: 3, maxIterations: 12 }
  const identical = JSON.stringify(generateAdaptivePalette(labs, weights, 25, options))
    === JSON.stringify(generateAdaptivePalette(labs, weights, 25, options))
  expect(identical).toBe(true)
})

test('Gallery-52 palette completes within the soft CI budget', async ({ page }) => {
  test.setTimeout(30_000)
  const labs = makeLabs(256, 23)
  await page.goto('/')
  const elapsed = await page.evaluate(async ({ fixtureLabs, fixtureWeights }) => {
    const { generateAdaptivePalette } = await import('/src/lib/adaptivePalette.ts')
    const start = performance.now()
    generateAdaptivePalette(fixtureLabs, Float32Array.from(fixtureWeights), 52)
    return performance.now() - start
  }, { fixtureLabs: labs, fixtureWeights: Array.from(makeWeights(labs.length)) })
  console.log(`Gallery-52 memoized palette: ${elapsed.toFixed(1)}ms`)
  expect(elapsed).toBeLessThan(1_500)
})
