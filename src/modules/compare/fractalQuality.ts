export type FractalQualityLevel = 'trusted' | 'caution' | 'unreliable'

export type FractalCountSample = {
  size: number
  count: number
}

export type FractalQualityAssessment = {
  level: FractalQualityLevel
  title: string
  summary: string
  reasons: string[]
  scaleCount: number
  scaleSpan: number
  fitR2: number
  fractalDimension: number
}

type FractalQualityInput = {
  boxCounts: FractalCountSample[]
  fractalDimension: number
  fitR2: number
}

const QUALITY_LABELS: Record<FractalQualityLevel, string> = {
  trusted: 'Trusted estimate',
  caution: 'Limited confidence',
  unreliable: 'Unreliable estimate',
}

const QUALITY_SORT_ORDER: Record<FractalQualityLevel, number> = {
  trusted: 0,
  caution: 1,
  unreliable: 2,
}

const MIN_TRUSTED_SCALES = 5
const MIN_CAUTION_SCALES = 3
const TRUSTED_R2 = 0.97
const CAUTION_R2 = 0.9
const MAX_EXPECTED_DIMENSION = 2.5
const MIN_SPAN_FOR_SIGNAL = 4

function toFiniteNumber(value: number) {
  return Number.isFinite(value) ? value : null
}

export function assessFractalQuality(input: FractalQualityInput): FractalQualityAssessment {
  const validCounts = input.boxCounts.filter((item) => Number.isFinite(item.size) && item.size > 0 && Number.isFinite(item.count) && item.count > 0)
  const scaleCount = validCounts.length
  const sizes = validCounts.map((item) => item.size)
  const minSize = sizes.length ? Math.min(...sizes) : 0
  const maxSize = sizes.length ? Math.max(...sizes) : 0
  const scaleSpan = minSize > 0 ? maxSize / minSize : 0
  const uniqueCounts = new Set(validCounts.map((item) => item.count)).size
  const reasons: string[] = []

  const dimension = toFiniteNumber(input.fractalDimension)
  const r2 = toFiniteNumber(input.fitR2)

  if (dimension === null || r2 === null) {
    return {
      level: 'unreliable',
      title: QUALITY_LABELS.unreliable,
      summary: 'The estimate cannot be trusted because one or more core metrics are not finite.',
      reasons: ['Missing or invalid fractal metric values.'],
      scaleCount,
      scaleSpan,
      fitR2: r2 ?? Number.NaN,
      fractalDimension: dimension ?? Number.NaN,
    }
  }

  if (scaleCount < MIN_CAUTION_SCALES) {
    reasons.push(`Only ${scaleCount} usable scales were available.`)
  } else if (scaleCount < MIN_TRUSTED_SCALES) {
    reasons.push(`Only ${scaleCount} usable scales were available.`)
  }

  if (scaleSpan < MIN_SPAN_FOR_SIGNAL) {
    reasons.push(`Scale span is narrow (${scaleSpan.toFixed(2)}x).`)
  }

  if (uniqueCounts < 3) {
    reasons.push('Box counts change too little across scales.')
  }

  if (dimension < 0 || dimension > MAX_EXPECTED_DIMENSION) {
    reasons.push(`Fractal dimension ${dimension.toFixed(4)} is outside the expected image range.`)
  }

  if (r2 < CAUTION_R2) {
    reasons.push(`Fit quality is weak (R² ${r2.toFixed(4)}).`)
  } else if (r2 < TRUSTED_R2) {
    reasons.push(`Fit quality is moderate (R² ${r2.toFixed(4)}).`)
  }

  const hardFailure =
    scaleCount < MIN_CAUTION_SCALES ||
    scaleSpan < MIN_SPAN_FOR_SIGNAL ||
    uniqueCounts < 3 ||
    dimension < 0 ||
    dimension > MAX_EXPECTED_DIMENSION ||
    r2 < CAUTION_R2

  const level: FractalQualityLevel = hardFailure
    ? 'unreliable'
    : scaleCount >= MIN_TRUSTED_SCALES && r2 >= TRUSTED_R2
      ? 'trusted'
      : 'caution'

  const summary =
    level === 'trusted'
      ? 'The estimate passes quality checks and is stable enough for side-by-side comparison, though still not diagnostic.'
      : level === 'caution'
        ? 'The estimate is usable but should be treated as limited-confidence evidence.'
        : 'The estimate is unstable and should be withheld rather than treated as a reliable result.'

  return {
    level,
    title: QUALITY_LABELS[level],
    summary,
    reasons,
    scaleCount,
    scaleSpan,
    fitR2: r2,
    fractalDimension: dimension,
  }
}

export function combineFractalQuality(assessments: Array<FractalQualityAssessment | null | undefined>): FractalQualityAssessment | null {
  const validAssessments = assessments.filter((assessment): assessment is FractalQualityAssessment => assessment !== null && assessment !== undefined)
  if (!validAssessments.length) {
    return null
  }

  return [...validAssessments].sort((left, right) => QUALITY_SORT_ORDER[right.level] - QUALITY_SORT_ORDER[left.level])[0]
}
