import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { BoxCountResult } from '../../core/services/contracts'
import { isUsableBoxCountResult } from './boxCountResultValidation.ts'

const makeResult = (overrides: Partial<BoxCountResult> = {}): BoxCountResult => ({
  runId: 'box_1',
  fractalDimension: 1.32,
  elapsedSeconds: 0.112,
  roi: { x: 10, y: 20, size: 128 },
  boxCounts: [
    { size: 1, count: 1200 },
    { size: 2, count: 620 },
    { size: 4, count: 300 },
  ],
  previewUrl: 'data:image/png;base64,abc',
  ...overrides,
})

describe('isUsableBoxCountResult', () => {
  it('accepts complete box-count results', () => {
    assert.equal(isUsableBoxCountResult(makeResult()), true)
  })

  it('rejects results with missing preview image', () => {
    assert.equal(isUsableBoxCountResult(makeResult({ previewUrl: '' })), false)
  })

  it('rejects results with invalid dimension', () => {
    assert.equal(isUsableBoxCountResult(makeResult({ fractalDimension: Number.NaN })), false)
  })

  it('rejects results with invalid ROI size', () => {
    assert.equal(isUsableBoxCountResult(makeResult({ roi: { x: 0, y: 0, size: 0 } })), false)
  })

  it('rejects results with empty or unusable box counts', () => {
    assert.equal(isUsableBoxCountResult(makeResult({ boxCounts: [] })), false)
    assert.equal(
      isUsableBoxCountResult(
        makeResult({
          boxCounts: [
            { size: 0, count: 10 },
            { size: 8, count: 0 },
          ],
        }),
      ),
      false,
    )
  })
})
