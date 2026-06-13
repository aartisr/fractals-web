import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FilePicker } from '../../components/FilePicker'
import { Panel } from '../../components/Panel'
import { useOverlayPreference } from '../../core/hooks/useOverlayPreference'
import { api } from '../../core/services/api'

function classifyDelta(delta: number) {
  const absDelta = Math.abs(delta)
  if (absDelta < 0.05) {
    return 'Near-equivalent complexity'
  }
  if (absDelta < 0.15) {
    return 'Moderate structural difference'
  }
  return 'Strong structural separation'
}

export function ComparePage() {
  const [fileA, setFileA] = useState<File | null>(null)
  const [fileB, setFileB] = useState<File | null>(null)
  const [showOverlays, setShowOverlays] = useOverlayPreference('compare.overlay.visible')

  const compareMutation = useMutation({
    mutationFn: async () => {
      if (!fileA || !fileB) {
        throw new Error('Upload two images before comparing.')
      }
      return api.analyzeCompare(fileA, fileB)
    },
  })

  const imageAUrl = fileA ? URL.createObjectURL(fileA) : ''
  const imageBUrl = fileB ? URL.createObjectURL(fileB) : ''

  return (
    <div className="tool-grid">
      <Panel title="Image Compare" subtitle="Side-by-side complexity comparison across two images.">
        <div className="form-grid">
          <FilePicker label="Image A" onChange={setFileA} />
          <FilePicker label="Image B" onChange={setFileB} />
          <div className="edu-note">
            <p className="edu-note-title">Comparison Logic</p>
            <p>Keep acquisition conditions consistent so complexity deltas reflect structure, not capture artifacts.</p>
            <p>Use the same pre-processing path for both images when teaching comparative analysis.</p>
          </div>
          <button
            className="action"
            type="button"
            disabled={compareMutation.isPending || !fileA || !fileB}
            onClick={() => compareMutation.mutate()}
          >
            {compareMutation.isPending ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                Comparing...
              </>
            ) : (
              'Compare Images'
            )}
          </button>
          {!fileA || !fileB ? <p className="muted">Both uploads are required.</p> : null}
        </div>
      </Panel>

      <Panel title="Comparison Workspace" subtitle="Linked previews and interpretation output.">
        <div className="overlay-controls">
          <button type="button" className="overlay-toggle" onClick={() => setShowOverlays((value) => !value)}>
            {showOverlays ? 'Hide overlays' : 'Show overlays'}
          </button>
          <div className="overlay-legend" aria-label="Compare overlay legend">
            <span className="overlay-legend-item" tabIndex={0} title="Image labels keep the reference and comparison channels explicit during discussion.">
              Channel label
            </span>
            <span className="overlay-legend-item" tabIndex={0} title="Bottom labels indicate the role of each image in complexity comparison.">
              Channel role
            </span>
          </div>
        </div>

        <div className="compare-grid">
          <div className="compare-slot">
            {imageAUrl ? (
              <div className="image-stage stage-grid">
                <img src={imageAUrl} alt="Image A preview" className="result-image" />
                {showOverlays ? (
                  <>
                    <span className="stage-badge stage-focusable" tabIndex={0} aria-label="Image A channel label">
                      Image A
                    </span>
                    <span className="stage-scale stage-focusable" tabIndex={0} aria-label="Image A role in comparison">
                      Reference channel
                    </span>
                  </>
                ) : null}
              </div>
            ) : (
              <p className="muted">Image A</p>
            )}
          </div>
          <div className="compare-slot">
            {imageBUrl ? (
              <div className="image-stage stage-grid">
                <img src={imageBUrl} alt="Image B preview" className="result-image" />
                {showOverlays ? (
                  <>
                    <span className="stage-badge stage-focusable" tabIndex={0} aria-label="Image B channel label">
                      Image B
                    </span>
                    <span className="stage-scale stage-focusable" tabIndex={0} aria-label="Image B role in comparison">
                      Comparison channel
                    </span>
                  </>
                ) : null}
              </div>
            ) : (
              <p className="muted">Image B</p>
            )}
          </div>
        </div>
        {compareMutation.data ? (
          <>
            <div className="edu-chip-row" aria-label="Comparison interpretation">
              <span className="edu-chip">Dimension A: {compareMutation.data.imageA.fractalDimension}</span>
              <span className="edu-chip">Dimension B: {compareMutation.data.imageB.fractalDimension}</span>
              <span className="edu-chip">Delta Class: {classifyDelta(compareMutation.data.delta)}</span>
            </div>
            <pre>{JSON.stringify(compareMutation.data, null, 2)}</pre>
          </>
        ) : null}
      </Panel>
    </div>
  )
}
