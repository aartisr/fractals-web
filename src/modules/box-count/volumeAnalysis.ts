export type VolumeSourceKind = 'mesh' | 'dicom-stack'

export interface VolumeBoxCountResult {
  runId: string
  sourceKind: VolumeSourceKind
  fractalDimension: number
  elapsedSeconds: number
  boxCounts: Array<{ size: number; count: number }>
  pointCount: number
  bounds: { x: number; y: number; z: number }
  gridOptimization: { enabled: true; offsetsPerScale: number; method: string }
}

type Point3 = [number, number, number]
const MAX_POINTS = 250_000
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

const parseObj = (text: string): Point3[] => text.split(/\r?\n/).flatMap((line) => {
  const parts = line.trim().split(/\s+/)
  if (parts[0] !== 'v' || parts.length < 4) return []
  const point: Point3 = [Number(parts[1]), Number(parts[2]), Number(parts[3])]
  return point.every(Number.isFinite) ? [point] : []
})

const parseStl = async (file: File): Promise<Point3[]> => {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const textPrefix = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 512))).trimStart().toLowerCase()
  if (textPrefix.startsWith('solid')) {
    return [...new TextDecoder().decode(bytes).matchAll(/vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/gi)].flatMap((match) => {
      const point: Point3 = [Number(match[1]), Number(match[2]), Number(match[3])]
      return point.every(Number.isFinite) ? [point] : []
    })
  }
  if (buffer.byteLength < 84) return []
  const view = new DataView(buffer)
  const triangleCount = view.getUint32(80, true)
  if (84 + triangleCount * 50 > buffer.byteLength) return []
  const points: Point3[] = []
  for (let triangle = 0; triangle < triangleCount && points.length < MAX_POINTS; triangle += 1) {
    const base = 84 + triangle * 50 + 12
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = base + vertex * 12
      points.push([view.getFloat32(offset, true), view.getFloat32(offset + 4, true), view.getFloat32(offset + 8, true)])
    }
  }
  return points.filter((point) => point.every(Number.isFinite))
}

const sample = <T,>(values: T[], maximum = MAX_POINTS) => {
  if (values.length <= maximum) return values
  const stride = values.length / maximum
  return Array.from({ length: maximum }, (_, index) => values[Math.floor(index * stride)])
}

const normalizePoints = (points: Point3[]) => {
  const min: Point3 = [Infinity, Infinity, Infinity]
  const max: Point3 = [-Infinity, -Infinity, -Infinity]
  points.forEach((point) => point.forEach((value, axis) => {
    min[axis] = Math.min(min[axis], value)
    max[axis] = Math.max(max[axis], value)
  }))
  const extent: Point3 = [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
  const side = Math.max(...extent, 1e-9)
  return { extent, points: points.map((point) => [
    clamp(Math.floor(((point[0] - min[0]) / side) * 127), 0, 127),
    clamp(Math.floor(((point[1] - min[1]) / side) * 127), 0, 127),
    clamp(Math.floor(((point[2] - min[2]) / side) * 127), 0, 127),
  ] as Point3) }
}

const countAtOffset = (points: Point3[], size: number, offset: Point3) => new Set(points.map(([x, y, z]) => {
  const gx = Math.floor((x + offset[0]) / size)
  const gy = Math.floor((y + offset[1]) / size)
  const gz = Math.floor((z + offset[2]) / size)
  return `${gx}:${gy}:${gz}`
})).size

const boxCounts3d = (points: Point3[]) => [1, 2, 4, 8, 16, 32, 64].map((size) => {
  const half = Math.floor(size / 2)
  const offsets: Point3[] = size <= 2 ? [[0, 0, 0]] : [[0, 0, 0], [half, 0, 0], [0, half, 0], [0, 0, half], [half, half, half]]
  const count = offsets.reduce((sum, offset) => sum + countAtOffset(points, size, offset), 0) / offsets.length
  return { size, count: Number(count.toFixed(4)) }
})

const dimension = (counts: Array<{ size: number; count: number }>) => {
  const xs = counts.map(({ size }) => Math.log(size))
  const ys = counts.map(({ count }) => Math.log(count))
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length
  const denominator = xs.reduce((sum, value) => sum + (value - meanX) ** 2, 0)
  return Number((-(xs.reduce((sum, value, index) => sum + (value - meanX) * (ys[index] - meanY), 0) / denominator)).toFixed(4))
}

export async function analyzeMeshVolume(file: File): Promise<VolumeBoxCountResult> {
  const start = performance.now()
  const extension = file.name.split('.').pop()?.toLowerCase()
  const points = sample(extension === 'obj' ? parseObj(await file.text()) : await parseStl(file))
  if (points.length < 8) throw new Error('The mesh has too few readable vertices. Upload a valid OBJ or STL geometry file.')
  const normalized = normalizePoints(points)
  const boxCounts = boxCounts3d(normalized.points)
  return {
    runId: `volume_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sourceKind: 'mesh', fractalDimension: dimension(boxCounts), boxCounts, pointCount: points.length, bounds: { x: normalized.extent[0], y: normalized.extent[1], z: normalized.extent[2] },
    elapsedSeconds: Number(((performance.now() - start) / 1000).toFixed(4)),
    gridOptimization: { enabled: true, offsetsPerScale: 5, method: 'five-phase translated-voxel-grid average' },
  }
}

type DicomSlice = { width: number; height: number; pixels: Uint16Array }

const readDicomSlice = async (file: File): Promise<DicomSlice> => {
  const buffer = await file.arrayBuffer()
  const view = new DataView(buffer)
  let offset = buffer.byteLength >= 132 && new TextDecoder().decode(new Uint8Array(buffer, 128, 4)) === 'DICM' ? 132 : 0
  let width = 0, height = 0, bits = 8, pixelOffset = -1, pixelLength = 0
  while (offset + 8 <= view.byteLength) {
    const group = view.getUint16(offset, true), element = view.getUint16(offset + 2, true)
    const vr = String.fromCharCode(view.getUint8(offset + 4), view.getUint8(offset + 5))
    const longVr = ['OB', 'OD', 'OF', 'OL', 'OW', 'SQ', 'UC', 'UR', 'UT', 'UN'].includes(vr)
    const header = longVr ? 12 : 8
    if (offset + header > view.byteLength) break
    const length = longVr ? view.getUint32(offset + 8, true) : view.getUint16(offset + 6, true)
    const valueOffset = offset + header
    if (length === 0xffffffff || valueOffset + length > view.byteLength) break
    if (group === 0x0028 && element === 0x0010) height = view.getUint16(valueOffset, true)
    if (group === 0x0028 && element === 0x0011) width = view.getUint16(valueOffset, true)
    if (group === 0x0028 && element === 0x0100) bits = view.getUint16(valueOffset, true)
    if (group === 0x7fe0 && element === 0x0010) { pixelOffset = valueOffset; pixelLength = length; break }
    offset = valueOffset + length
  }
  if (!width || !height || pixelOffset < 0 || ![8, 16].includes(bits)) throw new Error('Only uncompressed explicit-little-endian DICOM slices with 8- or 16-bit pixels are supported in-browser.')
  const pixelCount = width * height
  if (pixelLength < pixelCount * (bits / 8)) throw new Error('DICOM pixel data is incomplete.')
  const pixels = new Uint16Array(pixelCount)
  for (let i = 0; i < pixelCount; i += 1) pixels[i] = bits === 8 ? view.getUint8(pixelOffset + i) : view.getUint16(pixelOffset + i * 2, true)
  return { width, height, pixels }
}

export async function analyzeDicomStack(files: File[]): Promise<VolumeBoxCountResult> {
  const start = performance.now()
  if (files.length < 2) throw new Error('Choose at least two DICOM slices to form a volume.')
  const slices = await Promise.all(files.map(readDicomSlice))
  const { width, height } = slices[0]
  if (slices.some((slice) => slice.width !== width || slice.height !== height)) throw new Error('All DICOM slices must share the same pixel dimensions.')
  const allValues = slices.flatMap((slice) => Array.from(slice.pixels))
  const threshold = allValues.reduce((sum, value) => sum + value, 0) / allValues.length
  const points: Point3[] = []
  slices.forEach((slice, z) => slice.pixels.forEach((value, index) => {
    if (value > threshold) points.push([index % width, Math.floor(index / width), z])
  }))
  if (points.length < 8) throw new Error('The DICOM stack has too little above-threshold structure to count.')
  const normalized = normalizePoints(sample(points))
  const boxCounts = boxCounts3d(normalized.points)
  return {
    runId: `dicom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sourceKind: 'dicom-stack', fractalDimension: dimension(boxCounts), boxCounts, pointCount: points.length, bounds: { x: width, y: height, z: slices.length },
    elapsedSeconds: Number(((performance.now() - start) / 1000).toFixed(4)),
    gridOptimization: { enabled: true, offsetsPerScale: 5, method: 'five-phase translated-voxel-grid average' },
  }
}
