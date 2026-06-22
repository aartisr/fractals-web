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

type LogPoint = { x: number; y: number }

type StableWindow = {
  start: number
  end: number
  slope: number
  intercept: number
  r2: number
}

function fitLine(points: LogPoint[]) {
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length
  const numerator = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0)
  const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0)
  const slope = denominator === 0 ? 0 : numerator / denominator
  const intercept = meanY - slope * meanX
  const fitted = points.map((point) => intercept + slope * point.x)
  const ssRes = points.reduce((sum, point, index) => sum + (point.y - fitted[index]) ** 2, 0)
  const ssTot = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0)
  const r2 = ssTot === 0 ? 0 : Math.max(0, Math.min(1, 1 - ssRes / ssTot))

  return {
    slope: Number(slope.toFixed(4)),
    intercept,
    r2: Number(r2.toFixed(4)),
  }
}

function findStableWindow(points: LogPoint[]): StableWindow | null {
  if (points.length < 3) {
    return null
  }

  let best: StableWindow | null = null

  for (let start = 0; start < points.length - 2; start += 1) {
    for (let end = start + 2; end < points.length; end += 1) {
      const windowPoints = points.slice(start, end + 1)
      const fit = fitLine(windowPoints)
      const candidate: StableWindow = {
        start,
        end,
        slope: fit.slope,
        intercept: fit.intercept,
        r2: fit.r2,
      }

      if (!best) {
        best = candidate
        continue
      }

      const bestLength = best.end - best.start + 1
      const candidateLength = candidate.end - candidate.start + 1
      const bestSpan = points[best.end].x - points[best.start].x
      const candidateSpan = points[candidate.end].x - points[candidate.start].x

      if (
        candidate.r2 > best.r2 ||
        (candidate.r2 === best.r2 && candidateLength > bestLength) ||
        (candidate.r2 === best.r2 && candidateLength === bestLength && candidateSpan > bestSpan)
      ) {
        best = candidate
      }
    }
  }

  return best
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
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const [isCompactChart, setIsCompactChart] = useState(false)
  const [chartWidth, setChartWidth] = useState(400)
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const minX = Math.min(...insight.points.map((point) => point.x))
  const maxX = Math.max(...insight.points.map((point) => point.x))
  const minY = Math.min(...insight.points.map((point) => point.y))
  const maxY = Math.max(...insight.points.map((point) => point.y))

  useEffect(() => {
    const query = window.matchMedia('(max-width: 680px)')
    const update = () => setIsCompactChart(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const element = surfaceRef.current
    if (!element) {
      return
    }

    const updateSize = () => {
      const measuredWidth = Math.floor(element.getBoundingClientRect().width)
      setChartWidth(Math.max(280, measuredWidth || 400))
    }

    updateSize()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize)
      return () => window.removeEventListener('resize', updateSize)
    }

    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const width = chartWidth
  const height = Math.max(198, Math.round(width * (isCompactChart ? 0.62 : 0.56)))
  const pad = isCompactChart
    ? {
        top: Math.round(height * 0.05),
        right: Math.round(width * 0.045),
        bottom: Math.round(height * 0.21),
        left: Math.round(width * 0.12),
      }
    : {
        top: Math.round(height * 0.05),
        right: Math.round(width * 0.045),
        bottom: Math.round(height * 0.16),
        left: Math.round(width * 0.11),
      }
  const plotWidth = width - pad.left - pad.right
  const plotHeight = height - pad.top - pad.bottom
  const xRange = Math.max(1e-6, maxX - minX)
  const yRange = Math.max(1e-6, maxY - minY)
  const tickCount = isCompactChart ? 3 : 5
  const xTicks = Array.from({ length: tickCount }, (_, index) => minX + ((maxX - minX) * index) / Math.max(1, tickCount - 1))
  const yTicks = Array.from({ length: tickCount }, (_, index) => minY + ((maxY - minY) * index) / Math.max(1, tickCount - 1))

  const mapX = (value: number) => pad.left + ((value - minX) / xRange) * plotWidth
  const mapY = (value: number) => height - pad.bottom - ((value - minY) / yRange) * plotHeight

  const path = insight.points.map((point, index) => `${index === 0 ? 'M' : 'L'}${mapX(point.x)} ${mapY(point.y)}`).join(' ')
  const stableWindow = findStableWindow(insight.points)
  const fitIntercept =
    insight.points.reduce((sum, point) => sum + point.y, 0) / insight.points.length -
    insight.slope * (insight.points.reduce((sum, point) => sum + point.x, 0) / insight.points.length)
  const fitPath = `M${mapX(minX)} ${mapY(insight.slope * minX + fitIntercept)} L${mapX(maxX)} ${mapY(insight.slope * maxX + fitIntercept)}`
  const chartTitleId = 'boxcount-log-chart-title'
  const chartDescId = 'boxcount-log-chart-desc'
  const yLabelY = pad.top + plotHeight / 2
  const bannerText = isCompactChart
    ? 'Right = smaller boxes, up = more occupied boxes, dashed = estimate.'
    : 'Right = smaller boxes, up = more occupied boxes, dashed line = fitted estimate.'
  const stableWindowPath =
    stableWindow && stableWindow.end > stableWindow.start
      ? `M${mapX(insight.points[stableWindow.start].x)} ${mapY(stableWindow.slope * insight.points[stableWindow.start].x + stableWindow.intercept)} L${mapX(insight.points[stableWindow.end].x)} ${mapY(stableWindow.slope * insight.points[stableWindow.end].x + stableWindow.intercept)}`
      : ''
  const stableWindowBand =
    stableWindow && stableWindow.end > stableWindow.start
      ? {
          x: Math.max(pad.left, mapX(insight.points[stableWindow.start].x) - 8),
          width: Math.min(width - pad.right, mapX(insight.points[stableWindow.end].x) + 8) - Math.max(pad.left, mapX(insight.points[stableWindow.start].x) - 8),
        }
      : null

  return (
    <figure className={`log-chart-wrap ${hoveredPoint !== null ? 'is-hovered' : ''}`} aria-label="Log-log box counting chart">
      <div className="log-chart-header">
        <div>
          <p className="log-chart-kicker">Box-count trend</p>
          <h4 id={chartTitleId} className="log-chart-title">
            Log-log scaling plot
          </h4>
          <p className="log-chart-summary">{bannerText}</p>
        </div>
        <div className="log-chart-summary log-chart-summary-stack">
          <span>D={insight.slope.toFixed(4)}</span>
          <span>R²={insight.fitR2.toFixed(4)}</span>
          <span>{insight.stabilityLabel}</span>
        </div>
      </div>

      <div className="boxcount-chart-banner" role="note" aria-label="How to read the box-count chart">
        <strong>How to read:</strong>
        <span>the highlighted band is the most stable scaling window.</span>
      </div>

      <div className="log-chart-surface" ref={surfaceRef}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-labelledby={chartTitleId}
          aria-describedby={chartDescId}
        >
          <desc id={chartDescId}>X shows log(1 divided by box size). Y shows log(box count).</desc>

          {stableWindowBand ? (
            <rect
              className="log-stable-window"
              x={stableWindowBand.x}
              y={pad.top}
              width={Math.max(0, stableWindowBand.width)}
              height={plotHeight}
              rx="10"
            />
          ) : null}

          {stableWindowPath ? <path className="log-stable-fit-line" d={stableWindowPath} /> : null}

          {xTicks.map((tick, index) => {
            const x = mapX(tick)
            return (
              <g key={`x-${tick}`}>
                <line className="log-gridline" x1={x} y1={pad.top} x2={x} y2={height - pad.bottom} />
                <text className="log-axis-label log-tick-label log-tick-label-x" x={x} y={height - 22}>
                  {isCompactChart && index !== 0 && index !== xTicks.length - 1 ? '' : tick.toFixed(2)}
                </text>
              </g>
            )
          })}

          {yTicks.map((tick, index) => {
            const y = mapY(tick)
            return (
              <g key={`y-${tick}`}>
                <line className="log-gridline" x1={pad.left} y1={y} x2={width - pad.right} y2={y} />
                <text className="log-axis-label log-tick-label log-tick-label-y" x={pad.left - 6} y={y}>
                  {isCompactChart && index !== 0 && index !== yTicks.length - 1 ? '' : tick.toFixed(2)}
                </text>
              </g>
            )
          })}

          <line className="log-axis" x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} />
          <line className="log-axis" x1={pad.left} y1={height - pad.bottom} x2={pad.left} y2={pad.top} />
          <path className="log-fit-line" d={fitPath} />
          <path className="log-line" d={path} />
          <text className="log-axis-label log-axis-label-y" x={2} y={yLabelY} transform={`rotate(-90 2 ${yLabelY})`}>
            log(box count)
          </text>
          {insight.points.map((point, index) => (
            <circle
              key={`${point.x}-${point.y}`}
              className="log-dot"
              cx={mapX(point.x)}
              cy={mapY(point.y)}
              r={3.2}
              tabIndex={0}
              aria-label={`Box size point ${index + 1}, x ${point.x.toFixed(2)}, y ${point.y.toFixed(2)}`}
              onMouseEnter={() => setHoveredPoint(index)}
              onMouseLeave={() => setHoveredPoint(null)}
              onFocus={() => setHoveredPoint(index)}
              onBlur={() => setHoveredPoint(null)}
            >
              <title>
                Box size {Math.round(1 / Math.exp(point.x))}, occupied boxes point {index + 1}
              </title>
            </circle>
          ))}
        </svg>
        <div className="log-axis-caption log-axis-caption-x" aria-label="X axis label">
          <span>log(1 / box size)</span>
          <small>Right = smaller boxes</small>
        </div>
        {hoveredPoint !== null ? (
          <div className="log-point-tooltip" style={{ left: `${(mapX(insight.points[hoveredPoint].x) / width) * 100}%`, top: `${(mapY(insight.points[hoveredPoint].y) / height) * 100}%` }}>
            <strong>Box size {Math.round(1 / Math.exp(insight.points[hoveredPoint].x))}</strong>
            <span>Occupied boxes: {Math.round(Math.exp(insight.points[hoveredPoint].y))}</span>
            <span>log x: {insight.points[hoveredPoint].x.toFixed(2)} · log y: {insight.points[hoveredPoint].y.toFixed(2)}</span>
          </div>
        ) : null}
      </div>

      <div className="boxcount-chart-guidance">
        <span>Smaller boxes move to the right.</span>
        <span>More occupied boxes move up.</span>
        <span>The slope is the fractal-dimension estimate.</span>
      </div>

      <div className="boxcount-stability-callout">
        <div>
          <p className="boxcount-stability-title">Most stable fit window</p>
          <p className="boxcount-stability-text">
            {stableWindow
              ? `This highlighted segment is the most linear contiguous window in the plot. R² ${stableWindow.r2.toFixed(4)} with slope ${stableWindow.slope.toFixed(4)}.`
              : 'The current point set is too small to isolate a stable window, so the full fitted trend is shown instead.'}
          </p>
        </div>
        <p className="boxcount-stability-note">{insight.teachingHint}</p>
      </div>

      <div className="boxcount-chart-key" aria-label="Chart key">
        <span className="boxcount-chart-key-item">
          <span className="boxcount-chart-key-line" aria-hidden="true" />
          Fitted trend line
        </span>
        <span className="boxcount-chart-key-item">
          <span className="boxcount-chart-key-band" aria-hidden="true" />
          Stable scaling window
        </span>
        <span className="boxcount-chart-key-item">
          <span className="boxcount-chart-key-dot" aria-hidden="true" />
          Measured box counts
        </span>
      </div>

      <p className="log-chart-caption">
        Each point is one box size from the ROI. The dashed line is the fitted trend used to estimate the dimension, so you can judge both
        the value and how closely the points follow a power law.
      </p>
    </figure>
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

      <details className="boxcount-raw-details">
        <summary>Raw box counts</summary>
        <pre>{JSON.stringify(result?.boxCounts ?? [], null, 2)}</pre>
      </details>
    </div>
  )
}
