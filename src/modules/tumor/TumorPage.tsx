import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FilePicker } from '../../components/FilePicker'
import { Panel } from '../../components/Panel'
import { useOverlayPreference } from '../../core/hooks/useOverlayPreference'
import { api } from '../../core/services/api'

type View = 'axial' | 'coronal' | 'sagittal'

function confidenceTier(confidence: number) {
  if (confidence >= 0.8) {
    return 'high'
  }
  if (confidence >= 0.5) {
    return 'medium'
  }
  return 'low'
}

function confidenceRectClass(confidence: number) {
  const tier = confidenceTier(confidence)
  return `bbox-rect bbox-rect-${tier}`
}

function confidenceLabelClass(confidence: number) {
  const tier = confidenceTier(confidence)
  return `bbox-label bbox-label-${tier}`
}

function summarizeConfidence(detections: Array<{ confidence: number }>) {
  return detections.reduce(
    (acc, detection) => {
      const tier = confidenceTier(detection.confidence)
      if (tier === 'high') {
        acc.high += 1
      } else if (tier === 'medium') {
        acc.medium += 1
      } else {
        acc.low += 1
      }
      return acc
    },
    { high: 0, medium: 0, low: 0 },
  )
}

export function TumorPage() {
  const [file, setFile] = useState<File | null>(null)
  const [view, setView] = useState<View>('axial')
  const [showOverlays, setShowOverlays] = useOverlayPreference('tumor.overlay.visible')
  const [imageLoaded, setImageLoaded] = useState(false)

  const detectMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error('Upload an image before detection.')
      }
      return api.detectTumor(file, view)
    },
  })

  const detectionData = detectMutation.data
  const confidenceSummary = detectionData ? summarizeConfidence(detectionData.detections) : null
  const isDisplayLoading = detectMutation.isPending || (!!detectionData && !imageLoaded)

  return (
    <div className="tool-grid">
      <Panel title="Tumor Detection" subtitle="Model view selection with confidence-box overlays.">
        <div className="form-grid">
          <FilePicker label="MRI/Scan Image" onChange={setFile} />
          <label className="field">
            <span>View</span>
            <select value={view} onChange={(e) => setView(e.target.value as View)}>
              <option value="axial">axial</option>
              <option value="coronal">coronal</option>
              <option value="sagittal">sagittal</option>
            </select>
          </label>

          <div className="edu-note">
            <p className="edu-note-title">Clinical Safety Note</p>
            <p>This view is educational support, not medical diagnosis or treatment guidance.</p>
            <p>Interpret confidence with caution and validate against expert review protocols.</p>
          </div>

          <button
            className="action"
            type="button"
            disabled={!file || isDisplayLoading}
            onClick={() => {
              setImageLoaded(false)
              detectMutation.mutate()
            }}
          >
            {isDisplayLoading ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                Rendering...
              </>
            ) : (
              'Run Detection'
            )}
          </button>
          <p className="muted">Local-first processing pattern for privacy-sensitive imaging workflows.</p>
        </div>
      </Panel>

      <Panel title="Detection Overlay" subtitle="Bounding boxes and confidence outputs by view.">
        {detectionData ? (
          <div className="result-stack">
            <div className="overlay-controls">
              <button type="button" className="overlay-toggle" onClick={() => setShowOverlays((value) => !value)}>
                {showOverlays ? 'Hide overlays' : 'Show overlays'}
              </button>
              <div className="overlay-legend" aria-label="Tumor overlay legend">
                <span className="overlay-legend-item" tabIndex={0} title="View badge identifies the selected anatomical orientation for this prediction.">
                  View badge
                </span>
                <span className="overlay-legend-item" tabIndex={0} title="Confidence colors separate detections into high, medium, and low certainty tiers.">
                  Confidence color
                </span>
                <span className="overlay-legend-item" tabIndex={0} title="Scale legend explains the color mapping to support quick interpretation.">
                  Color legend
                </span>
              </div>
            </div>

            <div className="overlay-stage image-stage stage-grid">
              <img
                key={detectionData.runId}
                src={detectionData.imageUrl}
                alt="Detection source"
                className="result-image"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
              {showOverlays ? (
                <>
                  <span className="stage-badge stage-focusable" tabIndex={0} aria-label="Selected medical view">
                    View: {detectionData.view}
                  </span>
                  <span className="stage-badge stage-badge-right stage-focusable" tabIndex={0} aria-label="Overlay confidence mode">
                    Confidence coded boxes
                  </span>
                  <span className="stage-scale stage-focusable" tabIndex={0} aria-label="Confidence color mapping">
                    High: teal | Medium: amber | Low: crimson
                  </span>
                  <svg className="overlay-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Tumor detection boxes">
                    {detectionData.detections.map((detection, index) => {
                      const width = Math.max(6, detection.box.x2 - detection.box.x1)
                      const height = Math.max(6, detection.box.y2 - detection.box.y1)
                      return (
                        <g key={`${detection.label}-${index}`}>
                          <rect x={detection.box.x1} y={detection.box.y1} width={width} height={height} className={confidenceRectClass(detection.confidence)} />
                          <text x={detection.box.x1} y={Math.max(4, detection.box.y1 - 2)} className={confidenceLabelClass(detection.confidence)}>
                            {detection.label} ({detection.confidence})
                          </text>
                        </g>
                      )
                    })}
                  </svg>
                </>
              ) : null}
            </div>
            <div className="edu-chip-row" aria-label="Detection confidence guide">
              <span className="edu-chip">Detections: {detectionData.detections.length}</span>
              <span className="edu-chip">High: {confidenceSummary?.high ?? 0}</span>
              <span className="edu-chip">Medium: {confidenceSummary?.medium ?? 0}</span>
              <span className="edu-chip">Low: {confidenceSummary?.low ?? 0}</span>
              <span className="edu-chip">High confidence: {'>'}= 0.80</span>
              <span className="edu-chip">Review threshold: 0.50 - 0.79</span>
            </div>
            <pre>{JSON.stringify(detectionData.detections, null, 2)}</pre>
          </div>
        ) : (
          <p className="muted">Upload an image and run detection to view overlays.</p>
        )}
      </Panel>
    </div>
  )
}
