import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildShareCardMarkdown,
  createCompareShareCard,
  createFractalShareCard,
  createShareRecord,
  decodeWorkbenchShareRecord,
  encodeWorkbenchShareRecord,
} from './workbenchSharing.ts'

test('encodes and decodes share records', () => {
  const card = createFractalShareCard({
    params: {
      type: 'Mandelbrot',
      width: 800,
      height: 600,
      maxIter: 256,
      colorScheme: 'inferno',
    },
    viewport: {
      xMin: -2,
      xMax: 1,
      yMin: -1.25,
      yMax: 1.25,
    },
  })
  const record = createShareRecord(card)
  const decoded = decodeWorkbenchShareRecord(encodeWorkbenchShareRecord(record))

  assert.ok(decoded)
  assert.equal(decoded?.card.kind, 'fractals')
  assert.equal(decoded?.card.metrics[0]?.value, '800×600')
})

test('builds a concise markdown summary for compare cards', () => {
  const card = createCompareShareCard({
    result: {
      runId: 'compare-1',
      imageA: { fractalDimension: 1.8, fitR2: 0.97, boxCounts: [] },
      imageB: { fractalDimension: 1.3, fitR2: 0.92, boxCounts: [] },
      delta: 0.5,
      interpretation: 'Image A has the higher estimated fractal complexity.',
    },
    summary: 'Image A has the higher estimated fractal complexity.',
    labels: ['A', 'B'],
    safeInterpretationMode: true,
    slotCount: 2,
  })

  const markdown = buildShareCardMarkdown(card)
  assert.match(markdown, /Image compare result/)
  assert.match(markdown, /Safety:/)
  assert.match(markdown, /Delta/)
})
