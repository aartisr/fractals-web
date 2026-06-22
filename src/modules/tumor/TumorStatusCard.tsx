import type { DetectionResult } from '../../core/services/contracts'
import { formatTumorFractalDelta, tumorFractalEvidenceSources } from './tumorEvidence'

type View = DetectionResult['view']

type FractalEvidence = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  message: string
  source: { fractalDimension: number; fitR2: number } | null
  crop: { fractalDimension: number; fitR2: number } | null
  delta: number | null
}

interface TumorStatusCardProps {
  isRunning: boolean
  detectionData?: DetectionResult
  detectionError: string
  confidenceThreshold: number
  detectionCount: number
  strongestConfidence: string
  confidenceSummary: { high: number; medium: number; low: number } | null
  fractalEvidence: FractalEvidence
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
  fractalEvidence,
}: TumorStatusCardProps) {
  const sourceEvidence = fractalEvidence.source
  const cropEvidence = fractalEvidence.crop
  const hasFractalComparison = fractalEvidence.status === 'ready' && sourceEvidence !== null && cropEvidence !== null
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
      <div className="tumor-fractal-panel">
        <div className="tumor-fractal-header">
          <div>
            <p className="tumor-fractal-title">Fractal evidence</p>
            <p className="tumor-fractal-subtitle">A structural complexity score that turns visual roughness into a number you can compare.</p>
          </div>
          <span className="tumor-fractal-pill">Supporting biomarker</span>
        </div>

        <div className="tumor-fractal-guide" aria-label="How to read fractal dimension">
          <span className="tumor-fractal-guide-chip">Higher D usually means more irregular, more space-filling structure</span>
          <span className="tumor-fractal-guide-chip">Lower D usually means smoother, more uniform structure</span>
          <span className="tumor-fractal-guide-chip">Compare the crop against the full scan to see whether the model and the geometry agree</span>
        </div>

        {fractalEvidence.status === 'loading' ? (
          <div className="tumor-fractal-loading">
            <div className="loading-spinner tumor-status-spinner" aria-hidden="true" />
            <p>{fractalEvidence.message}</p>
          </div>
        ) : fractalEvidence.status === 'error' ? (
          <div className="tumor-status-empty">
            <div className="tumor-status-empty-icon" aria-hidden="true">
              !
            </div>
            <div className="tumor-status-empty-copy">
              <strong>Fractal analysis error</strong>
              <p>{fractalEvidence.message}</p>
            </div>
          </div>
        ) : hasFractalComparison ? (
          <div className="tumor-fractal-stack">
            <div className="tumor-fractal-metrics">
              <div className="tumor-fractal-metric">
                <span>Whole scan D</span>
                <strong>{sourceEvidence.fractalDimension.toFixed(4)}</strong>
                <small>R² {sourceEvidence.fitR2.toFixed(4)}</small>
              </div>
              <div className="tumor-fractal-metric">
                <span>Candidate crop D</span>
                <strong>{cropEvidence.fractalDimension.toFixed(4)}</strong>
                <small>R² {cropEvidence.fitR2.toFixed(4)}</small>
              </div>
              <div className="tumor-fractal-metric tumor-fractal-metric-emphasis">
                <span>Delta</span>
                <strong>{formatTumorFractalDelta(fractalEvidence.delta ?? 0)}</strong>
                <small>Crop minus whole scan</small>
              </div>
            </div>
            <div className="tumor-fractal-interpretation">
              <strong>
                {fractalEvidence.delta !== null && fractalEvidence.delta > 0
                  ? 'The detected region is more structurally irregular than the whole scan in this run.'
                  : fractalEvidence.delta !== null && fractalEvidence.delta < 0
                    ? 'The detected region is structurally simpler than the whole scan in this run.'
                    : 'The detected region and whole scan have very similar measured complexity in this run.'}
              </strong>
              <p>
                Fractal dimension is a quantitative roughness score, not a diagnosis. Here it helps answer a simple question: does the
                AI-selected region look structurally more complex than the scan as a whole?
              </p>
            </div>
          </div>
        ) : fractalEvidence.status === 'ready' ? (
          <div className="tumor-fractal-stack">
            <div className="tumor-fractal-metrics">
              <div className="tumor-fractal-metric tumor-fractal-metric-emphasis">
                <span>Whole scan D</span>
                <strong>{sourceEvidence ? sourceEvidence.fractalDimension.toFixed(4) : '—'}</strong>
                <small>R² {sourceEvidence ? sourceEvidence.fitR2.toFixed(4) : '—'}</small>
              </div>
            </div>
            <div className="tumor-fractal-interpretation">
              <strong>Fractal complexity is ready, but no candidate crop has been generated yet.</strong>
              <p>
                Once detection runs, we compare the candidate crop against the full scan to see whether the model and the complexity score
                point to the same region.
              </p>
            </div>
          </div>
        ) : null}

        <div className="tumor-fractal-sources">
          <p>Research basis</p>
          <ul>
            {tumorFractalEvidenceSources.map((source) => (
              <li key={source.url}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
                <span>{source.summary}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
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
