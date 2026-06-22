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
import { isUsableBoxCountResult } from '../../modules/box-count/boxCountResultValidation'
import { detectTumorLocally, preloadTumorModel as preloadTumorModelLocal } from './tumorInference'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'
const HISTORY_KEY = 'fractals-workbench-runs'
const MAX_LOCAL_HISTORY = 120
const LOCAL_LATENCY_MS = 80

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
  if (!url) {
    return ''
  }

  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
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

const sanitizeRunPayload = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') {
    return value
  }

  const source = value as Record<string, unknown>
  const compact: Record<string, unknown> = {}

  for (const [key, raw] of Object.entries(source)) {
    const isImageLikeKey =
      key === 'imageUrl' ||
      key === 'image_url' ||
      key === 'sourceImageUrl' ||
      key === 'source_image_url' ||
      key === 'overlayImageUrl' ||
      key === 'overlay_image_url' ||
      key === 'previewUrl' ||
      key === 'preview_url' ||
      key === 'overlayUrl' ||
      key === 'overlay_url' ||
      key === 'cropImageUrl' ||
      key === 'crop_image_url' ||
      key === 'annotatedImageUrl' ||
      key === 'annotated_image_url' ||
      key === 'artifact_url'

    if (typeof raw === 'string') {
      const isDataUrl = raw.startsWith('data:')
      const isTooLarge = raw.length > 2048
      if (isImageLikeKey && (isDataUrl || isTooLarge)) {
        compact[key] = '[omitted: large image payload]'
        continue
      }
      compact[key] = raw
      continue
    }

    if (key === 'boxCounts' && Array.isArray(raw)) {
      compact[key] = raw.slice(0, 128)
      continue
    }

    compact[key] = raw
  }

  return compact
}

const saveLocalHistorySafely = (runs: RunSummary[]) => {
  // Persist progressively smaller snapshots if storage is near quota.
  for (let keep = runs.length; keep >= 1; keep -= 10) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(runs.slice(0, keep)))
      return
    } catch {
      // Keep trying with fewer rows.
    }
  }

  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    // Ignore localStorage failures.
  }
}

const addLocalHistory = (entry: RunSummary) => {
  const next = [entry, ...loadLocalHistory()].slice(0, MAX_LOCAL_HISTORY)
  saveLocalHistorySafely(next)
}

const pollJob = async <T>(jobId: string): Promise<T> => {
  const maxAttempts = 60

  for (let i = 0; i < maxAttempts; i += 1) {
    const job = (await request<JobStatus<T> & Record<string, unknown>>(`/api/jobs/${jobId}`))
    const resolvedStatus = asString(pick(job, 'status', 'state'), 'running') as JobStatus<T>['status']
    const resolvedResult = unwrapJobResult(job)

    if (resolvedStatus === 'complete') {
      if (resolvedResult !== undefined) {
        return resolvedResult
      }

      // Some backends return complete payloads directly on the job envelope.
      return job as unknown as T
    }

    if (resolvedStatus === 'failed') {
      throw new Error(asString(pick(job, 'errorMessage', 'error_message', 'error'), 'Job failed'))
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error('Timed out while polling job status.')
}

const saveRun = (type: RunType, runId: string, detail: string, payload?: unknown, parameters?: unknown) => {
  const compactPayload = sanitizeRunPayload(payload)
  addLocalHistory({
    id: runId,
    type,
    status: 'complete',
    createdAt: new Date().toISOString(),
    detail,
    payload: {
      result: compactPayload,
      parameters,
    },
  })
}

const delay = (ms = LOCAL_LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms))

const createRunId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

const colorMap = (value: number, max: number, scheme: string): [number, number, number] => {
  const t = max <= 0 ? 0 : clamp(value / max, 0, 1)
  const maps: Record<string, [number, number, number][]> = {
    inferno: [
      [0, 0, 4],
      [87, 15, 109],
      [187, 55, 84],
      [249, 142, 8],
      [252, 255, 164],
    ],
    plasma: [
      [13, 8, 135],
      [126, 3, 168],
      [203, 71, 120],
      [248, 149, 64],
      [240, 249, 33],
    ],
    viridis: [
      [68, 1, 84],
      [59, 82, 139],
      [33, 145, 140],
      [94, 201, 98],
      [253, 231, 37],
    ],
    magma: [
      [0, 0, 4],
      [80, 18, 123],
      [182, 54, 121],
      [251, 136, 97],
      [252, 253, 191],
    ],
  }
  const stops = maps[scheme] ?? maps.inferno
  const scaled = t * (stops.length - 1)
  const i = Math.floor(scaled)
  const j = Math.min(stops.length - 1, i + 1)
  const f = scaled - i
  return [
    Math.round(stops[i][0] + (stops[j][0] - stops[i][0]) * f),
    Math.round(stops[i][1] + (stops[j][1] - stops[i][1]) * f),
    Math.round(stops[i][2] + (stops[j][2] - stops[i][2]) * f),
  ]
}

const extentForType = (type: FractalParams['type']): [number, number, number, number] => {
  switch (type) {
    case 'Mandelbrot':
      return [-2.5, 1, -1.25, 1.25]
    case 'Burning Ship':
      return [-2, 1, -2, 1]
    case 'Barnsley Fern':
      return [0, 8, 0, 10]
    case 'Sierpinski Triangle':
      return [0, 1, 0, 1]
    default:
      return [-2, 2, -2, 2]
  }
}

const localGenerateFractal = async (params: FractalParams): Promise<FractalResult> => {
  await delay()
  const width = clamp(Math.round(params.width), 64, 2048)
  const height = clamp(Math.round(params.height), 64, 2048)
  const maxIter = clamp(Math.round(params.maxIter), 1, 5000)
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is unavailable in this browser.')
  }

  const image = ctx.createImageData(width, height)
  const extent = extentForType(params.type)
  const [xMin, xMax, yMin, yMax] = extent

  if (params.type === 'Barnsley Fern') {
    const density = new Float32Array(width * height)
    let x = 0
    let y = 0
    let seed = 123456789
    const nextRandom = () => {
      seed = (1664525 * seed + 1013904223) >>> 0
      return seed / 4294967296
    }
    const totalPoints = Math.max(5000, maxIter * 500)
    let maxDensity = 1
    for (let i = 0; i < totalPoints; i += 1) {
      const r = nextRandom()
      let nextX: number
      let nextY: number
      if (r < 0.01) {
        nextX = 0
        nextY = 0.16 * y
      } else if (r < 0.86) {
        nextX = 0.85 * x + 0.04 * y
        nextY = -0.04 * x + 0.85 * y + 1.6
      } else if (r < 0.93) {
        nextX = 0.2 * x - 0.26 * y
        nextY = 0.23 * x + 0.22 * y + 1.6
      } else {
        nextX = -0.15 * x + 0.28 * y
        nextY = 0.26 * x + 0.24 * y + 0.44
      }
      x = nextX
      y = nextY
      const px = Math.floor((x + 2.5) * (width / 5))
      const py = height - 1 - Math.floor(y * (height / 10))
      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = py * width + px
        density[idx] += 1
        maxDensity = Math.max(maxDensity, density[idx])
      }
    }
    for (let i = 0; i < density.length; i += 1) {
      const [r, g, b] = colorMap(Math.log1p(density[i]), Math.log1p(maxDensity), params.colorScheme)
      image.data[i * 4] = r
      image.data[i * 4 + 1] = g
      image.data[i * 4 + 2] = b
      image.data[i * 4 + 3] = 255
    }
  } else if (params.type === 'Sierpinski Triangle') {
    image.data.fill(255)
    let x = 0.5
    let y = Math.sqrt(3) / 2
    let seed = 987654321
    const vertices = [
      [0.5, Math.sqrt(3) / 2],
      [0, 0],
      [1, 0],
    ]
    const nextRandom = () => {
      seed = (1103515245 * seed + 12345) >>> 0
      return seed / 4294967296
    }
    for (let i = 0; i < maxIter * 10; i += 1) {
      const vertex = vertices[Math.floor(nextRandom() * 3)]
      x = (x + vertex[0]) / 2
      y = (y + vertex[1]) / 2
      if (i < 100) {
        continue
      }
      const px = Math.floor(x * (width - 1))
      const py = height - 1 - Math.floor((y / (Math.sqrt(3) / 2)) * (height - 1))
      const idx = (py * width + px) * 4
      image.data[idx] = 16
      image.data[idx + 1] = 33
      image.data[idx + 2] = 43
      image.data[idx + 3] = 255
    }
  } else {
    const power = Math.max(2, Math.round(params.power ?? 2))
    const cReal = params.cReal ?? -0.42
    const cImag = params.cImag ?? 0.6
    const newtonDegree = clamp(power, 2, 12)
    const roots = Array.from({ length: newtonDegree }, (_, i) => [
      Math.cos((2 * Math.PI * i) / newtonDegree),
      Math.sin((2 * Math.PI * i) / newtonDegree),
    ])

    for (let py = 0; py < height; py += 1) {
      const imag = yMax - (py / (height - 1)) * (yMax - yMin)
      for (let px = 0; px < width; px += 1) {
        const real = xMin + (px / (width - 1)) * (xMax - xMin)
        let value = 0

        if (params.type === 'Newton') {
          let zr = real
          let zi = imag
          for (let iter = 0; iter < maxIter; iter += 1) {
            const angle = Math.atan2(zi, zr)
            const radius = Math.hypot(zr, zi) || 1e-12
            const rPower = Math.pow(radius, newtonDegree)
            const rPowerMinusOne = Math.pow(radius, newtonDegree - 1) || 1e-12
            const fReal = rPower * Math.cos(newtonDegree * angle) - 1
            const fImag = rPower * Math.sin(newtonDegree * angle)
            const dfReal = newtonDegree * rPowerMinusOne * Math.cos((newtonDegree - 1) * angle)
            const dfImag = newtonDegree * rPowerMinusOne * Math.sin((newtonDegree - 1) * angle)
            const denom = dfReal * dfReal + dfImag * dfImag || 1e-12
            const nr = zr - (fReal * dfReal + fImag * dfImag) / denom
            const ni = zi - (fImag * dfReal - fReal * dfImag) / denom
            zr = nr
            zi = ni
            const rootIndex = roots.findIndex(([rr, ri]) => Math.hypot(zr - rr, zi - ri) < 1e-4)
            if (rootIndex >= 0) {
              value = ((rootIndex + 1) / roots.length) * maxIter - iter * 0.35
              break
            }
          }
        } else {
          let zr = params.type === 'Julia' ? real : 0
          let zi = params.type === 'Julia' ? imag : 0
          const cr = params.type === 'Julia' ? cReal : real
          const ci = params.type === 'Julia' ? cImag : imag
          for (let iter = 0; iter < maxIter; iter += 1) {
            const radius = Math.hypot(zr, zi)
            if (radius > 2) {
              value = iter
              break
            }
            const angle = Math.atan2(params.type === 'Burning Ship' ? Math.abs(zi) : zi, params.type === 'Burning Ship' ? Math.abs(zr) : zr)
            const magnitude = Math.pow(radius, power)
            zr = magnitude * Math.cos(power * angle) + cr
            zi = magnitude * Math.sin(power * angle) + ci
          }
        }

        const idx = (py * width + px) * 4
        const [r, g, b] = value === 0 ? [0, 0, 4] : colorMap(value, maxIter, params.colorScheme)
        image.data[idx] = r
        image.data[idx + 1] = g
        image.data[idx + 2] = b
        image.data[idx + 3] = 255
      }
    }
  }

  ctx.putImageData(image, 0, 0)
  const runId = createRunId('fractal')
  return {
    runId,
    imageUrl: canvas.toDataURL('image/png'),
    metadata: {
      ...params,
      width,
      height,
      maxIter,
      extent,
    },
  }
}

const readImage = async (file: File): Promise<{ canvas: HTMLCanvasElement; data: ImageData }> => {
  const bitmap = await createImageBitmap(file)
  const canvas = createCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is unavailable in this browser.')
  }
  ctx.drawImage(bitmap, 0, 0)
  return { canvas, data: ctx.getImageData(0, 0, bitmap.width, bitmap.height) }
}

const grayscaleAt = (data: ImageData, x: number, y: number) => {
  const idx = (y * data.width + x) * 4
  return 0.299 * data.data[idx] + 0.587 * data.data[idx + 1] + 0.114 * data.data[idx + 2]
}

const makeBinary = (data: ImageData, roi = { x: 0, y: 0, width: data.width, height: data.height }) => {
  const width = roi.width
  const height = roi.height
  const gray = new Uint8Array(width * height)
  let sum = 0
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = grayscaleAt(data, roi.x + x, roi.y + y)
      gray[y * width + x] = value
      sum += value
    }
  }
  const mean = sum / gray.length
  const binary = new Uint8Array(width * height)
  for (let i = 0; i < gray.length; i += 1) {
    binary[i] = gray[i] < mean ? 1 : 0
  }
  return { binary, width, height }
}

const countBoxes = (binary: Uint8Array, width: number, height: number) => {
  const maxBox = Math.max(2, Math.floor(Math.min(width, height) / 4))
  const sizes: number[] = []
  for (let size = 1; size <= maxBox; size *= 2) {
    sizes.push(size)
  }
  if (sizes.length < 3) {
    ;[64, 32, 16, 8, 4, 2, 1].forEach((size) => {
      if (size <= maxBox && !sizes.includes(size)) {
        sizes.push(size)
      }
    })
  }
  return sizes.sort((a, b) => a - b).map((size) => {
    let count = 0
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        let occupied = false
        for (let yy = y; yy < Math.min(height, y + size) && !occupied; yy += 1) {
          for (let xx = x; xx < Math.min(width, x + size); xx += 1) {
            if (binary[yy * width + xx]) {
              occupied = true
              break
            }
          }
        }
        if (occupied) {
          count += 1
        }
      }
    }
    return { size, count: Math.max(1, count) }
  })
}

const fractalDimensionFromCounts = (boxCounts: Array<{ size: number; count: number }>) => {
  const points = boxCounts.filter((item) => item.size > 0 && item.count > 0)
  const n = points.length
  if (n < 2) {
    return 0
  }
  const xs = points.map((item) => Math.log(item.size))
  const ys = points.map((item) => Math.log(item.count))
  const meanX = xs.reduce((sum, value) => sum + value, 0) / n
  const meanY = ys.reduce((sum, value) => sum + value, 0) / n
  const numerator = xs.reduce((sum, value, index) => sum + (value - meanX) * (ys[index] - meanY), 0)
  const denominator = xs.reduce((sum, value) => sum + (value - meanX) ** 2, 0)
  return Number((-numerator / denominator).toFixed(4))
}

const fitR2FromCounts = (boxCounts: Array<{ size: number; count: number }>) => {
  const points = boxCounts.filter((item) => item.size > 0 && item.count > 0)
  const n = points.length
  if (n < 2) {
    return 0
  }

  const xs = points.map((item) => Math.log(item.size))
  const ys = points.map((item) => Math.log(item.count))
  const meanX = xs.reduce((sum, value) => sum + value, 0) / n
  const meanY = ys.reduce((sum, value) => sum + value, 0) / n
  const numerator = xs.reduce((sum, value, index) => sum + (value - meanX) * (ys[index] - meanY), 0)
  const denominator = xs.reduce((sum, value) => sum + (value - meanX) ** 2, 0)
  if (denominator === 0) {
    return 0
  }

  const slope = numerator / denominator
  const intercept = meanY - slope * meanX
  const fitted = xs.map((value) => slope * value + intercept)
  const ssRes = ys.reduce((sum, value, index) => sum + (value - fitted[index]) ** 2, 0)
  const ssTot = ys.reduce((sum, value) => sum + (value - meanY) ** 2, 0)
  if (ssTot === 0) {
    return 0
  }

  return Number((1 - ssRes / ssTot).toFixed(4))
}

const analyzeImageDimension = async (file: File, roi?: { x: number; y: number; size: number }) => {
  const start = performance.now()
  const { canvas, data } = await readImage(file)
  const resolvedRoi = roi
    ? {
        x: clamp(Math.round(roi.x), 0, data.width - 1),
        y: clamp(Math.round(roi.y), 0, data.height - 1),
        width: clamp(Math.round(roi.size), 1, data.width - clamp(Math.round(roi.x), 0, data.width - 1)),
        height: clamp(Math.round(roi.size), 1, data.height - clamp(Math.round(roi.y), 0, data.height - 1)),
      }
    : { x: 0, y: 0, width: data.width, height: data.height }
  const { binary, width, height } = makeBinary(data, resolvedRoi)
  const boxCounts = countBoxes(binary, width, height)
  const fractalDimension = fractalDimensionFromCounts(boxCounts)
  const fitR2 = fitR2FromCounts(boxCounts)
  const elapsedSeconds = Number(((performance.now() - start) / 1000).toFixed(4))
  return { canvas, fractalDimension, elapsedSeconds, fitR2, boxCounts, roi: resolvedRoi }
}

const localAnalyzeBoxCount = async (file: File, roi: { x: number; y: number; size: number }): Promise<BoxCountResult> => {
  await delay()
  const analysis = await analyzeImageDimension(file, roi)
  const ctx = analysis.canvas.getContext('2d')
  if (ctx) {
    ctx.strokeStyle = '#ff7b4a'
    ctx.lineWidth = Math.max(2, Math.floor(Math.min(analysis.canvas.width, analysis.canvas.height) / 160))
    ctx.strokeRect(analysis.roi.x, analysis.roi.y, analysis.roi.width, analysis.roi.height)
  }
  return {
    runId: createRunId('box'),
    fractalDimension: analysis.fractalDimension,
    elapsedSeconds: analysis.elapsedSeconds,
    roi: { x: analysis.roi.x, y: analysis.roi.y, size: Math.min(analysis.roi.width, analysis.roi.height) },
    boxCounts: analysis.boxCounts,
    previewUrl: analysis.canvas.toDataURL('image/png'),
  }
}

const localAnalyzeCompare = async (fileA: File, fileB: File): Promise<CompareResult> => {
  await delay()
  const [a, b] = await Promise.all([analyzeImageDimension(fileA), analyzeImageDimension(fileB)])
  const delta = Number(Math.abs(a.fractalDimension - b.fractalDimension).toFixed(4))
  const interpretation =
    delta < 0.05
      ? 'The images have very similar estimated fractal complexity.'
      : a.fractalDimension > b.fractalDimension
        ? 'Image A has the higher estimated fractal complexity.'
        : 'Image B has the higher estimated fractal complexity.'
  return {
    runId: createRunId('compare'),
    imageA: {
      fractalDimension: a.fractalDimension,
      elapsedSeconds: a.elapsedSeconds,
      fitR2: a.fitR2,
      boxCounts: a.boxCounts,
    },
    imageB: {
      fractalDimension: b.fractalDimension,
      elapsedSeconds: b.elapsedSeconds,
      fitR2: b.fitR2,
      boxCounts: b.boxCounts,
    },
    delta,
    interpretation,
  }
}

const normalizeFractalResult = (input: unknown): FractalResult => {
  const result = asRecord(input)
  const metadata = asRecord(pick(result, 'metadata', 'params', 'parameters'))
  const artifacts = asRecord(pick(result, 'artifacts', 'files'))
  const imageUrl = asString(
    pick(
      result,
      'imageUrl',
      'image_url',
      'image',
      'artifact_url',
      'fractal_url',
      'fractal_image_url',
      'output_url',
      'url',
    ),
    asString(
      pick(
        artifacts,
        'image_url',
        'imageUrl',
        'fractal_url',
        'fractal_image_url',
        'artifact_url',
        'output_url',
        'url',
      ),
    ),
  )
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

  const normalizeCompareImage = (image: Record<string, unknown>) => ({
    fractalDimension: asNumber(pick(image, 'fractalDimension', 'fractal_dimension'), 0),
    elapsedSeconds: asNumber(pick(image, 'elapsedSeconds', 'elapsed_seconds'), 0),
    fitR2: asNumber(pick(image, 'fitR2', 'fit_r2'), 0),
    boxCounts: asArray<unknown>(pick(image, 'boxCounts', 'box_counts')).map((item) => {
      const countObj = asRecord(item)
      return {
        size: asNumber(pick(countObj, 'size'), 0),
        count: asNumber(pick(countObj, 'count'), 0),
      }
    }),
  })

  return {
    runId: asString(pick(result, 'runId', 'run_id', 'id'), `compare_${Date.now()}`),
    imageA: normalizeCompareImage(imageA),
    imageB: normalizeCompareImage(imageB),
    delta: asNumber(pick(result, 'delta'), 0),
    interpretation: asString(pick(result, 'interpretation', 'summary'), ''),
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
  async generateFractalPreview(params: FractalParams): Promise<FractalResult> {
    return localGenerateFractal(params)
  },

  async generateFractal(params: FractalParams): Promise<FractalResult> {
    let result: FractalResult
    try {
      const response = await request<unknown>('/api/fractals/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      const responseObj = asRecord(response)
      const jobId = asString(pick(responseObj, 'jobId', 'job_id', 'id'))
      result = isJobAccepted(response)
        ? normalizeFractalResult(await pollJob<unknown>(jobId))
        : normalizeFractalResult(response)

      // Some backends return successful metadata but store image under unexpected keys.
      // Fall back to local generation to guarantee an image is always rendered.
      if (!result.imageUrl) {
        result = await localGenerateFractal(params)
      }
    } catch {
      result = await localGenerateFractal(params)
    }

    saveRun('fractal', result.runId, `${result.metadata.type} ${result.metadata.width}x${result.metadata.height}`, result, params)
    return result
  },

  async analyzeBoxCount(file: File, roi: { x: number; y: number; size: number }): Promise<BoxCountResult> {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('roi_x', String(roi.x))
    formData.append('roi_y', String(roi.y))
    formData.append('roi_size', String(roi.size))

    let result: BoxCountResult
    try {
      const response = await request<unknown>('/api/box-count/analyze', {
        method: 'POST',
        body: formData,
      })

      const responseObj = asRecord(response)
      const jobId = asString(pick(responseObj, 'jobId', 'job_id', 'id'))
      const normalized = isJobAccepted(response)
        ? normalizeBoxResult(await pollJob<unknown>(jobId))
        : normalizeBoxResult(response)
      result = isUsableBoxCountResult(normalized) ? normalized : await localAnalyzeBoxCount(file, roi)
    } catch {
      result = await localAnalyzeBoxCount(file, roi)
    }

    saveRun('box_count', result.runId, `ROI ${result.roi.x},${result.roi.y} size ${result.roi.size}`, result, roi)
    return result
  },

  async analyzeCompare(fileA: File, fileB: File): Promise<CompareResult> {
    const formData = new FormData()
    formData.append('image_a', fileA)
    formData.append('image_b', fileB)

    let result: CompareResult
    try {
      const response = await request<unknown>('/api/compare/analyze', {
        method: 'POST',
        body: formData,
      })

      const responseObj = asRecord(response)
      const jobId = asString(pick(responseObj, 'jobId', 'job_id', 'id'))
      result = isJobAccepted(response) ? normalizeCompareResult(await pollJob<unknown>(jobId)) : normalizeCompareResult(response)
    } catch {
      result = await localAnalyzeCompare(fileA, fileB)
    }
    saveRun('compare', result.runId, `Delta ${result.delta.toFixed(4)}`, result, { imageA: fileA.name, imageB: fileB.name })
    return result
  },

  async preloadTumorModel(view: 'axial' | 'coronal' | 'sagittal'): Promise<void> {
    await preloadTumorModelLocal(view)
  },

  async detectTumor(file: File, view: 'axial' | 'coronal' | 'sagittal', threshold = 0.25): Promise<DetectionResult> {
    const result = await detectTumorLocally(file, view, threshold)

    saveRun('tumor_detection', result.runId, `${view} detections ${result.detections.length}`, result, { view, image: file.name })
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
        result: asRecord(local.payload).result ?? local.payload,
        parameters: asRecord(local.payload).parameters,
      }
    }
  },
}
