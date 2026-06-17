const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export interface ImagePoint {
  x: number
  y: number
  imageWidth: number
  imageHeight: number
}

export interface RenderedImageGeometry {
  rect: DOMRect
  renderedWidth: number
  renderedHeight: number
  offsetX: number
  offsetY: number
  imageWidth: number
  imageHeight: number
}

export interface RenderedRoiRect {
  leftPx: number
  topPx: number
  sizePx: number
}

function getRenderedImageGeometry(img: HTMLImageElement): RenderedImageGeometry | null {
  const rect = img.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    return null
  }

  const imageWidth = img.naturalWidth || img.width
  const imageHeight = img.naturalHeight || img.height
  if (imageWidth <= 0 || imageHeight <= 0) {
    return null
  }

  const imageAspect = imageWidth / imageHeight
  const boxAspect = rect.width / rect.height

  let renderedWidth = rect.width
  let renderedHeight = rect.height

  if (imageAspect > boxAspect) {
    renderedHeight = rect.width / imageAspect
  } else {
    renderedWidth = rect.height * imageAspect
  }

  const offsetX = (rect.width - renderedWidth) / 2
  const offsetY = (rect.height - renderedHeight) / 2

  return {
    rect,
    renderedWidth,
    renderedHeight,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight,
  }
}

export function clientPointToImagePoint(img: HTMLImageElement, clientX: number, clientY: number): ImagePoint | null {
  const geometry = getRenderedImageGeometry(img)
  if (!geometry) {
    return null
  }

  const { rect, renderedWidth, renderedHeight, offsetX, offsetY, imageWidth, imageHeight } = geometry

  const localX = clientX - rect.left - offsetX
  const localY = clientY - rect.top - offsetY

  if (localX < 0 || localY < 0 || localX > renderedWidth || localY > renderedHeight) {
    return null
  }

  const imageX = Math.floor((localX / renderedWidth) * imageWidth)
  const imageY = Math.floor((localY / renderedHeight) * imageHeight)

  return {
    x: clamp(imageX, 0, imageWidth - 1),
    y: clamp(imageY, 0, imageHeight - 1),
    imageWidth,
    imageHeight,
  }
}

export function imageRoiToRenderedRect(
  img: HTMLImageElement,
  roi: { x: number; y: number; size: number },
): RenderedRoiRect | null {
  const geometry = getRenderedImageGeometry(img)
  if (!geometry) {
    return null
  }

  const { renderedWidth, renderedHeight, offsetX, offsetY, imageWidth, imageHeight } = geometry

  const scaleX = renderedWidth / imageWidth
  const scaleY = renderedHeight / imageHeight

  const leftPx = offsetX + roi.x * scaleX
  const topPx = offsetY + roi.y * scaleY
  const sizePx = Math.max(1, roi.size * Math.min(scaleX, scaleY))

  return {
    leftPx,
    topPx,
    sizePx,
  }
}
