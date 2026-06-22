import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEventHandler, ReactEventHandler, WheelEventHandler } from 'react'
import type { DetectionResult } from '../../core/services/contracts'
import { confidenceTier, formatConfidence, formatDetectionBox, summarizeConfidence } from './tumorDisplay'
import { useObjectUrl } from './useObjectUrl'
import { useTumorViewport } from './useTumorViewport'

interface TumorComparisonPanelProps {
  file: File | null
  detectionData?: DetectionResult
  showDetails: boolean
  onToggleDetails: () => void
}

type TumorStageImageProps = {
  src: string
  alt: string
  emptyText: string
  keyHint: string
  fitMode: 'contain' | 'native'
  zoomTransform: string
  isZoomable: boolean
  onWheel: WheelEventHandler<HTMLDivElement>
  onPointerDown: PointerEventHandler<HTMLDivElement>
  onPointerMove: PointerEventHandler<HTMLDivElement>
  onPointerUp: PointerEventHandler<HTMLDivElement>
  onPointerCancel: PointerEventHandler<HTMLDivElement>
  imageKey?: string
}

function TumorStageImage({
  src,
  alt,
  emptyText,
  keyHint,
  fitMode,
  zoomTransform,
  isZoomable,
  onWheel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  imageKey,
}: TumorStageImageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) {
      return
    }

    const updateStageSize = () => {
      const rect = stage.getBoundingClientRect()
      setStageSize((current) =>
        current.width === Math.round(rect.width) && current.height === Math.round(rect.height)
          ? current
          : { width: Math.round(rect.width), height: Math.round(rect.height) },
      )
    }

    updateStageSize()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateStageSize)
      return () => window.removeEventListener('resize', updateStageSize)
    }

    const observer = new ResizeObserver(updateStageSize)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  const handleImageLoad: ReactEventHandler<HTMLImageElement> = (event) => {
    const image = event.currentTarget
    const nextSize = {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    }

    setImageSize((current) => (current.width === nextSize.width && current.height === nextSize.height ? current : nextSize))
  }

  const hasImage = !!src
  const scale = stageSize.width > 0 && stageSize.height > 0 && imageSize.width > 0 && imageSize.height > 0 ? Math.min(stageSize.width / imageSize.width, stageSize.height / imageSize.height) : 1
  const fittedStyle =
    fitMode === 'contain'
      ? {
          display: 'block',
          width: `${Math.max(1, Math.round(imageSize.width * scale))}px`,
          height: `${Math.max(1, Math.round(imageSize.height * scale))}px`,
          transform: zoomTransform,
        }
      : {
          display: 'block',
          width: 'auto',
          height: 'auto',
          maxWidth: '100%',
          maxHeight: '100%',
          transform: zoomTransform,
        }

  return (
    <div
      ref={stageRef}
      className={`tumor-stage-media ${isZoomable ? 'is-zoomable' : ''}`}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      data-stage={keyHint}
    >
      {hasImage ? (
        <img
          key={imageKey ?? src}
          src={src}
          alt={alt}
          className="tumor-stage-image"
          onLoad={handleImageLoad}
          onError={handleImageLoad}
          style={fittedStyle}
        />
      ) : (
        <div className="tumor-stage-empty">{emptyText}</div>
      )}
    </div>
  )
}

export function TumorComparisonPanel({ file, detectionData, showDetails, onToggleDetails }: TumorComparisonPanelProps) {
  const filePreviewUrl = useObjectUrl(file)
  const viewport = useTumorViewport(file)
  const cropViewport = useTumorViewport(file)
  const confidenceSummary = detectionData ? summarizeConfidence(detectionData.detections) : null
  const originalImageUrl = detectionData?.sourceImageUrl || filePreviewUrl
  const strongestDetection = useMemo(() => {
    if (!detectionData?.detections.length) {
      return null
    }

    return [...detectionData.detections].sort((left, right) => right.confidence - left.confidence)[0]
  }, [detectionData])

  const detectionImageUrl = detectionData?.overlayImageUrl || ''
  const cropImageUrl = detectionData?.cropImageUrl || ''
  const detectionCount = detectionData?.detections.length ?? 0
  const strongestConfidence = strongestDetection ? formatConfidence(strongestDetection.confidence) : '—'

  return (
    <div className="tumor-compare-stack">
      <div className="tumor-zoom-toolbar" aria-label="Zoom controls">
        <span className="tumor-zoom-label">Zoom</span>
        <div className="tumor-zoom-controls">
          <button type="button" className="tumor-zoom-button" onClick={() => viewport.adjustZoom(-0.25)} aria-label="Zoom out">
            −
          </button>
          <span className="tumor-zoom-value">{Math.round(viewport.zoomLevel * 100)}%</span>
          <button type="button" className="tumor-zoom-button" onClick={() => viewport.adjustZoom(0.25)} aria-label="Zoom in">
            +
          </button>
          <button type="button" className="tumor-zoom-button tumor-zoom-reset" onClick={viewport.resetViewport} aria-label="Reset zoom">
            Reset
          </button>
        </div>
      </div>

      <div className="tumor-compare-grid">
        <article className="tumor-stage-card">
          <div className="tumor-stage-header">
            <p className="tumor-stage-title">Before</p>
            <span className="tumor-stage-pill">Original upload</span>
          </div>
          <TumorStageImage
            src={originalImageUrl}
            alt="Uploaded scan before detection"
            emptyText="Preview appears here after upload."
            keyHint="before"
            fitMode="contain"
            zoomTransform={viewport.zoomTransform}
            isZoomable={viewport.canPan}
            onWheel={viewport.handleWheel}
            onPointerDown={viewport.handlePointerDown}
            onPointerMove={viewport.handlePointerMove}
            onPointerUp={viewport.handlePointerUp}
            onPointerCancel={viewport.handlePointerUp}
          />
        </article>

        <article className="tumor-stage-card">
          <div className="tumor-stage-header">
            <p className="tumor-stage-title">After</p>
            <span className="tumor-stage-pill">{detectionData ? 'Annotated output' : 'Waiting for run'}</span>
          </div>
          <TumorStageImage
            src={detectionImageUrl}
            alt="Annotated tumor detection result"
            emptyText={
              detectionData
                ? 'The backend did not return an annotated image. Check the service output before trusting the result.'
                : 'Run detection to generate the annotated comparison image.'
            }
            keyHint="after"
            fitMode="contain"
            imageKey={detectionData?.runId ?? 'tumor-output'}
            zoomTransform={viewport.zoomTransform}
            isZoomable={viewport.canPan}
            onWheel={viewport.handleWheel}
            onPointerDown={viewport.handlePointerDown}
            onPointerMove={viewport.handlePointerMove}
            onPointerUp={viewport.handlePointerUp}
            onPointerCancel={viewport.handlePointerUp}
          />
        </article>
      </div>

      <div className="tumor-zoom-grid">
        <article className="tumor-stage-card">
          <div className="tumor-stage-header">
            <p className="tumor-stage-title">Zoomed crop</p>
            <span className="tumor-stage-pill">{cropImageUrl ? 'Detected region' : 'Waiting for crop'}</span>
          </div>
          <div className="tumor-zoom-toolbar tumor-zoom-toolbar-crop" aria-label="Crop zoom controls">
            <span className="tumor-zoom-label">Crop zoom</span>
            <div className="tumor-zoom-controls">
              <button type="button" className="tumor-zoom-button" onClick={() => cropViewport.adjustZoom(-0.25)} aria-label="Zoom out crop">
                −
              </button>
              <span className="tumor-zoom-value">{Math.round(cropViewport.zoomLevel * 100)}%</span>
              <button type="button" className="tumor-zoom-button" onClick={() => cropViewport.adjustZoom(0.25)} aria-label="Zoom in crop">
                +
              </button>
              <button type="button" className="tumor-zoom-button tumor-zoom-reset" onClick={cropViewport.resetViewport} aria-label="Reset crop zoom">
                Reset
              </button>
            </div>
          </div>
          <TumorStageImage
            src={cropImageUrl}
            alt="Zoomed crop of the detected tumor region"
            emptyText={
              detectionData
                ? 'No region passed the current threshold. Lower the slider to review more candidate areas.'
                : 'The detected crop will appear here after a successful run.'
            }
            keyHint="crop"
            fitMode="native"
            imageKey={`${detectionData?.runId ?? 'tumor-crop'}-crop`}
            zoomTransform={cropViewport.zoomTransform}
            isZoomable={cropViewport.canPan}
            onWheel={cropViewport.handleWheel}
            onPointerDown={cropViewport.handlePointerDown}
            onPointerMove={cropViewport.handlePointerMove}
            onPointerUp={cropViewport.handlePointerUp}
            onPointerCancel={cropViewport.handlePointerUp}
          />
        </article>
      </div>

      <div className="tumor-evidence-panel">
        <div className="overlay-controls">
          <div className="overlay-legend" aria-label="Tumor result legend">
            <span className="overlay-legend-item" tabIndex={0} title="The before image is the untouched upload.">
              Original
            </span>
            <span className="overlay-legend-item" tabIndex={0} title="The after image is the annotated model output.">
              Annotated output
            </span>
            <span className="overlay-legend-item" tabIndex={0} title="Confidence summaries help distinguish the strongest candidate region.">
              Confidence summary
            </span>
          </div>
          <button type="button" className="overlay-toggle tumor-detail-toggle" onClick={onToggleDetails}>
            {showDetails ? 'Hide evidence details' : 'Show evidence details'}
          </button>
        </div>

        {detectionData ? (
          <>
            <div className="tumor-metric-row" aria-label="Detection summary metrics">
              <span className="edu-chip">Detections: {detectionCount}</span>
              <span className="edu-chip">Highest confidence: {strongestConfidence}</span>
              <span className="edu-chip">High: {confidenceSummary?.high ?? 0}</span>
              <span className="edu-chip">Medium: {confidenceSummary?.medium ?? 0}</span>
              <span className="edu-chip">Low: {confidenceSummary?.low ?? 0}</span>
            </div>

            {showDetails ? (
              <div className="tumor-detection-list" aria-label="Detection evidence list">
                {detectionData.detections.length ? (
                  detectionData.detections.map((detection, index) => (
                    <article key={`${detection.label}-${index}`} className={`tumor-detection-item tumor-detection-item-${confidenceTier(detection.confidence)}`}>
                      <div className="tumor-detection-item-header">
                        <strong>{detection.label}</strong>
                        <span className="tumor-detection-confidence">{formatConfidence(detection.confidence)}</span>
                      </div>
                      <div className="tumor-confidence-bar" aria-hidden="true">
                        <span style={{ width: `${Math.round(detection.confidence * 100)}%` }} />
                      </div>
                      <p>Raw box: {formatDetectionBox(detection.box)}</p>
                    </article>
                  ))
                ) : (
                  <div className="tumor-detection-empty">No region met the candidate threshold. Try a clearer scan or a different view.</div>
                )}
              </div>
            ) : (
              <p className="muted">Evidence details are hidden. Turn them back on to inspect confidence and coordinates.</p>
            )}
          </>
        ) : (
          <p className="muted">Upload an image and run detection to compare the original scan with the annotated output.</p>
        )}
      </div>
    </div>
  )
}
