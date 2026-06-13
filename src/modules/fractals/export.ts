/**
 * export.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Export helpers for fractal images.
 *
 * Two export formats are supported:
 *   - PNG  – rasterised snapshot via canvas.toDataURL.
 *   - SVG  – vector-native for Fern and Sierpinski (chaos-game polyline);
 *            image-embedded SVG wrapper for GPU-rendered fractals.
 *
 * All functions are pure (no React state side-effects) and can be called
 * from any context that has access to an HTMLCanvasElement.
 */

import { clamp } from './viewport'
import type { RenderParams } from './fractal-types'

// ── SVG builders ──────────────────────────────────────────────────────────────

/**
 * Wrap a canvas's pixel content inside an SVG <image> element.
 * Used as the SVG export path for WebGL-rendered escape-time fractals
 * (Mandelbrot, Julia, Burning Ship, Newton).
 */
export const buildSvgFromCanvas = (canvas: HTMLCanvasElement): string => {
  const pngData = canvas.toDataURL('image/png')
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">`,
    `  <image href="${pngData}" width="${canvas.width}" height="${canvas.height}" />`,
    `</svg>`,
  ].join('\n')
}

/**
 * Generate a vector-native SVG for the Sierpinski Triangle using the chaos
 * game algorithm (same construction as the Canvas renderer).
 * Produces a crisp polyline at any output size without rasterisation artefacts.
 *
 * @param width   - SVG canvas width in pixels.
 * @param height  - SVG canvas height in pixels.
 * @param maxIter - Controls point density (scaled internally to 2 000–60 000).
 */
export const buildSierpinskiSvg = (width: number, height: number, maxIter: number): string => {
  const points: string[] = []
  const vertices = [
    [0.5, Math.sqrt(3) / 2],
    [0, 0],
    [1, 0],
  ]
  let x = 0.5
  let y = Math.sqrt(3) / 2
  let seed = 1357911
  const nextRandom = (): number => {
    seed = (1103515245 * seed + 12345) >>> 0
    return seed / 4294967296
  }
  const iterations = Math.max(2000, Math.min(60000, maxIter * 12))
  for (let i = 0; i < iterations; i += 1) {
    const vertex = vertices[Math.floor(nextRandom() * 3)]
    x = (x + vertex[0]) / 2
    y = (y + vertex[1]) / 2
    if (i < 80) continue
    points.push(`${(x * width).toFixed(2)},${(height - (y / (Math.sqrt(3) / 2)) * height).toFixed(2)}`)
  }
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <rect width="100%" height="100%" fill="#ffffff"/>`,
    `  <polyline points="${points.join(' ')}" fill="none" stroke="#102130" stroke-width="0.55" stroke-linecap="round" stroke-linejoin="round"/>`,
    `</svg>`,
  ].join('\n')
}

/**
 * Generate a vector-native SVG for the Barnsley Fern using the chaos game IFS.
 * Produces a natural-looking fern outline as a thin vector stroke.
 *
 * @param width   - SVG canvas width in pixels.
 * @param height  - SVG canvas height in pixels.
 * @param maxIter - Controls point density (scaled internally to 12 000–90 000).
 */
export const buildFernSvg = (width: number, height: number, maxIter: number): string => {
  const points: string[] = []
  let x = 0
  let y = 0
  let seed = 24681357
  const nextRandom = (): number => {
    seed = (1664525 * seed + 1013904223) >>> 0
    return seed / 4294967296
  }
  const iterations = Math.max(12000, Math.min(90000, maxIter * 160))
  for (let i = 0; i < iterations; i += 1) {
    const r = nextRandom()
    let nx: number, ny: number
    if (r < 0.01) {
      nx = 0;             ny = 0.16 * y
    } else if (r < 0.86) {
      nx = 0.85 * x + 0.04 * y;   ny = -0.04 * x + 0.85 * y + 1.6
    } else if (r < 0.93) {
      nx = 0.2 * x - 0.26 * y;    ny = 0.23 * x + 0.22 * y + 1.6
    } else {
      nx = -0.15 * x + 0.28 * y;  ny = 0.26 * x + 0.24 * y + 0.44
    }
    x = nx; y = ny
    points.push(`${(((x + 2.5) / 5) * width).toFixed(2)},${(height - (y / 10) * height).toFixed(2)}`)
  }
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `  <rect width="100%" height="100%" fill="#ffffff"/>`,
    `  <polyline points="${points.join(' ')}" fill="none" stroke="#007a65" stroke-width="0.35" stroke-linecap="round" stroke-linejoin="round"/>`,
    `</svg>`,
  ].join('\n')
}

// ── Download triggers ─────────────────────────────────────────────────────────

/**
 * Trigger a browser download for a text payload (SVG, JSON, etc.).
 *
 * @param fileName - Suggested download file name including extension.
 * @param content  - Text content to save.
 * @param mime     - MIME type string. Defaults to image/svg+xml.
 */
export const downloadTextAsFile = (
  fileName: string,
  content: string,
  mime = 'image/svg+xml',
): void => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Trigger a browser download for a data URL (e.g. canvas.toDataURL output).
 *
 * @param fileName - Suggested download file name including extension.
 * @param dataUrl  - Data URL string (e.g. "data:image/png;base64,…").
 */
export const downloadDataUrl = (fileName: string, dataUrl: string): void => {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = fileName
  link.click()
}

// ── Convenience facade ────────────────────────────────────────────────────────

/** Normalised file-name slug from a fractal type string. */
const slug = (type: string) => type.toLowerCase().replace(/\s+/g, '-')

/**
 * Download the current fractal canvas as a PNG file.
 *
 * @param canvas - The HTMLCanvasElement to snapshot.
 * @param params - Active render parameters (used to derive file name).
 */
export const exportPng = (canvas: HTMLCanvasElement, params: RenderParams): void => {
  downloadDataUrl(`fractal-${slug(params.type)}.png`, canvas.toDataURL('image/png'))
}

/**
 * Download the current fractal as an SVG file.
 * IFS types (Barnsley Fern, Sierpinski Triangle) produce vector-native SVGs.
 * GPU-rendered types produce an image-embedded SVG wrapping the canvas content.
 *
 * @param canvas - The WebGL or 2D canvas element.
 * @param params - Active render parameters.
 */
export const exportSvg = (canvas: HTMLCanvasElement, params: RenderParams): void => {
  const width = clamp(Math.round(params.width), 320, 2800)
  const height = clamp(Math.round(params.height), 220, 1800)
  let svg: string
  if (params.type === 'Sierpinski Triangle') {
    svg = buildSierpinskiSvg(width, height, params.maxIter)
  } else if (params.type === 'Barnsley Fern') {
    svg = buildFernSvg(width, height, params.maxIter)
  } else {
    svg = buildSvgFromCanvas(canvas)
  }
  downloadTextAsFile(`fractal-${slug(params.type)}.svg`, svg)
}
