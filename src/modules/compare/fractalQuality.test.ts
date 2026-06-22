import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { assessFractalQuality, combineFractalQuality } from './fractalQuality.ts'

describe('assessFractalQuality', () => {
  it('marks a stable multi-scale estimate as trusted', () => {
    const quality = assessFractalQuality({
      fractalDimension: 1.42,
      fitR2: 0.989,
      boxCounts: [
        { size: 1, count: 512 },
        { size: 2, count: 256 },
        { size: 4, count: 128 },
        { size: 8, count: 64 },
        { size: 16, count: 32 },
      ],
    })

    assert.equal(quality.level, 'trusted')
    assert.equal(quality.scaleCount, 5)
    assert.equal(quality.title, 'Trusted estimate')
  })

  it('marks sparse scales as unreliable', () => {
    const quality = assessFractalQuality({
      fractalDimension: 1.1,
      fitR2: 0.91,
      boxCounts: [
        { size: 8, count: 24 },
        { size: 16, count: 10 },
      ],
    })

    assert.equal(quality.level, 'unreliable')
    assert.match(quality.summary, /unstable/i)
  })

  it('marks flat counts as unreliable', () => {
    const quality = assessFractalQuality({
      fractalDimension: 1.0,
      fitR2: 0.995,
      boxCounts: [
        { size: 1, count: 100 },
        { size: 2, count: 100 },
        { size: 4, count: 100 },
        { size: 8, count: 100 },
      ],
    })

    assert.equal(quality.level, 'unreliable')
    assert.ok(quality.reasons.some((reason) => /change too little/i.test(reason)))
  })
})

describe('combineFractalQuality', () => {
  it('returns the worst quality level across inputs', () => {
    const result = combineFractalQuality([
      assessFractalQuality({
        fractalDimension: 1.42,
        fitR2: 0.989,
        boxCounts: [
          { size: 1, count: 512 },
          { size: 2, count: 256 },
          { size: 4, count: 128 },
          { size: 8, count: 64 },
          { size: 16, count: 32 },
        ],
      }),
      assessFractalQuality({
        fractalDimension: 1.0,
        fitR2: 0.91,
        boxCounts: [
          { size: 8, count: 24 },
          { size: 16, count: 10 },
        ],
      }),
    ])

    assert.equal(result?.level, 'unreliable')
  })
})
