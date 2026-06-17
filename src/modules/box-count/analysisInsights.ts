import type { BoxCountResult } from '../../core/services/contracts'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export interface BoxCountInsight {
  complexityBand: 'low' | 'moderate' | 'high'
  complexityLabel: string
  fitR2: number
  slope: number
  stabilityLabel: string
  teachingHint: string
  points: Array<{ x: number; y: number }>
}

export function buildBoxCountInsight(result: BoxCountResult | undefined): BoxCountInsight | null {
  if (!result || result.boxCounts.length < 2) {
    return null
  }

  const points = result.boxCounts
    .filter((item) => item.size > 0 && item.count > 0)
    .map((item) => ({
      x: Math.log(1 / item.size),
      y: Math.log(item.count),
    }))

  if (points.length < 2) {
    return null
  }

  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length
  const numerator = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0)
  const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0)
  const slope = denominator === 0 ? 0 : numerator / denominator

  const fitted = points.map((point) => meanY + slope * (point.x - meanX))
  const ssRes = points.reduce((sum, point, index) => sum + (point.y - fitted[index]) ** 2, 0)
  const ssTot = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0)
  const fitR2 = ssTot === 0 ? 0 : clamp(1 - ssRes / ssTot, 0, 1)

  const dimension = result.fractalDimension
  const complexityBand = dimension < 1.2 ? 'low' : dimension < 1.6 ? 'moderate' : 'high'
  const complexityLabel =
    complexityBand === 'low'
      ? 'Sparse texture / smooth boundary'
      : complexityBand === 'moderate'
        ? 'Structured branching complexity'
        : 'Dense irregular complexity'

  const stabilityLabel = fitR2 >= 0.96 ? 'Very stable' : fitR2 >= 0.9 ? 'Stable' : 'Low stability'
  const teachingHint =
    fitR2 >= 0.9
      ? 'Your log-log trend is close to linear. This ROI is a good teaching example.'
      : 'Trend is noisy. Compare with another ROI or adjust ROI size for a clearer scaling regime.'

  return {
    complexityBand,
    complexityLabel,
    fitR2: Number(fitR2.toFixed(4)),
    slope: Number(slope.toFixed(4)),
    stabilityLabel,
    teachingHint,
    points,
  }
}
