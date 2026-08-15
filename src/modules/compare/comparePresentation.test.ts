import assert from 'node:assert/strict'
import test from 'node:test'
import { buildInterpretation, buildStageTwoTemplate, buildTickValues, clipLabel } from './comparePresentation.ts'

const trusted = { level: 'trusted' as const, title: 'Trusted estimate' }

test('comparison presentation returns a cautious, non-ranking message when QC fails', () => {
  const interpretation = buildInterpretation([
    { label: 'A', fractalDimension: 1.2, fitR2: 0.99, boxCounts: [], quality: trusted },
    { label: 'B', fractalDimension: 1.6, fitR2: 0.7, boxCounts: [], quality: { level: 'unreliable', title: 'Unreliable estimate' } },
  ])

  assert.match(interpretation.summary, /not stable enough to trust/i)
  assert.match(interpretation.student, /withhold/i)
})

test('comparison presentation keeps labels and chart ticks deterministic', () => {
  assert.equal(clipLabel('  abcdefghijklm  ', 12), 'abcdefghi...')
  assert.deepEqual(buildTickValues(2, 2), [2])
  assert.deepEqual(buildTickValues(0, 3, 4), [0, 1, 2, 3])
})

test('research template withholds unreliable values', () => {
  const template = buildStageTwoTemplate([
    { label: 'A', fractalDimension: 1.2, fitR2: 0.99, boxCounts: [{ size: 8, count: 14 }], quality: trusted },
    { label: 'B', fractalDimension: 1.6, fitR2: 0.7, boxCounts: [{ size: 8, count: 20 }], quality: { level: 'unreliable', title: 'Unreliable estimate' } },
  ], 'Summary')

  assert.match(template, /A: D=1\.2000/)
  assert.match(template, /B: D=withheld, R²=withheld/)
})
