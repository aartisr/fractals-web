import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { GuidedKickoffPanel } from '../../components/GuidedKickoffPanel'
import { downloadJson, downloadTextAsFile } from '../../core/services/export'
import { Panel } from '../../components/Panel'
import { PeerComparisonPanel } from '../../components/PeerComparisonPanel'
import { SharedArtifactGallery } from '../../components/SharedArtifactGallery'
import { useEducatorMode } from '../../core/hooks/useEducatorMode'
import { api } from '../../core/services/api'
import {
  buildShareUrl,
  clearSharedCards,
  loadSharedCards,
  persistSharedCard,
  trackWorkbenchEvent,
} from '../../core/services/workbenchSharing'
import type { RunSummary } from '../../core/services/contracts'
import {
  buildCohortComparisonJson,
  buildCohortComparisonMarkdown,
  buildNormalizedRunsCsv,
  buildRunResearchSnapshot,
} from '../../core/services/researchWorkbench'

const columnHelper = createColumnHelper<RunSummary>()

const columns = [
  columnHelper.accessor('id', {
    header: 'Run ID',
    cell: (info) => {
      const id = info.getValue()
      return (
        <Link to="/workbench/runs/$runId" params={{ runId: id }} className="table-link">
          {id}
        </Link>
      )
    },
  }),
  columnHelper.accessor('type', {
    header: 'Type',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: (info) => new Date(info.getValue()).toLocaleString(),
  }),
  columnHelper.accessor('detail', {
    header: 'Detail',
    cell: (info) => info.getValue(),
  }),
]

export function RunsPage() {
  const { educatorMode } = useEducatorMode()
  const [sharedCards, setSharedCards] = useState(() => loadSharedCards().map((record) => record.card))
  const runsQuery = useQuery({
    queryKey: ['runs'],
    queryFn: api.getRuns,
    refetchInterval: 5000,
  })

  useEffect(() => {
    const refreshCards = () => setSharedCards(loadSharedCards().map((record) => record.card))
    refreshCards()
    window.addEventListener('storage', refreshCards)
    return () => window.removeEventListener('storage', refreshCards)
  }, [])

  const rows = useMemo(() => runsQuery.data ?? [], [runsQuery.data])
  const latestResearchSnapshots = useMemo(
    () =>
      rows.slice(0, 4).map((run, index) =>
        buildRunResearchSnapshot(run, {
          title: `${run.type.replace('_', ' ')} run ${index + 1}`,
          summary: run.detail,
          metrics: [
            { label: 'Status', value: run.status },
            { label: 'Created', value: new Date(run.createdAt).toLocaleString() },
            { label: 'Run ID', value: run.id.slice(0, 12) },
          ],
          annotations: [
            { label: 'Method', text: run.provenance?.method ?? run.detail ?? 'Analysis result recorded in history.' },
            { label: 'Source', text: run.provenance?.source ? `Provenance source: ${run.provenance.source}.` : 'Provenance not yet recorded.' },
          ],
        }),
      ),
    [rows],
  )
  const cohortComparisonMarkdown = useMemo(
    () => buildCohortComparisonMarkdown(latestResearchSnapshots),
    [latestResearchSnapshots],
  )
  const cohortComparisonJson = useMemo(
    () => buildCohortComparisonJson(latestResearchSnapshots),
    [latestResearchSnapshots],
  )
  const normalizedRunCsv = useMemo(() => buildNormalizedRunsCsv(rows), [rows])

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const sharedByKind = useMemo(() => {
    return sharedCards.reduce<Record<string, number>>((acc, card) => {
      acc[card.kind] = (acc[card.kind] ?? 0) + 1
      return acc
    }, {})
  }, [sharedCards])

  const latestShared = useMemo(() => sharedCards.slice(0, 4), [sharedCards])

  const exportInstructorHandout = () => {
    const markdown = [
      '# Instructor Dashboard',
      '',
      `Total runs: ${rows.length}`,
      `Shared examples: ${sharedCards.length}`,
      '',
      'Submission overview:',
      `- Fractals: ${sharedByKind.fractals ?? 0}`,
      `- Box count: ${sharedByKind['box-count'] ?? 0}`,
      `- Compare: ${sharedByKind.compare ?? 0}`,
      `- Tumor: ${sharedByKind['tumor-detection'] ?? 0}`,
      '',
      'Latest artifacts:',
      ...latestShared.map((card) => `- ${card.title} (${card.kind})`),
      '',
      'Teacher note: use classroom mode to keep interpretation safe and guided.',
    ].join('\n')

    downloadTextAsFile('instructor-dashboard.md', markdown, 'text/markdown')
  }

  const exportInstructorSlides = () => {
    const markdown = [
      '# Instructor Dashboard - Slide Summary',
      '',
      `Runs: ${rows.length}`,
      `Shared examples: ${sharedCards.length}`,
      '',
      'Highlights:',
      ...latestShared.map((card) => `- ${card.title}`),
      '',
      'Status by module:',
      `- Fractals: ${sharedByKind.fractals ?? 0}`,
      `- Box count: ${sharedByKind['box-count'] ?? 0}`,
      `- Compare: ${sharedByKind.compare ?? 0}`,
      `- Tumor: ${sharedByKind['tumor-detection'] ?? 0}`,
    ].join('\n')

    downloadTextAsFile('instructor-dashboard-slides.md', markdown, 'text/markdown')
  }

  const exportResearchCsv = () => {
    downloadTextAsFile('run-history-normalized.csv', normalizedRunCsv, 'text/csv')
  }

  const exportResearchJson = () => {
    downloadJson('run-history-normalized.json', {
      version: 1,
      exportedAt: new Date().toISOString(),
      runs: rows,
    })
  }

  const exportCohortComparison = () => {
    downloadTextAsFile('cohort-comparison.md', cohortComparisonMarkdown, 'text/markdown')
  }

  const exportCohortComparisonJson = () => {
    downloadJson('cohort-comparison.json', cohortComparisonJson)
  }

  const openSharedCard = (card: (typeof sharedCards)[number]) => {
    const baseUrl = `${window.location.origin}${card.sourcePath ?? '/workbench/fractals'}`
    window.location.assign(buildShareUrl({ version: 1, card }, baseUrl))
  }

  const saveSharedCardCopy = (card: (typeof sharedCards)[number]) => {
    persistSharedCard({
      ...card,
      id: `${card.id}-copy-${Date.now()}`,
      createdAt: new Date().toISOString(),
      sourceRunId: card.sourceRunId ?? card.id,
    })
    setSharedCards(loadSharedCards().map((record) => record.card))
    trackWorkbenchEvent('shared_card_duplicated', { kind: card.kind, sourceRunId: card.sourceRunId })
  }

  return (
    <div className="tool-grid tool-grid-single">
      <GuidedKickoffPanel
        title="Run History Workspace"
        subtitle="Start here if you want provenance, reusable examples, or a clean research paper trail."
        steps={[
          'Open the run history to find the output you want to revisit.',
          'Save or duplicate a shared example so you can keep working from a known-good state.',
          'Use the research exports and peer review tools when you need a reproducible record.',
        ]}
        actions={[
          {
            label: 'Browse discovery',
            to: '/workbench/discover',
            description: 'Find bookmarkable examples and challenge pages.',
          },
          {
            label: 'Open fractals',
            to: '/workbench/fractals',
            description: 'Create a fresh example and share it back into the gallery.',
          },
        ]}
        note="This page is the best home for returning users because it keeps the evidence, reuse, and export workflow in one place."
      />

      <Panel title="Run History" subtitle="Unified run registry from API endpoint with local fallback.">
        <div className="edu-chip-row" aria-label="Status legend">
          <span className="edu-chip">queued: accepted, waiting</span>
          <span className="edu-chip">running: actively processing</span>
          <span className="edu-chip">complete: result available</span>
          <span className="edu-chip">failed: inspect detail or run record</span>
        </div>

        {runsQuery.isLoading ? <p className="muted">Loading run history...</p> : null}
        {rows.length === 0 ? <p className="muted">No runs yet. Execute any module to populate history.</p> : null}

        {rows.length > 0 ? (
          <div className="table-wrap">
            <table className="runs-table">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Panel>

      <Panel title="Shared Examples" subtitle="Saved share cards from fractals, compare, box count, and tumor detection live here as a local exemplar gallery.">
        <div className="compare-stage-actions">
          <button type="button" className="overlay-toggle" onClick={() => setSharedCards(loadSharedCards().map((record) => record.card))}>
            Refresh gallery
          </button>
          <button
            type="button"
            className="overlay-toggle"
            onClick={() => {
              clearSharedCards()
              setSharedCards([])
              trackWorkbenchEvent('shared_gallery_cleared', {})
            }}
          >
            Clear gallery
          </button>
        </div>
        <SharedArtifactGallery cards={sharedCards} onRemix={openSharedCard} onSave={saveSharedCardCopy} canModerate={educatorMode} />
      </Panel>

      <Panel title="Peer Review Studio" subtitle="Compare two shared artifacts, score reasoning, and export a structured peer review.">
        <PeerComparisonPanel cards={sharedCards} />
      </Panel>

      <Panel title="Research Workbench" subtitle="Versioned provenance, normalized exports, and cohort comparison for reproducible analysis notes.">
        <div className="classroom-grid">
          <div className="classroom-card">
            <h3>Normalized exports</h3>
            <ul className="classroom-checklist">
              <li>CSV flattens the run registry into a citation-friendly table.</li>
              <li>JSON keeps the full versioned payload for lab notebooks and pipelines.</li>
              <li>Cohort exports preserve annotations for side-by-side review.</li>
            </ul>
          </div>
          <div className="classroom-card">
            <h3>Research actions</h3>
            <div className="compare-stage-actions">
              <button type="button" className="overlay-toggle" onClick={exportResearchCsv}>
                Export runs CSV
              </button>
              <button type="button" className="overlay-toggle" onClick={exportResearchJson}>
                Export runs JSON
              </button>
              <button type="button" className="overlay-toggle" onClick={exportCohortComparison}>
                Export cohort note
              </button>
              <button type="button" className="overlay-toggle" onClick={exportCohortComparisonJson}>
                Export cohort JSON
              </button>
            </div>
          </div>
        </div>

        <div className="research-cohort-grid">
          {latestResearchSnapshots.length > 0 ? (
            latestResearchSnapshots.map((snapshot) => (
              <article className="research-cohort-card" key={snapshot.runId}>
                <p className="edu-note-title">{snapshot.title}</p>
                <p className="muted">{snapshot.summary}</p>
                <div className="metrics detail-grid">
                  {snapshot.metrics.map((metric) => (
                    <span key={`${snapshot.runId}-${metric.label}`}>
                      <strong>{metric.label}:</strong> {metric.value}
                    </span>
                  ))}
                </div>
                <div className="edu-note">
                  <p className="edu-note-title">Annotations</p>
                  {snapshot.annotations.map((annotation) => (
                    <p key={`${snapshot.runId}-${annotation.label}`}>
                      <strong>{annotation.label}:</strong> {annotation.text}
                    </p>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <p className="muted">No runs available yet for a cohort comparison.</p>
          )}
        </div>
      </Panel>

      {educatorMode ? (
        <Panel title="Instructor Dashboard" subtitle="Track classroom progress, recent submissions, and module coverage from one place.">
          <div className="classroom-grid">
            <div className="classroom-card">
              <h3>Class progress</h3>
              <ul>
                <li><strong>Runs:</strong> {rows.length}</li>
                <li><strong>Shared examples:</strong> {sharedCards.length}</li>
                <li><strong>Fractals:</strong> {sharedByKind.fractals ?? 0}</li>
                <li><strong>Box count:</strong> {sharedByKind['box-count'] ?? 0}</li>
                <li><strong>Compare:</strong> {sharedByKind.compare ?? 0}</li>
                <li><strong>Tumor:</strong> {sharedByKind['tumor-detection'] ?? 0}</li>
              </ul>
            </div>
            <div className="classroom-card">
              <h3>Teacher actions</h3>
              <ul>
                <li><strong>Review:</strong> open recent artifacts from the gallery.</li>
                <li><strong>Moderate:</strong> clear or duplicate shared examples for the next lesson.</li>
                <li><strong>Export:</strong> create a handout or slide summary for class or slides.</li>
              </ul>
            </div>
          </div>
          <div className="compare-stage-actions">
            <button type="button" className="overlay-toggle" onClick={exportInstructorHandout}>
              Export instructor handout
            </button>
            <button type="button" className="overlay-toggle" onClick={exportInstructorSlides}>
              Export instructor slides
            </button>
          </div>
        </Panel>
      ) : null}
    </div>
  )
}
