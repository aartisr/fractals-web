import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildClassroomStatus,
  buildHandoutMarkdown,
  buildSlideSummaryMarkdown,
  defaultChecklistStatus,
} from './educationToolkit.ts'

test('builds classroom status with checklist progress', () => {
  const status = buildClassroomStatus(
    'compare',
    [{ label: 'Images', value: '2' }],
    [
      { label: 'Upload images', complete: true },
      { label: 'Run compare', complete: false },
    ],
  )

  assert.equal(status.progressLabel, '1/2 complete')
  assert.equal(status.submissionStatus, 'in-progress')
  assert.equal(status.checklist[0]?.complete, true)
})

test('exports classroom handout and slide summaries', () => {
  const status = buildClassroomStatus('fractals', [{ label: 'Family', value: 'Mandelbrot' }], defaultChecklistStatus(['Explore']))
  const handout = buildHandoutMarkdown('fractals', status, ['Use the share card'])
  const slides = buildSlideSummaryMarkdown('fractals', status, ['Zoomed view'])

  assert.match(handout, /Fractal Exploration Lesson/)
  assert.match(handout, /Use the share card/)
  assert.match(slides, /Slide Summary/)
  assert.match(slides, /Zoomed view/)
})

