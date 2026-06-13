/**
 * viewport.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Immutable viewport math for the fractal explorer.
 *
 * A `Viewport` is a rectangular region in fractal coordinate space (the complex
 * plane for escape-time fractals, real Euclidean space for IFS attractors).
 * All zoom and pan operations return NEW Viewport objects — they never mutate
 * the original — which makes them safe to use directly with React state.
 *
 * Plug-in contract
 * ────────────────
 * To add a default viewport for a new fractal family, extend `defaultExtent`
 * with the matching `case` branch. No other changes are required.
 */

import type { FractalType } from '../../core/services/contracts'

// ── Core type ─────────────────────────────────────────────────────────────────

/** Axis-aligned rectangle in fractal world space. */
export type Viewport = {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

// ── Utility ───────────────────────────────────────────────────────────────────

/** Clamp `value` into [min, max]. */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

// ── Default extents ───────────────────────────────────────────────────────────

/**
 * Returns the canonical "home" viewport for a given fractal type.
 * Used when the user presses Home/Reset or switches fractal families.
 */
export const defaultExtent = (type: FractalType): Viewport => {
  switch (type) {
    case 'Mandelbrot':
      return { xMin: -2.5, xMax: 1, yMin: -1.25, yMax: 1.25 }
    case 'Julia':
      return { xMin: -2, xMax: 2, yMin: -2, yMax: 2 }
    case 'Burning Ship':
      return { xMin: -2.2, xMax: 1.2, yMin: -2.2, yMax: 1.2 }
    case 'Newton':
      return { xMin: -2, xMax: 2, yMin: -2, yMax: 2 }
    case 'Barnsley Fern':
      // Fern IFS world coordinates span roughly x ∈ [-2.8, 2.8], y ∈ [0, 10]
      return { xMin: -2.8, xMax: 2.8, yMin: 0, yMax: 10 }
    case 'Sierpinski Triangle':
      // Chaos-game world coords normalised to [0,1]×[0,1] with slight margin
      return { xMin: -0.05, xMax: 1.05, yMin: -0.05, yMax: 1.1 }
    default:
      return { xMin: -2, xMax: 2, yMin: -2, yMax: 2 }
  }
}

// ── Viewport transforms ───────────────────────────────────────────────────────

/**
 * Zoom the viewport by `scale` around a focus point expressed as a
 * normalised canvas-space fraction (tx, ty) ∈ [0, 1].
 *
 * - scale < 1 → zoom in (smaller world region)
 * - scale > 1 → zoom out (larger world region)
 *
 * The zoom is clamped so that the span never drops below `minSpan` or
 * exceeds 20 units, preventing both arithmetic underflow and runaway zoom.
 *
 * @param current   - Current viewport before transform.
 * @param scale     - Zoom scale factor.
 * @param tx        - Horizontal focus fraction (0 = left, 1 = right). Default 0.5.
 * @param ty        - Vertical focus fraction (0 = top, 1 = bottom). Default 0.5.
 * @param minSpan   - Minimum permitted span (use 1e-18 for precision mode).
 */
export const zoomViewport = (
  current: Viewport,
  scale: number,
  tx = 0.5,
  ty = 0.5,
  minSpan = 1e-15,
): Viewport => {
  const w = current.xMax - current.xMin
  const h = current.yMax - current.yMin
  const focusX = current.xMin + tx * w
  const focusY = current.yMax - ty * h

  const ws = clamp(scale, minSpan / Math.max(w, minSpan), 20 / Math.max(w, minSpan))
  const hs = clamp(scale, minSpan / Math.max(h, minSpan), 20 / Math.max(h, minSpan))
  const s = Math.max(ws, hs)

  return {
    xMin: focusX - (focusX - current.xMin) * s,
    xMax: focusX + (current.xMax - focusX) * s,
    yMin: focusY - (focusY - current.yMin) * s,
    yMax: focusY + (current.yMax - focusY) * s,
  }
}

/**
 * Translate the viewport by a fraction of its current size.
 *
 * @param current - Current viewport before transform.
 * @param fx      - Horizontal shift as a fraction of viewport width (+x = right).
 * @param fy      - Vertical shift as a fraction of viewport height (+y = up).
 */
export const panViewport = (current: Viewport, fx: number, fy: number): Viewport => {
  const shiftX = (current.xMax - current.xMin) * fx
  const shiftY = (current.yMax - current.yMin) * fy
  return {
    xMin: current.xMin + shiftX,
    xMax: current.xMax + shiftX,
    yMin: current.yMin + shiftY,
    yMax: current.yMax + shiftY,
  }
}
