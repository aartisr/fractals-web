import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { GuidedKickoffPanel } from '../../components/GuidedKickoffPanel'
import { CommentThreadPanel } from '../../components/CommentThreadPanel'
import { FilePicker } from '../../components/FilePicker'
import { ClassroomPanel } from '../../components/ClassroomPanel'
import { Panel } from '../../components/Panel'
import { ResultCardPanel } from '../../components/ResultCardPanel'
import { downloadJson, downloadTextAsFile } from '../../core/services/export'
import { useEducatorMode } from '../../core/hooks/useEducatorMode'
import { useWorkbenchShareArtifact } from '../../core/hooks/useWorkbenchShareArtifact'
import { useOverlayPreference } from '../../core/hooks/useOverlayPreference'
import {
  buildClassroomStatus,
  buildHandoutMarkdown,
  buildSlideSummaryMarkdown,
  defaultChecklistStatus,
} from '../../core/services/educationToolkit'
import {
  createCompareShareCard,
  decodeWorkbenchShareRecord,
  encodeWorkbenchState,
  trackWorkbenchEvent,
} from '../../core/services/workbenchSharing'
import {
  buildCohortComparisonJson,
  buildCohortComparisonMarkdown,
  buildPublicationFigureManifest,
  buildResearchSnapshot,
  type ResearchSnapshot,
} from '../../core/services/researchWorkbench'
import type { RunSummary } from '../../core/services/contracts'
import { buildCompareImageVisuals } from './compareVisuals'
import type { FractalQualityAssessment } from './fractalQuality'

const MAX_IMAGES = 5
const MIN_IMAGES = 2
const BOX_SIZES = [8, 16, 32]
const SERIES_COLORS = ['#ff7b4a', '#41d6a4', '#64b5f6', '#ffd166', '#b78dff']
const QUALITY_LABELS: Record<FractalQualityAssessment['level'], string> = {
  trusted: 'Trusted',
  caution: 'Limited confidence',
  unreliable: 'Unreliable',
}

type CompareViewState = {
  slotCount: number
  customLabels: string[]
  useFilenameLabels: boolean
  safeInterpretationMode: boolean
  activeEducationStage: number
}

const compareViewStorageKey = 'fractals-workbench-compare-view'

const readCompareViewState = (): CompareViewState | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(compareViewStorageKey)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as CompareViewState
    if (typeof parsed.slotCount === 'number') {
      return parsed
    }
  } catch {
    // Ignore malformed state.
  }

  return null
}

const persistCompareViewState = (state: CompareViewState) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(compareViewStorageKey, JSON.stringify(state))
    const url = new URL(window.location.href)
    url.searchParams.set('view', encodeWorkbenchState(state))
    window.history.replaceState({}, '', url)
  } catch {
    // Ignore state persistence errors.
  }
}

const imageLetterLabel = (index: number) => `Image ${String.fromCharCode(65 + index)}`

const clipLabel = (value: string, maxLength = 42) => {
  const normalized = value.trim()
  if (!normalized) {
    return ''
  }
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized
}

const sanitizeFilenameLabel = (file: File) => {
  const base = file.name.replace(/\.[^.]+$/, '').trim()
  if (!base) {
    return file.name || 'Untitled image'
  }
  return clipLabel(base)
}

type SelectedImage = {
  index: number
  file: File
  label: string
  originalUrl: string
}

type ImageAnalysis = SelectedImage & {
  color: string
  grayscaleUrl: string
  binarizedUrl: string
  overlayVisuals: Array<{ size: number; count: number; url: string }>
  boxCounts: Array<{ size: number; count: number }>
  fractalDimension: number
  fitR2: number
  chartPoints: Array<{ x: number; y: number }>
  quality: FractalQualityAssessment
}

type ChartHoverState = {
  seriesIndex: number
  pointIndex: number
  label: string
  boxSize: number
  count: number
  x: number
  y: number
  fractalDimension: number
  fitR2: number
}

function buildTickValues(min: number, max: number, tickCount = 4) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return []
  }

  if (Math.abs(max - min) < 1e-6) {
    return [min]
  }

  return Array.from({ length: tickCount }, (_, index) => min + ((max - min) * index) / (tickCount - 1))
}

function MultiSeriesLogChart({ analyses }: { analyses: ImageAnalysis[] }) {
  const [activeSeriesIndex, setActiveSeriesIndex] = useState<number | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState<ChartHoverState | null>(null)
  const allPoints = analyses.flatMap((analysis) => analysis.chartPoints)
  if (allPoints.length < 2) {
    return <p className="muted">The log-log chart appears after at least two images are analyzed.</p>
  }

  const minX = Math.min(...allPoints.map((point) => point.x))
  const maxX = Math.max(...allPoints.map((point) => point.x))
  const minY = Math.min(...allPoints.map((point) => point.y))
  const maxY = Math.max(...allPoints.map((point) => point.y))
  const pad = 18
  const width = 520
  const height = 170
  const xRange = Math.max(1e-6, maxX - minX)
  const yRange = Math.max(1e-6, maxY - minY)
  const xTicks = buildTickValues(minX, maxX)
  const yTicks = buildTickValues(minY, maxY)

  const mapX = (value: number) => pad + ((value - minX) / xRange) * (width - pad * 2)
  const mapY = (value: number) => height - pad - ((value - minY) / yRange) * (height - pad * 2)
  const buildPath = (points: Array<{ x: number; y: number }>) =>
    points.map((point, index) => `${index === 0 ? 'M' : 'L'}${mapX(point.x)} ${mapY(point.y)}`).join(' ')
  const chartTitleId = 'compare-log-chart-title'
  const chartDescId = 'compare-log-chart-desc'
  const activeLabel =
    activeSeriesIndex !== null ? analyses[activeSeriesIndex]?.label ?? 'selected series' : 'all series'
  const hoveredTooltip =
    hoveredPoint !== null
      ? {
          left: `${(mapX(hoveredPoint.x) / width) * 100}%`,
          top: `${(mapY(hoveredPoint.y) / height) * 100}%`,
        }
      : null

  return (
    <figure
      className={`log-chart-wrap ${isHovered ? 'is-hovered' : ''}`}
      aria-label="Multi-image log-log box counting chart"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="log-chart-header">
        <div>
          <p className="log-chart-kicker">Scaling-law view</p>
          <h4 id={chartTitleId} className="log-chart-title">
            Log-log box-count plot
          </h4>
        </div>
        <p className="log-chart-summary">
          Hover zoom: {isHovered ? 'on' : 'off'} · Active series: {activeLabel}
        </p>
      </div>

      <div className="log-chart-surface">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby={chartTitleId}
          aria-describedby={chartDescId}
        >
          <desc id={chartDescId}>
            X axis shows log(1 divided by box size), so points farther right represent smaller boxes. Y axis shows log(box count), so
            points higher up represent more occupied boxes. A straighter line indicates a more stable scaling law.
          </desc>

          {xTicks.map((tick) => {
            const x = mapX(tick)
            const label = tick.toFixed(2)
            return (
              <g key={`x-grid-${tick}`}>
                <line className="log-gridline" x1={x} y1={pad} x2={x} y2={height - pad} />
                <text className="log-axis-label log-tick-label log-tick-label-x" x={x} y={height - 3}>
                  {label}
                </text>
              </g>
            )
          })}

          {yTicks.map((tick) => {
            const y = mapY(tick)
            const label = tick.toFixed(2)
            return (
              <g key={`y-grid-${tick}`}>
                <line className="log-gridline" x1={pad} y1={y} x2={width - pad} y2={y} />
                <text className="log-axis-label log-tick-label log-tick-label-y" x={pad - 4} y={y}>
                  {label}
                </text>
              </g>
            )
          })}

          <line className="log-axis" x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} />
          <line className="log-axis" x1={pad} y1={height - pad} x2={pad} y2={pad} />
          <text className="log-axis-label log-axis-label-x" x={width / 2} y={height - 2}>
            log(1 / box size)
          </text>
          <text className="log-axis-label log-axis-label-y" x={8} y={height / 2} transform={`rotate(-90 8 ${height / 2})`}>
            log(box count)
          </text>

          {analyses.map((analysis, seriesIndex) => (
            <g
              key={`${analysis.index}-${analysis.label}`}
              className={`log-series-${seriesIndex % SERIES_COLORS.length} ${activeSeriesIndex !== null && activeSeriesIndex !== seriesIndex ? 'is-muted' : ''}`}
            >
              <path className="log-line" d={buildPath(analysis.chartPoints)} />
              {analysis.chartPoints.map((point, pointIndex) => {
                const cx = mapX(point.x)
                const cy = mapY(point.y)
                const boxSize = analysis.boxCounts[pointIndex]?.size ?? BOX_SIZES[pointIndex] ?? pointIndex + 1
                const count = analysis.boxCounts[pointIndex]?.count ?? 0
                return (
                  <circle
                    key={`${analysis.label}-${point.x}-${point.y}`}
                    className="log-dot"
                    cx={cx}
                    cy={cy}
                    r={3}
                    tabIndex={0}
                    aria-label={`${analysis.label}, box size ${boxSize}, occupied boxes ${count}, log x ${point.x.toFixed(2)}, log y ${point.y.toFixed(2)}`}
                    onMouseEnter={() =>
                      setHoveredPoint({
                        seriesIndex,
                        pointIndex,
                        label: analysis.label,
                        boxSize,
                        count,
                        x: point.x,
                        y: point.y,
                        fractalDimension: analysis.fractalDimension,
                        fitR2: analysis.fitR2,
                      })
                    }
                    onFocus={() =>
                      setHoveredPoint({
                        seriesIndex,
                        pointIndex,
                        label: analysis.label,
                        boxSize,
                        count,
                        x: point.x,
                        y: point.y,
                        fractalDimension: analysis.fractalDimension,
                        fitR2: analysis.fitR2,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                    onBlur={() => setHoveredPoint(null)}
                  >
                    <title>
                      {analysis.label}: box size {boxSize}, occupied boxes {count}, log x {point.x.toFixed(2)}, log y {point.y.toFixed(2)}
                    </title>
                  </circle>
                )
              })}
            </g>
          ))}
        </svg>

        {hoveredPoint && hoveredTooltip ? (
          <div className="log-point-tooltip" style={hoveredTooltip}>
            <strong>{hoveredPoint.label}</strong>
            <span>Box size: {hoveredPoint.boxSize}</span>
            <span>Occupied boxes: {hoveredPoint.count}</span>
            <span>log x: {hoveredPoint.x.toFixed(2)} · log y: {hoveredPoint.y.toFixed(2)}</span>
            <span>D: {hoveredPoint.fractalDimension.toFixed(4)} · R²: {hoveredPoint.fitR2.toFixed(4)}</span>
          </div>
        ) : null}
      </div>
      <div className="compare-series-legend">
        {analyses.map((analysis, index) => (
          <button
            key={`${analysis.index}-${analysis.label}`}
            type="button"
            className={`compare-series-item ${activeSeriesIndex === index ? 'is-active' : ''} ${activeSeriesIndex !== null && activeSeriesIndex !== index ? 'is-muted' : ''}`}
            onClick={() => {
              setActiveSeriesIndex((current) => (current === index ? null : index))
              setHoveredPoint(null)
            }}
          >
            <span className={`compare-series-dot compare-series-dot-${index % SERIES_COLORS.length}`} aria-hidden="true" />
            {analysis.label} (D={analysis.quality.level === 'unreliable' ? 'withheld' : analysis.fractalDimension.toFixed(4)})
          </button>
        ))}
      </div>
      <figcaption className="log-chart-caption">
        X measures scale shrinkage, Y measures box occupancy. Use the legend to isolate one image, then compare slope, straightness,
        and how tightly each series tracks the same pattern across scales.
      </figcaption>
      <div className="log-chart-explainer">
        <span>
          Steeper lines usually mean more structural complexity in the box-counting sense.
        </span>
        <span>
          More overlap across the same scales usually means the images behave more similarly.
        </span>
      </div>
    </figure>
  )
}

function buildInterpretation(analyses: ImageAnalysis[]) {
  if (analyses.length < 2) {
    return {
      summary: 'Upload at least two images to compare fractal dimensions.',
      student: '',
      researcher: '',
      community: '',
    }
  }

  const dimensions = analyses.map((analysis) => analysis.fractalDimension)
  const mean = dimensions.reduce((sum, value) => sum + value, 0) / dimensions.length
  const variance = dimensions.reduce((sum, value) => sum + (value - mean) ** 2, 0) / dimensions.length
  const stdDev = Math.sqrt(variance)
  const ranked = [...analyses].sort((left, right) => right.fractalDimension - left.fractalDimension)
  const highest = ranked[0]
  const lowest = ranked[ranked.length - 1]
  const unreliableCount = analyses.filter((analysis) => analysis.quality.level === 'unreliable').length
  const cautionCount = analyses.filter((analysis) => analysis.quality.level === 'caution').length

  if (unreliableCount > 0) {
    return {
      summary: `One or more images failed quality checks, so the fractal comparison is not stable enough to trust. ${unreliableCount} image${unreliableCount === 1 ? '' : 's'} were marked unreliable.`,
      student: 'When QC fails, the safest interpretation is to withhold the result instead of ranking the images.',
      researcher: 'Report the QC failure first, then repeat with more scales, cleaner preprocessing, or a larger region of interest.',
      community: 'This run should not be used for conclusions because the estimate is too unstable.',
    }
  }

  if (cautionCount > 0) {
    return {
      summary: `The comparison is usable, but ${cautionCount} image${cautionCount === 1 ? '' : 's'} only passed limited-confidence checks.`,
      student: 'Treat the ranking as provisional and confirm it with a repeat run.',
      researcher: `Keep the comparison, but note that ${cautionCount} image${cautionCount === 1 ? ' has' : 's have'} borderline quality.`,
      community: 'This comparison is informative, but it should be reviewed alongside expert interpretation.',
    }
  }

  if (analyses.length === 2) {
    const delta = Math.abs(highest.fractalDimension - lowest.fractalDimension)
    return {
      summary: `${highest.label} has the higher fractal complexity. Absolute delta is ${delta.toFixed(4)} (${((delta / Math.max(highest.fractalDimension, 1)) * 100).toFixed(1)}%).`,
      student: 'When two lines separate clearly on the log-log plot, the image with the steeper line is more space-filling.',
      researcher: `Both images should report dimension and R² together. Current fit quality: ${highest.label} ${highest.fitR2.toFixed(4)}, ${lowest.label} ${lowest.fitR2.toFixed(4)}.`,
      community: 'This is a structural complexity comparison, not a diagnosis. Use it as a quantitative discussion aid.',
    }
  }

  const spread = highest.fractalDimension - lowest.fractalDimension
  return {
    summary: `${analyses.length} images compared. Highest complexity: ${highest.label} (${highest.fractalDimension.toFixed(4)}). Lowest complexity: ${lowest.label} (${lowest.fractalDimension.toFixed(4)}). Cohort spread: ${spread.toFixed(4)}; mean: ${mean.toFixed(4)}; std-dev: ${stdDev.toFixed(4)}.`,
    student: 'Use rank order to see which samples are smooth versus irregular. The spread tells you how diverse the cohort is.',
    researcher: `Report cohort statistics (mean=${mean.toFixed(4)}, std=${stdDev.toFixed(4)}) with per-image R² for reproducibility and quality control.`,
    community: 'Comparing multiple samples helps prioritize outliers for deeper review, but should not replace domain expertise.',
  }
}

function softenInterpretation(text: string) {
  return text
    .replace('has the higher fractal complexity.', 'shows a higher measured fractal complexity in this run.')
    .replace('is more space-filling.', 'appears more space-filling in this analysis window.')
    .replace('is more complex and why the difference matters.', 'shows different measured complexity and how to discuss that difference safely.')
}

function buildStageTwoTemplate(analyses: ImageAnalysis[], summary: string) {
  const scaleLabel = analyses.length ? analyses[0].boxCounts.map((item) => item.size).join(', ') : '4, 8, 16, 32'
  if (!analyses.length) {
    return [
      'Research question: ________________________________________________',
      'Modality + preprocessing: _________________________________________',
      `Scale ladder used: ${scaleLabel}`,
      'Key result: Upload at least two images to generate quantitative output.',
      'Clinical note: Fractal dimension is a structural descriptor, not a diagnosis.',
    ].join('\n')
  }

  const rows = analyses
    .map(
      (analysis) =>
        `- ${analysis.label}: D=${analysis.quality.level === 'unreliable' ? 'withheld' : analysis.fractalDimension.toFixed(4)}, R²=${analysis.quality.level === 'unreliable' ? 'withheld' : analysis.fitR2.toFixed(4)}, QC=${analysis.quality.title}, points=${analysis.boxCounts.length}`,
    )
    .join('\n')

  return [
    'Research question: ________________________________________________',
    'Modality + preprocessing: _________________________________________',
    `Scale ladder used: ${scaleLabel}`,
    `Key result: ${summary}`,
    'Per-image metrics:',
    rows,
    'Clinical note: Fractal dimension is a structural descriptor, not a diagnosis.',
  ].join('\n')
}

export function ComparePage() {
  const { educatorMode } = useEducatorMode()
  const initialCompareView = useMemo(() => readCompareViewState(), [])
  const [slotCount, setSlotCount] = useState(initialCompareView?.slotCount ?? MIN_IMAGES)
  const [files, setFiles] = useState<Array<File | null>>(Array.from({ length: MAX_IMAGES }, () => null))
  const [customLabels, setCustomLabels] = useState<string[]>(
    initialCompareView?.customLabels ?? Array.from({ length: MAX_IMAGES }, () => ''),
  )
  const [analyses, setAnalyses] = useState<ImageAnalysis[]>([])
  const [useFilenameLabels, setUseFilenameLabels] = useState(initialCompareView?.useFilenameLabels ?? true)
  const [showOverlays, setShowOverlays] = useOverlayPreference('compare.overlay.visible')
  const [activeEducationStage, setActiveEducationStage] = useState(initialCompareView?.activeEducationStage ?? 1)
  const [safeInterpretationMode, setSafeInterpretationMode] = useState(
    initialCompareView?.safeInterpretationMode ?? educatorMode ?? true,
  )
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const shareHydratedRef = useRef(false)
  const activeFiles = useMemo(() => files.slice(0, slotCount), [files, slotCount])
  const previewUrls = useMemo(() => files.map((file) => (file ? URL.createObjectURL(file) : '')), [files])

  const resolveImageLabel = useCallback(
    (index: number, file: File) => {
      const custom = clipLabel(customLabels[index] ?? '')
      if (custom) {
        return custom
      }
      return useFilenameLabels ? sanitizeFilenameLabel(file) : imageLetterLabel(index)
    },
    [customLabels, useFilenameLabels],
  )

  const selectedImages = useMemo(() => {
    return activeFiles
      .map((file, index) => ({ index, file }))
      .filter((entry): entry is { index: number; file: File } => entry.file !== null)
      .map((entry) => ({
        index: entry.index,
        file: entry.file,
        label: resolveImageLabel(entry.index, entry.file),
      }))
  }, [activeFiles, resolveImageLabel])

  const displayedAnalyses = useMemo(() => {
    return analyses.map((analysis) => ({
      ...analysis,
      label: resolveImageLabel(analysis.index, analysis.file),
    }))
  }, [analyses, resolveImageLabel])

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => {
        if (url) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [previewUrls])

  const compareMutation = useMutation({
    mutationFn: async (payload: SelectedImage[]) => {
      if (payload.length < MIN_IMAGES) {
        throw new Error('Upload at least two images before comparing.')
      }
      return Promise.all(
        payload.map(async (image, index) => {
          const color = SERIES_COLORS[index % SERIES_COLORS.length]
          const visuals = await buildCompareImageVisuals(image.file, BOX_SIZES, color)

          return {
            ...image,
            color,
            grayscaleUrl: visuals.grayscaleUrl,
            binarizedUrl: visuals.binarizedUrl,
            overlayVisuals: visuals.overlayVisuals,
            boxCounts: visuals.boxCounts,
            fractalDimension: visuals.fractalDimension,
            fitR2: visuals.fitR2,
            chartPoints: visuals.chartPoints,
            quality: visuals.quality,
          } satisfies ImageAnalysis
        }),
      )
    },
    onSuccess: (result) => setAnalyses(result),
  })

  const interpretation = useMemo(() => buildInterpretation(displayedAnalyses), [displayedAnalyses])
  const interpretationText = useMemo(() => {
    if (!safeInterpretationMode) {
      return interpretation
    }

    return {
      summary: softenInterpretation(interpretation.summary),
      student: softenInterpretation(interpretation.student),
      researcher: softenInterpretation(interpretation.researcher),
      community: `${softenInterpretation(interpretation.community)} This result should be reviewed with clinical context and domain expertise.`,
    }
  }, [interpretation, safeInterpretationMode])

  const stageTwoReport = useMemo(
    () => buildStageTwoTemplate(displayedAnalyses, interpretationText.summary),
    [displayedAnalyses, interpretationText.summary],
  )

  const compareShareResult = useMemo(() => {
    if (displayedAnalyses.length < 2) {
      return null
    }

    const ranked = [...displayedAnalyses].sort((left, right) => right.fractalDimension - left.fractalDimension)
    const highest = ranked[0]
    const lowest = ranked[ranked.length - 1]
    return {
      runId: `compare-${displayedAnalyses.map((analysis) => analysis.label).join('-')}`,
      imageA: {
        fractalDimension: highest.fractalDimension,
        elapsedSeconds: highest.quality.level === 'unreliable' ? undefined : undefined,
        fitR2: highest.fitR2,
        boxCounts: highest.boxCounts,
      },
      imageB: {
        fractalDimension: lowest.fractalDimension,
        elapsedSeconds: lowest.quality.level === 'unreliable' ? undefined : undefined,
        fitR2: lowest.fitR2,
        boxCounts: lowest.boxCounts,
      },
      delta: Number(Math.abs(highest.fractalDimension - lowest.fractalDimension).toFixed(4)),
      interpretation: interpretationText.summary,
    }
  }, [displayedAnalyses, interpretationText.summary])

  const compareShareCard = useMemo(
    () =>
      compareShareResult
        ? createCompareShareCard({
            result: compareShareResult,
            summary: interpretationText.summary,
            labels: displayedAnalyses.map((analysis) => analysis.label),
            safeInterpretationMode,
            slotCount,
            activeEducationStage,
          })
        : null,
    [activeEducationStage, compareShareResult, displayedAnalyses, interpretationText.summary, safeInterpretationMode, slotCount],
  )
  const researchSnapshots = useMemo<ResearchSnapshot[]>(
    () =>
      displayedAnalyses.map((analysis, index) =>
        buildResearchSnapshot({
          run: {
            id: `compare-${analysis.label}-${index}`,
            type: 'compare',
            status: 'complete',
            createdAt: new Date().toISOString(),
            detail: `${analysis.label} comparison snapshot`,
            payload: {
              result: analysis,
              parameters: {
                label: analysis.label,
                quality: analysis.quality.level,
                sourceName: analysis.file.name,
              },
            },
          } as RunSummary,
          title: `${analysis.label} comparison`,
          summary: `${analysis.label}: D ${analysis.fractalDimension.toFixed(4)}, R² ${analysis.fitR2.toFixed(4)}.`,
          metrics: [
            { label: 'Dimension', value: analysis.fractalDimension.toFixed(4) },
            { label: 'R²', value: analysis.fitR2.toFixed(4) },
            { label: 'Quality', value: QUALITY_LABELS[analysis.quality.level] },
          ],
          annotations: [
            { label: 'Label', text: analysis.label },
            { label: 'Source', text: analysis.file.name },
          ],
          parameters: {
            label: analysis.label,
            quality: analysis.quality.level,
          },
          result: {
            fractalDimension: analysis.fractalDimension,
            fitR2: analysis.fitR2,
            quality: analysis.quality,
          },
        }),
      ),
    [displayedAnalyses],
  )
  const cohortComparisonMarkdown = useMemo(
    () => buildCohortComparisonMarkdown(researchSnapshots),
    [researchSnapshots],
  )
  const cohortComparisonJson = useMemo(
    () => buildCohortComparisonJson(researchSnapshots),
    [researchSnapshots],
  )
  const publicationFigureManifest = useMemo(
    () =>
      compareShareCard
        ? buildPublicationFigureManifest({
            version: 1,
            title: compareShareCard.title,
            module: 'compare',
            runId: compareShareCard.id,
            createdAt: compareShareCard.createdAt,
            summary: compareShareCard.summary,
            provenance: {
              version: 1,
              module: 'compare',
              generatedAt: compareShareCard.createdAt,
              source: 'local',
              method: 'Comparison cohort export',
              appVersion: 'unknown',
            },
            parameters: { labels: displayedAnalyses.map((analysis) => analysis.label) },
            result: compareShareResult,
            artifacts: {},
            metrics: [],
            annotations: researchSnapshots.flatMap((snapshot) => snapshot.annotations),
          })
        : null,
    [compareShareCard, compareShareResult, displayedAnalyses, researchSnapshots],
  )
  const {
    shareUrl: compareShareUrl,
    shareText: compareShareText,
    shareStatus: compareShareStatus,
    copyShareLink: copyCompareShareLink,
    copyShareText: copyCompareShareText,
    saveShareCard: saveCompareShareCard,
    remixShareCard,
  } = useWorkbenchShareArtifact<{
    labels?: string[]
    safeInterpretationMode?: boolean
    slotCount?: number
    activeEducationStage?: number
  }>({
    card: compareShareCard,
    sourcePath: '/workbench/compare',
    copyLinkEventName: 'compare_share_link_copied',
    copyTextEventName: 'compare_share_card_copied',
    saveEventName: 'compare_share_saved',
    remixEventName: 'compare_share_remixed',
    eventPayload: { labels: displayedAnalyses.map((analysis) => analysis.label) },
    onRemix: (state) => {
      if (typeof state.slotCount === 'number') {
        setSlotCount(Math.min(MAX_IMAGES, Math.max(MIN_IMAGES, state.slotCount)))
      }
      if (Array.isArray(state.labels)) {
        const labels = state.labels
        setCustomLabels(labels.slice(0, MAX_IMAGES))
        setUseFilenameLabels(false)
      }
      if (typeof state.safeInterpretationMode === 'boolean') {
        setSafeInterpretationMode(state.safeInterpretationMode)
      }
      if (typeof state.activeEducationStage === 'number') {
        setActiveEducationStage(state.activeEducationStage)
      }
    },
  })

  const classroomStatus = useMemo(() => {
    const checklist = defaultChecklistStatus([
      'Upload two or more comparable images',
      'Run the comparison and inspect QC',
      'Keep safe interpretation mode on',
      'Copy or export the report for submission',
    ])

    checklist[0].complete = selectedImages.length >= 2
    checklist[0].detail = `${selectedImages.length} uploaded`
    checklist[1].complete = analyses.length > 0 && displayedAnalyses.every((analysis) => analysis.quality.level !== 'unreliable')
    checklist[1].detail = analyses.length ? `Quality ${[...displayedAnalyses].every((analysis) => analysis.quality.level === 'trusted') ? 'trusted' : 'mixed'}` : 'Waiting for run'
    checklist[2].complete = safeInterpretationMode
    checklist[2].detail = safeInterpretationMode ? 'Safe mode enabled' : 'Turned off'
    checklist[3].complete = analyses.length > 0
    checklist[3].detail = analyses.length ? 'Report ready' : 'Run comparison first'

    return buildClassroomStatus(
      'compare',
      [
        { label: 'Images', value: String(displayedAnalyses.length || selectedImages.length) },
        { label: 'QC', value: analyses.length ? (displayedAnalyses.every((analysis) => analysis.quality.level === 'trusted') ? 'Trusted' : 'Mixed') : 'Pending' },
        { label: 'Stage', value: String(activeEducationStage) },
        {
          label: 'Spread',
          value: analyses.length
            ? (Math.max(...displayedAnalyses.map((analysis) => analysis.fractalDimension)) - Math.min(...displayedAnalyses.map((analysis) => analysis.fractalDimension))).toFixed(4)
            : '—',
        },
      ],
      checklist,
      {
        submissionStatus: analyses.length ? 'ready-to-submit' : selectedImages.length >= 2 ? 'in-progress' : 'not-started',
        progressLabel: `${Math.min(selectedImages.length, 2)}/2 images ready`,
        summary: analyses.length
          ? `Comparison complete for ${displayedAnalyses.length} image${displayedAnalyses.length === 1 ? '' : 's'}.`
          : 'Comparison setup is ready for a classroom run.',
      },
    )
  }, [activeEducationStage, analyses.length, displayedAnalyses, safeInterpretationMode, selectedImages.length])

  const exportCompareHandout = () => {
    downloadTextAsFile(
      'compare-classroom-handout.md',
      buildHandoutMarkdown('compare', classroomStatus, ['Use the share card to submit the class result.']),
      'text/markdown',
    )
    trackWorkbenchEvent('compare_classroom_handout_exported', { images: selectedImages.length, safeInterpretationMode })
  }

  const exportCompareSlides = () => {
    downloadTextAsFile(
      'compare-slide-summary.md',
      buildSlideSummaryMarkdown('compare', classroomStatus, [
        `Images compared: ${displayedAnalyses.length || selectedImages.length}`,
        `Safe interpretation: ${safeInterpretationMode ? 'on' : 'off'}`,
        `Stage: ${activeEducationStage}`,
      ]),
      'text/markdown',
    )
    trackWorkbenchEvent('compare_classroom_slides_exported', { images: selectedImages.length, safeInterpretationMode })
  }

  const exportCompareCohortNote = () => {
    downloadTextAsFile('compare-cohort-comparison.md', cohortComparisonMarkdown, 'text/markdown')
  }

  const exportCompareCohortJson = () => {
    downloadJson('compare-cohort-comparison.json', cohortComparisonJson)
  }

  const exportCompareFigureManifest = () => {
    if (!publicationFigureManifest) {
      return
    }

    downloadJson('compare-figure-manifest.json', publicationFigureManifest)
  }

  const copyStageTwoReport = async () => {
    try {
      await navigator.clipboard.writeText(stageTwoReport)
      setCopyStatus('copied')
      window.setTimeout(() => setCopyStatus('idle'), 1800)
    } catch {
      setCopyStatus('error')
      window.setTimeout(() => setCopyStatus('idle'), 2200)
    }
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!analyses.length) {
        return
      }

      const target = event.target as HTMLElement | null
      if (target) {
        const tagName = target.tagName.toLowerCase()
        const isTypingField =
          tagName === 'input' ||
          tagName === 'textarea' ||
          tagName === 'select' ||
          target.isContentEditable

        if (isTypingField) {
          return
        }
      }

      if (event.key === '1') {
        setActiveEducationStage(1)
      } else if (event.key === '2') {
        setActiveEducationStage(2)
      } else if (event.key === '3') {
        setActiveEducationStage(3)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [analyses.length])

  useEffect(() => {
    persistCompareViewState({
      slotCount,
      customLabels,
      useFilenameLabels,
      safeInterpretationMode,
      activeEducationStage,
    })
  }, [activeEducationStage, customLabels, safeInterpretationMode, slotCount, useFilenameLabels])

  useEffect(() => {
    if (educatorMode) {
      setSafeInterpretationMode(true)
    }
  }, [educatorMode])

  useEffect(() => {
    if (shareHydratedRef.current) {
      return
    }
    shareHydratedRef.current = true
    if (typeof window === 'undefined') {
      return
    }

    const url = new URL(window.location.href)
    const encodedShare = url.searchParams.get('share')
    if (!encodedShare) {
      return
    }

    const decodedShare = decodeWorkbenchShareRecord(encodedShare)
    const shareState = decodedShare?.card.shareState as
      | {
          labels?: string[]
          safeInterpretationMode?: boolean
          slotCount?: number
          activeEducationStage?: number
        }
      | undefined

    if (!shareState) {
      return
    }

    if (typeof shareState.slotCount === 'number') {
      setSlotCount(Math.min(MAX_IMAGES, Math.max(MIN_IMAGES, shareState.slotCount)))
    }
    if (Array.isArray(shareState.labels)) {
      setCustomLabels((prev) => {
        const next = [...prev]
        shareState.labels?.forEach((label, index) => {
          if (index < MAX_IMAGES) {
            next[index] = label
          }
        })
        return next
      })
    }
    if (typeof shareState.safeInterpretationMode === 'boolean') {
      setSafeInterpretationMode(shareState.safeInterpretationMode)
    }
    if (typeof shareState.activeEducationStage === 'number') {
      setActiveEducationStage(shareState.activeEducationStage)
    }
  }, [])

  const setFileAt = (index: number, file: File | null) => {
    setFiles((prev) => {
      const next = [...prev]
      next[index] = file
      return next
    })
  }

  const setCustomLabelAt = (index: number, value: string) => {
    setCustomLabels((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const analysisPayload = useMemo(() => {
    return selectedImages.map((image) => ({
      ...image,
      originalUrl: previewUrls[image.index] ?? '',
    }))
  }, [selectedImages, previewUrls])

  return (
    <div className="tool-grid compare-tool-grid">
      <GuidedKickoffPanel
        title="Image Comparison Studio"
        subtitle="Load matching images, keep the interpretation safe, and compare the scaling story."
        steps={[
          'Upload at least two images that answer the same question.',
          'Use the built-in labels and preprocessing controls to align the comparison.',
          'Read the fit quality before you treat the dimension estimate as meaningful.',
        ]}
        actions={[
          {
            label: 'Try discovery feed',
            to: '/workbench/discover',
            description: 'Pick a challenge or open a shared example.',
          },
          {
            label: 'Open run history',
            to: '/workbench/runs',
            description: 'Inspect previous comparisons and exports.',
          },
        ]}
        note="Safe interpretation mode keeps the story grounded in evidence, which is especially useful in classroom settings."
      />

      <div className="compare-column compare-column-left">
        <div className="compare-step compare-step-1">
          <Panel title="Step 1: Load and align" subtitle="Use matched images so the comparison measures structure, not capture drift.">
            <div className="compare-step1-layout">
              <div className="compare-step1-left">
                <div className="compare-upload-stack">
                  {Array.from({ length: slotCount }).map((_, index) => (
                    <div key={`image-slot-${index}`} className="compare-upload-item">
                      <FilePicker
                        label={imageLetterLabel(index)}
                        onChange={(file) => setFileAt(index, file)}
                      />
                      <label className="compare-custom-label-field">
                        <span>Custom label (optional)</span>
                        <input
                          type="text"
                          maxLength={60}
                          value={customLabels[index] ?? ''}
                          onChange={(event) => setCustomLabelAt(index, event.target.value)}
                          placeholder={`Example: Sample ${String.fromCharCode(65 + index)} / Patient ${index + 1}`}
                        />
                      </label>
                    </div>
                  ))}
                  <div className="compare-slot-actions">
                    <button
                      type="button"
                      className="overlay-toggle"
                      disabled={slotCount >= MAX_IMAGES}
                      onClick={() => setSlotCount((count) => Math.min(MAX_IMAGES, count + 1))}
                    >
                      Add image slot
                    </button>
                    <button
                      type="button"
                      className="overlay-toggle"
                      disabled={slotCount <= MIN_IMAGES}
                      onClick={() => {
                        setSlotCount((count) => {
                          const nextCount = Math.max(MIN_IMAGES, count - 1)
                          setFiles((prev) => {
                            const next = [...prev]
                            for (let index = nextCount; index < MAX_IMAGES; index += 1) {
                              next[index] = null
                            }
                            return next
                          })
                          setCustomLabels((prev) => {
                            const next = [...prev]
                            for (let index = nextCount; index < MAX_IMAGES; index += 1) {
                              next[index] = ''
                            }
                            return next
                          })
                          return nextCount
                        })
                      }}
                    >
                      Remove last slot
                    </button>
                  </div>

                  <div className="compare-label-mode" role="group" aria-label="Image label mode">
                    <p className="compare-label-mode-title">Label mode</p>
                    <button
                      type="button"
                      className={`overlay-toggle ${useFilenameLabels ? 'is-active' : ''}`}
                      onClick={() => setUseFilenameLabels(true)}
                    >
                      Filename labels
                    </button>
                    <button
                      type="button"
                      className={`overlay-toggle ${!useFilenameLabels ? 'is-active' : ''}`}
                      onClick={() => setUseFilenameLabels(false)}
                    >
                      Image A-E labels
                    </button>
                  </div>

                  <p className="muted">Selected {selectedImages.length}/{slotCount} active images. You can add up to {MAX_IMAGES}.</p>
                </div>

                <div className="compare-compact-preview-list" aria-label="Uploaded image previews">
                  {selectedImages.length ? (
                    selectedImages.map((image) => (
                      <div key={`${image.index}-${image.label}`} className="compare-compact-preview-item">
                        <p className="compare-compact-preview-title">{image.label}</p>
                        {previewUrls[image.index] ? (
                          <img src={previewUrls[image.index]} alt={`${image.label} uploaded preview`} className="compare-compact-preview-image" />
                        ) : (
                          <div className="compare-compact-preview-empty">Preview unavailable</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="muted">Upload at least two images to unlock comparison.</p>
                  )}
                </div>

                <div className="form-grid">
                  <div className="edu-note">
                    <p className="edu-note-title">What this step does</p>
                    <p>Image Compare works best when both inputs come from the same modality, resolution, and preprocessing path.</p>
                    <p>This multi-image mode compares up to five samples using the same preprocessing and box-size scales.</p>
                  </div>
                  <button
                    className="action"
                    type="button"
                    disabled={compareMutation.isPending || analysisPayload.length < MIN_IMAGES}
                    onClick={() => compareMutation.mutate(analysisPayload)}
                  >
                    {compareMutation.isPending ? (
                      <>
                        <span className="button-spinner" aria-hidden="true" />
                        Comparing...
                      </>
                    ) : (
                      `Compare ${analysisPayload.length || MIN_IMAGES} Images`
                    )}
                  </button>
                  {analysisPayload.length < MIN_IMAGES ? <p className="muted">At least two uploads are required.</p> : null}
                </div>

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
              </div>

              <div className="compare-step1-right">
                {analyses.length ? (
                  <div className="compare-preprocess-stack">
                    {displayedAnalyses.map((analysis) => (
                      <div key={`${analysis.label}-preprocess`} className="compare-preprocess-item">
                        <p className="compare-preprocess-title">{analysis.label}</p>
                        <div className={`compare-quality-badge compare-quality-${analysis.quality.level}`}>
                          <strong>{QUALITY_LABELS[analysis.quality.level]}</strong>
                          <span>{analysis.quality.summary}</span>
                        </div>
                        <div className="compare-preprocess-grid">
                          <div className="compare-visual-card compare-visual-card-image">
                            <p className="compare-visual-title">Original</p>
                            <img className="compare-visual-image" src={analysis.originalUrl} alt={`${analysis.label} original`} />
                          </div>
                          <div className="compare-visual-card compare-visual-card-image">
                            <p className="compare-visual-title">Greyscale</p>
                            <img className="compare-visual-image" src={analysis.grayscaleUrl} alt={`${analysis.label} grayscale`} />
                          </div>
                          <div className="compare-visual-card compare-visual-card-image">
                            <p className="compare-visual-title">Binarized</p>
                            <img className="compare-visual-image" src={analysis.binarizedUrl} alt={`${analysis.label} binarized`} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="compare-empty-state" aria-live="polite">
                    <p className="compare-empty-state-title">No preprocessing previews yet</p>
                    <p className="compare-empty-state-copy">Preprocessing previews appear here after running comparison.</p>
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="compare-column compare-column-right">
        <div className="compare-step compare-step-2">
          <Panel title="Step 2: Preprocess and count" subtitle="The algorithm scans a stable box-size ladder and counts occupied boxes at each step.">
            {analyses.length ? (
              <div className="compare-overlay-stack">
                {displayedAnalyses.map((analysis) => (
                  <div key={`${analysis.label}-overlays`} className="compare-visual-set">
                    <p className="compare-visual-set-title">{analysis.label}</p>
                    <div className="compare-visual-grid compare-overlay-grid">
                      {analysis.overlayVisuals.map((visual) => (
                        <div key={`${analysis.label}-${visual.size}`} className="compare-visual-card compare-overlay-card">
                          <p className="compare-visual-title">Box size {visual.size}</p>
                          <p className="compare-visual-meta">Occupied boxes: {visual.count}</p>
                          <img className="compare-visual-image" src={visual.url} alt={`${analysis.label} box overlay ${visual.size}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Run a comparison to see the per-scale box counts and preprocessing summary.</p>
            )}
          </Panel>
        </div>

        <div className="compare-step compare-step-3">
          <Panel title="Step 3: Fit the scaling law" subtitle="The log-log slope is the estimated fractal dimension, and R² shows how linear the scale law is.">
            {analyses.length ? (
              <div className="compare-step-3-shell">
                <div className="edu-chip-row compare-step-3-chips" aria-label="Comparison summary">
                  <span className="edu-chip">Images: {displayedAnalyses.length}</span>
                  <span className="edu-chip">Quality: {[...displayedAnalyses].every((analysis) => analysis.quality.level === 'trusted') ? 'Trusted' : 'Mixed'}</span>
                  <span className="edu-chip">Scale ladder: {displayedAnalyses[0]?.boxCounts.map((item) => item.size).join(', ')}</span>
                  <span className="edu-chip">
                    Top image:{' '}
                    {[...displayedAnalyses].some((analysis) => analysis.quality.level === 'unreliable')
                      ? 'withheld due to QC'
                      : [...displayedAnalyses].sort((left, right) => right.fractalDimension - left.fractalDimension)[0].label}
                  </span>
                </div>
                <div className="compare-step-3-summary" aria-label="Quick metrics">
                  <div className="insight-card insight-low">
                    <p className="insight-label">Most complex</p>
                    <p className="insight-value">
                      {[...displayedAnalyses].some((analysis) => analysis.quality.level === 'unreliable')
                        ? 'Withheld'
                        : [...displayedAnalyses].sort((left, right) => right.fractalDimension - left.fractalDimension)[0].label}
                    </p>
                  </div>
                  <div className="insight-card insight-moderate">
                    <p className="insight-label">Fractal spread</p>
                    <p className="insight-value">
                      {(Math.max(...displayedAnalyses.map((analysis) => analysis.fractalDimension)) - Math.min(...displayedAnalyses.map((analysis) => analysis.fractalDimension))).toFixed(4)}
                    </p>
                  </div>
                  <div className="insight-card insight-high">
                    <p className="insight-label">QC status</p>
                    <p className="insight-value">
                      {[...displayedAnalyses].every((analysis) => analysis.quality.level === 'trusted') ? 'Stable' : 'Review needed'}
                    </p>
                  </div>
                </div>
                <div className="compare-step-3-layout">
                  <div className="compare-step-3-side">
                    <div className="table-wrap compare-table-wrap-compact">
                      <table className="runs-table">
                        <thead>
                          <tr>
                            <th scope="col">Image</th>
                            <th scope="col">D</th>
                            <th scope="col">R²</th>
                            <th scope="col">QC</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedAnalyses.map((analysis) => (
                            <tr key={`${analysis.label}-metrics`}>
                              <td>{analysis.label}</td>
                              <td>{analysis.quality.level === 'unreliable' ? '—' : analysis.fractalDimension.toFixed(4)}</td>
                              <td>{analysis.quality.level === 'unreliable' ? '—' : analysis.fitR2.toFixed(4)}</td>
                              <td>{analysis.quality.title}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="compare-step-3-side compare-step-3-chart">
                    <MultiSeriesLogChart analyses={displayedAnalyses} />
                  </div>
                </div>
              </div>
            ) : (
              <p className="muted">The scaling-law fit appears here after the comparison finishes.</p>
            )}
          </Panel>
        </div>

        <div className="compare-step compare-step-4">
          <Panel title="Step 4: Interpret the results" subtitle="Turn the curve into an explanation that students, researchers, and communities can use.">
            {analyses.length ? (
              <>
                <div className="edu-chip-row" aria-label="Comparison interpretation">
                  <span className="edu-chip">Images compared: {displayedAnalyses.length}</span>
                  <span className="edu-chip">Scales: {BOX_SIZES.join(', ')}</span>
                  <span className="edu-chip">
                    Quality:{' '}
                    {[...displayedAnalyses].every((analysis) => analysis.quality.level === 'trusted') ? 'Trusted' : 'Mixed'}
                  </span>
                  <span className="edu-chip">
                    Top image:{' '}
                    {[...displayedAnalyses].some((analysis) => analysis.quality.level === 'unreliable')
                      ? 'withheld due to QC'
                      : [...displayedAnalyses].sort((left, right) => right.fractalDimension - left.fractalDimension)[0].label}
                  </span>
                </div>

                <div className="edu-note">
                  <p className="edu-note-title">Interpretation</p>
                  <p>{interpretationText.summary}</p>
                  <p>{interpretationText.student}</p>
                  <p>{interpretationText.researcher}</p>
                  <p>{interpretationText.community}</p>
                </div>

                <div className="compare-education-stages" aria-label="Three-stage explanation workflow">
                  <div className="compare-stage-progress" aria-label="Interpretation stages">
                    <button
                      type="button"
                      className={`compare-stage-tab ${activeEducationStage === 1 ? 'is-active' : ''}`}
                      onClick={() => setActiveEducationStage(1)}
                    >
                      Stage 1
                    </button>
                    <button
                      type="button"
                      className={`compare-stage-tab ${activeEducationStage === 2 ? 'is-active' : ''}`}
                      onClick={() => setActiveEducationStage(2)}
                    >
                      Stage 2
                    </button>
                    <button
                      type="button"
                      className={`compare-stage-tab ${activeEducationStage === 3 ? 'is-active' : ''}`}
                      onClick={() => setActiveEducationStage(3)}
                    >
                      Stage 3
                    </button>
                  </div>
                  <label className="compare-safe-toggle">
                    <input
                      type="checkbox"
                      checked={safeInterpretationMode}
                      onChange={(event) => setSafeInterpretationMode(event.target.checked)}
                    />
                    Safe interpretation mode
                  </label>
                  <p className="muted">Shortcut: press 1, 2, or 3 to jump between stages.</p>

                  <section className={`compare-stage-card ${activeEducationStage === 1 ? 'is-active' : ''}`} aria-labelledby="compare-stage-1-title">
                    <h3 id="compare-stage-1-title">Stage 1: Demo Protocol (2-5 Images)</h3>
                    <p>
                      Build a balanced cohort view: one healthy/control-style reference and up to four
                      lesion-focused samples. Keep modality and preprocessing consistent so the slope
                      differences represent structure, not scanner drift.
                    </p>
                    <ol className="compare-stage-list">
                      <li>Pick one baseline reference image (same sequence family as all others).</li>
                      <li>Add 1-4 comparison images from the same preprocessing path.</li>
                      <li>Run the same box sizes (8, 16, 32) for every image.</li>
                      <li>Only trust images that pass QC and show stable box-count scaling.</li>
                      <li>Use Stage 3 curves to rank complexity before drawing conclusions.</li>
                    </ol>
                    <div className="compare-stage-chip-row" aria-label="Current image slots">
                      {displayedAnalyses.map((analysis, index) => (
                        <span key={`${analysis.label}-slot`} className="compare-stage-chip">
                          Slot {index + 1}: {analysis.label}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className={`compare-stage-card ${activeEducationStage === 2 ? 'is-active' : ''}`} aria-labelledby="compare-stage-2-title">
                    <h3 id="compare-stage-2-title">Stage 2: Reporting Template</h3>
                    <p>
                      Use a fixed template to avoid over-claiming. Always pair fractal dimension with fit
                      quality (R²) and QC status, and include a safety note that this is quantitative support, not a
                      standalone diagnosis.
                    </p>
                    <div className="compare-stage-actions">
                      <button type="button" className="overlay-toggle" onClick={copyStageTwoReport}>
                        Copy Stage 2 report
                      </button>
                      {copyStatus === 'copied' ? <span className="muted">Copied.</span> : null}
                      {copyStatus === 'error' ? <span className="muted">Clipboard unavailable. Copy manually from the template below.</span> : null}
                    </div>
                    <pre>{stageTwoReport}</pre>
                  </section>

                  <section className={`compare-stage-card ${activeEducationStage === 3 ? 'is-active' : ''}`} aria-labelledby="compare-stage-3-title">
                    <h3 id="compare-stage-3-title">Stage 3: Dataset Acquisition Guide</h3>
                    <p>
                      Use public datasets to build reproducible examples of healthy/control brains and
                      heterogeneous tumor subregions (edema, enhancing tumor, necrotic or non-enhancing
                      core) across MRI sequences.
                    </p>
                    <div className="compare-dataset-grid">
                      <a href="https://www.oasis-brains.org/" target="_blank" rel="noopener noreferrer" className="compare-dataset-card">
                        <strong>OASIS</strong>
                        <span>Healthy/control structural brain MRI cohorts.</span>
                      </a>
                      <a href="https://www.brain-development.org/ixi-dataset/" target="_blank" rel="noopener noreferrer" className="compare-dataset-card">
                        <strong>IXI</strong>
                        <span>Healthy multi-sequence MRI for control comparisons.</span>
                      </a>
                      <a href="https://www.cancerimagingarchive.net/access-data/" target="_blank" rel="noopener noreferrer" className="compare-dataset-card">
                        <strong>TCIA / BraTS-related collections</strong>
                        <span>Tumor-focused datasets and analysis resources.</span>
                      </a>
                      <a href="https://arxiv.org/abs/1811.02629" target="_blank" rel="noopener noreferrer" className="compare-dataset-card">
                        <strong>BraTS overview paper</strong>
                        <span>Reference for heterogeneous glioma subregions and mpMRI usage.</span>
                      </a>
                    </div>
                    <p className="muted">
                      Sequence reminder: T1 and post-contrast T1 emphasize anatomy and enhancement;
                      T2 and FLAIR better reveal edema-like hyperintense regions.
                    </p>
                  </section>
                </div>

                {educatorMode ? (
                  <ClassroomPanel
                    moduleId="compare"
                    status={classroomStatus}
                    educatorMode={educatorMode}
                    onExportHandout={exportCompareHandout}
                    onExportSlides={exportCompareSlides}
                  />
                ) : null}

                {compareShareCard ? (
                  <div className="compare-share-panel">
                    <ResultCardPanel
                      card={compareShareCard}
                      shareUrl={compareShareUrl}
                      cardText={compareShareText}
                      primaryActionLabel="Save example"
                      secondaryActionLabel="Remix layout"
                      onPrimaryAction={saveCompareShareCard}
                      onSecondaryAction={remixShareCard}
                      onCopyText={copyCompareShareText}
                      onCopyLink={copyCompareShareLink}
                    />
                    <div className="edu-note">
                      <p className="edu-note-title">Share status</p>
                      <p>
                        {compareShareStatus === 'copied'
                          ? 'Copied to clipboard.'
                          : compareShareStatus === 'saved'
                            ? 'Saved to the local gallery.'
                            : compareShareStatus === 'error'
                              ? 'Clipboard unavailable, but the card is still visible.'
                              : 'Use the buttons above to create a reusable link and local example.'}
                      </p>
                    </div>
                    <div className="edu-note">
                      <p className="edu-note-title">Research exports</p>
                      <p>Export a side-by-side cohort note, a normalized JSON bundle, or a figure manifest for papers and lab notes.</p>
                      <div className="compare-stage-actions">
                        <button type="button" className="overlay-toggle" onClick={exportCompareCohortNote}>
                          Export cohort note
                        </button>
                        <button type="button" className="overlay-toggle" onClick={exportCompareCohortJson}>
                          Export cohort JSON
                        </button>
                        <button type="button" className="overlay-toggle" onClick={exportCompareFigureManifest}>
                          Export figure manifest
                        </button>
                      </div>
                    </div>
                    <CommentThreadPanel
                      target={{ kind: 'card', id: compareShareCard.id, title: compareShareCard.title, module: 'compare' }}
                      subject="compare result card"
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <p className="muted">After analysis, this section explains which image is more complex and why the difference matters.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
