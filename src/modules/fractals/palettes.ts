/**
 * palettes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Color scheme definitions used by both the Canvas 2D IFS renderer and the
 * WebGL escape-time shader.
 *
 * Each palette is a list of exactly 5 RGB stop colours.  The runtime
 * interpolates linearly between adjacent stops to produce a smooth gradient
 * mapped to iteration density or escape value.
 *
 * Plug-in contract
 * ────────────────
 * To add a new palette:
 *   1. Add its name to `COLOR_SCHEMES` (the UI dropdown picks this up).
 *   2. Add its 5 RGB stops to `CANVAS_PALETTE_STOPS` (Canvas 2D renderer).
 *   3. Add the matching `else if(u_scheme==N)` branch to the GLSL `pal()`
 *      function in webgl-renderer.ts, using the same colours normalised to
 *      [0,1] floats.
 *   4. Add the name→integer mapping to `GL_SCHEME_IDS` below.
 */

// ── Palette registry (Canvas 2D) ─────────────────────────────────────────────

/** Available color scheme names. Used to populate the UI dropdown. */
export const COLOR_SCHEMES = [
  'inferno', 'plasma', 'viridis', 'magma',
  'cividis', 'turbo', 'cubehelix', 'spectral',
  'coolwarm', 'twilight', 'ocean', 'fire', 'ice',
] as const

/** Type alias for valid color scheme names. */
export type ColorSchemeName = (typeof COLOR_SCHEMES)[number]

/**
 * Five-stop RGB colour tables used by the Canvas 2D renderer.
 * Format: [[R,G,B], …] with values in 0–255.
 * Index 0 is the darkest / lowest-value stop; index 4 is the brightest.
 */
export const CANVAS_PALETTE_STOPS: Record<string, [number, number, number][]> = {
  inferno:    [[0,0,4],[87,15,109],[187,55,84],[249,142,8],[252,255,164]],
  plasma:     [[13,8,135],[126,3,168],[203,71,120],[248,149,64],[240,249,33]],
  viridis:    [[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]],
  magma:      [[0,0,4],[80,18,123],[182,54,121],[251,136,97],[252,253,191]],
  cividis:    [[0,34,78],[48,73,124],[86,108,130],[138,140,107],[253,233,69]],
  turbo:      [[48,18,59],[45,109,212],[41,190,132],[245,210,64],[122,4,2]],
  cubehelix:  [[0,0,0],[37,35,95],[95,111,135],[198,155,124],[255,255,255]],
  spectral:   [[94,79,162],[50,136,189],[102,194,165],[252,141,89],[158,1,66]],
  coolwarm:   [[58,76,192],[123,158,248],[221,221,221],[245,152,121],[180,4,38]],
  twilight:   [[39,26,69],[90,58,122],[129,94,147],[187,134,162],[236,220,190]],
  ocean:      [[0,21,57],[0,84,140],[0,140,166],[77,190,160],[219,242,255]],
  fire:       [[0,0,0],[95,7,20],[180,34,18],[245,122,10],[255,232,150]],
  ice:        [[0,15,40],[0,72,120],[68,150,195],[160,220,240],[244,252,255]],
}

// ── WebGL palette mapping ─────────────────────────────────────────────────────

/**
 * Maps palette names to the integer uniform sent to the WebGL shader.
 * Must stay in sync with the `pal()` function in webgl-renderer.ts.
 */
export const GL_SCHEME_IDS: Record<string, number> = {
  inferno:   0,
  plasma:    1,
  viridis:   2,
  magma:     3,
  cividis:   4,
  turbo:     5,
  cubehelix: 6,
  spectral:  7,
  coolwarm:  8,
  twilight:  9,
  ocean:     10,
  fire:      11,
  ice:       12,
}

// ── Canvas 2D colour interpolation helper ────────────────────────────────────

/**
 * Map a scalar `value` in [0, max] to an RGB triple via linear interpolation
 * through the named palette's 5-stop gradient.
 *
 * @param value  - Iteration count or density value to map.
 * @param max    - Maximum possible value (used to normalise to [0,1]).
 * @param scheme - Palette name. Falls back to 'inferno' if not found.
 * @returns [R, G, B] tuple with components in 0–255.
 */
export const samplePalette = (
  value: number,
  max: number,
  scheme: string,
): [number, number, number] => {
  const t = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max))
  const stops = CANVAS_PALETTE_STOPS[scheme] ?? CANVAS_PALETTE_STOPS.inferno
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
