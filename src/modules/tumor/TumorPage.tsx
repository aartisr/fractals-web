import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FilePicker } from '../../components/FilePicker'
import { Panel } from '../../components/Panel'
import { useOverlayPreference } from '../../core/hooks/useOverlayPreference'
import { api } from '../../core/services/api'
import { TumorComparisonPanel } from './TumorComparisonPanel'
import { TumorStatusCard } from './TumorStatusCard'
import { formatConfidence, summarizeConfidence } from './tumorDisplay'
import { useTumorFractalEvidence } from './useTumorFractalEvidence'

type View = 'axial' | 'coronal' | 'sagittal'
type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'

export function TumorPage() {
  const [file, setFile] = useState<File | null>(null)
  const [view, setView] = useState<View>('axial')
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.25)
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle')
  const [modelStatusMessage, setModelStatusMessage] = useState('')
  const [showDetails, setShowDetails] = useOverlayPreference('tumor.overlay.visible')
  const previousFileRef = useRef<File | null>(null)

  useEffect(() => {
    let cancelled = false
    const timeout = window.setTimeout(() => {
      if (cancelled) {
        return
      }

      setModelStatus('loading')
      setModelStatusMessage('Loading tumor model...')

      api
        .preloadTumorModel(view)
        .then(() => {
          if (cancelled) {
            return
          }
          setModelStatus('ready')
          setModelStatusMessage('Model ready')
        })
        .catch((error) => {
          if (cancelled) {
            return
          }
          setModelStatus('error')
          setModelStatusMessage(error instanceof Error ? error.message : 'Failed to load tumor model.')
        })
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [view])

  const detectMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error('Upload an image before detection.')
      }

      return api.detectTumor(file, view, confidenceThreshold)
    },
  })

  useEffect(() => {
    if (previousFileRef.current === file) {
      return
    }

    previousFileRef.current = file
    detectMutation.reset()
  }, [file, detectMutation])

  const detectionData = detectMutation.data
  const detectionError = detectMutation.error instanceof Error ? detectMutation.error.message : ''
  const confidenceSummary = detectionData ? summarizeConfidence(detectionData.detections) : null
  const fractalEvidence = useTumorFractalEvidence(file, detectionData?.cropImageUrl)

  const strongestDetection = useMemo(() => {
    if (!detectionData?.detections.length) {
      return null
    }

    return [...detectionData.detections].sort((left, right) => right.confidence - left.confidence)[0]
  }, [detectionData])

  const detectionCount = detectionData?.detections.length ?? 0
  const strongestConfidence = strongestDetection ? formatConfidence(strongestDetection.confidence) : '—'

  return (
    <div className="tool-grid tumor-tool-grid">
      <Panel title="Tumor Detection" subtitle="Load a scan, choose the anatomical view, and review the candidate region summary.">
        <div className="tumor-control-grid">
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

            <label className="field tumor-threshold-field">
              <span>Confidence threshold</span>
              <div className="tumor-threshold-row">
                <input
                  type="range"
                  min="0.1"
                  max="0.95"
                  step="0.05"
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                />
                <strong>{Math.round(confidenceThreshold * 100)}%</strong>
              </div>
            </label>

            <button className="action" type="button" disabled={!file || detectMutation.isPending} onClick={() => detectMutation.mutate()}>
              {detectMutation.isPending ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  Running detection...
                </>
              ) : (
                'Run Detection'
              )}
            </button>

            <div className="tumor-model-badge" aria-live="polite">
              <span className={`tumor-model-dot tumor-model-dot-${modelStatus}`} aria-hidden="true" />
              <div>
                <strong>Model status</strong>
                <p>{modelStatusMessage}</p>
              </div>
            </div>

            <p className="muted">Model-backed processing runs locally in the browser. If inference fails, we surface the error instead of inventing a box.</p>
          </div>

          <TumorStatusCard
            isRunning={detectMutation.isPending}
            detectionData={detectionData}
            detectionError={detectionError}
            confidenceThreshold={confidenceThreshold}
            detectionCount={detectionCount}
            strongestConfidence={strongestConfidence}
            confidenceSummary={confidenceSummary}
            fractalEvidence={fractalEvidence}
          />
        </div>
      </Panel>

      <Panel title="Before / After Compare" subtitle="The left panel shows the uploaded scan; the right panel shows the model-annotated detection result.">
        <TumorComparisonPanel
          key={file ? `${file.name}-${file.size}-${file.lastModified}` : 'no-file'}
          file={file}
          detectionData={detectionData}
          showDetails={showDetails}
          onToggleDetails={() => setShowDetails((value) => !value)}
        />
      </Panel>
    </div>
  )
}
