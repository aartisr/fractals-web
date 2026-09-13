import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  RotateCcw, 
  Download, 
  Code2, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  Layers, 
  Palette, 
  Sliders, 
  Activity 
} from 'lucide-react';
import { WebGLFractalRenderer, FRACTAL_PRESETS, RenderProfile } from '../services/webglEngine';
import { FractalPreset } from '../types';

export const WebGLFractalStudio: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLFractalRenderer | null>(null);

  const [selectedPreset, setSelectedPreset] = useState<FractalPreset>(FRACTAL_PRESETS[0]);
  const [centerX, setCenterX] = useState<number>(FRACTAL_PRESETS[0].centerX);
  const [centerY, setCenterY] = useState<number>(FRACTAL_PRESETS[0].centerY);
  const [zoom, setZoom] = useState<number>(FRACTAL_PRESETS[0].zoom);
  const [maxIterations, setMaxIterations] = useState<number>(FRACTAL_PRESETS[0].maxIterations);
  const [fractalType, setFractalType] = useState<'mandelbrot' | 'julia' | 'burningship' | 'newton'>(FRACTAL_PRESETS[0].type);
  const [colorScheme, setColorScheme] = useState<string>(FRACTAL_PRESETS[0].colorScheme);
  const [juliaCr, setJuliaCr] = useState<number>(FRACTAL_PRESETS[3].juliaCr || -0.123);
  const [juliaCi, setJuliaCi] = useState<number>(FRACTAL_PRESETS[3].juliaCi || 0.745);

  const [telemetry, setTelemetry] = useState<RenderProfile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showShaderCode, setShowShaderCode] = useState(false);

  // Initialize Renderer
  useEffect(() => {
    if (!canvasRef.current) return;
    const renderer = new WebGLFractalRenderer(canvasRef.current);
    rendererRef.current = renderer;

    return () => {
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  // Continuous frame render
  const renderFrame = useCallback(() => {
    if (!rendererRef.current) return;
    const profile = rendererRef.current.render(
      centerX,
      centerY,
      zoom,
      maxIterations,
      fractalType,
      colorScheme,
      juliaCr,
      juliaCi
    );
    setTelemetry(profile);
  }, [centerX, centerY, zoom, maxIterations, fractalType, colorScheme, juliaCr, juliaCi]);

  useEffect(() => {
    renderFrame();
  }, [renderFrame]);

  // Handle preset change
  const applyPreset = (preset: FractalPreset) => {
    setSelectedPreset(preset);
    setCenterX(preset.centerX);
    setCenterY(preset.centerY);
    setZoom(preset.zoom);
    setMaxIterations(preset.maxIterations);
    setFractalType(preset.type);
    setColorScheme(preset.colorScheme);
    if (preset.juliaCr !== undefined) setJuliaCr(preset.juliaCr);
    if (preset.juliaCi !== undefined) setJuliaCi(preset.juliaCi);
  };

  // Canvas Mouse Pan & Zoom
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !canvasRef.current) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    const canvas = canvasRef.current;
    const factor = 3.0 / (zoom * Math.min(canvas.width, canvas.height));
    setCenterX(prev => prev - dx * factor);
    setCenterY(prev => prev + dy * factor);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.25 : 0.8;
    setZoom(prev => Math.max(0.1, prev * zoomFactor));
  };

  const handleReset = () => {
    applyPreset(selectedPreset);
  };

  const downloadSnapshot = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `fractal-${fractalType}-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Controls & Presets */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-900/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Interactive WebGL 2.0 Fractal Synthesis Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time fragment shader with Böttcher continuous escape potential coloring and interactive Julia space.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowShaderCode(!showShaderCode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>View GLSL</span>
          </button>
          <button
            onClick={downloadSnapshot}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export PNG</span>
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Select Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-xs font-mono uppercase text-slate-500 whitespace-nowrap">Presets:</span>
        {FRACTAL_PRESETS.map((p) => (
          <button
            key={p.id}
            id={`preset-btn-${p.id}`}
            onClick={() => applyPreset(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              selectedPreset.id === p.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Canvas Display Port */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[4/3] sm:aspect-[16/10] w-full shadow-2xl">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              className="w-full h-full cursor-grab active:cursor-grabbing block select-none"
            />

            {/* In-canvas HUD Overlay */}
            <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-300 pointer-events-none flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-bold">{telemetry?.fps || 60} FPS</span>
              </div>
              <span className="text-slate-600">|</span>
              <span>{telemetry?.frameTimeMs || 1.2} ms</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-300">{telemetry?.megaPixelsPerSec || 0} MP/s</span>
            </div>

            {/* Coordinate Overlay */}
            <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/80 font-mono text-[10px] text-slate-400 pointer-events-none space-x-3">
              <span>Re: {centerX.toFixed(6)}</span>
              <span>Im: {centerY.toFixed(6)}</span>
              <span className="text-cyan-400">Zoom: {zoom > 1000 ? zoom.toExponential(2) : zoom.toFixed(1)}x</span>
            </div>

            {/* Quick Zoom Buttons Overlay */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md p-1 rounded-lg border border-slate-800/80">
              <button
                onClick={() => setZoom(prev => prev * 1.5)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom(prev => Math.max(0.1, prev / 1.5))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
            <span>Click & drag to navigate complex plane • Scroll wheel to zoom continuously</span>
            <span className="font-mono text-cyan-400">{selectedPreset.description}</span>
          </div>
        </div>

        {/* Control Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  GPU Parameters
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                ES 3.0 Pipeline
              </span>
            </div>

            {/* Fractal Formulation Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">Mathematical Model</label>
              <select
                value={fractalType}
                onChange={(e) => setFractalType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="mandelbrot">Mandelbrot (z_{'{n+1}'} = z_n² + c)</option>
                <option value="julia">Julia Set (Fixed Complex Seed c)</option>
                <option value="burningship">Burning Ship (|Re| + i|Im|)² + c</option>
                <option value="newton">Newton-Raphson (z³ - 1 = 0)</option>
              </select>
            </div>

            {/* Color Palette Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-400" />
                Continuous Color Scheme
              </label>
              <select
                value={colorScheme}
                onChange={(e) => setColorScheme(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="cosmic">Cosmic Neon (Deep Violet to Cyan)</option>
                <option value="gold">Electric Gold (High-Order Energy)</option>
                <option value="thermal">Infrared Thermal (Heat Intensity)</option>
                <option value="ocean">Deep Ocean (Cyan to Indigo)</option>
                <option value="obsidian">Obsidian Monochrome (High-Contrast)</option>
                <option value="turbo">Turbo Spectral (Multi-Frequency)</option>
              </select>
            </div>

            {/* Max Iterations Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Iteration Ceiling</span>
                <span className="font-mono text-cyan-400">{maxIterations}</span>
              </div>
              <input
                type="range"
                min="50"
                max="1500"
                step="25"
                value={maxIterations}
                onChange={(e) => setMaxIterations(parseInt(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>50 (Fastest)</span>
                <span>500 (Balanced)</span>
                <span>1500 (Filament Depth)</span>
              </div>
            </div>

            {/* Julia Constant Sliders (if Julia is active) */}
            {fractalType === 'julia' && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="text-[11px] font-mono text-cyan-300 font-semibold uppercase">
                  Julia Complex Seed (c = c_r + i * c_i)
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Re(c): {juliaCr.toFixed(4)}</span>
                  </div>
                  <input
                    type="range"
                    min="-1.5"
                    max="1.5"
                    step="0.005"
                    value={juliaCr}
                    onChange={(e) => setJuliaCr(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Im(c): {juliaCi.toFixed(4)}</span>
                  </div>
                  <input
                    type="range"
                    min="-1.5"
                    max="1.5"
                    step="0.005"
                    value={juliaCi}
                    onChange={(e) => setJuliaCi(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            )}

            {/* Hardware Profile Details */}
            {telemetry && (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1 text-[11px] font-mono text-slate-400">
                <div className="text-slate-300 font-semibold mb-1">Renderer Pipeline Info:</div>
                <div>GPU: {telemetry.gpuRenderer}</div>
                <div>Internal Target: {telemetry.resolution}</div>
                <div>Throughput: {telemetry.megaOpsPerSec} M-FLOP/s</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GLSL Shader Code Viewer Modal */}
      {showShaderCode && (
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="text-xs font-mono text-cyan-400 flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              <span>Active GLSL ES 3.0 Fragment Shader (Continuous Potential Engine)</span>
            </div>
            <button
              onClick={() => setShowShaderCode(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-0.5"
            >
              Close
            </button>
          </div>
          <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/60 p-4 rounded-xl overflow-x-auto max-h-72 leading-relaxed">
            <code>{`// Continuous Escape Potential (Böttcher coordinate)
float r2 = dot(z, z);
if (r2 > 4.0) {
  // nu = i + 1.0 - log(0.5 * log(r2)) / log(2.0);
  float nu = float(i) + 1.0 - log(0.5 * log(r2)) / 0.69314718056;
  float t = nu / float(u_maxIterations);
  fragColor = vec4(getColor(t * 3.5, u_colorScheme), 1.0);
  return;
}`}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
