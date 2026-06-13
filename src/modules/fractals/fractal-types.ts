/**
 * fractal-types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Central registry for all fractal-domain types, constants and educational
 * metadata. Add a new fractal family here and the rest of the system picks it
 * up automatically via the shared registries.
 *
 * Plug-in contract
 * ────────────────
 * To register a new fractal family:
 *   1. Add its name as a literal to `FractalType` in contracts.ts.
 *   2. Add it to `FRACTAL_TYPES` below.
 *   3. Add it to `ZOOMABLE_TYPES` if pan/zoom should be enabled.
 *   4. Add its educational entry in `FRACTAL_GUIDES`.
 *   5. Add its default viewport extent in viewport.ts → `defaultExtent`.
 *   6. Wire its renderer in webgl-renderer.ts or ifs-renderer.ts.
 */

import type { FractalType } from '../../core/services/contracts'

// ── Ordered list used to populate the fractal type dropdown ──────────────────

/** All supported fractal families, in display order. */
export const FRACTAL_TYPES: FractalType[] = [
  'Mandelbrot',
  'Julia',
  'Burning Ship',
  'Newton',
  'Barnsley Fern',
  'Sierpinski Triangle',
]

// ── Interaction capability flags ─────────────────────────────────────────────

/**
 * Fractal types for which viewport pan/zoom is supported.
 * IFS attractors (Fern, Sierpinski) and escape-time fractals both qualify
 * because they use viewport-mapped pixel coordinates during rendering.
 */
export const ZOOMABLE_TYPES: FractalType[] = [
  'Mandelbrot',
  'Julia',
  'Burning Ship',
  'Newton',
  'Barnsley Fern',
  'Sierpinski Triangle',
]

// ── Render parameters type ────────────────────────────────────────────────────

/**
 * Complete set of user-controlled render parameters.
 * Passed to both the WebGL renderer and the Canvas 2D IFS renderer.
 */
export type RenderParams = {
  /** Which fractal family to render. */
  type: FractalType
  /** Output width in pixels (clamped 320–2800 before use). */
  width: number
  /** Output height in pixels (clamped 220–1800 before use). */
  height: number
  /** Maximum iteration depth (escape-time) or point count multiplier (IFS). */
  maxIter: number
  /** Name of the active color scheme. Must be a key in CANVAS_PALETTE_STOPS. */
  colorScheme: string
  /**
   * Polynomial exponent for Mandelbrot / Burning Ship variants,
   * or polynomial degree for Newton fractals.
   */
  power?: number
  /** Real part of the Julia set parameter c. */
  cReal?: number
  /** Imaginary part of the Julia set parameter c. */
  cImag?: number
}

// ── Educational content ───────────────────────────────────────────────────────

/** Per-type study guidance shown in the control panel. */
export type FractalGuide = {
  /** One-sentence description of the visual/mathematical focus. */
  focus: string
  /** Suggested pedagogical use-case for this fractal family. */
  learningUse: string
}

/**
 * Educational guide entries indexed by fractal type.
 * To add a guide for a new fractal, insert an entry here.
 */
export const FRACTAL_GUIDES: Record<FractalType, FractalGuide> = {
  Mandelbrot: {
    focus: 'Boundary complexity and self-similarity under iterative escape-time dynamics.',
    learningUse: 'Use this as a baseline to compare texture and edge behavior with other families.',
  },
  Julia: {
    focus: 'Parameter-sensitive topology controlled by the complex constant c = cReal + i*cImag.',
    learningUse: 'Sweep c values to study phase transitions between connected and dust-like sets.',
  },
  'Burning Ship': {
    focus: 'Absolute-value nonlinearity creates sharper ridges and flame-like morphology.',
    learningUse: 'Compare roughness versus Mandelbrot to discuss anisotropy in fractal geometry.',
  },
  Newton: {
    focus: 'Basins of attraction visualize root convergence for polynomial iterations.',
    learningUse: 'Use degree changes to inspect how convergence regions split and interleave.',
  },
  'Barnsley Fern': {
    focus: 'Affine stochastic system produces natural leaf-like self-similar structure.',
    learningUse: 'Use for teaching Iterated Function Systems and probabilistic construction.',
  },
  'Sierpinski Triangle': {
    focus: 'Canonical recursive triangle with exact geometric self-similarity.',
    learningUse: 'Use as a clean reference case for discussing fractal dimension fundamentals.',
  },
}
