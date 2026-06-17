type CompareOverlayVisual = {
  size: number
  count: number
  url: string
}

type CompareBoxCount = {
  size: number
  count: number
}

type CompareChartPoint = {
  x: number
  y: number
}

export type CompareImageVisuals = {
  grayscaleUrl: string
  binarizedUrl: string
  overlayVisuals: CompareOverlayVisual[]
  boxCounts: CompareBoxCount[]
  fractalDimension: number
  fitR2: number
  chartPoints: CompareChartPoint[]
}

const readImageBitmap = async (file: File) => createImageBitmap(file)

const bitmapToCanvas = (bitmap: ImageBitmap) => {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas context is unavailable.')
  }
  context.drawImage(bitmap, 0, 0)
  return { canvas, context }
}

const canvasToDataUrl = (canvas: HTMLCanvasElement) => canvas.toDataURL('image/png')

const grayscaleFromImageData = (imageData: ImageData) => {
  const { data, width, height } = imageData
  const grayData = new Uint8ClampedArray(data.length)
  let sum = 0

  for (let index = 0; index < data.length; index += 4) {
    const grayscale = Math.round(0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2])
    grayData[index] = grayscale
    grayData[index + 1] = grayscale
    grayData[index + 2] = grayscale
    grayData[index + 3] = 255
    sum += grayscale
  }

  return {
    imageData: new ImageData(grayData, width, height),
    threshold: sum / (width * height),
  }
}

const binarizeImageData = (imageData: ImageData, threshold: number) => {
  const { data, width, height } = imageData
  const binaryData = new Uint8ClampedArray(data.length)

  for (let index = 0; index < data.length; index += 4) {
    const value = data[index] >= threshold ? 255 : 0
    binaryData[index] = value
    binaryData[index + 1] = value
    binaryData[index + 2] = value
    binaryData[index + 3] = 255
  }

  return new ImageData(binaryData, width, height)
}

const countOccupiedBoxes = (binaryData: ImageData, boxSize: number) => {
  const { data, width, height } = binaryData
  const safeBoxSize = Math.max(1, Math.floor(boxSize))
  let count = 0

  for (let y = 0; y < height; y += safeBoxSize) {
    for (let x = 0; x < width; x += safeBoxSize) {
      let occupied = false

      for (let yy = y; yy < Math.min(height, y + safeBoxSize) && !occupied; yy += 1) {
        for (let xx = x; xx < Math.min(width, x + safeBoxSize); xx += 1) {
          const index = (yy * width + xx) * 4
          if (data[index] > 0) {
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

  return count
}

const countBoxesAcrossScales = (binaryData: ImageData): CompareBoxCount[] => {
  const maxBox = Math.max(2, Math.floor(Math.min(binaryData.width, binaryData.height) / 4))
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

  return sizes
    .sort((left, right) => left - right)
    .map((size) => ({
      size,
      count: Math.max(1, countOccupiedBoxes(binaryData, size)),
    }))
}

const computeFractalMetrics = (boxCounts: CompareBoxCount[]) => {
  const valid = boxCounts.filter((item) => item.size > 0 && item.count > 0)
  if (valid.length < 2) {
    return {
      fractalDimension: 0,
      fitR2: 0,
      chartPoints: [] as CompareChartPoint[],
    }
  }

  const xs = valid.map((item) => Math.log(item.size))
  const ys = valid.map((item) => Math.log(item.count))
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length
  const numerator = xs.reduce((sum, value, index) => sum + (value - meanX) * (ys[index] - meanY), 0)
  const denominator = xs.reduce((sum, value) => sum + (value - meanX) ** 2, 0)

  if (denominator === 0) {
    return {
      fractalDimension: 0,
      fitR2: 0,
      chartPoints: valid.map((item) => ({ x: Math.log(1 / item.size), y: Math.log(item.count) })),
    }
  }

  const slope = numerator / denominator
  const intercept = meanY - slope * meanX
  const fitted = xs.map((value) => slope * value + intercept)
  const ssRes = ys.reduce((sum, value, index) => sum + (value - fitted[index]) ** 2, 0)
  const ssTot = ys.reduce((sum, value) => sum + (value - meanY) ** 2, 0)

  return {
    fractalDimension: Number((-slope).toFixed(4)),
    fitR2: Number((ssTot === 0 ? 0 : 1 - ssRes / ssTot).toFixed(4)),
    chartPoints: valid.map((item) => ({ x: Math.log(1 / item.size), y: Math.log(item.count) })),
  }
}

const buildBoxOverlayUrl = (binaryData: ImageData, boxSize: number, accent: string) => {
  const { width, height, data } = binaryData
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas context is unavailable.')
  }

  context.putImageData(binaryData, 0, 0)
  context.fillStyle = `${accent}30`
  context.strokeStyle = accent
  context.lineWidth = Math.max(1, Math.round(Math.min(width, height) / 180))

  const safeBoxSize = Math.max(1, Math.floor(boxSize))

  for (let y = 0; y < height; y += safeBoxSize) {
    for (let x = 0; x < width; x += safeBoxSize) {
      let occupied = false

      for (let yy = y; yy < Math.min(height, y + safeBoxSize) && !occupied; yy += 1) {
        for (let xx = x; xx < Math.min(width, x + safeBoxSize); xx += 1) {
          const index = (yy * width + xx) * 4
          if (data[index] > 0) {
            occupied = true
            break
          }
        }
      }

      if (occupied) {
        context.fillRect(x, y, safeBoxSize, safeBoxSize)
      }
      context.strokeRect(x, y, safeBoxSize, safeBoxSize)
    }
  }

  return canvasToDataUrl(canvas)
}

export async function buildCompareImageVisuals(file: File, boxSizes: number[] = [], accent = '#ff7b4a'): Promise<CompareImageVisuals> {
  const bitmap = await readImageBitmap(file)
  const { canvas } = bitmapToCanvas(bitmap)
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas context is unavailable.')
  }

  const sourceData = context.getImageData(0, 0, canvas.width, canvas.height)
  const grayscale = grayscaleFromImageData(sourceData)
  const binarized = binarizeImageData(grayscale.imageData, grayscale.threshold)

  const grayscaleCanvas = document.createElement('canvas')
  grayscaleCanvas.width = canvas.width
  grayscaleCanvas.height = canvas.height
  const grayscaleContext = grayscaleCanvas.getContext('2d')
  if (!grayscaleContext) {
    throw new Error('Canvas context is unavailable.')
  }
  grayscaleContext.putImageData(grayscale.imageData, 0, 0)

  const binarizedCanvas = document.createElement('canvas')
  binarizedCanvas.width = canvas.width
  binarizedCanvas.height = canvas.height
  const binarizedContext = binarizedCanvas.getContext('2d')
  if (!binarizedContext) {
    throw new Error('Canvas context is unavailable.')
  }
  binarizedContext.putImageData(binarized, 0, 0)

  const overlayVisuals = boxSizes
    .filter((size, index, values) => Number.isFinite(size) && size > 0 && values.indexOf(size) === index)
    .map((size) => ({
      size,
      count: countOccupiedBoxes(binarized, size),
      url: buildBoxOverlayUrl(binarized, size, accent),
    }))

  const boxCounts = countBoxesAcrossScales(binarized)
  const metrics = computeFractalMetrics(boxCounts)

  return {
    grayscaleUrl: canvasToDataUrl(grayscaleCanvas),
    binarizedUrl: canvasToDataUrl(binarizedCanvas),
    overlayVisuals,
    boxCounts,
    fractalDimension: metrics.fractalDimension,
    fitR2: metrics.fitR2,
    chartPoints: metrics.chartPoints,
  }
}
