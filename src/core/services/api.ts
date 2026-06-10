import type {
  BoxCountResult,
  CompareResult,
  DetectionResult,
  FractalParams,
  FractalResult,
  JobAccepted,
  JobStatus,
  RunDetail,
  RunSummary,
  RunType,
} from './contracts'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const HISTORY_KEY = 'fractals-workbench-runs'

const isJobAccepted = (value: unknown): value is JobAccepted => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  const jobId = candidate.jobId ?? candidate.job_id ?? candidate.id
  const status = candidate.status
  return typeof jobId === 'string' && (status === 'queued' || status === 'running')
}

const asRecord = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' ? (value as Record<string, unknown>) : {})
const asString = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback)
const asNumber = (value: unknown, fallback = 0): number => (typeof value === 'number' ? value : fallback)
const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])
const pick = <T = unknown>(obj: Record<string, unknown>, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    if (key in obj) {
      return obj[key] as T
    }
  }
  return undefined
}

const resolveAssetUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }

  if (url.startsWith('/')) {
    return `${API_BASE_URL}${url}`
  }

  return `${API_BASE_URL}/${url}`
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}

const unwrapJobResult = <T>(job: JobStatus<T> & Record<string, unknown>): T | undefined => {
  return (pick(job, 'result', 'data', 'payload') as T | undefined) ?? undefined
}

const loadLocalHistory = (): RunSummary[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw) as RunSummary[]
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
  } catch {
    return []
  }
}

const addLocalHistory = (entry: RunSummary) => {
  const next = [entry, ...loadLocalHistory()].slice(0, 200)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

const pollJob = async <T>(jobId: string): Promise<T> => {
  const maxAttempts = 60

  for (let i = 0; i < maxAttempts; i += 1) {
    const job = (await request<JobStatus<T> & Record<string, unknown>>(`/api/jobs/${jobId}`))
    const resolvedStatus = asString(pick(job, 'status', 'state'), 'running') as JobStatus<T>['status']
    const resolvedResult = unwrapJobResult(job)

    if (resolvedStatus === 'complete' && resolvedResult) {
      return resolvedResult
    }

    if (resolvedStatus === 'failed') {
      throw new Error(asString(pick(job, 'errorMessage', 'error_message', 'error'), 'Job failed'))
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error('Timed out while polling job status.')
}

const saveRun = (type: RunType, runId: string, detail: string) => {
  addLocalHistory({
    id: runId,
    type,
    status: 'complete',
    createdAt: new Date().toISOString(),
    detail,
  })
}

const normalizeFractalResult = (input: unknown): FractalResult => {
  const result = asRecord(input)
  const metadata = asRecord(pick(result, 'metadata', 'params', 'parameters'))
  const imageUrl = asString(pick(result, 'imageUrl', 'image_url', 'image', 'artifact_url'))
  const runId = asString(pick(result, 'runId', 'run_id', 'id'), `fractal_${Date.now()}`)

  return {
    runId,
    imageUrl: resolveAssetUrl(imageUrl),
    metadata: {
      type: asString(pick(metadata, 'type', 'fractal_type'), 'Mandelbrot') as FractalParams['type'],
      width: asNumber(pick(metadata, 'width', 'w'), 800),
      height: asNumber(pick(metadata, 'height', 'h'), 600),
      maxIter: asNumber(pick(metadata, 'maxIter', 'max_iter'), 256),
      colorScheme: asString(pick(metadata, 'colorScheme', 'color_scheme'), 'inferno'),
      power: asNumber(pick(metadata, 'power'), 2),
      cReal: asNumber(pick(metadata, 'cReal', 'c_real'), -0.42),
      cImag: asNumber(pick(metadata, 'cImag', 'c_imag'), 0.6),
      extent: (pick(metadata, 'extent') as [number, number, number, number] | undefined) ?? [-2, 1, -1.5, 1.5],
    },
  }
}

const normalizeBoxResult = (input: unknown): BoxCountResult => {
  const result = asRecord(input)
  const roiObj = asRecord(pick(result, 'roi'))
  const artifacts = asRecord(pick(result, 'artifacts'))
  const rawCounts = asArray<unknown>(pick(result, 'boxCounts', 'box_counts'))
  const boxCounts = rawCounts.map((item) => {
    const countObj = asRecord(item)
    return {
      size: asNumber(pick(countObj, 'size'), 0),
      count: asNumber(pick(countObj, 'count'), 0),
    }
  })

  return {
    runId: asString(pick(result, 'runId', 'run_id', 'id'), `box_${Date.now()}`),
    fractalDimension: asNumber(pick(result, 'fractalDimension', 'fractal_dimension'), 0),
    elapsedSeconds: asNumber(pick(result, 'elapsedSeconds', 'elapsed_seconds'), 0),
    roi: {
      x: asNumber(pick(roiObj, 'x', 'roi_x'), 0),
      y: asNumber(pick(roiObj, 'y', 'roi_y'), 0),
      size: asNumber(pick(roiObj, 'size', 'roi_size'), 0),
    },
    boxCounts,
    previewUrl: resolveAssetUrl(asString(pick(result, 'previewUrl', 'preview_url', 'overlay_url', 'image_url', 'image', 'artifact_url', 'overlayUrl', 'overlay'), asString(pick(artifacts, 'overlay_url', 'overlayUrl'), ''))),
  }
}

const normalizeCompareResult = (input: unknown): CompareResult => {
  const result = asRecord(input)
  const imageA = asRecord(pick(result, 'imageA', 'image_a'))
  const imageB = asRecord(pick(result, 'imageB', 'image_b'))

  return {
    runId: asString(pick(result, 'runId', 'run_id', 'id'), `compare_${Date.now()}`),
    imageA: {
      fractalDimension: asNumber(pick(imageA, 'fractalDimension', 'fractal_dimension'), 0),
    },
    imageB: {
      fractalDimension: asNumber(pick(imageB, 'fractalDimension', 'fractal_dimension'), 0),
    },
    delta: asNumber(pick(result, 'delta'), 0),
    interpretation: asString(pick(result, 'interpretation', 'summary'), ''),
  }
}

const normalizeDetectionResult = (input: unknown): DetectionResult => {
  const result = asRecord(input)
  const detections = asArray<unknown>(pick(result, 'detections', 'boxes', 'predictions')).map((item) => {
    const det = asRecord(item)
    const boxObj = asRecord(pick(det, 'box', 'bbox'))

    return {
      label: asString(pick(det, 'label', 'class'), 'Tumor'),
      confidence: asNumber(pick(det, 'confidence', 'score'), 0),
      box: {
        x1: asNumber(pick(boxObj, 'x1', 'left'), 0),
        y1: asNumber(pick(boxObj, 'y1', 'top'), 0),
        x2: asNumber(pick(boxObj, 'x2', 'right'), 0),
        y2: asNumber(pick(boxObj, 'y2', 'bottom'), 0),
      },
    }
  })

  return {
    runId: asString(pick(result, 'runId', 'run_id', 'id'), `tumor_${Date.now()}`),
    view: asString(pick(result, 'view'), 'axial') as DetectionResult['view'],
    detections,
    imageUrl: resolveAssetUrl(asString(pick(result, 'imageUrl', 'image_url', 'overlay_url', 'overlayUrl', 'original_url', 'originalUrl'))),
  }
}

const normalizeRunSummary = (input: unknown): RunSummary => {
  const run = asRecord(input)
  return {
    id: asString(pick(run, 'id', 'run_id', 'runId'), `run_${Date.now()}`),
    type: asString(pick(run, 'type'), 'fractal') as RunType,
    status: asString(pick(run, 'status', 'state'), 'complete') as RunSummary['status'],
    createdAt: asString(pick(run, 'createdAt', 'created_at'), new Date().toISOString()),
    detail: asString(pick(run, 'detail', 'summary', 'message'), ''),
    payload: pick(run, 'payload', 'result'),
  }
}

const normalizeRunDetail = (input: unknown): RunDetail => {
  const run = asRecord(input)
  const summary = normalizeRunSummary(run)
  return {
    ...summary,
    result: pick(run, 'result', 'payload'),
    parameters: pick(run, 'parameters', 'params', 'parameters_json'),
    artifacts: asRecord(pick(run, 'artifacts')) as Record<string, string>,
    errorMessage: asString(pick(run, 'errorMessage', 'error_message', 'error'), ''),
  }
}

export const api = {
  async generateFractal(params: FractalParams): Promise<FractalResult> {
    const response = await request<unknown>('/api/fractals/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    const responseObj = asRecord(response)
    const jobId = asString(pick(responseObj, 'jobId', 'job_id', 'id'))
    const result = isJobAccepted(response)
      ? normalizeFractalResult(await pollJob<unknown>(jobId))
      : normalizeFractalResult(response)

    saveRun('fractal', result.runId, `${result.metadata.type} ${result.metadata.width}x${result.metadata.height}`)
    return result
  },

  async analyzeBoxCount(file: File, roi: { x: number; y: number; size: number }): Promise<BoxCountResult> {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('roi_x', String(roi.x))
    formData.append('roi_y', String(roi.y))
    formData.append('roi_size', String(roi.size))

    const response = await request<unknown>('/api/box-count/analyze', {
      method: 'POST',
      body: formData,
    })

    const responseObj = asRecord(response)
    const jobId = asString(pick(responseObj, 'jobId', 'job_id', 'id'))
    const result = isJobAccepted(response)
      ? normalizeBoxResult(await pollJob<unknown>(jobId))
      : normalizeBoxResult(response)

    saveRun('box_count', result.runId, `ROI ${result.roi.x},${result.roi.y} size ${result.roi.size}`)
    return result
  },

  async analyzeCompare(fileA: File, fileB: File): Promise<CompareResult> {
    const formData = new FormData()
    formData.append('image_a', fileA)
    formData.append('image_b', fileB)

    const response = await request<unknown>('/api/compare/analyze', {
      method: 'POST',
      body: formData,
    })

    const responseObj = asRecord(response)
    const jobId = asString(pick(responseObj, 'jobId', 'job_id', 'id'))
    const result = isJobAccepted(response) ? normalizeCompareResult(await pollJob<unknown>(jobId)) : normalizeCompareResult(response)
    saveRun('compare', result.runId, `Delta ${result.delta.toFixed(4)}`)
    return result
  },

  async detectTumor(file: File, view: 'axial' | 'coronal' | 'sagittal'): Promise<DetectionResult> {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('view', view)

    const response = await request<unknown>('/api/tumor-detection/detect', {
      method: 'POST',
      body: formData,
    })

    const responseObj = asRecord(response)
    const jobId = asString(pick(responseObj, 'jobId', 'job_id', 'id'))
    const result = isJobAccepted(response)
      ? normalizeDetectionResult(await pollJob<unknown>(jobId))
      : normalizeDetectionResult(response)

    saveRun('tumor_detection', result.runId, `${view} detections ${result.detections.length}`)
    return result
  },

  async getRuns(): Promise<RunSummary[]> {
    try {
      const response = await request<unknown>('/api/runs')
      const root = asRecord(response)
      const rawRuns = asArray<unknown>(pick(root, 'items', 'runs') ?? response)
      return rawRuns.map(normalizeRunSummary)
    } catch {
      return loadLocalHistory()
    }
  },

  async getRunById(runId: string): Promise<RunDetail | null> {
    try {
      const response = await request<unknown>(`/api/runs/${runId}`)
      return normalizeRunDetail(response)
    } catch {
      const local = loadLocalHistory().find((run) => run.id === runId)
      if (!local) {
        return null
      }

      return {
        ...local,
        result: local.payload,
      }
    }
  },
}
