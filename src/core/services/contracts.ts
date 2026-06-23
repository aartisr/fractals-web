export type FractalType =
  | 'Mandelbrot'
  | 'Julia'
  | 'Burning Ship'
  | 'Newton'
  | 'Barnsley Fern'
  | 'Sierpinski Triangle'

export interface FractalParams {
  type: FractalType
  width: number
  height: number
  maxIter: number
  colorScheme: string
  power?: number
  cReal?: number
  cImag?: number
}

export interface FractalResult {
  runId: string
  imageUrl: string
  metadata: {
    extent: [number, number, number, number]
  } & FractalParams
}

export interface BoxCountResult {
  runId: string
  fractalDimension: number
  elapsedSeconds: number
  roi: {
    x: number
    y: number
    size: number
  }
  boxCounts: Array<{ size: number; count: number }>
  previewUrl: string
}

export interface CompareResult {
  runId: string
  imageA: {
    fractalDimension: number
    elapsedSeconds?: number
    fitR2?: number
    boxCounts?: Array<{ size: number; count: number }>
  }
  imageB: {
    fractalDimension: number
    elapsedSeconds?: number
    fitR2?: number
    boxCounts?: Array<{ size: number; count: number }>
  }
  delta: number
  interpretation: string
}

export interface DetectionResult {
  runId: string
  view: 'axial' | 'coronal' | 'sagittal'
  sourceImageUrl?: string
  overlayImageUrl?: string
  cropImageUrl?: string
  detections: Array<{
    label: string
    confidence: number
    box: { x1: number; y1: number; x2: number; y2: number }
  }>
  imageUrl: string
}

export type RunType = 'fractal' | 'box_count' | 'compare' | 'tumor_detection'

export interface RunProvenance {
  version: 1
  module: RunType
  generatedAt: string
  source: 'local' | 'api'
  method: string
  appVersion: string
}

export interface RunSummary {
  id: string
  type: RunType
  status: 'queued' | 'running' | 'complete' | 'failed'
  createdAt: string
  detail: string
  payload?: unknown
  provenance?: RunProvenance
}

export interface RunDetail extends RunSummary {
  result?: unknown
  parameters?: unknown
  artifacts?: Record<string, string>
  errorMessage?: string
}

export interface JobAccepted {
  status: 'queued' | 'running'
  jobId: string
}

export interface JobStatus<T> {
  status: 'queued' | 'running' | 'complete' | 'failed'
  result?: T
  errorMessage?: string
}
