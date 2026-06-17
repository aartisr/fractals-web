import { useEffect, useRef, useState } from 'react'
import type { BoxCountResult } from '../../core/services/contracts'
import type { BoxCountInsight } from './analysisInsights'
import type { BoxCountRoiDraft } from './types'
import { clientPointToImagePoint, imageRoiToRenderedRect } from './roiPointer'
import type { BoxCountRoiInput } from './types'

interface BoxCountSample {
  id: string
  createdAt: string
  roi: BoxCountRoiInput
  fractalDimension: number
  elapsedSeconds: number
  fitR2: number
  complexityLabel: string
}

interface LabChecklist {
  uploadedImage: boolean
  placedRoi: boolean
  ranAnalysis: boolean
  collectedSamples: boolean
  stableFitObserved: boolean
}

interface BoxCountResultPanelProps {
  roi: BoxCountRoiInput
  hasPlacedRoi: boolean
  result: BoxCountResult | undefined
  insight: BoxCountInsight | null
  error: string
  samples: BoxCountSample[]
  onAddCurrentSample: () => void
  onClearSamples: () => void
  onApplySampleRoi: (sample: BoxCountSample) => void
  exportSamplesCsv: () => string
  labChecklist: LabChecklist
  displayImageUrl: string
  sourcePreviewUrl: string
  roiDraft: BoxCountRoiDraft | null
  showOverlays: boolean
  onToggleOverlays: () => void
  onImageLoad: () => void
  onSelectRoiAnchor: (x: number, y: number, imageWidth: number, imageHeight: number) => void
  onUpdateRoiDraftFromDrag: (
    startX: number,
    startY: number,
    currentX: number,
    currentY: number,
    imageWidth: number,
    imageHeight: number,
  ) => void
  onCommitRoiDraft: (draft: BoxCountRoiDraft, imageWidth: number, imageHeight: number) => void
  onClearRoiDraft: () => void
}

function BoxCountImageStage({
  roi,
  hasPlacedRoi,
  result,
  displayImageUrl,
  sourcePreviewUrl,
  roiDraft,
  showOverlays,
  onImageLoad,
  onSelectRoiAnchor,
  onUpdateRoiDraftFromDrag,
  onCommitRoiDraft,
  onClearRoiDraft,
}: {
  roi: BoxCountRoiInput
  hasPlacedRoi: boolean
  result: BoxCountResult | undefined
  displayImageUrl: string
  sourcePreviewUrl: string
  roiDraft: BoxCountRoiDraft | null
  showOverlays: boolean
  onImageLoad: () => void
  onSelectRoiAnchor: (x: number, y: number, imageWidth: number, imageHeight: number) => void
  onUpdateRoiDraftFromDrag: (
    startX: number,
    startY: number,
    currentX: number,
    currentY: number,
    imageWidth: number,
    imageHeight: number,
  ) => void
  onCommitRoiDraft: (draft: BoxCountRoiDraft, imageWidth: number, imageHeight: number) => void
  onClearRoiDraft: () => void
}) {
  const imageRef = useRef<HTMLImageElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [dragAnchor, setDragAnchor] = useState<{ x: number; y: number; clientX: number; clientY: number; imageWidth: number; imageHeight: number } | null>(null)
  const canShowOverlay = hasPlacedRoi || !!result

  useEffect(() => {
    const image = imageRef.current
    const stage = stageRef.current
    if (!stage || !image || !canShowOverlay) {
      stage?.style.removeProperty('--roi-draft-left')
      stage?.style.removeProperty('--roi-draft-top')
      stage?.style.removeProperty('--roi-draft-size')
      return
    }

    const activeRoi = roiDraft ?? roi
    const rect = imageRoiToRenderedRect(image, activeRoi)
    if (!rect) {
      stage.style.removeProperty('--roi-draft-left')
      stage.style.removeProperty('--roi-draft-top')
      stage.style.removeProperty('--roi-draft-size')
      return
    }

    stage.style.setProperty('--roi-draft-left', `${rect.leftPx}px`)
    stage.style.setProperty('--roi-draft-top', `${rect.topPx}px`)
    stage.style.setProperty('--roi-draft-size', `${rect.sizePx}px`)
  }, [canShowOverlay, roiDraft, roi, displayImageUrl])

  const isResultImage = !!result
  const isSourcePreview = !isResultImage && displayImageUrl === sourcePreviewUrl

  if (!displayImageUrl) {
    return <p className="muted">Select an image to preview it here, then run ROI analysis to inspect box-count output.</p>
  }

  return (
    <div ref={stageRef} className="image-stage stage-grid">
      <img
        ref={imageRef}
        key={result?.runId ?? displayImageUrl}
        src={displayImageUrl}
        alt={isResultImage ? 'Analyzed ROI source' : 'Selected source image preview'}
        className="result-image"
        onLoad={onImageLoad}
        onError={onImageLoad}
        onClick={(event) => {
          if (dragAnchor) {
            return
          }
          const point = clientPointToImagePoint(event.currentTarget, event.clientX, event.clientY)
          if (!point) {
            return
          }
          onSelectRoiAnchor(point.x, point.y, point.imageWidth, point.imageHeight)
        }}
        onPointerDown={(event) => {
          if (!event.isPrimary) {
            return
          }
          const point = clientPointToImagePoint(event.currentTarget, event.clientX, event.clientY)
          if (!point) {
            return
          }
          event.currentTarget.setPointerCapture(event.pointerId)
          setDragAnchor({
            x: point.x,
            y: point.y,
            clientX: event.clientX,
            clientY: event.clientY,
            imageWidth: point.imageWidth,
            imageHeight: point.imageHeight,
          })
        }}
        onPointerMove={(event) => {
          if (!dragAnchor) {
            return
          }
          const point = clientPointToImagePoint(event.currentTarget, event.clientX, event.clientY)
          if (!point) {
            return
          }
          onUpdateRoiDraftFromDrag(
            dragAnchor.x,
            dragAnchor.y,
            point.x,
            point.y,
            dragAnchor.imageWidth,
            dragAnchor.imageHeight,
          )
        }}
        onPointerUp={(event) => {
          if (!dragAnchor) {
            return
          }

          const movedDistance = Math.hypot(event.clientX - dragAnchor.clientX, event.clientY - dragAnchor.clientY)
          const imageWidth = dragAnchor.imageWidth
          const imageHeight = dragAnchor.imageHeight

          if (movedDistance > 3 && roiDraft) {
            onCommitRoiDraft(roiDraft, imageWidth, imageHeight)
          } else {
            onSelectRoiAnchor(dragAnchor.x, dragAnchor.y, imageWidth, imageHeight)
            onClearRoiDraft()
          }
          setDragAnchor(null)
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
        }}
        onPointerCancel={(event) => {
          setDragAnchor(null)
          onClearRoiDraft()
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }
        }}
      />
      {canShowOverlay && (!result || !!roiDraft) ? (
        <span
          className={roiDraft ? 'roi-draft-rect' : 'roi-committed-rect'}
          aria-label={roiDraft ? 'Current drag ROI preview' : 'Current ROI preview'}
        />
      ) : null}
      {isSourcePreview ? (
        <span className="stage-badge stage-focusable" tabIndex={0} aria-label="Source preview label">
          Source Preview
        </span>
      ) : null}
      {isResultImage && showOverlays ? (
        <>
          <span className="stage-badge stage-focusable" tabIndex={0} aria-label="ROI preview label">
            {roiDraft ? 'ROI Draft' : 'ROI Preview'}
          </span>
          <span className="stage-badge stage-badge-right stage-focusable" tabIndex={0} aria-label="ROI coordinate origin">
            x:{(roiDraft ?? roi).x} y:{(roiDraft ?? roi).y}
          </span>
          <span className="stage-scale stage-focusable" tabIndex={0} aria-label="ROI pixel size">
            ROI size: {(roiDraft ?? roi).size}px
          </span>
        </>
      ) : null}
    </div>
  )
}

function InsightChart({ insight }: { insight: BoxCountInsight }) {
  const minX = Math.min(...insight.points.map((point) => point.x))
  const maxX = Math.max(...insight.points.map((point) => point.x))
  const minY = Math.min(...insight.points.map((point) => point.y))
  const maxY = Math.max(...insight.points.map((point) => point.y))

  const pad = 18
  const width = 360
  const height = 170
  const xRange = Math.max(1e-6, maxX - minX)
  const yRange = Math.max(1e-6, maxY - minY)

  const mapX = (value: number) => pad + ((value - minX) / xRange) * (width - pad * 2)
  const mapY = (value: number) => height - pad - ((value - minY) / yRange) * (height - pad * 2)

  const path = insight.points.map((point, index) => `${index === 0 ? 'M' : 'L'}${mapX(point.x)} ${mapY(point.y)}`).join(' ')

  return (
    <div className="log-chart-wrap" aria-label="Log-log box counting chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="log-log slope chart">
        <line className="log-axis" x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} />
        <line className="log-axis" x1={pad} y1={height - pad} x2={pad} y2={pad} />
        <path className="log-line" d={path} />
        {insight.points.map((point) => (
          <circle key={`${point.x}-${point.y}`} className="log-dot" cx={mapX(point.x)} cy={mapY(point.y)} r={3.2} />
        ))}
      </svg>
      <p className="muted">Log-log trend: x = log(1/box size), y = log(box count). Slope approximates fractal dimension.</p>
    </div>
  )
}

function ExportCsvButton({ csv }: { csv: string }) {
  if (!csv) {
    return null
  }

  return (
    <a
      className="overlay-toggle"
      download="box-count-samples.csv"
      href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
    >
      Export CSV
    </a>
  )
}

export function BoxCountResultPanel({
  roi,
  hasPlacedRoi,
  result,
  insight,
  error,
  samples,
  onAddCurrentSample,
  onClearSamples,
  onApplySampleRoi,
  exportSamplesCsv,
  labChecklist,
  displayImageUrl,
  sourcePreviewUrl,
  roiDraft,
  showOverlays,
  onToggleOverlays,
  onImageLoad,
  onSelectRoiAnchor,
  onUpdateRoiDraftFromDrag,
  onCommitRoiDraft,
  onClearRoiDraft,
}: BoxCountResultPanelProps) {
  const activeRoi = roiDraft ?? roi
  const csv = exportSamplesCsv()
  const checklistItems: Array<{ key: keyof LabChecklist; label: string }> = [
    { key: 'uploadedImage', label: 'Upload an image' },
    { key: 'placedRoi', label: 'Place ROI (click/drag)' },
    { key: 'ranAnalysis', label: 'Run at least one analysis' },
    { key: 'collectedSamples', label: 'Collect three ROI samples' },
    { key: 'stableFitObserved', label: 'Find one stable fit (R² >= 0.9)' },
  ]

  return (
    <div className="result-stack">
      <div className="overlay-controls">
        <button type="button" className="overlay-toggle" onClick={onToggleOverlays}>
          {showOverlays ? 'Hide overlays' : 'Show overlays'}
        </button>
        {result ? (
          <div className="overlay-legend" aria-label="Box count overlay legend">
            <span
              className="overlay-legend-item"
              tabIndex={0}
              title="ROI badge confirms that the preview corresponds to the selected analysis region."
            >
              ROI badge
            </span>
            <span
              className="overlay-legend-item"
              tabIndex={0}
              title="Coordinate tag shows where the analysis window begins in the source image."
            >
              ROI coordinates
            </span>
            <span
              className="overlay-legend-item"
              tabIndex={0}
              title="Scale label shows ROI size in pixels for repeatable experiments."
            >
              ROI scale
            </span>
          </div>
        ) : null}
      </div>

      <BoxCountImageStage
        roi={roi}
        hasPlacedRoi={hasPlacedRoi}
        result={result}
        displayImageUrl={displayImageUrl}
        sourcePreviewUrl={sourcePreviewUrl}
        roiDraft={roiDraft}
        showOverlays={showOverlays}
        onImageLoad={onImageLoad}
        onSelectRoiAnchor={onSelectRoiAnchor}
        onUpdateRoiDraftFromDrag={onUpdateRoiDraftFromDrag}
        onCommitRoiDraft={onCommitRoiDraft}
        onClearRoiDraft={onClearRoiDraft}
      />

      <p className="muted">
        {hasPlacedRoi || result
          ? `Tip: click to reposition ROI, drag in any direction to draw a square ROI, then release. Current ROI: x:${activeRoi.x} y:${activeRoi.y} size:${activeRoi.size}px.`
          : 'Tip: no ROI box is shown until you click or drag on the image.'}
      </p>

      {error ? <p className="alert-inline">{error}</p> : null}

      <div className="metrics">
        <span>Fractal Dimension: {result ? result.fractalDimension : '—'}</span>
        <span>Elapsed Seconds: {result ? result.elapsedSeconds : '—'}</span>
        <span>Count Trend Points: {result ? result.boxCounts.length : 0}</span>
      </div>

      {insight ? (
        <div className="insight-grid">
          <div className={`insight-card insight-${insight.complexityBand}`}>
            <p className="insight-label">Complexity Class</p>
            <p className="insight-value">{insight.complexityLabel}</p>
          </div>
          <div className="insight-card">
            <p className="insight-label">Scaling Stability (R²)</p>
            <p className="insight-value">{insight.fitR2} • {insight.stabilityLabel}</p>
          </div>
          <div className="insight-card">
            <p className="insight-label">Estimated Slope</p>
            <p className="insight-value">{insight.slope}</p>
          </div>
        </div>
      ) : (
        <p className="muted">Dimension, timing, and trend appear here after first analysis.</p>
      )}

      {insight ? <InsightChart insight={insight} /> : null}

      <div className="edu-note">
        <p className="edu-note-title">Reading Your Results</p>
        <p><strong>Fractal Dimension:</strong> Ranges from 1 (smooth line) to 3 (space-filling). Medical imaging typically shows 2.0–2.8 for tissue boundaries.</p>
        <p><strong>Scaling Stability (R²):</strong> Closer to 1.0 = more reliable fit. Below 0.85 = dimension estimate may be misleading; try a different ROI location.</p>
        <p><strong>Key Insight:</strong> High dimension + low R² suggests mixed patterns in your ROI. Try a more uniform texture region for clarity.</p>
        {insight ? <p><strong>This Result:</strong> {insight.teachingHint}</p> : null}
      </div>

      <div className="edu-note">
        <p className="edu-note-title">Guided Lab Mode</p>
        <div className="checklist-grid">
          {checklistItems.map((item) => (
            <p key={item.key} className={labChecklist[item.key] ? 'check-pass' : 'check-pending'}>
              {labChecklist[item.key] ? '✓' : '○'} {item.label}
            </p>
          ))}
        </div>
      </div>

      <div className="edu-note">
        <p className="edu-note-title">Compare Regions & Build Research Datasets</p>
        <p>Save multiple ROI analyses to spot patterns. Areas with consistent high dimension + high R² indicate true structural complexity. Inconsistent results suggest regional heterogeneity.</p>
        <div className="overlay-controls">
          <button type="button" className="overlay-toggle" onClick={onAddCurrentSample} disabled={!result}>
            Save Current ROI Sample
          </button>
          <button type="button" className="overlay-toggle" onClick={onClearSamples} disabled={!samples.length}>
            Clear Samples
          </button>
          <ExportCsvButton csv={csv} />
        </div>
        {samples.length ? (
          <div className="table-wrap">
            <table className="runs-table">
              <thead>
                <tr>
                  <th>ROI Position</th>
                  <th>Dimension</th>
                  <th>Stability (R²)</th>
                  <th>Class</th>
                  <th>Time</th>
                  <th>Reuse</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((sample) => (
                  <tr key={sample.id}>
                    <td>{`(${sample.roi.x},${sample.roi.y}) ${sample.roi.size}px`}</td>
                    <td>{sample.fractalDimension.toFixed(2)}</td>
                    <td>{sample.fitR2.toFixed(3)}</td>
                    <td>{sample.complexityLabel}</td>
                    <td>{sample.elapsedSeconds.toFixed(1)}s</td>
                    <td>
                      <button type="button" className="overlay-toggle" onClick={() => onApplySampleRoi(sample)}>
                        Reuse
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No samples yet. After running an analysis, click "Save Current ROI Sample" to build a dataset for comparative texture analysis.</p>
        )}
      </div>

      <pre>{JSON.stringify(result?.boxCounts ?? [], null, 2)}</pre>
    </div>
  )
}
