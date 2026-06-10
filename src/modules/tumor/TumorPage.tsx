import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FilePicker } from '../../components/FilePicker'
import { Panel } from '../../components/Panel'
import { api } from '../../core/services/api'

type View = 'axial' | 'coronal' | 'sagittal'

export function TumorPage() {
  const [file, setFile] = useState<File | null>(null)
  const [view, setView] = useState<View>('axial')

  const detectMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error('Upload an image before detection.')
      }
      return api.detectTumor(file, view)
    },
  })

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

          <button className="action" type="button" disabled={!file || detectMutation.isPending} onClick={() => detectMutation.mutate()}>
            {detectMutation.isPending ? 'Detecting...' : 'Run Detection'}
          </button>
          <p className="muted">Local-first processing pattern for privacy-sensitive imaging workflows.</p>
        </div>
      </Panel>

      <Panel title="Detection Overlay" subtitle="Bounding boxes and confidence outputs by view.">
        {detectMutation.data ? (
          <div className="result-stack">
            <div className="overlay-stage">
              <img src={detectMutation.data.imageUrl} alt="Detection source" className="result-image" />
              <svg className="overlay-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Tumor detection boxes">
                {detectMutation.data.detections.map((detection, index) => {
                  const width = Math.max(6, detection.box.x2 - detection.box.x1)
                  const height = Math.max(6, detection.box.y2 - detection.box.y1)
                  return (
                    <g key={`${detection.label}-${index}`}>
                      <rect x={detection.box.x1} y={detection.box.y1} width={width} height={height} className="bbox-rect" />
                      <text x={detection.box.x1} y={Math.max(4, detection.box.y1 - 2)} className="bbox-label">
                        {detection.label} ({detection.confidence})
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
            <pre>{JSON.stringify(detectMutation.data.detections, null, 2)}</pre>
          </div>
        ) : (
          <p className="muted">Upload an image and run detection to view overlays.</p>
        )}
      </Panel>
    </div>
  )
}
