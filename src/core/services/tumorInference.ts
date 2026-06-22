import type { DetectionResult } from './contracts'

type View = DetectionResult['view']

const MODEL_SIZE = 640
const TUMOR_CLASS_INDEX = 1
const MODEL_URLS: Record<View, string> = {
  axial: '/models/tumor_detector_axial.onnx',
  coronal: '/models/tumor_detector_coronal.onnx',
  sagittal: '/models/tumor_detector_sagittal.onnx',
}

const ORT_RUNTIME_URL = '/vendor/ort/ort.min.js'
const ORT_WASM_BASE_URL = '/vendor/ort/'

type OrtTensor = {
  data: Float32Array | Float64Array | Int32Array | Uint8Array
  dims: number[]
}

type OrtSession = {
  run: (feeds: Record<string, OrtTensor>) => Promise<Record<string, OrtTensor>>
  inputNames?: string[]
  outputNames?: string[]
  getInputs?: () => Array<{ name: string }>
  getOutputs?: () => Array<{ name: string }>
}

type OrtModule = {
  env: {
    wasm: {
      wasmPaths?: string
      numThreads?: number
    }
  }
  Tensor: new (type: string, data: Float32Array, dims: number[]) => OrtTensor
  InferenceSession: {
    create: (modelUrl: string, options: { executionProviders: string[] }) => Promise<OrtSession>
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
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

const ensureOrtRuntime = async (): Promise<OrtModule> => {
  const existing = (globalThis as typeof globalThis & { ort?: OrtModule }).ort
  if (existing) {
    existing.env.wasm.wasmPaths = ORT_WASM_BASE_URL
    existing.env.wasm.numThreads = 1
    return existing
  }

  await new Promise<void>((resolve, reject) => {
    const current = document.querySelector<HTMLScriptElement>('script[data-ort-runtime="true"]')
    if (current) {
      if ((globalThis as typeof globalThis & { ort?: OrtModule }).ort) {
        resolve()
        return
      }

      current.addEventListener('load', () => resolve(), { once: true })
      current.addEventListener('error', () => reject(new Error('Failed to load ONNX runtime.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.async = true
    script.dataset.ortRuntime = 'true'
    script.src = ORT_RUNTIME_URL
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load ONNX runtime.'))
    document.head.appendChild(script)
  })

  const ort = (globalThis as typeof globalThis & { ort?: OrtModule }).ort
  if (!ort) {
    throw new Error('ONNX runtime did not initialize.')
  }

  ort.env.wasm.wasmPaths = ORT_WASM_BASE_URL
  ort.env.wasm.numThreads = 1
  return ort
}

const sessionCache = new Map<View, Promise<OrtSession>>()

const getSession = async (view: View): Promise<OrtSession> => {
  const cached = sessionCache.get(view)
  if (cached) {
    return cached
  }

  const sessionPromise = ensureOrtRuntime().then((ort) =>
    ort.InferenceSession.create(MODEL_URLS[view], {
      executionProviders: ['wasm'],
    }),
  )
  sessionCache.set(view, sessionPromise)
  return sessionPromise
}

export const preloadTumorModel = async (view: View): Promise<void> => {
  await getSession(view)
}

const letterboxToModelInput = (canvas: HTMLCanvasElement) => {
  const modelCanvas = createCanvas(MODEL_SIZE, MODEL_SIZE)
  const ctx = modelCanvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is unavailable in this browser.')
  }

  ctx.fillStyle = 'rgb(114, 114, 114)'
  ctx.fillRect(0, 0, MODEL_SIZE, MODEL_SIZE)

  const ratio = Math.min(MODEL_SIZE / canvas.width, MODEL_SIZE / canvas.height)
  const newWidth = Math.round(canvas.width * ratio)
  const newHeight = Math.round(canvas.height * ratio)
  const dx = Math.round((MODEL_SIZE - newWidth) / 2)
  const dy = Math.round((MODEL_SIZE - newHeight) / 2)
  ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, dx, dy, newWidth, newHeight)
  return modelCanvas
}

const drawConfidenceBadge = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  confidence: number,
  boxWidth: number,
) => {
  const label = `Tumor ${confidence.toFixed(2)}`
  ctx.font = '16px sans-serif'
  const badgeWidth = Math.max(132, ctx.measureText(label).width + 16)
  ctx.fillStyle = 'rgba(8, 53, 45, 0.86)'
  ctx.fillRect(x, Math.max(0, y - 24), Math.min(badgeWidth, boxWidth + 12), 24)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(label, x + 6, Math.max(16, y - 7))
}

const createCropUrl = (canvas: HTMLCanvasElement, box: { x1: number; y1: number; x2: number; y2: number }) => {
  const cropCanvas = createCanvas(320, 320)
  const ctx = cropCanvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is unavailable in this browser.')
  }

  ctx.fillStyle = '#0b1116'
  ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height)

  const padX = Math.max(8, Math.round((box.x2 - box.x1) * 0.2))
  const padY = Math.max(8, Math.round((box.y2 - box.y1) * 0.2))
  const sx = clamp(Math.floor(box.x1 - padX), 0, canvas.width - 1)
  const sy = clamp(Math.floor(box.y1 - padY), 0, canvas.height - 1)
  const sw = clamp(Math.ceil(box.x2 - box.x1 + padX * 2), 1, canvas.width - sx)
  const sh = clamp(Math.ceil(box.y2 - box.y1 + padY * 2), 1, canvas.height - sy)
  ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, cropCanvas.width, cropCanvas.height)
  ctx.strokeStyle = 'rgba(65, 214, 164, 0.95)'
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, cropCanvas.width - 3, cropCanvas.height - 3)
  return cropCanvas.toDataURL('image/png')
}

const nms = (boxes: Array<{ x1: number; y1: number; x2: number; y2: number }>, scores: number[], iouThreshold: number) => {
  const order = scores.map((score, index) => ({ score, index })).sort((left, right) => right.score - left.score).map((item) => item.index)
  const keep: number[] = []

  const iou = (a: { x1: number; y1: number; x2: number; y2: number }, b: { x1: number; y1: number; x2: number; y2: number }) => {
    const xx1 = Math.max(a.x1, b.x1)
    const yy1 = Math.max(a.y1, b.y1)
    const xx2 = Math.min(a.x2, b.x2)
    const yy2 = Math.min(a.y2, b.y2)
    const w = Math.max(0, xx2 - xx1 + 1)
    const h = Math.max(0, yy2 - yy1 + 1)
    const inter = w * h
    const areaA = Math.max(1, (a.x2 - a.x1 + 1) * (a.y2 - a.y1 + 1))
    const areaB = Math.max(1, (b.x2 - b.x1 + 1) * (b.y2 - b.y1 + 1))
    return inter / (areaA + areaB - inter)
  }

  while (order.length > 0) {
    const current = order.shift() as number
    keep.push(current)
    for (let i = order.length - 1; i >= 0; i -= 1) {
      if (iou(boxes[current], boxes[order[i]]) > iouThreshold) {
        order.splice(i, 1)
      }
    }
  }

  return keep
}

const decodeDetections = (
  raw: Float32Array,
  dims: number[],
  originalWidth: number,
  originalHeight: number,
  threshold: number,
) => {
  const detections: DetectionResult['detections'] = []
  const rowSize = dims[dims.length - 1]
  const rowCount = dims.length === 3 ? dims[1] : Math.floor(raw.length / rowSize)
  const candidateBoxes: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
  const candidateScores: number[] = []

  const detectionRows = Array.from({ length: rowCount }, (_, index) =>
    raw.slice(index * rowSize, index * rowSize + rowSize),
  )

  const r = Math.min(MODEL_SIZE / originalWidth, MODEL_SIZE / originalHeight)
  const newUnpadWidth = Math.round(originalWidth * r)
  const newUnpadHeight = Math.round(originalHeight * r)
  const dw = (MODEL_SIZE - newUnpadWidth) / 2
  const dh = (MODEL_SIZE - newUnpadHeight) / 2

  for (const det of detectionRows) {
    if (det.length < 6) {
      continue
    }

    const objectness = det[4]
    const classScores = det.slice(5)
    const tumorScore = classScores[TUMOR_CLASS_INDEX] ?? classScores[0] ?? 0
    const confidence = objectness * tumorScore

    if (confidence < threshold) {
      continue
    }

    const centerX = det[0]
    const centerY = det[1]
    const width = det[2]
    const height = det[3]

    let x1 = centerX - width / 2
    let y1 = centerY - height / 2
    let x2 = centerX + width / 2
    let y2 = centerY + height / 2

    x1 = (x1 - dw) / r
    y1 = (y1 - dh) / r
    x2 = (x2 - dw) / r
    y2 = (y2 - dh) / r

    x1 = clamp(x1, 0, originalWidth - 1)
    y1 = clamp(y1, 0, originalHeight - 1)
    x2 = clamp(x2, 0, originalWidth - 1)
    y2 = clamp(y2, 0, originalHeight - 1)

    if (x2 <= x1 || y2 <= y1) {
      continue
    }

    candidateBoxes.push({ x1, y1, x2, y2 })
    candidateScores.push(confidence)
  }

  const keep = nms(candidateBoxes, candidateScores, 0.3)
  for (const index of keep) {
    const confidence = Number(candidateScores[index].toFixed(2))
    const box = candidateBoxes[index]
    detections.push({
      label: 'Tumor candidate',
      confidence,
      box: {
        x1: Number(box.x1.toFixed(2)),
        y1: Number(box.y1.toFixed(2)),
        x2: Number(box.x2.toFixed(2)),
        y2: Number(box.y2.toFixed(2)),
      },
    })
  }

  return detections
}

export const detectTumorLocally = async (file: File, view: View, threshold = 0.25): Promise<DetectionResult> => {
  const { canvas, data } = await readImage(file)
  const sourceImageUrl = canvas.toDataURL('image/png')
  const session = await getSession(view)
  const modelCanvas = letterboxToModelInput(canvas)
  const modelCtx = modelCanvas.getContext('2d')
  if (!modelCtx) {
    throw new Error('Canvas is unavailable in this browser.')
  }

  const imageData = modelCtx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE)
  const input = new Float32Array(1 * 3 * MODEL_SIZE * MODEL_SIZE)

  for (let y = 0; y < MODEL_SIZE; y += 1) {
    for (let x = 0; x < MODEL_SIZE; x += 1) {
      const idx = (y * MODEL_SIZE + x) * 4
      const r = imageData.data[idx] / 255
      const g = imageData.data[idx + 1] / 255
      const b = imageData.data[idx + 2] / 255
      const offset = y * MODEL_SIZE + x
      input[offset] = r
      input[MODEL_SIZE * MODEL_SIZE + offset] = g
      input[2 * MODEL_SIZE * MODEL_SIZE + offset] = b
    }
  }

  const ort = await ensureOrtRuntime()
  const inputName = session.inputNames?.[0] ?? session.getInputs?.()[0]?.name
  const outputName = session.outputNames?.[0] ?? session.getOutputs?.()[0]?.name
  if (!inputName || !outputName) {
    throw new Error('Unexpected ONNX session metadata.')
  }

  const outputs = await session.run({
    [inputName]: new ort.Tensor('float32', input, [1, 3, MODEL_SIZE, MODEL_SIZE]),
  })

  const output = outputs[outputName] ?? Object.values(outputs)[0]
  if (!output) {
    throw new Error('Tumor model did not return an output tensor.')
  }

  const detections = decodeDetections(output.data as Float32Array, output.dims, data.width, data.height, threshold)
  const cropImageUrl = detections.length ? createCropUrl(canvas, detections[0].box) : ''
  const overlayCanvas = canvas
  const overlayCtx = overlayCanvas.getContext('2d')
  if (!overlayCtx) {
    throw new Error('Canvas is unavailable in this browser.')
  }

  for (const detection of detections) {
    const { x1, y1, x2, y2 } = detection.box
    const color = detection.confidence >= 0.75 ? '#41d6a4' : detection.confidence >= 0.5 ? '#e6b84a' : '#e25555'
    overlayCtx.strokeStyle = color
    overlayCtx.lineWidth = Math.max(2, Math.floor(Math.min(data.width, data.height) / 120))
    overlayCtx.strokeRect(x1, y1, x2 - x1, y2 - y1)
    drawConfidenceBadge(overlayCtx, x1, y1, detection.confidence, x2 - x1)
  }

  const overlayImageUrl = overlayCanvas.toDataURL('image/png')

  return {
    runId: `tumor_${Date.now()}`,
    view,
    sourceImageUrl,
    overlayImageUrl: detections.length ? overlayImageUrl : '',
    cropImageUrl,
    detections,
    imageUrl: detections.length ? overlayImageUrl : sourceImageUrl,
  }
}
