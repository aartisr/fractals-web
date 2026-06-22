import type { DetectionResult } from '../../core/services/contracts'

export function confidenceTier(confidence: number) {
  if (confidence >= 0.8) {
    return 'high'
  }

  if (confidence >= 0.5) {
    return 'medium'
  }

  return 'low'
}

export function summarizeConfidence(detections: Array<{ confidence: number }>) {
  return detections.reduce(
    (acc, detection) => {
      const tier = confidenceTier(detection.confidence)
      if (tier === 'high') {
        acc.high += 1
      } else if (tier === 'medium') {
        acc.medium += 1
      } else {
        acc.low += 1
      }
      return acc
    },
    { high: 0, medium: 0, low: 0 },
  )
}

export function formatDetectionBox(box: { x1: number; y1: number; x2: number; y2: number }) {
  return `x1=${box.x1.toFixed(1)}, y1=${box.y1.toFixed(1)}, x2=${box.x2.toFixed(1)}, y2=${box.y2.toFixed(1)}`
}

export function formatConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}%`
}

export type DetectionSummary = ReturnType<typeof summarizeConfidence>
export type TumorDetection = DetectionResult
