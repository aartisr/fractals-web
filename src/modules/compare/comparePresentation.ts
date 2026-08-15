export type ComparePresentationAnalysis = {
  label: string
  fractalDimension: number
  fitR2: number
  boxCounts: Array<{ size: number; count: number }>
  quality: { level: 'trusted' | 'caution' | 'unreliable'; title: string }
}

export const imageLetterLabel = (index: number) => `Image ${String.fromCharCode(65 + index)}`

export const clipLabel = (value: string, maxLength = 42) => {
  const normalized = value.trim()
  if (!normalized) return ''
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized
}

export const sanitizeFilenameLabel = (file: File) => {
  const base = file.name.replace(/\.[^.]+$/, '').trim()
  return base ? clipLabel(base) : file.name || 'Untitled image'
}

export const buildTickValues = (min: number, max: number, tickCount = 4) => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  if (Math.abs(max - min) < 1e-6) return [min]
  return Array.from({ length: tickCount }, (_, index) => min + ((max - min) * index) / (tickCount - 1))
}

export const buildInterpretation = (analyses: ComparePresentationAnalysis[]) => {
  if (analyses.length < 2) return { summary: 'Upload at least two images to compare fractal dimensions.', student: '', researcher: '', community: '' }

  const dimensions = analyses.map((analysis) => analysis.fractalDimension)
  const mean = dimensions.reduce((sum, value) => sum + value, 0) / dimensions.length
  const variance = dimensions.reduce((sum, value) => sum + (value - mean) ** 2, 0) / dimensions.length
  const stdDev = Math.sqrt(variance)
  const ranked = [...analyses].sort((left, right) => right.fractalDimension - left.fractalDimension)
  const highest = ranked[0]
  const lowest = ranked[ranked.length - 1]
  const unreliableCount = analyses.filter((analysis) => analysis.quality.level === 'unreliable').length
  const cautionCount = analyses.filter((analysis) => analysis.quality.level === 'caution').length

  if (unreliableCount > 0) return { summary: `One or more images failed quality checks, so the fractal comparison is not stable enough to trust. ${unreliableCount} image${unreliableCount === 1 ? '' : 's'} were marked unreliable.`, student: 'When QC fails, the safest interpretation is to withhold the result instead of ranking the images.', researcher: 'Report the QC failure first, then repeat with more scales, cleaner preprocessing, or a larger region of interest.', community: 'This run should not be used for conclusions because the estimate is too unstable.' }
  if (cautionCount > 0) return { summary: `The comparison is usable, but ${cautionCount} image${cautionCount === 1 ? '' : 's'} only passed limited-confidence checks.`, student: 'Treat the ranking as provisional and confirm it with a repeat run.', researcher: `Keep the comparison, but note that ${cautionCount} image${cautionCount === 1 ? ' has' : 's have'} borderline quality.`, community: 'This comparison is informative, but it should be reviewed alongside expert interpretation.' }

  if (analyses.length === 2) {
    const delta = Math.abs(highest.fractalDimension - lowest.fractalDimension)
    return { summary: `${highest.label} has the higher fractal complexity. Absolute delta is ${delta.toFixed(4)} (${((delta / Math.max(highest.fractalDimension, 1)) * 100).toFixed(1)}%).`, student: 'When two lines separate clearly on the log-log plot, the image with the steeper line is more space-filling.', researcher: `Both images should report dimension and R² together. Current fit quality: ${highest.label} ${highest.fitR2.toFixed(4)}, ${lowest.label} ${lowest.fitR2.toFixed(4)}.`, community: 'This is a structural complexity comparison, not a diagnosis. Use it as a quantitative discussion aid.' }
  }

  const spread = highest.fractalDimension - lowest.fractalDimension
  return { summary: `${analyses.length} images compared. Highest complexity: ${highest.label} (${highest.fractalDimension.toFixed(4)}). Lowest complexity: ${lowest.label} (${lowest.fractalDimension.toFixed(4)}). Cohort spread: ${spread.toFixed(4)}; mean: ${mean.toFixed(4)}; std-dev: ${stdDev.toFixed(4)}.`, student: 'Use rank order to see which samples are smooth versus irregular. The spread tells you how diverse the cohort is.', researcher: `Report cohort statistics (mean=${mean.toFixed(4)}, std=${stdDev.toFixed(4)}) with per-image R² for reproducibility and quality control.`, community: 'Comparing multiple samples helps prioritize outliers for deeper review, but should not replace domain expertise.' }
}

export const softenInterpretation = (text: string) => text
  .replace('has the higher fractal complexity.', 'shows a higher measured fractal complexity in this run.')
  .replace('is more space-filling.', 'appears more space-filling in this analysis window.')
  .replace('is more complex and why the difference matters.', 'shows different measured complexity and how to discuss that difference safely.')

export const buildStageTwoTemplate = (analyses: ComparePresentationAnalysis[], summary: string) => {
  const scaleLabel = analyses.length ? analyses[0].boxCounts.map((item) => item.size).join(', ') : '4, 8, 16, 32'
  if (!analyses.length) return ['Research question: ________________________________________________', 'Modality + preprocessing: _________________________________________', `Scale ladder used: ${scaleLabel}`, 'Key result: Upload at least two images to generate quantitative output.', 'Clinical note: Fractal dimension is a structural descriptor, not a diagnosis.'].join('\n')
  const rows = analyses.map((analysis) => `- ${analysis.label}: D=${analysis.quality.level === 'unreliable' ? 'withheld' : analysis.fractalDimension.toFixed(4)}, R²=${analysis.quality.level === 'unreliable' ? 'withheld' : analysis.fitR2.toFixed(4)}, QC=${analysis.quality.title}, points=${analysis.boxCounts.length}`).join('\n')
  return ['Research question: ________________________________________________', 'Modality + preprocessing: _________________________________________', `Scale ladder used: ${scaleLabel}`, `Key result: ${summary}`, 'Per-image metrics:', rows, 'Clinical note: Fractal dimension is a structural descriptor, not a diagnosis.'].join('\n')
}
