import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { FilePicker } from '../../components/FilePicker'
import { Panel } from '../../components/Panel'
import { useOverlayPreference } from '../../core/hooks/useOverlayPreference'
import { api } from '../../core/services/api'

export function BoxCountPage() {
  const [file, setFile] = useState<File | null>(null)
  const [showOverlays, setShowOverlays] = useOverlayPreference('box-count.overlay.visible')
  const [imageLoaded, setImageLoaded] = useState(false)

  const analyzeMutation = useMutation({
    mutationFn: async (values: { x: number; y: number; size: number }) => {
      if (!file) {
        throw new Error('Upload an image before running analysis.')
      }
      return api.analyzeBoxCount(file, values)
    },
  })

  const form = useForm({
    defaultValues: { x: 120, y: 120, size: 128 },
    onSubmit: async ({ value }) => {
      setImageLoaded(false)
      await analyzeMutation.mutateAsync(value)
    },
  })

  const result = analyzeMutation.data
  const isDisplayLoading = analyzeMutation.isPending || (!!result && !imageLoaded)

  return (
    <div className="tool-grid">
      <Panel title="Box Counter" subtitle="ROI-driven fractal dimension with box-count diagnostics.">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            form.handleSubmit()
          }}
        >
          <FilePicker label="Source Image" onChange={setFile} />

          <div className="edu-note">
            <p className="edu-note-title">Protocol Reminder</p>
            <p>Place ROI on structurally rich regions and avoid large blank areas to reduce unstable estimates.</p>
            <p>Run multiple ROI sizes and compare slope consistency before drawing conclusions.</p>
          </div>

          <form.Field
            name="x"
            children={(field) => (
              <label className="field">
                <span>ROI X</span>
                <input type="number" min={0} value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
              </label>
            )}
          />

          <form.Field
            name="y"
            children={(field) => (
              <label className="field">
                <span>ROI Y</span>
                <input type="number" min={0} value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
              </label>
            )}
          />

          <form.Field
            name="size"
            children={(field) => (
              <label className="field">
                <span>ROI Size</span>
                <input type="number" min={32} max={1024} value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
              </label>
            )}
          />

          <button className="action" type="submit" disabled={isDisplayLoading || !file}>
            {isDisplayLoading ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                Rendering...
              </>
            ) : (
              'Analyze ROI'
            )}
          </button>
          {!file ? <p className="muted">Upload an image to enable analysis.</p> : null}
        </form>
      </Panel>

      <Panel title="Box Count Metrics" subtitle="Dimension, timing, and count trend by box size.">
        {result ? (
          <div className="result-stack">
            <div className="overlay-controls">
              <button type="button" className="overlay-toggle" onClick={() => setShowOverlays((value) => !value)}>
                {showOverlays ? 'Hide overlays' : 'Show overlays'}
              </button>
              <div className="overlay-legend" aria-label="Box count overlay legend">
                <span className="overlay-legend-item" tabIndex={0} title="ROI badge confirms that the preview corresponds to the selected analysis region.">
                  ROI badge
                </span>
                <span className="overlay-legend-item" tabIndex={0} title="Coordinate tag shows where the analysis window begins in the source image.">
                  ROI coordinates
                </span>
                <span className="overlay-legend-item" tabIndex={0} title="Scale label shows ROI size in pixels for repeatable experiments.">
                  ROI scale
                </span>
              </div>
            </div>

            <div className="image-stage stage-grid">
              <img
                key={result.runId}
                src={result.previewUrl}
                alt="Analyzed ROI source"
                className="result-image"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
              {showOverlays ? (
                <>
                  <span className="stage-badge stage-focusable" tabIndex={0} aria-label="ROI preview label">
                    ROI Preview
                  </span>
                  <span className="stage-badge stage-badge-right stage-focusable" tabIndex={0} aria-label="ROI coordinate origin">
                    x:{result.roi.x} y:{result.roi.y}
                  </span>
                  <span className="stage-scale stage-focusable" tabIndex={0} aria-label="ROI pixel size">
                    ROI size: {result.roi.size}px
                  </span>
                </>
              ) : null}
            </div>
            <div className="metrics">
              <span>Fractal Dimension: {result.fractalDimension}</span>
              <span>Elapsed Seconds: {result.elapsedSeconds}</span>
            </div>
            <div className="edu-note">
              <p className="edu-note-title">Interpretation Guide</p>
              <p>Higher dimension usually indicates denser boundary complexity within the selected ROI.</p>
              <p>Quality check: count values should decrease smoothly as box size increases.</p>
            </div>
            <pre>{JSON.stringify(result.boxCounts, null, 2)}</pre>
          </div>
        ) : (
          <p className="muted">Run ROI analysis to inspect box-count output.</p>
        )}
      </Panel>
    </div>
  )
}
