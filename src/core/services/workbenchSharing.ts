import type { BoxCountResult, CompareResult, DetectionResult, FractalParams } from './contracts'

export type WorkbenchShareKind = 'fractals' | 'box-count' | 'compare' | 'tumor-detection'

export type WorkbenchMetric = {
  label: string
  value: string
  detail?: string
}

export type WorkbenchShareState = Record<string, unknown>

export type WorkbenchResultCard = {
  id: string
  kind: WorkbenchShareKind
  title: string
  summary: string
  detail: string
  createdAt: string
  sourceRunId?: string
  sourcePath?: string
  safetyNote: string
  tags: string[]
  metrics: WorkbenchMetric[]
  shareState?: WorkbenchShareState
}

export type WorkbenchShareRecord = {
  version: 1
  card: WorkbenchResultCard
}

export type WorkbenchEvent = {
  id: string
  name: string
  createdAt: string
  payload?: WorkbenchShareState
}

const SHARE_RECORD_KEY = 'fractals-workbench-shares'
const EVENT_LOG_KEY = 'fractals-workbench-events'
const MAX_SHARES = 24
const MAX_EVENTS = 80
const memoryStore = new Map<string, unknown>()

const safeWindow = () => (typeof window === 'undefined' ? null : window)

const randomId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const utf8Encode = (value: string) => {
  return new TextEncoder().encode(value)
}

const utf8Decode = (bytes: Uint8Array) => {
  return new TextDecoder().decode(bytes)
}

const base64Encode = (value: string) => {
  const bytes = utf8Encode(value)
  let binary = ''
  bytes.forEach((byte: number) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

const base64Decode = (value: string) => {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return utf8Decode(bytes)
}

const toBase64Url = (value: string) => base64Encode(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

const fromBase64Url = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const missing = padded.length % 4
  const decoded = missing ? padded.padEnd(padded.length + (4 - missing), '=') : padded
  return base64Decode(decoded)
}

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
    // Ignore storage quota or privacy-mode failures.
  }
}

const clampText = (value: string, maxLength = 120) => {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length <= maxLength) {
    return normalized
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`
}

const toListText = (values: string[]) => values.filter(Boolean).slice(0, 6).join(', ')

export const encodeWorkbenchShareRecord = (record: WorkbenchShareRecord): string => {
  return toBase64Url(JSON.stringify(record))
}

export const decodeWorkbenchShareRecord = (value: string): WorkbenchShareRecord | null => {
  try {
    const parsed = JSON.parse(fromBase64Url(value)) as WorkbenchShareRecord
    if (!parsed || parsed.version !== 1 || !parsed.card || typeof parsed.card !== 'object') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export const encodeWorkbenchState = (value: unknown): string => toBase64Url(JSON.stringify(value))

export const decodeWorkbenchState = <T>(value: string): T | null => {
  try {
    return JSON.parse(fromBase64Url(value)) as T
  } catch {
    return null
  }
}

export const buildShareUrl = (record: WorkbenchShareRecord, baseUrl?: string) => {
  const win = safeWindow()
  const url = new URL(baseUrl ?? win?.location.href ?? 'http://localhost')
  url.searchParams.set('share', encodeWorkbenchShareRecord(record))
  return url.toString()
}

export const summarizeShareCard = (card: WorkbenchResultCard) => {
  const metrics = card.metrics.map((metric) => `${metric.label}: ${metric.value}`)
  return [
    `${card.title}`,
    `${card.summary}`,
    card.detail ? `${card.detail}` : '',
    metrics.length ? `Metrics: ${metrics.join(' | ')}` : '',
    card.safetyNote ? `Safety: ${card.safetyNote}` : '',
    card.tags.length ? `Tags: ${toListText(card.tags)}` : '',
  ]
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

export const createShareRecord = (card: WorkbenchResultCard): WorkbenchShareRecord => ({
  version: 1,
  card: {
    ...card,
    id: card.id || randomId(card.kind),
    createdAt: card.createdAt || new Date().toISOString(),
  },
})

export const persistSharedCard = (card: WorkbenchResultCard) => {
  const next = [createShareRecord(card), ...readJson<WorkbenchShareRecord>(SHARE_RECORD_KEY)]
    .slice(0, MAX_SHARES)
  writeJson(SHARE_RECORD_KEY, next)
  return next[0]
}

export const loadSharedCards = (kind?: WorkbenchShareKind) => {
  const cards = readJson<WorkbenchShareRecord>(SHARE_RECORD_KEY).filter((entry) => entry?.version === 1)
  return kind ? cards.filter((entry) => entry.card.kind === kind) : cards
}

export const clearSharedCards = () => {
  const win = safeWindow()
  if (!win) {
    memoryStore.delete(SHARE_RECORD_KEY)
    return
  }
  try {
    win.localStorage.removeItem(SHARE_RECORD_KEY)
  } catch {
    // Ignore storage failures.
  }
}

export const trackWorkbenchEvent = (name: string, payload?: WorkbenchShareState) => {
  const event: WorkbenchEvent = {
    id: randomId('event'),
    name,
    createdAt: new Date().toISOString(),
    payload,
  }

  const next = [event, ...readJson<WorkbenchEvent>(EVENT_LOG_KEY)].slice(0, MAX_EVENTS)
  writeJson(EVENT_LOG_KEY, next)
  return event
}

export const loadWorkbenchEvents = () => readJson<WorkbenchEvent>(EVENT_LOG_KEY)

export const clearWorkbenchEvents = () => {
  const win = safeWindow()
  if (!win) {
    memoryStore.delete(EVENT_LOG_KEY)
    return
  }
  try {
    win.localStorage.removeItem(EVENT_LOG_KEY)
  } catch {
    // Ignore storage failures.
  }
}

export const createFractalShareCard = (input: {
  params: FractalParams
  viewport: { xMin: number; xMax: number; yMin: number; yMax: number }
  runId?: string
  fractalDimension?: number | null
  fitR2?: number | null
  summary?: string
  safetyNote?: string
}) => {
  const { params, viewport, runId, fractalDimension, fitR2, summary, safetyNote } = input
  const zoom = (2.5 / Math.max(1e-9, viewport.xMax - viewport.xMin)).toFixed(2)
  return createShareRecord({
    id: runId ?? randomId('fractal-share'),
    kind: 'fractals',
    title: `${params.type} exploration`,
    summary: summary ?? `Exploration at ${params.width}×${params.height} with palette ${params.colorScheme}.`,
    detail: `Viewport x:[${viewport.xMin.toExponential(3)}, ${viewport.xMax.toExponential(3)}] y:[${viewport.yMin.toExponential(3)}, ${viewport.yMax.toExponential(3)}].`,
    createdAt: new Date().toISOString(),
    sourceRunId: runId,
    safetyNote: safetyNote ?? 'Great for learning and sharing, but interpretation should stay descriptive, not diagnostic.',
    tags: [params.type, `zoom ${zoom}x`, params.colorScheme],
    metrics: [
      { label: 'Size', value: `${params.width}×${params.height}` },
      { label: 'Iterations', value: String(params.maxIter) },
      { label: 'Palette', value: params.colorScheme },
      { label: 'Power', value: String(params.power ?? 2) },
      { label: 'D', value: fractalDimension === null || fractalDimension === undefined ? '—' : fractalDimension.toFixed(4) },
      { label: 'R²', value: fitR2 === null || fitR2 === undefined ? '—' : fitR2.toFixed(4) },
    ],
    shareState: {
      params,
      viewport,
    },
  }).card
}

export const createBoxCountShareCard = (input: {
  result: BoxCountResult
  label?: string
  insight?: { complexityLabel: string; fitR2: number; teachingHint: string } | null
}) => {
  const { result, label, insight } = input
  return createShareRecord({
    id: result.runId,
    kind: 'box-count',
    title: label ? `${label} ROI box count` : 'Box-count analysis',
    summary: insight?.teachingHint ?? `Fractal dimension estimate: ${result.fractalDimension.toFixed(4)}.`,
    detail: `ROI ${result.roi.x},${result.roi.y} size ${result.roi.size}.`,
    createdAt: new Date().toISOString(),
    sourceRunId: result.runId,
    safetyNote: 'Use this as a descriptive complexity measure, not a standalone diagnosis.',
    tags: ['box-count', insight?.complexityLabel ?? 'analysis', `R² ${insight?.fitR2.toFixed(4) ?? '—'}`],
    metrics: [
      { label: 'D', value: result.fractalDimension.toFixed(4) },
      { label: 'Elapsed', value: `${result.elapsedSeconds.toFixed(2)}s` },
      { label: 'ROI', value: `${result.roi.x},${result.roi.y},${result.roi.size}` },
      { label: 'Scales', value: result.boxCounts.map((item) => item.size).join(', ') },
    ],
    shareState: {
      roi: result.roi,
      result,
    },
  }).card
}

export const createCompareShareCard = (input: {
  result: CompareResult
  summary: string
  labels: string[]
  safeInterpretationMode: boolean
  slotCount?: number
  activeEducationStage?: number
}) => {
  const { result, summary, labels, safeInterpretationMode, slotCount, activeEducationStage } = input
  const safeSummary = safeInterpretationMode
    ? summary.replace('diagnosis', 'clinical interpretation').replace('diagnostic', 'descriptive')
    : summary

  return createShareRecord({
    id: result.runId,
    kind: 'compare',
    title: 'Image compare result',
    summary: clampText(safeSummary, 180),
    detail: `Compared ${labels.length} images: ${toListText(labels)}.`,
    createdAt: new Date().toISOString(),
    sourceRunId: result.runId,
    safetyNote: 'Comparison supports discussion and research notes, but should not replace expert review.',
    tags: ['compare', `${labels.length} images`, safeInterpretationMode ? 'safe mode' : 'raw mode'],
    metrics: [
      { label: 'Delta', value: result.delta.toFixed(4) },
      { label: 'Image A', value: result.imageA.fractalDimension.toFixed(4) },
      { label: 'Image B', value: result.imageB.fractalDimension.toFixed(4) },
    ],
    shareState: {
      labels,
      safeInterpretationMode,
      slotCount: slotCount ?? labels.length,
      activeEducationStage: activeEducationStage ?? 1,
    },
  }).card
}

export const createTumorShareCard = (input: {
  result: DetectionResult
  threshold: number
  detectionCount: number
  strongestConfidence: string
  summary: string
}) => {
  const { result, threshold, detectionCount, strongestConfidence, summary } = input
  return createShareRecord({
    id: result.runId,
    kind: 'tumor-detection',
    title: `${result.view} tumor detection`,
    summary: clampText(summary, 180),
    detail: `Threshold ${Math.round(threshold * 100)}%, detections ${detectionCount}.`,
    createdAt: new Date().toISOString(),
    sourceRunId: result.runId,
    safetyNote: 'Educational support only. Interpret with expert review and clinical context.',
    tags: ['tumor', result.view, `${detectionCount} candidates`],
    metrics: [
      { label: 'View', value: result.view },
      { label: 'Threshold', value: `${Math.round(threshold * 100)}%` },
      { label: 'Candidates', value: String(detectionCount) },
      { label: 'Top confidence', value: strongestConfidence },
    ],
    shareState: {
      threshold,
      view: result.view,
      result,
    },
  }).card
}

export const buildShareCardMarkdown = (card: WorkbenchResultCard) => {
  const metrics = card.metrics.map((metric) => `- ${metric.label}: ${metric.value}${metric.detail ? ` (${metric.detail})` : ''}`).join('\n')
  const tags = card.tags.length ? `\nTags: ${toListText(card.tags)}` : ''
  const source = card.sourceRunId ? `\nSource run: ${card.sourceRunId}` : ''
  return [
    `# ${card.title}`,
    '',
    card.summary,
    '',
    card.detail,
    '',
    metrics,
    '',
    `Safety: ${card.safetyNote}`,
    tags,
    source,
  ]
    .filter(Boolean)
    .join('\n')
}

export const getResultCardState = (card: WorkbenchResultCard) => card.shareState ?? null
