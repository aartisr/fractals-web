import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addCollaborationComment,
  buildDefaultPeerReviewRubric,
  buildPeerComparisonMarkdown,
  loadCollaborationComments,
  loadCollaborationModeration,
  saveCollaborationRubric,
  setCollaborationModeration,
} from './collaboration.ts'

test('stores collaboration comments and moderation state', () => {
  const target = { kind: 'run' as const, id: 'run-1', title: 'Run 1', module: 'fractal' as const }

  const comment = addCollaborationComment(target, {
    author: 'Ava',
    role: 'teacher',
    body: 'Focus on the evidence rather than the conclusion.',
  })

  const comments = loadCollaborationComments(target)
  assert.equal(comments[0]?.id, comment.id)
  assert.equal(comments[0]?.isTeacherAnnotation, true)

  setCollaborationModeration(target, { status: 'approved', updatedBy: 'Teacher' })
  assert.equal(loadCollaborationModeration(target).status, 'approved')
})

test('stores rubric reviews and builds comparison markdown', () => {
  const target = { kind: 'card' as const, id: 'card-1', title: 'Card 1', module: 'compare' as const }
  const rubric = buildDefaultPeerReviewRubric('compare')

  saveCollaborationRubric(target, {
    reviewer: 'Teacher',
    role: 'teacher',
    criteria: rubric.map((item) => ({ label: item.label, score: 4, note: item.note })),
    overallFeedback: 'Strong evidence and clear explanation.',
  })

  const markdown = buildPeerComparisonMarkdown(
    {
      id: 'left',
      kind: 'compare',
      title: 'Left',
      summary: 'Left summary',
      detail: 'Detail',
      createdAt: '2026-06-23T12:00:00.000Z',
      safetyNote: 'Safe',
      tags: ['a'],
      metrics: [{ label: 'D', value: '1.2' }],
    },
    {
      id: 'right',
      kind: 'compare',
      title: 'Right',
      summary: 'Right summary',
      detail: 'Detail',
      createdAt: '2026-06-23T12:00:00.000Z',
      safetyNote: 'Safe',
      tags: ['b'],
      metrics: [{ label: 'D', value: '1.4' }],
    },
  )

  assert.match(markdown, /Peer Comparison/)
  assert.match(markdown, /Left summary/)
})
