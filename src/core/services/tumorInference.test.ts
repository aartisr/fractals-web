import assert from 'node:assert/strict'
import test from 'node:test'
import { formatModelDownloadSize, TUMOR_MODEL_MANIFEST } from './tumorInference.ts'

test('tumor model manifest publishes accurate, distinct download sizes', () => {
  assert.equal(formatModelDownloadSize('axial'), '84 MB')
  assert.equal(formatModelDownloadSize('coronal'), '84 MB')
  assert.equal(formatModelDownloadSize('sagittal'), '29 MB')
  assert.ok(TUMOR_MODEL_MANIFEST.axial.bytes > TUMOR_MODEL_MANIFEST.sagittal.bytes)
})
