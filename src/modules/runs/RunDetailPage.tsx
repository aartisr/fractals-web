import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { CommentThreadPanel } from '../../components/CommentThreadPanel'
import { Panel } from '../../components/Panel'
import { downloadJson, downloadTextAsFile } from '../../core/services/export'
import { api } from '../../core/services/api'
import {
  buildMethodsSnapshotMarkdown,
  buildPublicationFigureManifest,
  buildRunResearchSnapshot,
} from '../../core/services/researchWorkbench'

export function RunDetailPage() {
  const { runId } = useParams({ from: '/workbench/runs/$runId' })

  const runQuery = useQuery({
    queryKey: ['run', runId],
    queryFn: () => api.getRunById(runId),
  })

  const run = runQuery.data
  const researchSnapshot = run
    ? buildRunResearchSnapshot(run, {
        title: `${run.type.replace('_', ' ')} run detail`,
        summary: run.detail,
        metrics: [
          { label: 'Status', value: run.status },
          { label: 'Created', value: new Date(run.createdAt).toLocaleString() },
          { label: 'Run ID', value: run.id },
        ],
        annotations: [
          { label: 'Reproducibility', text: 'Use the provenance block and parameters to recreate the exact settings.' },
          { label: 'Caveat', text: 'Interpret output with the quality notes attached to the module.' },
        ],
      })
    : null
  const figureManifest = researchSnapshot ? buildPublicationFigureManifest(researchSnapshot) : null

  const exportMethodsSnapshot = () => {
    if (!researchSnapshot) {
      return
    }

    downloadTextAsFile(
      `${run?.type ?? 'run'}-methods-snapshot.md`,
      buildMethodsSnapshotMarkdown(researchSnapshot),
      'text/markdown',
    )
  }

  const exportFigureManifest = () => {
    if (!figureManifest) {
      return
    }

    downloadJson(`${run?.type ?? 'run'}-figure-manifest.json`, figureManifest)
  }

  return (
    <div className="tool-grid tool-grid-single">
      <Panel title="Run Detail" subtitle="Single-run diagnostics, payload, and artifact metadata.">
        {runQuery.isLoading ? <p className="muted">Loading run detail...</p> : null}
        {!runQuery.isLoading && !run ? <p className="muted">Run not found for id: {runId}</p> : null}

        {run ? (
          <div className="detail-stack">
            <div className="edu-note">
              <p className="edu-note-title">How to read this record</p>
              <p>Summary captures operational context, Parameters capture experiment setup, and Artifacts capture generated files.</p>
              <p>Use Result as the final evidence block for interpretation and reproducibility checks.</p>
            </div>

            <div className="metrics detail-grid">
              <span>Run ID: {run.id}</span>
              <span>Type: {run.type}</span>
              <span>Status: {run.status}</span>
              <span>Created: {new Date(run.createdAt).toLocaleString()}</span>
            </div>

            {run.provenance ? (
              <div className="edu-note">
                <p className="edu-note-title">Provenance</p>
                <p>Version: {run.provenance.version}</p>
                <p>Source: {run.provenance.source}</p>
                <p>Method: {run.provenance.method}</p>
                <p>App version: {run.provenance.appVersion}</p>
              </div>
            ) : null}

            <div className="compare-stage-actions">
              <button type="button" className="overlay-toggle" onClick={exportMethodsSnapshot}>
                Export methods snapshot
              </button>
              <button type="button" className="overlay-toggle" onClick={exportFigureManifest}>
                Export figure manifest
              </button>
            </div>

            <h3 className="detail-heading">Summary</h3>
            <pre>{JSON.stringify({ detail: run.detail, errorMessage: run.errorMessage ?? null }, null, 2)}</pre>

            <h3 className="detail-heading">Parameters</h3>
            <pre>{JSON.stringify(run.parameters ?? null, null, 2)}</pre>

            <h3 className="detail-heading">Artifacts</h3>
            <pre>{JSON.stringify(run.artifacts ?? null, null, 2)}</pre>

            <h3 className="detail-heading">Result</h3>
            <pre>{JSON.stringify(run.result ?? run.payload ?? null, null, 2)}</pre>

            <CommentThreadPanel
              target={{ kind: 'run', id: run.id, title: run.detail, module: run.type }}
              subject={`${run.type.replace('_', ' ')} run`}
            />
          </div>
        ) : null}
      </Panel>
    </div>
  )
}
