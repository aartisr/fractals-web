import type { BoxCountResult } from '../../core/services/contracts'

export function isUsableBoxCountResult(result: BoxCountResult): boolean {
  const hasPreview = !!result.previewUrl
  const hasFiniteDimension = Number.isFinite(result.fractalDimension)
  const hasRoi = Number.isFinite(result.roi.size) && result.roi.size > 0
  const hasCounts = result.boxCounts.some(
    (item) => Number.isFinite(item.size) && item.size > 0 && Number.isFinite(item.count) && item.count > 0,
  )

  return hasPreview && hasFiniteDimension && hasRoi && hasCounts
}
