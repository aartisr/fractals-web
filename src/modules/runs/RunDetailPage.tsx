import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { Panel } from '../../components/Panel'
import { api } from '../../core/services/api'

export function RunDetailPage() {
  const { runId } = useParams({ from: '/workbench/runs/$runId' })

  const runQuery = useQuery({
    queryKey: ['run', runId],
    queryFn: () => api.getRunById(runId),
  })

  const run = runQuery.data

  return (
    <div className="tool-grid tool-grid-single">
      <Panel title="Run Detail" subtitle="Single-run diagnostics, payload, and artifact metadata.">
        {runQuery.isLoading ? <p className="muted">Loading run detail...</p> : null}
        {!runQuery.isLoading && !run ? <p className="muted">Run not found for id: {runId}</p> : null}

        {run ? (
          <div className="detail-stack">
            <div className="metrics detail-grid">
              <span>Run ID: {run.id}</span>
              <span>Type: {run.type}</span>
              <span>Status: {run.status}</span>
              <span>Created: {new Date(run.createdAt).toLocaleString()}</span>
            </div>

            <h3 className="detail-heading">Summary</h3>
            <pre>{JSON.stringify({ detail: run.detail, errorMessage: run.errorMessage ?? null }, null, 2)}</pre>

            <h3 className="detail-heading">Parameters</h3>
            <pre>{JSON.stringify(run.parameters ?? null, null, 2)}</pre>

            <h3 className="detail-heading">Artifacts</h3>
            <pre>{JSON.stringify(run.artifacts ?? null, null, 2)}</pre>

            <h3 className="detail-heading">Result</h3>
            <pre>{JSON.stringify(run.result ?? run.payload ?? null, null, 2)}</pre>
          </div>
        ) : null}
      </Panel>
    </div>
  )
}
