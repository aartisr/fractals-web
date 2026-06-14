/**
 * FractalsPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrating component for the Interactive Fractal Explorer.
 *
 * Responsibility
 * ──────────────
 * This file intentionally contains NO fractal math, NO shader code, NO colour
 * logic, and NO export logic.  Its sole job is to:
 *   - Wire user inputs → render parameters via TanStack Form.
 *   - Manage viewport state and expose zoom/pan interaction handlers.
 *   - Delegate rendering to the correct renderer module (WebGL or IFS).
 *   - Render the UI panel pair (controls + interactive canvas).
 *
 * Module map
 * ──────────
 *   fractal-types.ts  — type registry, constants, educational guides
 *   viewport.ts       — Viewport type and immutable viewport transforms
 *   palettes.ts       — colour scheme definitions and palette sampler
 *   webgl-renderer.ts — GPU fragment-shader renderer (escape-time fractals)
 *   ifs-renderer.ts   — Canvas 2D renderer (IFS / chaos-game fractals)
 *   export.ts         — PNG / SVG export helpers
 */

import { useForm } from '@tanstack/react-form'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Panel } from '../../components/Panel'
import { useOverlayPreference } from '../../core/hooks/useOverlayPreference'
import type { FractalType } from '../../core/services/contracts'

import { FRACTAL_TYPES, ZOOMABLE_TYPES, FRACTAL_GUIDES, type RenderParams } from './fractal-types'
import { COLOR_SCHEMES } from './palettes'
import { type Viewport, clamp, defaultExtent, zoomViewport, panViewport } from './viewport'
import { GL_FRACTAL_TYPES, type GLState, initGL, renderWithGL } from './webgl-renderer'
import { renderIFS } from './ifs-renderer'
import { exportPng, exportSvg } from './export'
import { generateResearchSummary, type FractalResearchSummary } from './research-analysis'
import { generateResearchReport } from './research-guides'

// ── Default form / initial render values ─────────────────────────────────────

const DEFAULT_PARAMS: RenderParams = {
  type: 'Mandelbrot',
  width: 1400,
  height: 900,
  maxIter: 512,
  colorScheme: 'inferno',
  power: 2,
  cReal: -0.42,
  cImag: 0.6,
}

// ── Animated zoom sequences ────────────────────────────────────────────────────

/** A keyframe in an animated zoom sequence with target viewport and normalized time (0–1). */
type ZoomKeyframe = {
  time: number
  viewport: Viewport
  title?: string
  insight?: string
}

/**
 * Creates an infinite zoom sequence that demonstrates self-similarity.
 * Continuously zooms in to reveal fractal structure, then smoothly cycles back
 * to show the same pattern at different scales, creating a hypnotic loop.
 */
const getInfiniteZoomSequence = (fractalType: FractalType, startViewport: Viewport): ZoomKeyframe[] => {
  const base = startViewport
  
  switch (fractalType) {
    case 'Mandelbrot':
      // Infinite zoom into Seahorse Valley: spiral patterns repeat at smaller scales
      return [
        // Phase 1: Zoom in (0.0 → 0.7) — dive deep into the structure
        { time: 0.0, viewport: base, title: 'Global Set', insight: 'Start at the full Mandelbrot to see where mini-sets live on the boundary.' },
        { time: 0.1, viewport: { xMin: -0.75, xMax: -0.74, yMin: 0.085, yMax: 0.095 }, title: 'Seahorse Valley', insight: 'Filaments spiral into smaller copies, a hallmark of self-similarity.' },
        { time: 0.2, viewport: { xMin: -0.7473, xMax: -0.7465, yMin: 0.0899, yMax: 0.0907 }, title: 'Spiral Corridor', insight: 'Repeated curling bands show near-scale invariance with deformation.' },
        { time: 0.35, viewport: { xMin: -0.746914, xMax: -0.746864, yMin: 0.08987, yMax: 0.08992 }, title: 'Mini-Set Boundary', insight: 'Tiny cardioid-like shapes echo the parent structure.' },
        { time: 0.5, viewport: { xMin: -0.7468897, xMax: -0.7468847, yMin: 0.089885, yMax: 0.089935 }, title: 'Filament Lace', insight: 'Boundary complexity rises as effective fractal dimension approaches 2.' },
        { time: 0.65, viewport: { xMin: -0.74688974, xMax: -0.74688924, yMin: 0.0898896, yMax: 0.0898946 }, title: 'Deep Repeat', insight: 'The motif recurs again: detail appears no matter how far you zoom.' },
        // Phase 2: Transition (0.7 → 1.0) — zoom out but reveal similar structure
        { time: 0.75, viewport: { xMin: -0.748, xMax: -0.742, yMin: 0.087, yMax: 0.093 }, title: 'Scale Bridge', insight: 'Zooming out reveals the same grammar of spirals at a larger scale.' },
        { time: 0.85, viewport: { xMin: -0.755, xMax: -0.735, yMin: 0.08, yMax: 0.1 }, title: 'Context Recovery', insight: 'You regain neighborhood context while preserving repeated motifs.' },
        { time: 1.0, viewport: base, title: 'Loop Restart', insight: 'One complete pedagogical loop: global to deep to global.' }, // Loop seamlessly
      ]
    
    case 'Julia':
      // Infinite spiral through Julia set
      return [
        { time: 0.0, viewport: base, title: 'Julia Global', insight: 'Connected lobes reveal sensitivity to the complex parameter c.' },
        { time: 0.15, viewport: { xMin: -0.8, xMax: -0.6, yMin: 0, yMax: 0.2 }, title: 'Primary Spiral', insight: 'Arms twist around attractor-like regions in complex dynamics.' },
        { time: 0.3, viewport: { xMin: -0.73, xMax: -0.71, yMin: 0.04, yMax: 0.06 }, title: 'Filament Junction', insight: 'Fine threads split repeatedly, forming recursive branch geometry.' },
        { time: 0.45, viewport: { xMin: -0.719, xMax: -0.709, yMin: 0.048, yMax: 0.058 }, title: 'Micro Spiral', insight: 'Local turns mimic macro turns: same pattern language, new scale.' },
        { time: 0.6, viewport: { xMin: -0.7149, xMax: -0.7139, yMin: 0.0508, yMax: 0.0518 }, title: 'Deep Julia Texture', insight: 'Boundary complexity indicates chaotic basin separation.' },
        { time: 0.8, viewport: { xMin: -0.76, xMax: -0.66, yMin: 0.01, yMax: 0.11 }, title: 'Scale Return', insight: 'Zoom-out reconnects micro detail to global topology.' },
        { time: 1.0, viewport: base, title: 'Loop Restart', insight: 'Replay to compare self-similarity across cycles.' },
      ]
    
    case 'Burning Ship':
      // Infinite asymmetric zoom
      return [
        { time: 0.0, viewport: base, title: 'Burning Ship Global', insight: 'Absolute-value dynamics break symmetry and create flame-like ridges.' },
        { time: 0.15, viewport: { xMin: -1.8, xMax: -1.6, yMin: -0.2, yMax: 0 }, title: 'Main Hull', insight: 'The hull region exhibits strong directional asymmetry.' },
        { time: 0.3, viewport: { xMin: -1.76, xMax: -1.74, yMin: -0.1, yMax: -0.08 }, title: 'Ridge Stack', insight: 'Ridges replicate in scaled clusters with sharp cusps.' },
        { time: 0.45, viewport: { xMin: -1.7547, xMax: -1.7527, yMin: -0.0947, yMax: -0.0927 }, title: 'Cusp Cascade', insight: 'Successive cusps show recurring geometry under anisotropic growth.' },
        { time: 0.6, viewport: { xMin: -1.75385, xMax: -1.75355, yMin: -0.09365, yMax: -0.09335 }, title: 'Deep Flame Detail', insight: 'Tiny crenellations mirror larger serrated structures.' },
        { time: 0.8, viewport: { xMin: -1.77, xMax: -1.73, yMin: -0.15, yMax: -0.05 }, title: 'Scale Return', insight: 'The same ridge language remains visible as scale expands.' },
        { time: 1.0, viewport: base, title: 'Loop Restart', insight: 'Use repeated loops to compare asymmetric self-similarity.' },
      ]
    
    case 'Newton':
      // Infinite cycle through Newton convergence basins
      return [
        { time: 0.0, viewport: base, title: 'Newton Basins', insight: 'Colors represent which root each point converges to.' },
        { time: 0.2, viewport: { xMin: -0.5, xMax: 0.5, yMin: -0.5, yMax: 0.5 }, title: 'Basin Boundary', insight: 'Near boundaries, tiny perturbations switch destination roots.' },
        { time: 0.4, viewport: { xMin: -0.1, xMax: 0.1, yMin: -0.1, yMax: 0.1 }, title: 'Chaotic Interface', insight: 'Convergence regions interleave in intricate fractal seams.' },
        { time: 0.6, viewport: { xMin: -0.02, xMax: 0.02, yMin: -0.02, yMax: 0.02 }, title: 'Deep Interface', insight: 'Boundary complexity persists as you magnify.' },
        { time: 0.8, viewport: { xMin: -0.3, xMax: 0.3, yMin: -0.3, yMax: 0.3 }, title: 'Scale Return', insight: 'Macro basins and micro seams align conceptually across scale.' },
        { time: 1.0, viewport: base, title: 'Loop Restart', insight: 'Each cycle replays root-basin sensitivity.' },
      ]
    
    case 'Barnsley Fern':
    case 'Sierpinski Triangle':
    default:
      // No zoom for IFS types
      return [
        { time: 0.0, viewport: base },
        { time: 1.0, viewport: base },
      ]
  }
}

/**
 * Add short pauses at educational landmarks so users can read the insight text.
 */
const withDwellKeyframes = (sequence: ZoomKeyframe[], dwell = 0.035): ZoomKeyframe[] => {
  if (sequence.length < 3) return sequence
  const out: ZoomKeyframe[] = []

  for (let i = 0; i < sequence.length; i++) {
    const current = sequence[i]
    out.push(current)

    if (i === sequence.length - 1) continue
    const next = sequence[i + 1]
    const segment = next.time - current.time
    const canDwell = Boolean(current.title) && segment > dwell * 1.6 && current.time + dwell < 0.995

    if (canDwell) {
      out.push({ ...current, time: current.time + dwell })
    }
  }

  return out.sort((a, b) => a.time - b.time)
}

/** Slower loops improve readability of each named region. */
const getInfiniteZoomCycleDurationMs = (fractalType: FractalType): number => {
  switch (fractalType) {
    case 'Mandelbrot':
      return 14000
    case 'Julia':
      return 13000
    case 'Burning Ship':
      return 13000
    case 'Newton':
      return 12000
    default:
      return 10000
  }
}

/**
 * Interpolates between two viewports using linear interpolation.
 * Smoother easing can be applied by the caller.
 */
const lerpViewport = (a: Viewport, b: Viewport, t: number): Viewport => ({
  xMin: a.xMin + (b.xMin - a.xMin) * t,
  xMax: a.xMax + (b.xMax - a.xMax) * t,
  yMin: a.yMin + (b.yMin - a.yMin) * t,
  yMax: a.yMax + (b.yMax - a.yMax) * t,
})

/**
 * Easing function for smooth animation (cubic ease-in-out).
 */
const easeCubicInOut = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FractalsPage() {

  // ── UI state ───────────────────────────────────────────────────────────────
  const [selectedType, setSelectedType]       = useState<FractalType>('Mandelbrot')
  const [showOverlays, setShowOverlays]        = useOverlayPreference('fractals.overlay.visible')
  const [controlsExpanded, setControlsExpanded] = useState(false)
  const [precisionMode, setPrecisionMode]      = useState(false)
  const [isFullPageMode, setIsFullPageMode]    = useState(false)
  const [isFullPageControlsVisible, setIsFullPageControlsVisible] = useState(true)

  // ── Animation state ────────────────────────────────────────────────────────
  const [isAnimating, setIsAnimating]          = useState(false)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [animationLoop, setAnimationLoop] = useState(0)
  const [zoomInsight, setZoomInsight] = useState<{ title: string; insight: string } | null>(null)

  // ── Research state ────────────────────────────────────────────────────────
  const [showResearchPanel, setShowResearchPanel] = useState(false)
  const [researchData, setResearchData] = useState<FractalResearchSummary | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // ── Render state ───────────────────────────────────────────────────────────
  const [isRendering, setIsRendering]          = useState(false)
  const [showRenderOverlay, setShowRenderOverlay] = useState(false)
  const [renderError, setRenderError]          = useState<string | null>(null)
  const [activeParams, setActiveParams]        = useState<RenderParams>(DEFAULT_PARAMS)
  const [viewport, setViewport]                = useState<Viewport>(defaultExtent('Mandelbrot'))

  // ── Canvas / GL refs ───────────────────────────────────────────────────────
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null)   // WebGL canvas
  const canvasRef   = useRef<HTMLCanvasElement | null>(null)   // Canvas 2D (IFS)
  const glStateRef  = useRef<GLState | null>(null)             // Compiled GL program

  // ── Animation refs ───────────────────────────────────────────────────────────
  const animationRafRef    = useRef<number | null>(null)       // requestAnimationFrame ID
  const animationStartRef  = useRef(0)                          // Animation start timestamp
  const zoomSequenceRef    = useRef<ZoomKeyframe[]>([])         // Current zoom sequence
  const infiniteZoomCycleRef = useRef(0)                        // Number of infinite loops completed

  // ── Interaction refs (mutations never need React re-render) ───────────────
  const panRef             = useRef<{ pointerId: number; x: number; y: number; viewport: Viewport } | null>(null)
  const panRafRef          = useRef<number | null>(null)
  const pendingViewportRef = useRef<Viewport | null>(null)
  const wheelRafRef        = useRef<number | null>(null)
  const wheelZoomRef       = useRef<{ velocity: number; tx: number; ty: number } | null>(null)

  // ── Timer / render-token refs ──────────────────────────────────────────────
  const renderDebounceRef     = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const renderTokenRef        = useRef(0)
  const renderOverlayTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const fullPageControlsTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  // ── Derived / memoised values ──────────────────────────────────────────────

  /** True → route to WebGL renderer; false → route to Canvas 2D IFS renderer. */
  const isGLType      = activeParams.type in GL_FRACTAL_TYPES

  /** True → zoom/pan controls are enabled for this fractal family. */
  const isZoomEnabled = ZOOMABLE_TYPES.includes(activeParams.type)

  const baseViewport = useMemo(() => defaultExtent(activeParams.type), [activeParams.type])
  const zoomFactor   = (baseViewport.xMax - baseViewport.xMin) / (viewport.xMax - viewport.xMin)

  /**
   * In precision mode the iteration cap grows logarithmically with zoom depth
   * to maintain boundary detail at extreme magnification.
   */
  const dynamicMaxIter = useMemo(() => {
    if (!isZoomEnabled || !precisionMode) return activeParams.maxIter
    const bonus = Math.floor(Math.log10(Math.max(1, zoomFactor)) * 140)
    return clamp(activeParams.maxIter + bonus, 32, 20000)
  }, [activeParams.maxIter, isZoomEnabled, precisionMode, zoomFactor])

  /**
   * Stable string key for the current non-viewport parameters.
   * Changing this key (e.g. new fractal type, different palette) triggers a
   * full re-render; viewport-only changes do not need this to change.
   */
  const renderParamsKey = useMemo(
    () => [
      activeParams.type, activeParams.width, activeParams.height,
      activeParams.maxIter, activeParams.colorScheme,
      activeParams.power ?? 2, activeParams.cReal ?? -0.42, activeParams.cImag ?? 0.6,
    ].join('|'),
    [activeParams],
  )

  const isDisplayLoading        = isRendering
  /** Overlay only appears after a 320ms delay to suppress flicker on fast GL renders. */
  const shouldShowLoadingOverlay = showRenderOverlay && isDisplayLoading && !isGLType

  // ── Delayed render-overlay effect ─────────────────────────────────────────
  useEffect(() => {
    if (renderOverlayTimerRef.current) { clearTimeout(renderOverlayTimerRef.current); renderOverlayTimerRef.current = null }
    if (isRendering) {
      renderOverlayTimerRef.current = window.setTimeout(() => setShowRenderOverlay(true), 320)
    } else {
      setShowRenderOverlay(false)
    }
    return () => { if (renderOverlayTimerRef.current) { clearTimeout(renderOverlayTimerRef.current); renderOverlayTimerRef.current = null } }
  }, [isRendering])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (panRafRef.current !== null)    cancelAnimationFrame(panRafRef.current)
      if (wheelRafRef.current !== null)  cancelAnimationFrame(wheelRafRef.current)
      if (animationRafRef.current !== null) cancelAnimationFrame(animationRafRef.current)
      if (renderDebounceRef.current)     clearTimeout(renderDebounceRef.current)
      if (renderOverlayTimerRef.current) clearTimeout(renderOverlayTimerRef.current)
      if (fullPageControlsTimerRef.current) clearTimeout(fullPageControlsTimerRef.current)
    }
  }, [])

  const scheduleFullPageControlsHide = () => {
    if (fullPageControlsTimerRef.current) {
      clearTimeout(fullPageControlsTimerRef.current)
    }
    fullPageControlsTimerRef.current = window.setTimeout(() => {
      setIsFullPageControlsVisible(false)
    }, 2200)
  }

  const revealFullPageControls = () => {
    if (!isFullPageMode) return
    if (!isFullPageControlsVisible) {
      setIsFullPageControlsVisible(true)
    }
    scheduleFullPageControlsHide()
  }

  useEffect(() => {
    if (!isFullPageMode) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullPageMode(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isFullPageMode])

  useEffect(() => {
    if (!isFullPageMode) {
      setIsFullPageControlsVisible(true)
      if (fullPageControlsTimerRef.current) {
        clearTimeout(fullPageControlsTimerRef.current)
        fullPageControlsTimerRef.current = null
      }
      return
    }

    setIsFullPageControlsVisible(true)
    scheduleFullPageControlsHide()

    return () => {
      if (fullPageControlsTimerRef.current) {
        clearTimeout(fullPageControlsTimerRef.current)
        fullPageControlsTimerRef.current = null
      }
    }
  }, [isFullPageMode])

  // ── Infinite animated zoom effect ────────────────────────────────────────
  useEffect(() => {
    if (!isAnimating || !isZoomEnabled) {
      if (animationRafRef.current !== null) {
        cancelAnimationFrame(animationRafRef.current)
        animationRafRef.current = null
      }
      setZoomInsight(null)
      return
    }

    const animate = (currentTime: number) => {
      const elapsed = currentTime - animationStartRef.current
      const cycleDurationMs = getInfiniteZoomCycleDurationMs(activeParams.type)
      const cycleProgress = (elapsed % cycleDurationMs) / cycleDurationMs
      const loop = Math.floor(elapsed / cycleDurationMs)

      if (loop !== infiniteZoomCycleRef.current) {
        infiniteZoomCycleRef.current = loop
        setAnimationLoop(loop)
      }
      
      // Update displayed progress
      setAnimationProgress(cycleProgress)

      // Find the current keyframe pair
      const sequence = zoomSequenceRef.current
      if (sequence.length > 0) {
        let keyframeIdx = 0
        for (let i = sequence.length - 1; i >= 0; i--) {
          if (cycleProgress >= sequence[i].time) {
            keyframeIdx = i
            break
          }
        }

        const currentKf = sequence[keyframeIdx]
        const nextKf = sequence[Math.min(keyframeIdx + 1, sequence.length - 1)]
        
        // Interpolate between keyframes
        const kfProgress = 
          currentKf.time === nextKf.time 
            ? 0 
            : (cycleProgress - currentKf.time) / (nextKf.time - currentKf.time)
        
        const easedProgress = easeCubicInOut(kfProgress)
        const interpolated = lerpViewport(currentKf.viewport, nextKf.viewport, easedProgress)

        const focusKf = kfProgress < 0.55 ? currentKf : nextKf
        if (focusKf.title && focusKf.insight) {
          setZoomInsight({ title: focusKf.title, insight: focusKf.insight })
        }
        
        setViewport(interpolated)
      }
      
      // Infinite loop: always schedule next frame
      animationRafRef.current = requestAnimationFrame(animate)
    }

    animationStartRef.current = performance.now()
    animationRafRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRafRef.current !== null) {
        cancelAnimationFrame(animationRafRef.current)
        animationRafRef.current = null
      }
    }
  }, [activeParams.type, isAnimating, isZoomEnabled])

  // ── WebGL render effect ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isGLType) return
    const canvas = glCanvasRef.current
    if (!canvas) return
    let rafId = 0

    // Compile the shader program once; reuse across all subsequent renders.
    if (!glStateRef.current) {
      glStateRef.current = initGL(canvas)
      if (!glStateRef.current) {
        setRenderError('WebGL is not supported in this browser. Try Chrome or Firefox.')
        setIsRendering(false)
        return
      }
    }

    setRenderError(null)
    rafId = requestAnimationFrame(() => {
      try {
        renderWithGL(glStateRef.current as GLState, activeParams, viewport, dynamicMaxIter)
      } catch {
        setRenderError('WebGL render error.')
      } finally {
        setIsRendering(false)
      }
    })

    return () => { if (rafId) cancelAnimationFrame(rafId) }
  }, [activeParams, dynamicMaxIter, isGLType, viewport])

  // ── Canvas 2D / IFS render effect ─────────────────────────────────────────
  useEffect(() => {
    if (isGLType) return
    const canvas = canvasRef.current
    if (!canvas) return

    const width  = clamp(Math.round(activeParams.width),  320, 2800)
    const height = clamp(Math.round(activeParams.height), 220, 1800)
    // Only resize when necessary — resizing clears all canvas content.
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width  = width
      canvas.height = height
    }

    if (renderDebounceRef.current) { clearTimeout(renderDebounceRef.current); renderDebounceRef.current = null }

    let cancelled = false
    renderDebounceRef.current = window.setTimeout(() => {
      const renderToken = ++renderTokenRef.current
      setIsRendering(true)
      setRenderError(null)

      renderIFS(
        canvas,
        activeParams,
        viewport,
        dynamicMaxIter,
        () => cancelled || renderToken !== renderTokenRef.current,
        () => setIsRendering(false),
        (msg) => { setRenderError(msg); setIsRendering(false) },
      )
    }, 150)

    return () => {
      cancelled = true
      if (renderDebounceRef.current) { clearTimeout(renderDebounceRef.current); renderDebounceRef.current = null }
    }
  }, [activeParams, dynamicMaxIter, isGLType, renderParamsKey, viewport])

  // ── TanStack Form ──────────────────────────────────────────────────────────
  const form = useForm({
    defaultValues: DEFAULT_PARAMS,
    onSubmit: async ({ value }) => {
      const nextType  = value.type
      const safePower = clamp(Math.round(value.power ?? 2), 2, 12)
      const safeCReal = Number.isFinite(value.cReal) ? value.cReal : -0.42
      const safeCImag = Number.isFinite(value.cImag) ? value.cImag : 0.6
      setSelectedType(nextType)
      setActiveParams({
        ...value,
        width:   clamp(Math.round(value.width),   320,  2800),
        height:  clamp(Math.round(value.height),  220,  1800),
        maxIter: clamp(Math.round(value.maxIter),  16,  5000),
        power: safePower, cReal: safeCReal, cImag: safeCImag,
      })
      setViewport(defaultExtent(nextType))
    },
  })

  // ── Viewport helpers ───────────────────────────────────────────────────────

  const zoomTo = (scale: number, tx = 0.5, ty = 0.5) => {
    if (!isZoomEnabled) return
    const minSpan = precisionMode ? 1e-18 : 1e-15
    setViewport((current) => zoomViewport(current, scale, tx, ty, minSpan))
  }

  const panBy = (fx: number, fy: number) => {
    if (!isZoomEnabled) return
    setViewport((current) => panViewport(current, fx, fy))
  }

  const resetView = () => setViewport(defaultExtent(activeParams.type))

  const startInfiniteZoom = () => {
    if (!isZoomEnabled || isAnimating) return
    // Stop any ongoing animation interactions
    if (animationRafRef.current !== null) {
      cancelAnimationFrame(animationRafRef.current)
    }
    // Generate the infinite zoom sequence for current fractal
    zoomSequenceRef.current = withDwellKeyframes(getInfiniteZoomSequence(activeParams.type, viewport))
    infiniteZoomCycleRef.current = 0
    setAnimationLoop(0)
    const initialKf = zoomSequenceRef.current[0]
    if (initialKf?.title && initialKf?.insight) {
      setZoomInsight({ title: initialKf.title, insight: initialKf.insight })
    }
    setAnimationProgress(0)
    setIsAnimating(true)
  }

  const stopInfiniteZoom = () => {
    setIsAnimating(false)
    infiniteZoomCycleRef.current = 0
    setAnimationLoop(0)
    setZoomInsight(null)
    if (animationRafRef.current !== null) {
      cancelAnimationFrame(animationRafRef.current)
      animationRafRef.current = null
    }
  }

  // ── Research Analysis Handlers ──────────────────────────────────────────

  const performResearchAnalysis = async () => {
    setIsAnalyzing(true)
    try {
      const canvas = isGLType ? glCanvasRef.current : canvasRef.current
      if (!canvas) return

      // Small delay to allow render to complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const analysis = generateResearchSummary(imageData)
      setResearchData(analysis)
      setShowResearchPanel(true)
    } catch {
      // Analysis failed silently
    } finally {
      setIsAnalyzing(false)
    }
  }

  const exportResearchData = () => {
    if (!researchData) return
    const report = generateResearchReport(
      activeParams.type,
      viewport,
      researchData.dimension.estimatedDimension,
      researchData.lacunarity.lacunarity,
      researchData.selfSimilarity,
    )

    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fractal-research-${activeParams.type.toLowerCase().replace(/ /g, '-')}-${Date.now()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── Inertial wheel zoom ────────────────────────────────────────────────────
  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    if (!isZoomEnabled) return
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const tx = clamp((event.clientX - rect.left) / Math.max(1, rect.width),  0, 1)
    const ty = clamp((event.clientY - rect.top)  / Math.max(1, rect.height), 0, 1)

    const normalized = clamp(event.deltaY, -220, 220) / 1800
    const current = wheelZoomRef.current ?? { velocity: 0, tx, ty }
    current.velocity = clamp(current.velocity + normalized, -0.12, 0.12)
    current.tx = tx; current.ty = ty
    wheelZoomRef.current = current
    if (wheelRafRef.current !== null) return

    wheelRafRef.current = requestAnimationFrame(function step() {
      const pending = wheelZoomRef.current
      if (!pending) { wheelRafRef.current = null; return }
      if (Math.abs(pending.velocity) < 0.0005) { wheelZoomRef.current = null; wheelRafRef.current = null; return }
      zoomTo(clamp(Math.exp(pending.velocity), 0.9, 1.1), pending.tx, pending.ty)
      pending.velocity *= 0.8
      wheelRafRef.current = requestAnimationFrame(step)
    })
  }

  // ── Pointer drag pan ───────────────────────────────────────────────────────
  const scheduleViewportUpdate = (next: Viewport) => {
    pendingViewportRef.current = next
    if (panRafRef.current !== null) return
    panRafRef.current = requestAnimationFrame(() => {
      panRafRef.current = null
      const pending = pendingViewportRef.current
      pendingViewportRef.current = null
      if (pending) setViewport(pending)
    })
  }

  const finishInteraction = (pointerId?: number, target?: EventTarget & HTMLDivElement) => {
    if (panRef.current && (pointerId === undefined || panRef.current.pointerId === pointerId)) panRef.current = null
    if (target && pointerId !== undefined && target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId)
    if (panRafRef.current !== null) { cancelAnimationFrame(panRafRef.current); panRafRef.current = null }
    if (pendingViewportRef.current) { const p = pendingViewportRef.current; pendingViewportRef.current = null; setViewport(p) }
  }

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!isZoomEnabled) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const target = event.currentTarget
    if (!target.hasPointerCapture(event.pointerId)) target.setPointerCapture(event.pointerId)
    panRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, viewport }
  }

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!isZoomEnabled || !panRef.current || event.pointerId !== panRef.current.pointerId) return
    if (event.pointerType === 'mouse' && (event.buttons & 1) !== 1) { finishInteraction(event.pointerId, event.currentTarget); return }
    const rect = event.currentTarget.getBoundingClientRect()
    const dx = event.clientX - panRef.current.x
    const dy = event.clientY - panRef.current.y
    if (Math.abs(dx) < 0.35 && Math.abs(dy) < 0.35) return
    const ww = panRef.current.viewport.xMax - panRef.current.viewport.xMin
    const wh = panRef.current.viewport.yMax - panRef.current.viewport.yMin
    scheduleViewportUpdate({
      xMin: panRef.current.viewport.xMin + (-dx / Math.max(1, rect.width))  * ww,
      xMax: panRef.current.viewport.xMax + (-dx / Math.max(1, rect.width))  * ww,
      yMin: panRef.current.viewport.yMin + (-dy / Math.max(1, rect.height)) * wh,
      yMax: panRef.current.viewport.yMax + (-dy / Math.max(1, rect.height)) * wh,
    })
  }

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!panRef.current || event.pointerId !== panRef.current.pointerId) return
    finishInteraction(event.pointerId, event.currentTarget)
  }

  const handleLostPointerCapture: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (panRef.current && panRef.current.pointerId === event.pointerId) finishInteraction(event.pointerId)
  }

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (!isZoomEnabled || isDisplayLoading) return
    const fineStep = event.shiftKey ? 0.05 : 0.12
    switch (event.key) {
      case '+': case '=': event.preventDefault(); zoomTo(event.shiftKey ? 0.9 : 0.75); break
      case '-': case '_': event.preventDefault(); zoomTo(event.shiftKey ? 1.1 : 1.34); break
      case '0': case 'h': case 'H': event.preventDefault(); resetView(); break
      case 'ArrowLeft':  event.preventDefault(); panBy(-fineStep, 0); break
      case 'ArrowRight': event.preventDefault(); panBy(fineStep,  0); break
      case 'ArrowUp':    event.preventDefault(); panBy(0, -fineStep); break
      case 'ArrowDown':  event.preventDefault(); panBy(0,  fineStep); break
    }
  }

  // ── Export handlers ────────────────────────────────────────────────────────
  const handleDownloadPng = () => { const c = isGLType ? glCanvasRef.current : canvasRef.current; if (c) exportPng(c, activeParams) }
  const handleDownloadSvg = () => { const c = isGLType ? glCanvasRef.current : canvasRef.current; if (c) exportSvg(c, activeParams) }

  // ── Render ─────────────────────────────────────────────────────────────────
  const selectedGuide = FRACTAL_GUIDES[selectedType]
  const viewportWidth = viewport.xMax - viewport.xMin

  return (
    <div className={`tool-grid ${isFullPageMode ? 'tool-grid-single full-page-mode' : ''}`}>

      {!isFullPageMode && <Panel title="Fractal Generator" subtitle="Fast path to visual complexity experiments.">
        <form className="form-grid" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit() }}>

          <form.Field name="type" children={(field) => (
            <label className="field"><span>Fractal Type</span>
              <select value={field.state.value} onChange={(e) => {
                const nextType = e.target.value as FractalType
                setSelectedType(nextType)
                field.handleChange(nextType)
                queueMicrotask(() => void form.handleSubmit())
              }}>
                {FRACTAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          )} />

          <div className="edu-note" aria-live="polite">
            <p className="edu-note-title">Study Focus</p>
            <p>{selectedGuide.focus}</p>
            <p>{selectedGuide.learningUse}</p>
          </div>

          <form.Field name="width" children={(field) => (
            <label className="field"><span>Width</span>
              <input type="number" min={256} max={2048} value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
            </label>
          )} />
          <form.Field name="height" children={(field) => (
            <label className="field"><span>Height</span>
              <input type="number" min={256} max={2048} value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
            </label>
          )} />
          <form.Field name="maxIter" children={(field) => (
            <label className="field"><span>Max Iterations</span>
              <input type="number" min={16} max={2000} value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
            </label>
          )} />

          {(selectedType === 'Mandelbrot' || selectedType === 'Burning Ship' || selectedType === 'Newton') && (
            <form.Field name="power" children={(field) => (
              <label className="field">
                <span>{selectedType === 'Newton' ? 'Polynomial Degree' : 'Power'}</span>
                <input type="number" min={2} step="1" value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
              </label>
            )} />
          )}

          {selectedType === 'Julia' && (
            <>
              <form.Field name="cReal" children={(field) => (
                <label className="field"><span>C Real</span>
                  <input type="number" step="0.01" value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
                </label>
              )} />
              <form.Field name="cImag" children={(field) => (
                <label className="field"><span>C Imaginary</span>
                  <input type="number" step="0.01" value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
                </label>
              )} />
            </>
          )}

          <form.Field name="colorScheme" children={(field) => (
            <label className="field"><span>Color Scheme</span>
              <select value={field.state.value} onChange={(e) => field.handleChange(e.target.value)}>
                {COLOR_SCHEMES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          )} />

          <button className="action" type="submit" disabled={isDisplayLoading}>
            {isDisplayLoading ? <><span className="button-spinner" aria-hidden="true" /> Rendering...</> : 'Render Explorer'}
          </button>
          <p className="muted">Mouse wheel to zoom, drag to pan, and use Home or keyboard shortcuts (+/-/0/arrows).</p>
        </form>
      </Panel>}

      <div
        className={isFullPageMode ? 'full-page-explorer' : ''}
        onMouseMove={revealFullPageControls}
        onPointerMove={revealFullPageControls}
        onTouchStart={revealFullPageControls}
        onKeyDownCapture={revealFullPageControls}
        onFocusCapture={revealFullPageControls}
      >
      <Panel title="Interactive Explorer" subtitle="Deep zoom and pan with GPU-accelerated rendering.">
        <div className={`overlay-controls fractal-explorer-toolbar${isFullPageMode ? ' full-page-controls' : ''}${isFullPageMode && !isFullPageControlsVisible ? ' is-hidden' : ''}`}>
          <button type="button" className="overlay-toggle" onClick={() => zoomTo(0.7)}  disabled={!isZoomEnabled || isDisplayLoading || isAnimating}>Zoom In</button>
          <button type="button" className="overlay-toggle" onClick={() => zoomTo(1.4)}  disabled={!isZoomEnabled || isDisplayLoading || isAnimating}>Zoom Out</button>
          <button type="button" className="overlay-toggle" onClick={resetView}          disabled={isDisplayLoading || isAnimating}>Home</button>
          <button
            type="button"
            className="overlay-toggle"
            onClick={() => setIsFullPageMode((v) => !v)}
            title={isFullPageMode ? 'Exit full page mode' : 'Show only fractal and zoom controls'}
          >
            {isFullPageMode ? 'Exit Full Page (Esc)' : 'Full Page'}
          </button>
          {!isFullPageMode && (
            <>
          <button type="button" className="overlay-toggle" 
            onClick={isAnimating ? stopInfiniteZoom : startInfiniteZoom}
            disabled={!isZoomEnabled || isDisplayLoading}
            title={isAnimating ? 'Stop infinite zoom' : 'Continuously zoom in and out to demonstrate self-similarity and repeating patterns'}>
            {isAnimating ? '⏸ Stop ∞ Zoom' : '∞ Infinite Zoom'}
          </button>
          <button type="button" className="overlay-toggle" onClick={performResearchAnalysis} disabled={isDisplayLoading || isAnalyzing}
            title="Analyze fractal: dimension, lacunarity, self-similarity">
            {isAnalyzing ? '⟳ Analyzing...' : '📊 Analyze'}
          </button>
          <button type="button" className="overlay-toggle" onClick={handleDownloadPng}  disabled={isDisplayLoading || isAnimating}>Download PNG</button>
          <button type="button" className="overlay-toggle" onClick={handleDownloadSvg}  disabled={isDisplayLoading || isAnimating}>Download SVG</button>
          <button type="button" className="overlay-toggle" onClick={() => setPrecisionMode((v) => !v)}
            disabled={!isZoomEnabled || isDisplayLoading || isAnimating}>
            {precisionMode ? 'Precision On' : 'Precision Off'}
          </button>
          <button type="button" className="overlay-toggle" onClick={() => setShowOverlays((v) => !v)}>
            {showOverlays ? 'Hide overlays' : 'Show overlays'}
          </button>
            </>
          )}
        </div>

        {!isFullPageMode && <div className="edu-chip-row" aria-label="Explorer telemetry">
          <span className="edu-chip">Type: {activeParams.type}</span>
          <span className="edu-chip">Zoom: {zoomFactor.toFixed(2)}x</span>
          <span className="edu-chip">Viewport width: {viewportWidth.toExponential(3)}</span>
          <span className="edu-chip">Iter: {dynamicMaxIter}</span>
          <span className="edu-chip">Size: {activeParams.width}x{activeParams.height}</span>
          {isAnimating && <span className="edu-chip">Animation: {(animationProgress * 100).toFixed(0)}%</span>}
          {isAnimating && <span className="edu-chip">Loop: {animationLoop + 1}</span>}
          <span className="edu-chip">Keyboard: +/-/0/arrows</span>
        </div>}

        {!isFullPageMode && isAnimating && zoomInsight && (
          <div className="edu-note" aria-live="polite">
            <p className="edu-note-title">Infinite Zoom Focus: {zoomInsight.title}</p>
            <p>{zoomInsight.insight}</p>
          </div>
        )}

        <div
          className={`image-stage stage-grid fractal-canvas-stage ${showOverlays ? 'stage-reticle' : ''}`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onLostPointerCapture={handleLostPointerCapture}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          aria-label="Interactive fractal explorer. Use mouse wheel, drag, plus/minus, zero, and arrow keys."
        >
          <canvas ref={glCanvasRef}
            className={`result-image fractal-canvas${isGLType ? '' : ' fractal-canvas-hidden'}`}
            aria-label="Interactive fractal canvas (WebGL)" />
          <canvas ref={canvasRef}
            className={`result-image fractal-canvas${isGLType ? ' fractal-canvas-hidden' : ''}`}
            aria-label="Interactive fractal canvas (2D)" />

          {!isFullPageMode && <div className={`explorer-controls-badge ${controlsExpanded ? 'is-open' : ''}`} aria-label="Explorer control hints">
            <button type="button" className="explorer-controls-toggle"
              aria-label={controlsExpanded ? 'Collapse explorer controls help' : 'Expand explorer controls help'}
              aria-controls="explorer-control-hints"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); setControlsExpanded((v) => !v) }}>?</button>
            {controlsExpanded && (
              <div id="explorer-control-hints" className="explorer-controls-panel">
                <strong>Controls</strong>
                <span>Wheel: zoom</span><span>Drag: pan</span>
                <span>+ / - : zoom</span><span>Arrows: pan</span><span>0 or H: home</span>
              </div>
            )}
          </div>}

          {shouldShowLoadingOverlay && (
            <div className="image-stage-loading-overlay" role="status" aria-live="polite" aria-label="Fractal render in progress">
              <div className="loading-spinner" aria-hidden="true" />
              <p className="loading-text">Rendering viewport...</p>
            </div>
          )}

          {!isFullPageMode && showOverlays && (
            <>
              <span className="stage-badge stage-focusable" tabIndex={0} aria-label="Current fractal family">{activeParams.type}</span>
              <span className="stage-badge stage-badge-right stage-focusable" tabIndex={0} aria-label="Current color scheme">Palette: {activeParams.colorScheme}</span>
              <span className="stage-scale stage-focusable" tabIndex={0} aria-label="Current viewport bounds">
                x:[{viewport.xMin.toExponential(3)}, {viewport.xMax.toExponential(3)}] y:[{viewport.yMin.toExponential(3)}, {viewport.yMax.toExponential(3)}]
              </span>
            </>
          )}
        </div>

        {!isFullPageMode && <div className="overlay-legend" aria-label="Fractal interaction legend">
          <span className="overlay-legend-item" tabIndex={0} title="Use mouse wheel or Zoom In/Out controls to navigate scales quickly.">Wheel zoom</span>
          <span className="overlay-legend-item" tabIndex={0} title="Drag on the canvas to pan while keeping magnification fixed.">Drag pan</span>
          <span className="overlay-legend-item" tabIndex={0} title="Home resets viewport to the canonical range for the selected fractal family.">Home reset</span>
          <span className="overlay-legend-item" tabIndex={0} title="SVG is vector-native for Fern and Sierpinski, and image-embedded SVG for escape-time fractals.">SVG export</span>
          <span className="overlay-legend-item" tabIndex={0} title="Use + and - to zoom, arrows to pan, 0 or H for reset, Shift for finer control.">Keyboard nav</span>
        </div>}

        {renderError && <p className="muted">{renderError}</p>}
        {precisionMode && isZoomEnabled && <p className="muted">Precision mode adaptively increases iteration depth as magnification grows.</p>}
      </Panel>
      </div>

      {!isFullPageMode && showResearchPanel && researchData && (
        <Panel title="Research Analysis" subtitle="Fractal dimension, lacunarity, and self-similarity metrics">
          <div className="research-panel research-panel-scroll">
            <div className="research-section">
              <h3>Fractal Dimension</h3>
              <p>
                <strong>Estimated Dimension:</strong> {researchData.dimension.estimatedDimension.toFixed(3)}
              </p>
              <p className="muted">
                Calculated via box-counting method. Values typically range 1.3–2.0 for mathematical fractals.
              </p>
              <p>
                <strong>Confidence:</strong> {(researchData.dimension.confidence * 100).toFixed(1)}%
                <span className="muted"> (R² value: {researchData.dimension.correlationCoefficient.toFixed(3)})</span>
              </p>
            </div>

            <div className="research-section">
              <h3>Lacunarity (Gap Analysis)</h3>
              <p>
                <strong>Lacunarity Score:</strong> {researchData.lacunarity.lacunarity.toFixed(3)}
              </p>
              <p className="muted">Higher values indicate more irregular gap distribution.</p>
              <p>
                <strong>Average Gap Size:</strong> {researchData.lacunarity.averageGapSize.toFixed(1)} pixels
              </p>
              <p>
                <strong>Gap Uniformity:</strong> {(researchData.lacunarity.gapUniformity * 100).toFixed(0)}%
              </p>
            </div>

            <div className="research-section">
              <h3>Self-Similarity</h3>
              <p>
                <strong>Score:</strong> {(researchData.selfSimilarity * 100).toFixed(1)}%
              </p>
              <p className="muted">Measures how similar the fractal is at different scales (0–100%).</p>
            </div>

            <div className="research-section">
              <h3>Iteration Analysis</h3>
              <p>
                <strong>Complexity Growth:</strong> {(researchData.iteration.complexityGrowth * 100).toFixed(1)}%
              </p>
              <p>
                <strong>Suggested Max Iterations:</strong> {researchData.iteration.estimatedOptimalIterations}
              </p>
            </div>

            {researchData.recommendations.length > 0 && (
              <div className="research-section">
                <h3>Recommendations</h3>
                <ul className="muted">
                  {researchData.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="research-actions">
              <button
                type="button"
                className="action research-action-button"
                onClick={exportResearchData}
              >
                📄 Export Report
              </button>
              <button
                type="button"
                className="action research-action-button"
                onClick={() => setShowResearchPanel(false)}
              >
                Close
              </button>
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}
