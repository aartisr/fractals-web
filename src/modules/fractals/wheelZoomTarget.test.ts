import assert from 'node:assert/strict'
import test from 'node:test'
import { isChromaticPixel, mapPointToContainedCanvas } from './wheelZoomTarget.ts'

test('maps points inside a contained render and rejects its left/right letterbox margins', () => {
  const frame = { left: 0, top: 0, width: 1000, height: 500 }

  assert.equal(mapPointToContainedCanvas(frame, 400, 400, 100, 250), null)
  assert.deepEqual(mapPointToContainedCanvas(frame, 400, 400, 500, 250), { x: 200, y: 200 })
  assert.equal(mapPointToContainedCanvas(frame, 400, 400, 900, 250), null)
})

test('rejects neutral canvas pixels and accepts visibly chromatic fractal pixels', () => {
  assert.equal(isChromaticPixel(255, 255, 255, 255), false)
  assert.equal(isChromaticPixel(8, 8, 12, 255), false)
  assert.equal(isChromaticPixel(13, 8, 135, 255), true)
  assert.equal(isChromaticPixel(248, 149, 64, 255), true)
  assert.equal(isChromaticPixel(255, 0, 0, 0), false)
})
