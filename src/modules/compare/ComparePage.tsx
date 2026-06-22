import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { FilePicker } from '../../components/FilePicker'
import { Panel } from '../../components/Panel'
import { useOverlayPreference } from '../../core/hooks/useOverlayPreference'
import { buildCompareImageVisuals } from './compareVisuals'

const MAX_IMAGES = 5
const MIN_IMAGES = 2
const BOX_SIZES = [8, 16, 32]
const SERIES_COLORS = ['#ff7b4a', '#41d6a4', '#64b5f6', '#ffd166', '#b78dff']

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
}

function MultiSeriesLogChart({ analyses }: { analyses: ImageAnalysis[] }) {
  const [activeSeriesIndex, setActiveSeriesIndex] = useState<number | null>(null)
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
  const height = 220
  const xRange = Math.max(1e-6, maxX - minX)
  const yRange = Math.max(1e-6, maxY - minY)

  const mapX = (value: number) => pad + ((value - minX) / xRange) * (width - pad * 2)
  const mapY = (value: number) => height - pad - ((value - minY) / yRange) * (height - pad * 2)
  const buildPath = (points: Array<{ x: number; y: number }>) =>
    points.map((point, index) => `${index === 0 ? 'M' : 'L'}${mapX(point.x)} ${mapY(point.y)}`).join(' ')

  return (
    <div className="log-chart-wrap" aria-label="Multi-image log-log box counting chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="multi-image log-log slope chart">
        <line className="log-axis" x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} />
        <line className="log-axis" x1={pad} y1={height - pad} x2={pad} y2={pad} />
        {analyses.map((analysis, index) => (
          <g
            key={`${analysis.index}-${analysis.label}`}
            className={`log-series-${index % SERIES_COLORS.length} ${activeSeriesIndex !== null && activeSeriesIndex !== index ? 'is-muted' : ''}`}
          >
            <path className="log-line" d={buildPath(analysis.chartPoints)} />
            {analysis.chartPoints.map((point) => (
              <circle
                key={`${analysis.label}-${point.x}-${point.y}`}
                className="log-dot"
                cx={mapX(point.x)}
                cy={mapY(point.y)}
                r={3}
              />
            ))}
          </g>
        ))}
      </svg>
      <div className="compare-series-legend">
        {analyses.map((analysis, index) => (
          <button
            key={`${analysis.index}-${analysis.label}`}
            type="button"
            className={`compare-series-item ${activeSeriesIndex === index ? 'is-active' : ''} ${activeSeriesIndex !== null && activeSeriesIndex !== index ? 'is-muted' : ''}`}
            onClick={() => setActiveSeriesIndex((current) => (current === index ? null : index))}
          >
            <span className={`compare-series-dot compare-series-dot-${index % SERIES_COLORS.length}`} aria-hidden="true" />
            {analysis.label} (D={analysis.fractalDimension.toFixed(4)})
          </button>
        ))}
      </div>
      <p className="muted">x = log(1/box size), y = log(box count). Each line represents one uploaded image.</p>
    </div>
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
  if (!analyses.length) {
    return [
      'Research question: ________________________________________________',
      'Modality + preprocessing: _________________________________________',
      'Scale set used: 8, 16, 32',
      'Key result: Upload at least two images to generate quantitative output.',
      'Clinical note: Fractal dimension is a structural descriptor, not a diagnosis.',
    ].join('\n')
  }

  const rows = analyses
    .map(
      (analysis) =>
        `- ${analysis.label}: D=${analysis.fractalDimension.toFixed(4)}, R²=${analysis.fitR2.toFixed(4)}, points=${analysis.boxCounts.length}`,
    )
    .join('\n')

  return [
    'Research question: ________________________________________________',
    'Modality + preprocessing: _________________________________________',
    'Scale set used: 8, 16, 32',
    `Key result: ${summary}`,
    'Per-image metrics:',
    rows,
    'Clinical note: Fractal dimension is a structural descriptor, not a diagnosis.',
  ].join('\n')
}

export function ComparePage() {
  const [slotCount, setSlotCount] = useState(MIN_IMAGES)
  const [files, setFiles] = useState<Array<File | null>>(Array.from({ length: MAX_IMAGES }, () => null))
  const [customLabels, setCustomLabels] = useState<string[]>(Array.from({ length: MAX_IMAGES }, () => ''))
  const [analyses, setAnalyses] = useState<ImageAnalysis[]>([])
  const [useFilenameLabels, setUseFilenameLabels] = useState(true)
  const [showOverlays, setShowOverlays] = useOverlayPreference('compare.overlay.visible')
  const [activeEducationStage, setActiveEducationStage] = useState(1)
  const [safeInterpretationMode, setSafeInterpretationMode] = useState(true)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
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
                    <div className="compare-preprocess-grid">
                      <div className="compare-visual-card">
                        <p className="compare-visual-title">Original</p>
                        <img className="compare-visual-image" src={analysis.originalUrl} alt={`${analysis.label} original`} />
                      </div>
                      <div className="compare-visual-card">
                        <p className="compare-visual-title">Greyscale</p>
                        <img className="compare-visual-image" src={analysis.grayscaleUrl} alt={`${analysis.label} grayscale`} />
                      </div>
                      <div className="compare-visual-card">
                        <p className="compare-visual-title">Binarized</p>
                        <img className="compare-visual-image" src={analysis.binarizedUrl} alt={`${analysis.label} binarized`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">Preprocessing previews appear here after running comparison.</p>
            )}
          </div>
        </div>
      </Panel>
      </div>

      <div className="compare-step compare-step-2">
      <Panel title="Step 2: Preprocess and count" subtitle="The algorithm scans fixed box sizes (8, 16, 32) and counts occupied boxes at each step.">
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
          <>
            <div className="table-wrap">
              <table className="runs-table">
                <thead>
                  <tr>
                    <th scope="col">Image</th>
                    <th scope="col">Fractal Dimension</th>
                    <th scope="col">R²</th>
                    <th scope="col">Box Points</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedAnalyses.map((analysis) => (
                    <tr key={`${analysis.label}-metrics`}>
                      <td>{analysis.label}</td>
                      <td>{analysis.fractalDimension.toFixed(4)}</td>
                      <td>{analysis.fitR2.toFixed(4)}</td>
                      <td>{analysis.boxCounts.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <MultiSeriesLogChart analyses={displayedAnalyses} />
          </>
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
              <span className="edu-chip">Top image: {[...displayedAnalyses].sort((left, right) => right.fractalDimension - left.fractalDimension)[0].label}</span>
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
                  quality (R²), and include a safety note that this is quantitative support, not a
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
          </>
        ) : (
          <p className="muted">After analysis, this section explains which image is more complex and why the difference matters.</p>
        )}
      </Panel>
      </div>
    </div>
  )
}
