/**
 * ifs-renderer.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canvas 2D renderer for Iterated Function System (IFS) fractals.
 *
 * IFS fractals are constructed by the chaos game algorithm: starting from a
 * seed point, repeatedly apply one of several affine transformations chosen
 * at random according to their probability weights, and accumulate the visited
 * points into a density map.  The density map is then colour-mapped to pixels.
 *
 * Both renderers here follow a three-phase pattern:
 *   1. Accumulate — run the IFS for N iterations into a Float32 density grid.
 *   2. Colour-map  — convert density → RGB using the active palette.
 *   3. Blit        — write ImageData to an offscreen canvas; the caller blits
 *                    the offscreen canvas to the visible canvas atomically to
 *                    prevent blank-flash artefacts during zoom/pan.
 *
 * Plug-in contract
 * ────────────────
 * To add a new IFS fractal:
 *   1. Write a function matching the `IFSRenderer` signature below.
 *   2. Register it in the `IFS_RENDERERS` map.
 *   3. Add the fractal to FRACTAL_TYPES / ZOOMABLE_TYPES in fractal-types.ts.
 *   4. Add a default viewport extent in viewport.ts → `defaultExtent`.
 */

import type { FractalType } from '../../core/services/contracts'
import type { RenderParams } from './fractal-types'
import type { Viewport } from './viewport'
import { clamp } from './viewport'
import { samplePalette } from './palettes'

// ── Shared helpers ────────────────────────────────────────────────────────────

/**
 * Write a filled square of pixels into an ImageData buffer.
 * Used to guarantee each plotted point is visible (1×1 pixel at minimum).
 *
 * @param data  - Mutable ImageData buffer.
 * @param x     - Left edge of the pixel block.
 * @param y     - Top edge of the pixel block.
 * @param size  - Side length in pixels.
 * @param r/g/b - RGB colour components in 0–255.
 */
const setPixelBlock = (
  data: ImageData,
  x: number,
  y: number,
  size: number,
  r: number,
  g: number,
  b: number,
): void => {
  const maxX = Math.min(data.width, x + size)
  const maxY = Math.min(data.height, y + size)
  for (let yy = y; yy < maxY; yy++) {
    for (let xx = x; xx < maxX; xx++) {
      const idx = (yy * data.width + xx) * 4
      data.data[idx] = r
      data.data[idx + 1] = g
      data.data[idx + 2] = b
      data.data[idx + 3] = 255
    }
  }
}

/** Map a world-space X coordinate to a canvas pixel column. */
const worldToPixelX = (worldX: number, viewport: Viewport, width: number): number =>
  Math.floor(((worldX - viewport.xMin) / (viewport.xMax - viewport.xMin)) * (width - 1))

/** Map a world-space Y coordinate to a canvas pixel row (Y-flipped). */
const worldToPixelY = (worldY: number, viewport: Viewport, height: number): number =>
  height - 1 - Math.floor(((worldY - viewport.yMin) / (viewport.yMax - viewport.yMin)) * (height - 1))

// ── IFS renderer signature ────────────────────────────────────────────────────

/**
 * Signature for all IFS renderer functions.
 * Returns the completed ImageData (to be written by the caller).
 * Must respect `isCancelled` to abort early when a newer render supersedes.
 */
type IFSRenderer = (options: {
  image: ImageData
  width: number
  height: number
  viewport: Viewport
  params: RenderParams
  maxIter: number
  isCancelled: () => boolean
}) => void

// ── Barnsley Fern ─────────────────────────────────────────────────────────────

/**
 * Renders the Barnsley Fern using Michael Barnsley's four-rule affine IFS.
 *
 * Affine rules and probabilities (from "Fractals Everywhere", 1988):
 *   p=0.01  → stem base:  [x,y] → [0,  0.16y]
 *   p=0.85  → main frond: [x,y] → [0.85x+0.04y, -0.04x+0.85y+1.6]
 *   p=0.07  → left leaflet
 *   p=0.07  → right leaflet
 *
 * Density accumulation with logarithmic tone-mapping produces natural
 * shading where heavily visited regions appear brighter.
 */
const renderBarnsleyFern: IFSRenderer = ({ image, width, height, viewport, params, maxIter, isCancelled }) => {
  const viewWidth = viewport.xMax - viewport.xMin
  const viewHeight = viewport.yMax - viewport.yMin
  if (viewWidth <= 0 || viewHeight <= 0) return

  const density = new Float32Array(width * height)
  let x = 0
  let y = 0
  let seed = 123456789
  const rand = (): number => {
    seed = (1664525 * seed + 1013904223) >>> 0
    return seed / 4294967296
  }

  const pointCount = Math.max(10000, maxIter * 180)
  let maxDensity = 1

  for (let i = 0; i < pointCount; i++) {
    if (isCancelled()) return

    const r = rand()
    let nx: number, ny: number
    if (r < 0.01) {
      nx = 0;              ny = 0.16 * y
    } else if (r < 0.86) {
      nx = 0.85 * x + 0.04 * y;  ny = -0.04 * x + 0.85 * y + 1.6
    } else if (r < 0.93) {
      nx = 0.2 * x - 0.26 * y;   ny = 0.23 * x + 0.22 * y + 1.6
    } else {
      nx = -0.15 * x + 0.28 * y; ny = 0.26 * x + 0.24 * y + 0.44
    }
    x = nx; y = ny

    const px = Math.floor(((x - viewport.xMin) / viewWidth) * (width - 1))
    const py = height - 1 - Math.floor(((y - viewport.yMin) / viewHeight) * (height - 1))
    if (px >= 0 && px < width && py >= 0 && py < height) {
      const idx = py * width + px
      density[idx]++
      maxDensity = Math.max(maxDensity, density[idx])
    }
  }

  // Colour-map density via log-normalised palette sampling
  for (let i = 0; i < density.length; i++) {
    const [r, g, b] = samplePalette(Math.log1p(density[i]), Math.log1p(maxDensity), params.colorScheme)
    image.data[i * 4]     = r
    image.data[i * 4 + 1] = g
    image.data[i * 4 + 2] = b
    image.data[i * 4 + 3] = 255
  }
}

// ── Sierpinski Triangle ───────────────────────────────────────────────────────

/**
 * Renders the Sierpinski Triangle using the three-vertex chaos game.
 *
 * Algorithm: pick a random vertex of the triangle and move halfway toward it.
 * After a short warm-up period the trajectory traces the Sierpinski attractor.
 *
 * World-space coordinates: x ∈ [0,1], y ∈ [0,1] (after y-normalisation by √3/2).
 */
const renderSierpinski: IFSRenderer = ({ image, width, height, viewport, maxIter, isCancelled }) => {
  const viewWidth = viewport.xMax - viewport.xMin
  const viewHeight = viewport.yMax - viewport.yMin
  if (viewWidth <= 0 || viewHeight <= 0) return

  image.data.fill(255) // white background

  const vertices = [
    [0.5, Math.sqrt(3) / 2],
    [0, 0],
    [1, 0],
  ]
  let x = 0.5
  let y = Math.sqrt(3) / 2
  let seed = 987654321
  const rand = (): number => {
    seed = (1103515245 * seed + 12345) >>> 0
    return seed / 4294967296
  }
  const WARMUP = 80
  const iterations = maxIter * 20

  for (let i = 0; i < iterations; i++) {
    if (isCancelled()) return

    const vertex = vertices[Math.floor(rand() * 3)]
    x = (x + vertex[0]) / 2
    y = (y + vertex[1]) / 2
    if (i < WARMUP) continue

    // Normalise y from the IFS coordinate system to [0,1] world space
    const worldY = y / (Math.sqrt(3) / 2)
    const px = worldToPixelX(x, viewport, width)
    const py = worldToPixelY(worldY, viewport, height)
    if (px >= 0 && px < width && py >= 0 && py < height) {
      setPixelBlock(image, px, py, 1, 16, 33, 43) // near-black dot
    }
  }
}

// ── Registry ──────────────────────────────────────────────────────────────────

/**
 * Maps fractal types to their IFS renderer functions.
 * Only types in this map are routed through the Canvas 2D path;
 * all other types use the WebGL renderer (see webgl-renderer.ts).
 */
export const IFS_RENDERERS: Partial<Record<FractalType, IFSRenderer>> = {
  'Barnsley Fern': renderBarnsleyFern,
  'Sierpinski Triangle': renderSierpinski,
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Dispatch to the correct IFS renderer and write the result atomically to
 * the visible canvas (via an offscreen intermediate to avoid blank flash).
 *
 * @param canvas       - Visible HTMLCanvasElement to write to.
 * @param params       - Active render parameters.
 * @param viewport     - Current viewport in world space.
 * @param maxIter      - Effective iteration cap.
 * @param isCancelled  - Predicate checked during iteration to abort superseded renders.
 * @param onComplete   - Called with the final viewport after a successful render.
 * @param onError      - Called with an error message on failure.
 */
export const renderIFS = (
  canvas: HTMLCanvasElement,
  params: RenderParams,
  viewport: Viewport,
  maxIter: number,
  isCancelled: () => boolean,
  onComplete: (v: Viewport) => void,
  onError: (msg: string) => void,
): void => {
  const renderer = IFS_RENDERERS[params.type]
  if (!renderer) {
    onError(`No IFS renderer registered for type: ${params.type}`)
    return
  }

  const width = clamp(Math.round(params.width), 320, 2800)
  const height = clamp(Math.round(params.height), 220, 1800)

  // Offscreen canvas prevents blank flash: the visible canvas is only updated once.
  const offscreen = document.createElement('canvas')
  offscreen.width = width
  offscreen.height = height
  const offCtx = offscreen.getContext('2d')
  if (!offCtx) {
    onError('Canvas 2D context unavailable.')
    return
  }

  const image = offCtx.createImageData(width, height)

  try {
    renderer({ image, width, height, viewport, params, maxIter, isCancelled })

    if (isCancelled()) return

    // Atomic blit to visible canvas
    offCtx.putImageData(image, 0, 0)
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(offscreen, 0, 0)
    }

    onComplete(viewport)
  } catch {
    onError('IFS render failed.')
  }
}
