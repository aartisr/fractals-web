import React, { useState, useRef } from 'react';
import { 
  Cpu, 
  Play, 
  CheckCircle2, 
  Terminal, 
  Zap, 
  Gauge, 
  TrendingUp, 
  Activity 
} from 'lucide-react';
import { WEBGL_OPTIMIZATION_ROADMAP } from '../data/optimizationRoadmap';
import { WebGLFractalRenderer } from '../services/webglEngine';

interface BenchmarkResult {
  iterations: number;
  frameTimeMs: number;
  fps: number;
  megaPixelsPerSec: number;
  megaOpsPerSec: number;
}

export const RoadmapView: React.FC = () => {
  const [activePhase, setActivePhase] = useState<number>(1);
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[] | null>(null);
  const [gpuInfo, setGpuInfo] = useState<{ renderer: string; vendor: string } | null>(null);
  
  const testCanvasRef = useRef<HTMLCanvasElement>(null);

  const runLiveBenchmark = async () => {
    if (!testCanvasRef.current) return;
    setBenchmarking(true);
    setBenchmarkResults(null);

    const canvas = testCanvasRef.current;
    canvas.width = 512;
    canvas.height = 512;
    const renderer = new WebGLFractalRenderer(canvas);

    const iterationsToTest = [50, 200, 600, 1200, 2000];
    const results: BenchmarkResult[] = [];

    // Warm-up pass
    renderer.render(-0.7, 0, 1.0, 100, 'mandelbrot', 'cosmic');
    await new Promise(r => setTimeout(r, 100));

    for (const iters of iterationsToTest) {
      let totalTime = 0;
      const runs = 5;

      for (let r = 0; r < runs; r++) {
        const t0 = performance.now();
        const profile = renderer.render(-0.743643887037, 0.1318259042, 150.0, iters, 'mandelbrot', 'cosmic');
        const t1 = performance.now();
        totalTime += (t1 - t0);
        if (!gpuInfo) {
          setGpuInfo({ renderer: profile.gpuRenderer, vendor: profile.gpuVendor });
        }
      }

      const avgTime = totalTime / runs;
      const fps = Math.min(120, Math.round(1000 / Math.max(0.1, avgTime)));
      const pixels = canvas.width * canvas.height;
      const mpxSec = (pixels / (avgTime / 1000)) / 1_000_000;
      const mops = (pixels * (iters * 0.4) * 8) / (avgTime / 1000) / 1_000_000;

      results.push({
        iterations: iters,
        frameTimeMs: parseFloat(avgTime.toFixed(2)),
        fps,
        megaPixelsPerSec: parseFloat(mpxSec.toFixed(1)),
        megaOpsPerSec: Math.round(mops)
      });

      // Allow UI tick
      await new Promise(r => setTimeout(r, 80));
    }

    setBenchmarkResults(results);
    setBenchmarking(false);
  };

  const selectedPhaseData = WEBGL_OPTIMIZATION_ROADMAP.find(p => p.phase === activePhase) || WEBGL_OPTIMIZATION_ROADMAP[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hidden benchmarking canvas */}
      <canvas ref={testCanvasRef} className="hidden" />

      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                Gold-Standard Performance Specification
              </span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Target: 60-120 FPS
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-['Plus_Jakarta_Sans']">
              WebGL & WebGPU Render Throughput Roadmap
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              A phased, hardware-conscious engineering roadmap designed to scale compute throughput from naive single-threaded Canvas 2D rasterization to sub-millisecond WebGPU WGSL compute workgroups with FP64 series perturbation approximation.
            </p>
          </div>

          <button
            id="btn-run-gpu-benchmark"
            onClick={runLiveBenchmark}
            disabled={benchmarking}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50 shrink-0 self-start md:self-center"
          >
            {benchmarking ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Running GPU Profiler...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Live GPU Stress Test</span>
              </>
            )}
          </button>
        </div>

        {/* Live Benchmark Results if Available */}
        {benchmarkResults && (
          <div className="mt-6 pt-6 border-t border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Client GPU Hardware Throughput Profile
                </span>
              </div>
              {gpuInfo && (
                <span className="text-xs font-mono text-cyan-400 bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
                  {gpuInfo.renderer} ({gpuInfo.vendor})
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {benchmarkResults.map((res) => (
                <div key={res.iterations} className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                  <div className="text-[11px] font-mono text-slate-400">{res.iterations} Iterations</div>
                  <div className="text-lg font-bold font-mono text-white flex items-baseline gap-1">
                    {res.frameTimeMs}
                    <span className="text-[10px] font-normal text-slate-400">ms</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="text-emerald-400">{res.fps} FPS</span>
                    <span>{res.megaPixelsPerSec} MP/s</span>
                  </div>
                  <div className="text-[9px] font-mono text-cyan-300">
                    {res.megaOpsPerSec} M-FLOP/s
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5-Phase Roadmap Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {WEBGL_OPTIMIZATION_ROADMAP.map((item) => {
          const isSelected = item.phase === activePhase;
          return (
            <button
              key={item.phase}
              id={`roadmap-phase-btn-${item.phase}`}
              onClick={() => setActivePhase(item.phase)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-800 border-cyan-500 shadow-md shadow-cyan-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/40 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                <span className={isSelected ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
                  PHASE 0{item.phase}
                </span>
                <span className="text-[9px] text-slate-500">{item.timeframe}</span>
              </div>
              <div className="text-xs font-semibold text-slate-200 line-clamp-1">{item.title}</div>
              <div className="text-[10px] font-mono text-emerald-400 mt-1 line-clamp-1">{item.targetThroughput}</div>
            </button>
          );
        })}
      </div>

      {/* Selected Phase Architectural Specification */}
      <div className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 mb-1">
              Phase 0{selectedPhaseData.phase} Deep Dive • {selectedPhaseData.timeframe}
            </div>
            <h2 className="text-xl font-bold text-white">
              {selectedPhaseData.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 font-mono text-xs text-emerald-400">
            <Activity className="w-3.5 h-3.5" />
            <span>Target: {selectedPhaseData.targetThroughput}</span>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          {selectedPhaseData.description}
        </p>

        {/* Mathematical Foundations */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            <Zap className="w-3.5 h-3.5" />
            Mathematical & Algorithmic Foundations
          </div>
          <p className="text-xs font-mono text-slate-300 leading-relaxed">
            {selectedPhaseData.mathematicalFoundations}
          </p>
        </div>

        {/* Techniques & Deliverables */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              Key GPU Engineering Techniques
            </div>
            <ul className="text-xs text-slate-300 space-y-2">
              {selectedPhaseData.keyTechniques.map((tech, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{tech}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Verified Deliverables & Milestones
            </div>
            <ul className="text-xs text-slate-300 space-y-2">
              {selectedPhaseData.deliverables.map((deliv, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{deliv}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Code Specification */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            Shader / Engine Implementation Blueprint
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
            <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Phase 0{selectedPhaseData.phase} Reference Architecture</span>
              <span className="text-cyan-400 font-mono text-[10px]">GLSL ES 3.0 / WGSL</span>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
              <code>{selectedPhaseData.sampleImplementation}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
