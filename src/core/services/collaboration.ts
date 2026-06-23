import type { RunSummary } from './contracts'
import type { WorkbenchResultCard, WorkbenchShareKind } from './workbenchSharing'

export type CollaborationRole = 'student' | 'peer' | 'teacher'

export type CollaborationTarget =
  | { kind: 'run'; id: string; title?: string; module?: RunSummary['type'] }
  | { kind: 'card'; id: string; title?: string; module?: WorkbenchShareKind }

export type CollaborationComment = {
  id: string
  targetKind: CollaborationTarget['kind']
  targetId: string
  author: string
  role: CollaborationRole
  body: string
  createdAt: string
  parentId?: string
  resolved?: boolean
  isTeacherAnnotation?: boolean
}

export type CollaborationRubricScore = 1 | 2 | 3 | 4

export type CollaborationRubric = {
  id: string
  targetKind: CollaborationTarget['kind']
  targetId: string
  createdAt: string
  reviewer: string
  role: CollaborationRole
  criteria: Array<{
    label: string
    score: CollaborationRubricScore
    note: string
  }>
  overallFeedback: string
}

export type CollaborationModerationStatus = 'pending' | 'approved' | 'hidden'

export type CollaborationModerationRecord = {
  targetKind: CollaborationTarget['kind']
  targetId: string
  status: CollaborationModerationStatus
  updatedAt: string
  updatedBy: string
  note?: string
}

const COMMENT_KEY = 'fractals-workbench-comments'
const RUBRIC_KEY = 'fractals-workbench-rubrics'
const MODERATION_KEY = 'fractals-workbench-moderation'
const memoryStore = new Map<string, unknown>()

const safeWindow = () => (typeof window === 'undefined' ? null : window)
const randomId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const readJson = <T>(key: string): T[] => {
  const win = safeWindow()
  if (!win) {
    const value = memoryStore.get(key)
    return Array.isArray(value) ? (value as T[]) : []
  }

  try {
    const raw = win.localStorage.getItem(key)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as T[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeJson = (key: string, value: unknown) => {
  const win = safeWindow()
  if (!win) {
    memoryStore.set(key, value)
    return
  }

  try {
    win.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures.
  }
}

const upsert = <T extends { targetKind: CollaborationTarget['kind']; targetId: string }>(items: T[], next: T) => {
  const index = items.findIndex((item) => item.targetKind === next.targetKind && item.targetId === next.targetId)
  if (index >= 0) {
    const copy = [...items]
    copy[index] = next
    return copy
  }
  return [next, ...items]
}

export const makeCollaborationTarget = (item: Pick<CollaborationTarget, 'kind' | 'id'> & Partial<CollaborationTarget>) => ({
  kind: item.kind,
  id: item.id,
  title: item.title,
  module: item.module,
})

export const loadCollaborationComments = (target: CollaborationTarget) =>
  readJson<CollaborationComment>(COMMENT_KEY).filter((comment) => comment.targetKind === target.kind && comment.targetId === target.id)

export const addCollaborationComment = (target: CollaborationTarget, input: {
  author: string
  role: CollaborationRole
  body: string
  parentId?: string
  isTeacherAnnotation?: boolean
}) => {
  const comment: CollaborationComment = {
    id: randomId('comment'),
    targetKind: target.kind,
    targetId: target.id,
    author: input.author.trim() || 'Anonymous',
    role: input.role,
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
    parentId: input.parentId,
    resolved: false,
    isTeacherAnnotation: input.isTeacherAnnotation ?? input.role === 'teacher',
  }

  const next = [comment, ...readJson<CollaborationComment>(COMMENT_KEY)]
  writeJson(COMMENT_KEY, next.slice(0, 200))
  return comment
}

export const toggleCollaborationCommentResolved = (commentId: string) => {
  const next = readJson<CollaborationComment>(COMMENT_KEY).map((comment) =>
    comment.id === commentId ? { ...comment, resolved: !comment.resolved } : comment,
  )
  writeJson(COMMENT_KEY, next)
}

export const loadCollaborationRubric = (target: CollaborationTarget) =>
  readJson<CollaborationRubric>(RUBRIC_KEY).find((rubric) => rubric.targetKind === target.kind && rubric.targetId === target.id) ?? null

export const saveCollaborationRubric = (
  target: CollaborationTarget,
  input: Omit<CollaborationRubric, 'id' | 'targetKind' | 'targetId' | 'createdAt'>,
) => {
  const rubric: CollaborationRubric = {
    id: randomId('rubric'),
    targetKind: target.kind,
    targetId: target.id,
    createdAt: new Date().toISOString(),
    ...input,
  }
  const next = upsert(readJson<CollaborationRubric>(RUBRIC_KEY), rubric)
  writeJson(RUBRIC_KEY, next)
  return rubric
}

export const loadCollaborationModeration = (target: CollaborationTarget) =>
  readJson<CollaborationModerationRecord>(MODERATION_KEY).find(
    (record) => record.targetKind === target.kind && record.targetId === target.id,
  ) ?? {
    targetKind: target.kind,
    targetId: target.id,
    status: 'pending',
    updatedAt: new Date(0).toISOString(),
    updatedBy: 'system',
  }

export const setCollaborationModeration = (
  target: CollaborationTarget,
  input: { status: CollaborationModerationStatus; updatedBy: string; note?: string },
) => {
  const record: CollaborationModerationRecord = {
    targetKind: target.kind,
    targetId: target.id,
    status: input.status,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy.trim() || 'Moderator',
    note: input.note?.trim(),
  }
  const next = upsert(readJson<CollaborationModerationRecord>(MODERATION_KEY), record)
  writeJson(MODERATION_KEY, next)
  return record
}

export const buildDefaultPeerReviewRubric = (subject: string) => [
  { label: `${subject} reasoning`, score: 3 as CollaborationRubricScore, note: 'Explain why the method or interpretation is convincing.' },
  { label: 'Evidence use', score: 3 as CollaborationRubricScore, note: 'Refer to metrics, annotations, or visuals rather than opinion.' },
  { label: 'Communication', score: 3 as CollaborationRubricScore, note: 'Use clear, precise language that another student can follow.' },
]

export const buildPeerComparisonMarkdown = (left: WorkbenchResultCard, right: WorkbenchResultCard) => {
  const leftMetrics = left.metrics.map((metric) => `${metric.label}: ${metric.value}`).join(' | ')
  const rightMetrics = right.metrics.map((metric) => `${metric.label}: ${metric.value}`).join(' | ')

  return [
    '# Peer Comparison',
    '',
    `Left: ${left.title}`,
    `Right: ${right.title}`,
    '',
    '## Shared strengths',
    `- Left tags: ${left.tags.join(', ')}`,
    `- Right tags: ${right.tags.join(', ')}`,
    '',
    '## Evidence summary',
    `- Left: ${left.summary}${leftMetrics ? ` | ${leftMetrics}` : ''}`,
    `- Right: ${right.summary}${rightMetrics ? ` | ${rightMetrics}` : ''}`,
    '',
    '## Coach note',
    '- Ask which method details are shared and which are genuinely different.',
    '- Keep interpretation descriptive and cite the evidence behind the claim.',
  ].join('\n')
}

export const buildCardAnnotation = (card: WorkbenchResultCard, note: string) => ({
  id: randomId('annotation'),
  cardId: card.id,
  note: note.trim(),
  createdAt: new Date().toISOString(),
})
