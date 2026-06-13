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

// ── Component ─────────────────────────────────────────────────────────────────

export function FractalsPage() {

  // ── UI state ───────────────────────────────────────────────────────────────
  const [selectedType, setSelectedType]       = useState<FractalType>('Mandelbrot')
  const [showOverlays, setShowOverlays]        = useOverlayPreference('fractals.overlay.visible')
  const [controlsExpanded, setControlsExpanded] = useState(false)
  const [precisionMode, setPrecisionMode]      = useState(false)

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
      if (renderDebounceRef.current)     clearTimeout(renderDebounceRef.current)
      if (renderOverlayTimerRef.current) clearTimeout(renderOverlayTimerRef.current)
    }
  }, [])

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
    <div className="tool-grid">

      <Panel title="Fractal Generator" subtitle="Fast path to visual complexity experiments.">
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
      </Panel>

      <Panel title="Interactive Explorer" subtitle="Deep zoom and pan with GPU-accelerated rendering.">
        <div className="overlay-controls fractal-explorer-toolbar">
          <button type="button" className="overlay-toggle" onClick={() => zoomTo(0.7)}  disabled={!isZoomEnabled || isDisplayLoading}>Zoom In</button>
          <button type="button" className="overlay-toggle" onClick={() => zoomTo(1.4)}  disabled={!isZoomEnabled || isDisplayLoading}>Zoom Out</button>
          <button type="button" className="overlay-toggle" onClick={resetView}          disabled={isDisplayLoading}>Home</button>
          <button type="button" className="overlay-toggle" onClick={handleDownloadPng}  disabled={isDisplayLoading}>Download PNG</button>
          <button type="button" className="overlay-toggle" onClick={handleDownloadSvg}  disabled={isDisplayLoading}>Download SVG</button>
          <button type="button" className="overlay-toggle" onClick={() => setPrecisionMode((v) => !v)}
            disabled={!isZoomEnabled || isDisplayLoading}>
            {precisionMode ? 'Precision On' : 'Precision Off'}
          </button>
          <button type="button" className="overlay-toggle" onClick={() => setShowOverlays((v) => !v)}>
            {showOverlays ? 'Hide overlays' : 'Show overlays'}
          </button>
        </div>

        <div className="edu-chip-row" aria-label="Explorer telemetry">
          <span className="edu-chip">Type: {activeParams.type}</span>
          <span className="edu-chip">Zoom: {zoomFactor.toFixed(2)}x</span>
          <span className="edu-chip">Viewport width: {viewportWidth.toExponential(3)}</span>
          <span className="edu-chip">Iter: {dynamicMaxIter}</span>
          <span className="edu-chip">Size: {activeParams.width}x{activeParams.height}</span>
          <span className="edu-chip">Keyboard: +/-/0/arrows</span>
        </div>

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

          <div className={`explorer-controls-badge ${controlsExpanded ? 'is-open' : ''}`} aria-label="Explorer control hints">
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
          </div>

          {shouldShowLoadingOverlay && (
            <div className="image-stage-loading-overlay" role="status" aria-live="polite" aria-label="Fractal render in progress">
              <div className="loading-spinner" aria-hidden="true" />
              <p className="loading-text">Rendering viewport...</p>
            </div>
          )}

          {showOverlays && (
            <>
              <span className="stage-badge stage-focusable" tabIndex={0} aria-label="Current fractal family">{activeParams.type}</span>
              <span className="stage-badge stage-badge-right stage-focusable" tabIndex={0} aria-label="Current color scheme">Palette: {activeParams.colorScheme}</span>
              <span className="stage-scale stage-focusable" tabIndex={0} aria-label="Current viewport bounds">
                x:[{viewport.xMin.toExponential(3)}, {viewport.xMax.toExponential(3)}] y:[{viewport.yMin.toExponential(3)}, {viewport.yMax.toExponential(3)}]
              </span>
            </>
          )}
        </div>

        <div className="overlay-legend" aria-label="Fractal interaction legend">
          <span className="overlay-legend-item" tabIndex={0} title="Use mouse wheel or Zoom In/Out controls to navigate scales quickly.">Wheel zoom</span>
          <span className="overlay-legend-item" tabIndex={0} title="Drag on the canvas to pan while keeping magnification fixed.">Drag pan</span>
          <span className="overlay-legend-item" tabIndex={0} title="Home resets viewport to the canonical range for the selected fractal family.">Home reset</span>
          <span className="overlay-legend-item" tabIndex={0} title="SVG is vector-native for Fern and Sierpinski, and image-embedded SVG for escape-time fractals.">SVG export</span>
          <span className="overlay-legend-item" tabIndex={0} title="Use + and - to zoom, arrows to pan, 0 or H for reset, Shift for finer control.">Keyboard nav</span>
        </div>

        {renderError && <p className="muted">{renderError}</p>}
        {precisionMode && isZoomEnabled && <p className="muted">Precision mode adaptively increases iteration depth as magnification grows.</p>}
      </Panel>
    </div>
  )
}
