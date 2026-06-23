import type { RunDetail, RunProvenance, RunSummary, RunType } from './contracts'

export type ResearchMetric = {
  label: string
  value: string
  detail?: string
}

export type ResearchAnnotation = {
  label: string
  text: string
}

export type ResearchSnapshot = {
  version: 1
  title: string
  module: RunType
  runId: string
  createdAt: string
  summary: string
  provenance: RunProvenance
  parameters: unknown
  result: unknown
  artifacts: Record<string, string>
  metrics: ResearchMetric[]
  annotations: ResearchAnnotation[]
}

export type PublicationFigureManifest = {
  version: 1
  title: string
  caption: string
  module: RunType
  runId: string
  createdAt: string
  primaryImageUrl?: string
  secondaryImageUrl?: string
  annotations: ResearchAnnotation[]
  exportFormats: string[]
}

const csvEscape = (value: string | number | boolean | null | undefined) => {
  const text = value === null || value === undefined ? '' : String(value)
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

const asObject = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {})

const normalizeMetrics = (metrics: ResearchMetric[]) => metrics.filter((metric) => metric.label && metric.value)

export const buildResearchSnapshot = (
  input: {
    run: RunSummary | RunDetail
    summary?: string
    title: string
    metrics: ResearchMetric[]
    annotations?: ResearchAnnotation[]
    parameters?: unknown
    result?: unknown
    artifacts?: Record<string, string>
    provenance?: Partial<RunProvenance>
  },
): ResearchSnapshot => {
  const run = input.run
  const runArtifacts = asObject((run as RunDetail).artifacts)
  const provenance = {
    version: 1 as const,
    module: run.type,
    generatedAt: run.createdAt,
    source: 'api' as const,
    method: run.detail || input.title,
    appVersion: 'unknown',
    ...run.provenance,
    ...input.provenance,
  }

  return {
    version: 1,
    title: input.title,
    module: run.type,
    runId: run.id,
    createdAt: run.createdAt,
    summary: input.summary ?? run.detail,
    provenance,
    parameters: input.parameters ?? (run as RunDetail).parameters ?? null,
    result: input.result ?? (run as RunDetail).result ?? run.payload ?? null,
    artifacts: {
      ...Object.fromEntries(Object.entries(runArtifacts).map(([key, value]) => [key, String(value)])),
      ...(input.artifacts ? Object.fromEntries(Object.entries(input.artifacts).map(([key, value]) => [key, String(value)])) : {}),
    },
    metrics: normalizeMetrics(input.metrics),
    annotations: input.annotations ?? [],
  }
}

export const buildRunResearchSnapshot = (
  run: RunSummary | RunDetail,
  input: {
    title?: string
    summary?: string
    metrics?: ResearchMetric[]
    annotations?: ResearchAnnotation[]
  } = {},
): ResearchSnapshot => {
  const detailRun = run as RunDetail
  const payload = asObject(run.payload)
  const payloadArtifacts = asObject(payload.artifacts)
  const payloadProvenance = asObject(payload.provenance)

  return buildResearchSnapshot({
    run,
    title: input.title ?? `${run.type} research snapshot`,
    summary: input.summary ?? run.detail,
    metrics: input.metrics ?? [],
    annotations: input.annotations ?? [],
    parameters: detailRun.parameters ?? payload.parameters ?? payload.params ?? null,
    result: detailRun.result ?? payload.result ?? payload.data ?? run.payload ?? null,
    artifacts: {
      ...Object.fromEntries(Object.entries(asObject(detailRun.artifacts)).map(([key, value]) => [key, String(value)])),
      ...Object.fromEntries(Object.entries(payloadArtifacts).map(([key, value]) => [key, String(value)])),
    },
    provenance: {
      ...run.provenance,
      generatedAt: run.provenance?.generatedAt ?? run.createdAt,
      method: run.provenance?.method ?? run.detail,
      source: run.provenance?.source ?? (payloadProvenance.source as RunProvenance['source']) ?? 'api',
      appVersion: run.provenance?.appVersion ?? (payloadProvenance.appVersion as string) ?? 'unknown',
    },
  })
}

export const buildMethodsSnapshotMarkdown = (snapshot: ResearchSnapshot) => {
  const metrics = snapshot.metrics.map((metric) => `- ${metric.label}: ${metric.value}${metric.detail ? ` (${metric.detail})` : ''}`).join('\n')
  const annotations = snapshot.annotations.length
    ? snapshot.annotations.map((annotation) => `- ${annotation.label}: ${annotation.text}`).join('\n')
    : '- None'
  const artifacts = Object.entries(snapshot.artifacts)
    .map(([label, url]) => `- ${label}: ${url}`)
    .join('\n') || '- None'

  return [
    `# ${snapshot.title}`,
    '',
    `Run ID: ${snapshot.runId}`,
    `Module: ${snapshot.module}`,
    `Snapshot version: ${snapshot.version}`,
    '',
    snapshot.summary,
    '',
    '## Provenance',
    `- Generated at: ${snapshot.provenance.generatedAt}`,
    `- Source: ${snapshot.provenance.source}`,
    `- Method: ${snapshot.provenance.method}`,
    `- App version: ${snapshot.provenance.appVersion}`,
    '',
    '## Parameters',
    '```json',
    JSON.stringify(snapshot.parameters ?? null, null, 2),
    '```',
    '',
    '## Result',
    '```json',
    JSON.stringify(snapshot.result ?? null, null, 2),
    '```',
    '',
    '## Metrics',
    metrics || '- None',
    '',
    '## Annotations',
    annotations,
    '',
    '## Artifacts',
    artifacts,
  ].join('\n')
}

export const buildPublicationFigureManifest = (snapshot: ResearchSnapshot, urls: { primaryImageUrl?: string; secondaryImageUrl?: string } = {}): PublicationFigureManifest => ({
  version: 1,
  title: snapshot.title,
  caption: snapshot.summary,
  module: snapshot.module,
  runId: snapshot.runId,
  createdAt: snapshot.createdAt,
  primaryImageUrl: urls.primaryImageUrl,
  secondaryImageUrl: urls.secondaryImageUrl,
  annotations: snapshot.annotations,
  exportFormats: ['png', 'svg', 'json', 'md'],
})

export const buildNormalizedRunsCsv = (runs: Array<RunSummary | RunDetail>) => {
  const header = [
    'run_id',
    'module',
    'status',
    'created_at',
    'detail',
    'provenance_version',
    'provenance_source',
    'provenance_method',
    'parameters_present',
    'result_present',
    'artifact_count',
  ]

  const rows = runs.map((run) => {
    const detailRun = run as RunDetail
    const artifacts = asObject(detailRun.artifacts)
    return [
      run.id,
      run.type,
      run.status,
      run.createdAt,
      run.detail,
      run.provenance?.version ?? 1,
      run.provenance?.source ?? 'api',
      run.provenance?.method ?? run.detail,
      detailRun.parameters ? 'yes' : 'no',
      (detailRun.result ?? run.payload) ? 'yes' : 'no',
      Object.keys(artifacts).length,
    ].map(csvEscape).join(',')
  })

  return [header.join(','), ...rows].join('\n')
}

export const buildCohortComparisonMarkdown = (snapshots: ResearchSnapshot[]) => {
  const lines = snapshots.map((snapshot) => {
    const metrics = snapshot.metrics.map((metric) => `${metric.label}=${metric.value}`).join(', ')
    return `- ${snapshot.title} (${snapshot.module}): ${snapshot.summary}${metrics ? ` | ${metrics}` : ''}`
  })

  return [
    '# Cohort Comparison',
    '',
    '## Side-by-side interpretation',
    ...lines,
    '',
    '## Shared caveats',
    '- Compare method quality and context before ranking one result as better than another.',
    '- Keep the provenance block with any published or submitted figures.',
  ].join('\n')
}

export const buildCohortComparisonJson = (snapshots: ResearchSnapshot[]) => ({
  version: 1 as const,
  generatedAt: new Date().toISOString(),
  snapshots,
})
