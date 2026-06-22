import type { DetectionResult } from '../../core/services/contracts'

type View = DetectionResult['view']

interface TumorStatusCardProps {
  isRunning: boolean
  detectionData?: DetectionResult
  detectionError: string
  confidenceThreshold: number
  detectionCount: number
  strongestConfidence: string
  confidenceSummary: { high: number; medium: number; low: number } | null
}

const VIEW_LABELS: Record<View, string> = {
  axial: 'Axial',
  coronal: 'Coronal',
  sagittal: 'Sagittal',
}

export function TumorStatusCard({
  isRunning,
  detectionData,
  detectionError,
  confidenceThreshold,
  detectionCount,
  strongestConfidence,
  confidenceSummary,
}: TumorStatusCardProps) {
  return (
    <div className="tumor-status-card">
      <p className="tumor-status-title">Current status</p>
      {isRunning ? (
        <div className="tumor-status-running" aria-live="polite">
          <div className="loading-spinner tumor-status-spinner" aria-hidden="true" />
          <div className="tumor-status-empty-copy">
            <strong>Running detection</strong>
            <p>Analyzing the uploaded scan and generating the comparison output now.</p>
            <p className="tumor-status-empty-hint">This may take a few moments depending on the image and model load time.</p>
          </div>
        </div>
      ) : null}
      {detectionError ? (
        <div className="tumor-status-empty">
          <div className="tumor-status-empty-icon" aria-hidden="true">
            !
          </div>
          <div className="tumor-status-empty-copy">
            <strong>Detection error</strong>
            <p>{detectionError}</p>
            <p>The local ONNX model must load successfully and return a valid annotated image.</p>
          </div>
        </div>
      ) : detectionData ? (
        <div className="tumor-status-stack">
          <div className="tumor-status-grid">
            <span className="edu-chip">View: {VIEW_LABELS[detectionData.view]}</span>
            <span className="edu-chip">Threshold: {Math.round(confidenceThreshold * 100)}%</span>
            <span className="edu-chip">Candidates: {detectionCount}</span>
            <span className="edu-chip">Top confidence: {strongestConfidence}</span>
            <span className="edu-chip">High: {confidenceSummary?.high ?? 0}</span>
            <span className="edu-chip">Medium: {confidenceSummary?.medium ?? 0}</span>
            <span className="edu-chip">Low: {confidenceSummary?.low ?? 0}</span>
          </div>
          <div className="tumor-status-note">
            <strong>{detectionCount > 0 ? 'Candidate region found' : 'No candidate region found'}</strong>
            <p>The app shows the original scan beside the locally generated model output so users can compare the result directly.</p>
          </div>
        </div>
      ) : (
        <div className="tumor-status-empty">
          <div className="tumor-status-empty-icon" aria-hidden="true">
            →
          </div>
          <div className="tumor-status-empty-copy">
            <strong>No detection run yet</strong>
            <p>Run detection to generate the before/after comparison and candidate evidence.</p>
            <p className="tumor-status-empty-hint">The annotated result will replace this panel after inference completes.</p>
          </div>
        </div>
      )}
    </div>
  )
}
