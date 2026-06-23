import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCohortComparisonMarkdown,
  buildMethodsSnapshotMarkdown,
  buildNormalizedRunsCsv,
  buildPublicationFigureManifest,
  buildResearchSnapshot,
  buildRunResearchSnapshot,
} from './researchWorkbench.ts'

test('builds a versioned research snapshot from a run record', () => {
  const snapshot = buildRunResearchSnapshot(
    {
      id: 'run_123',
      type: 'compare',
      status: 'complete',
      createdAt: '2026-06-23T12:00:00.000Z',
      detail: 'Comparison complete',
      payload: {
        result: { delta: 0.12 },
        parameters: { left: 'A', right: 'B' },
      },
      provenance: {
        version: 1,
        module: 'compare',
        generatedAt: '2026-06-23T12:00:00.000Z',
        source: 'local',
        method: 'Comparison complete',
        appVersion: 'test',
      },
    },
    {
      title: 'Compare snapshot',
      metrics: [{ label: 'Delta', value: '0.1200' }],
      annotations: [{ label: 'Note', text: 'Side-by-side comparison ready.' }],
    },
  )

  assert.equal(snapshot.version, 1)
  assert.equal(snapshot.runId, 'run_123')
  assert.equal(snapshot.provenance.method, 'Comparison complete')
  assert.equal(snapshot.metrics[0]?.label, 'Delta')
})

test('exports methods snapshots and cohort comparisons', () => {
  const snapshot = buildResearchSnapshot({
    run: {
      id: 'run_1',
      type: 'fractal',
      status: 'complete',
      createdAt: '2026-06-23T12:00:00.000Z',
      detail: 'Fractal research snapshot',
      payload: {},
    },
    title: 'Fractal research snapshot',
    summary: 'Method summary',
    metrics: [{ label: 'Dimension', value: '1.2345' }],
    annotations: [{ label: 'Rec 1', text: 'Try deeper zoom.' }],
    parameters: { power: 2 },
    result: { dimension: 1.2345 },
    artifacts: { imageUrl: 'data:image/png;base64,abc' },
  })

  const markdown = buildMethodsSnapshotMarkdown(snapshot)
  assert.match(markdown, /Snapshot version: 1/)
  assert.match(markdown, /Dimension/)

  const cohortMarkdown = buildCohortComparisonMarkdown([snapshot])
  assert.match(cohortMarkdown, /Cohort Comparison/)

  const csv = buildNormalizedRunsCsv([
    {
      id: 'run_2',
      type: 'box_count',
      status: 'complete',
      createdAt: '2026-06-23T12:00:00.000Z',
      detail: 'Box count result',
      payload: { result: { roi: { x: 1, y: 2, size: 3 } } },
      provenance: {
        version: 1,
        module: 'box_count',
        generatedAt: '2026-06-23T12:00:00.000Z',
        source: 'local',
        method: 'Box count result',
        appVersion: 'test',
      },
    },
  ])
  assert.match(csv, /run_id,module,status/)
  assert.match(csv, /box_count/)

  const manifest = buildPublicationFigureManifest(snapshot)
  assert.equal(manifest.version, 1)
  assert.equal(manifest.title, 'Fractal research snapshot')
})
