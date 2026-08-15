export type RenderFrame = {
  left: number
  top: number
  width: number
  height: number
}

export type CanvasPoint = {
  x: number
  y: number
}

/**
 * Maps a pointer coordinate into an object-fit: contain canvas. Returns null
 * when the pointer is in the neutral letterbox area rather than the render.
 */
export const mapPointToContainedCanvas = (
  frame: RenderFrame,
  canvasWidth: number,
  canvasHeight: number,
  clientX: number,
  clientY: number,
): CanvasPoint | null => {
  if (canvasWidth <= 0 || canvasHeight <= 0 || frame.width <= 0 || frame.height <= 0) return null

  const scale = Math.min(frame.width / canvasWidth, frame.height / canvasHeight)
  const renderedWidth = canvasWidth * scale
  const renderedHeight = canvasHeight * scale
  const renderedLeft = frame.left + (frame.width - renderedWidth) / 2
  const renderedTop = frame.top + (frame.height - renderedHeight) / 2

  if (
    clientX < renderedLeft || clientX > renderedLeft + renderedWidth
    || clientY < renderedTop || clientY > renderedTop + renderedHeight
  ) return null

  return {
    x: Math.min(canvasWidth - 1, Math.max(0, Math.floor((clientX - renderedLeft) * canvasWidth / renderedWidth))),
    y: Math.min(canvasHeight - 1, Math.max(0, Math.floor((clientY - renderedTop) * canvasHeight / renderedHeight))),
  }
}

/** White, gray, transparent, and near-black pixels are page-scroll territory. */
export const isChromaticPixel = (red: number, green: number, blue: number, alpha: number) =>
  alpha > 16 && Math.max(red, green, blue) - Math.min(red, green, blue) >= 24
