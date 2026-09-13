import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Grid3X3, 
  Upload, 
  Sparkles, 
  Sliders, 
  TrendingUp, 
  CheckCircle2, 
  RefreshCw, 
  Eye, 
  Maximize2,
  HelpCircle,
  Database,
  ExternalLink
} from 'lucide-react';
import { SAMPLE_IMAGES } from '../data/sampleImages';
import { 
  rgbaToGrayscale, 
  computeOtsuThreshold, 
  computeBoxCounting 
} from '../services/imageProcessing';
import { BoxCountResult, SampleImageItem } from '../types';
import { VolumetricBoxCountPanel } from './VolumetricBoxCountPanel';

export const BoxCounterStudio: React.FC = () => {
  const [organFilter, setOrganFilter] = useState<'all' | 'brain' | 'heart' | 'eye' | 'dental' | 'liver' | 'fractal'>('all');
  
  const allAvailableSamples = SAMPLE_IMAGES;
  const filteredSamples = organFilter === 'all'
    ? allAvailableSamples
    : allAvailableSamples.filter(item => item.organ === organFilter || (organFilter === 'fractal' && item.organ === 'geology'));
  
  const [selectedItem, setSelectedItem] = useState<SampleImageItem>(filteredSamples[0]);
  const [threshold, setThreshold] = useState<number>(128);
  const [otsuThreshold, setOtsuThreshold] = useState<number>(128);
  const [useOtsu, setUseOtsu] = useState<boolean>(true);
  const [invertMask, setInvertMask] = useState<boolean>(false);
  const [activeVisualGridScale, setActiveVisualGridScale] = useState<number>(16);
  const [showGridOverlay, setShowGridOverlay] = useState<boolean>(true);
  const [showBinaryMask, setShowBinaryMask] = useState<boolean>(false);

  // ROI: null = full image
  const [roi, setRoi] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isDrawingRoi, setIsDrawingRoi] = useState(false);
  const [roiStart, setRoiStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [boxResult, setBoxResult] = useState<BoxCountResult | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawImageRef = useRef<HTMLImageElement | null>(null);
  const grayscaleDataRef = useRef<Uint8Array | null>(null);

  // Load selected image
  const loadImage = useCallback((url: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      rawImageRef.current = img;
      processNewImage(img);
    };
    img.src = url;
  }, []);

  useEffect(() => {
    loadImage(selectedItem.url);
  }, [selectedItem, loadImage]);

  const processNewImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    canvas.width = img.width || 512;
    canvas.height = img.height || 512;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const gray = rgbaToGrayscale(imgData.data);
    grayscaleDataRef.current = gray;

    const autoOtsu = computeOtsuThreshold(gray);
    setOtsuThreshold(autoOtsu);
    const activeThresh = useOtsu ? autoOtsu : threshold;
    if (useOtsu) setThreshold(autoOtsu);

    // Compute box count
    runAnalysis(gray, canvas.width, canvas.height, activeThresh, invertMask, roi);
  };

  const runAnalysis = (
    gray: Uint8Array,
    width: number,
    height: number,
    t: number,
    invert: boolean,
    currentRoi: { x: number; y: number; width: number; height: number } | null
  ) => {
    const result = computeBoxCounting(gray, width, height, t, invert, currentRoi || undefined);
    setBoxResult(result);
    drawVisualViewport(width, height, t, invert, currentRoi, result);
  };

  const drawVisualViewport = (
    w: number,
    h: number,
    t: number,
    invert: boolean,
    currentRoi: { x: number; y: number; width: number; height: number } | null,
    res: BoxCountResult | null
  ) => {
    const canvas = canvasRef.current;
    if (!canvas || !rawImageRef.current || !grayscaleDataRef.current) return;
    const ctx = canvas.getContext('2d')!;

    // 1. Draw base image or binary mask
    if (showBinaryMask) {
      const imgData = ctx.createImageData(w, h);
      const data = imgData.data;
      const gray = grayscaleDataRef.current;
      for (let i = 0; i < gray.length; i++) {
        const val = gray[i];
        const isFore = invert ? val <= t : val >= t;
        const idx = i * 4;
        data[idx] = isFore ? 56 : 15;
        data[idx + 1] = isFore ? 189 : 23;
        data[idx + 2] = isFore ? 248 : 42;
        data[idx + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    } else {
      ctx.drawImage(rawImageRef.current, 0, 0, w, h);
    }

    // 2. Draw active box counting grid overlay
    if (showGridOverlay && activeVisualGridScale > 0) {
      const s = activeVisualGridScale;
      const rx = currentRoi ? currentRoi.x : 0;
      const ry = currentRoi ? currentRoi.y : 0;
      const rw = currentRoi ? currentRoi.width : w;
      const rh = currentRoi ? currentRoi.height : h;

      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1;

      // Draw vertical and horizontal grid lines
      for (let x = rx; x <= rx + rw; x += s) {
        ctx.beginPath();
        ctx.moveTo(x, ry);
        ctx.lineTo(x, ry + rh);
        ctx.stroke();
      }
      for (let y = ry; y <= ry + rh; y += s) {
        ctx.beginPath();
        ctx.moveTo(rx, y);
        ctx.lineTo(rx + rw, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Draw ROI boundary if active
    if (currentRoi) {
      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(currentRoi.x, currentRoi.y, currentRoi.width, currentRoi.height);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '10px monospace';
      ctx.fillText(`ROI ${currentRoi.width}x${currentRoi.height}`, currentRoi.x + 4, Math.max(14, currentRoi.y - 4));
      ctx.restore();
    }
  };

  // Re-run analysis on parameter adjustments
  const handleParamChange = (newThresh: number, newInvert: boolean, newRoi = roi) => {
    if (!canvasRef.current || !grayscaleDataRef.current) return;
    runAnalysis(grayscaleDataRef.current, canvasRef.current.width, canvasRef.current.height, newThresh, newInvert, newRoi);
  };

  // Mouse interaction for ROI drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawingRoi(true);
    setRoiStart({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRoi || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const curX = (e.clientX - rect.left) * scaleX;
    const curY = (e.clientY - rect.top) * scaleY;

    const x = Math.min(roiStart.x, curX);
    const y = Math.min(roiStart.y, curY);
    const width = Math.abs(curX - roiStart.x);
    const height = Math.abs(curY - roiStart.y);

    if (width > 8 && height > 8) {
      setRoi({ x, y, width, height });
      handleParamChange(threshold, invertMask, { x, y, width, height });
    }
  };

  const handleMouseUp = () => {
    setIsDrawingRoi(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        const customItem: SampleImageItem = {
          id: `custom-${Date.now()}`,
          title: `Uploaded Image (${file.name})`,
          category: 'box-counting',
          organ: 'fractal',
          condition: 'benchmark',
          subCategory: 'User-Provided Scan',
          description: 'Custom image uploaded for box-counting fractal dimension estimation.',
          url: ev.target.result as string,
          sourceProject: 'User Imported Diagnostic Imaging / Specimen',
          sourceCitation: 'Locally uploaded patient or experimental image.'
        };
        setSelectedItem(customItem);
        setRoi(null);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1.5">
              <Grid3X3 className="w-3.5 h-3.5" />
              Minkowski-Bouligand Dimension Engine
            </span>
            <span className="text-xs font-mono text-slate-400">
              D = -lim(s→0) [log N(s) / log s]
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Precision Box-Counting & Lacunarity Analyzer
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Quantify boundary roughness, surface complexity, and scale-invariance on authentic geometric standards, geographic contours, micro-porous rock matrices, and clinical brain tumor slices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload Image</span>
          </button>
          {roi && (
            <button
              onClick={() => {
                setRoi(null);
                handleParamChange(threshold, invertMask, null);
              }}
              className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
            >
              Reset ROI
            </button>
          )}
        </div>
      </div>

      {/* Preloaded Real Sample Image Selector with Organ Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['all', 'brain', 'heart', 'eye', 'dental', 'liver', 'fractal'] as const).map(org => (
              <button
                key={org}
                onClick={() => setOrganFilter(org)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  organFilter === org
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {org === 'all' ? 'All Datasets' : org}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono text-cyan-400">
            Top 3 Biomedical Open Source Citations
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredSamples.map((sample) => {
            const isSelected = selectedItem.id === sample.id;
            const isNormal = sample.condition === 'normal';
            return (
              <div
                key={sample.id}
                onClick={() => {
                  setSelectedItem(sample);
                  setRoi(null);
                }}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="aspect-square rounded-lg overflow-hidden bg-slate-950 mb-1.5 border border-slate-800 relative">
                    <img
                      src={sample.url}
                      alt={sample.title}
                      className="w-full h-full object-cover"
                    />

                    {/* Condition Badge */}
                    {sample.condition && sample.condition !== 'benchmark' && (
                      <span className={`absolute top-1 left-1 px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        isNormal
                          ? 'bg-emerald-500/90 text-white shadow-sm'
                          : 'bg-rose-500/90 text-white shadow-sm'
                      }`}>
                        {isNormal ? '✓ Normal' : '⚠ Diseased'}
                      </span>
                    )}

                    {sample.theoreticalDimension && (
                      <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-slate-950/90 text-[9px] font-mono text-emerald-400 border border-slate-800">
                        D≈{sample.theoreticalDimension}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-200 line-clamp-1">{sample.title}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">{sample.subCategory}</div>
                </div>

                <div className="text-[9px] font-mono text-cyan-400/80 mt-1 pt-1 border-t border-slate-800/60 line-clamp-1">
                  {sample.sourceProject ? sample.sourceProject.split('(')[0] : 'Open Benchmark'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Canvas Viewport */}
        <div className="lg:col-span-7 space-y-3">
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">{selectedItem.title}</span>
                <span className="text-[10px] font-mono text-slate-400">
                  {canvasRef.current?.width || 512}x{canvasRef.current?.height || 512} px
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => {
                    setShowBinaryMask(!showBinaryMask);
                    setTimeout(() => drawVisualViewport(canvasRef.current?.width || 512, canvasRef.current?.height || 512, threshold, invertMask, roi, boxResult), 50);
                  }}
                  className={`px-2.5 py-1 rounded font-mono text-xs border ${
                    showBinaryMask
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  Binary Mask
                </button>
                <button
                  onClick={() => {
                    setShowGridOverlay(!showGridOverlay);
                    setTimeout(() => drawVisualViewport(canvasRef.current?.width || 512, canvasRef.current?.height || 512, threshold, invertMask, roi, boxResult), 50);
                  }}
                  className={`px-2.5 py-1 rounded font-mono text-xs border ${
                    showGridOverlay
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  Grid: {activeVisualGridScale}px
                </button>
              </div>
            </div>

            {/* Canvas Port with Mouse ROI selector */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="max-w-full max-h-[460px] object-contain cursor-crosshair select-none block"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Click and drag on canvas to define custom Region of Interest (ROI)</span>
              {selectedItem.theoreticalDimension && (
                <span className="text-emerald-400 font-mono">
                  Theoretical Benchmark: D = {selectedItem.theoreticalDimension}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Dimension & Regression Results */}
        <div className="lg:col-span-5 space-y-4">
          {/* Main Results Card */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Calculated Fractal Dimension
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                OLS Linear Fit
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl sm:text-4xl font-extrabold font-mono text-cyan-400 tracking-tight">
                  {boxResult ? boxResult.dimension.toFixed(4) : '--'}
                </span>
                <span className="text-xs text-slate-400 ml-2 font-mono">
                  ± {boxResult ? boxResult.stdError.toFixed(4) : '--'} (SE)
                </span>
              </div>

              <div className="text-right">
                <div className="text-xs font-mono font-semibold text-emerald-400">
                  R² = {boxResult ? boxResult.rSquared.toFixed(4) : '--'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Goodness of Fit
                </div>
              </div>
            </div>

            {/* Lacunarity & Density strip */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                <div className="text-[10px] font-mono uppercase text-slate-400">Lacunarity (Λ)</div>
                <div className="text-sm font-bold font-mono text-slate-200">
                  {boxResult ? boxResult.lacunarity.toFixed(4) : '--'}
                </div>
                <div className="text-[9px] text-slate-500">Void clustering index</div>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                <div className="text-[10px] font-mono uppercase text-slate-400">Foreground Mass</div>
                <div className="text-sm font-bold font-mono text-slate-200">
                  {boxResult ? boxResult.foregroundPixelCount.toLocaleString() : '--'} px
                </div>
                <div className="text-[9px] text-slate-500">Active boundary pixels</div>
              </div>
            </div>

            {/* Interactive SVG Log-Log Plot */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Log-Log Regression: log N(s) vs log(1/s)</span>
                <span className="text-cyan-400 text-[10px]">Slope = D</span>
              </div>

              <div className="h-44 w-full bg-slate-950 rounded-xl border border-slate-800 p-2 relative">
                {boxResult && boxResult.logScales.length > 0 ? (
                  <svg className="w-full h-full" viewBox="0 0 320 150">
                    {/* Grid lines */}
                    <line x1="30" y1="130" x2="310" y2="130" stroke="#334155" strokeWidth="1" />
                    <line x1="30" y1="10" x2="30" y2="130" stroke="#334155" strokeWidth="1" />

                    {/* Compute normalized coordinates */}
                    {(() => {
                      const minX = Math.min(...boxResult.logScales);
                      const maxX = Math.max(...boxResult.logScales);
                      const minY = Math.min(...boxResult.logCounts);
                      const maxY = Math.max(...boxResult.logCounts);

                      const scaleX = (x: number) => 35 + ((x - minX) / Math.max(0.001, maxX - minX)) * 265;
                      const scaleY = (y: number) => 125 - ((y - minY) / Math.max(0.001, maxY - minY)) * 110;

                      // Regression Line Endpoints
                      const x1 = minX;
                      const x2 = maxX;
                      const y1 = minY;
                      const y2 = maxY;

                      return (
                        <>
                          {/* Linear regression fitted trendline */}
                          <line
                            x1={scaleX(x1)}
                            y1={scaleY(y1)}
                            x2={scaleX(x2)}
                            y2={scaleY(y2)}
                            stroke="#06b6d4"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                          />

                          {/* Data points */}
                          {boxResult.logScales.map((lx, i) => {
                            const ly = boxResult.logCounts[i];
                            const s = boxResult.scales[i];
                            const cx = scaleX(lx);
                            const cy = scaleY(ly);
                            return (
                              <g key={i} className="cursor-pointer">
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r="4.5"
                                  fill="#38bdf8"
                                  stroke="#0f172a"
                                  strokeWidth="1.5"
                                />
                                <title>Scale s={s}px: log(1/s)={lx.toFixed(2)}, log N={ly.toFixed(2)}</title>
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                    Awaiting image analysis...
                  </div>
                )}
              </div>
            </div>

            {/* Threshold & Binarization Controls */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-slate-300">Segmentation Threshold</div>
                <button
                  onClick={() => {
                    const nextUse = !useOtsu;
                    setUseOtsu(nextUse);
                    if (nextUse) {
                      setThreshold(otsuThreshold);
                      handleParamChange(otsuThreshold, invertMask);
                    }
                  }}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    useOtsu
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {useOtsu ? `Otsu Auto: ${otsuThreshold}` : 'Manual Override'}
                </button>
              </div>

              <input
                type="range"
                min="1"
                max="254"
                value={threshold}
                disabled={useOtsu}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setThreshold(val);
                  handleParamChange(val, invertMask);
                }}
                className="w-full accent-cyan-400 cursor-pointer disabled:opacity-40"
              />

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={invertMask}
                    onChange={(e) => {
                      setInvertMask(e.target.checked);
                      handleParamChange(threshold, e.target.checked);
                    }}
                    className="accent-cyan-400"
                  />
                  <span>Invert Foreground</span>
                </label>

                {/* Visual Grid Size Picker */}
                <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                  <span>Visual Grid:</span>
                  {[4, 8, 16, 32, 64].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => {
                        setActiveVisualGridScale(sz);
                        setTimeout(() => drawVisualViewport(canvasRef.current?.width || 512, canvasRef.current?.height || 512, threshold, invertMask, roi, boxResult), 50);
                      }}
                      className={`px-1.5 py-0.5 rounded ${
                        activeVisualGridScale === sz
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                          : 'hover:bg-slate-800'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ground Truth Validation Notes */}
            {selectedItem.groundTruthNotes && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Benchmark Verification Notes
                </div>
                <p className="leading-relaxed">{selectedItem.groundTruthNotes}</p>
              </div>
            )}

            {/* Top 3 Open Source Repository Provenance */}
            {selectedItem.sourceProject && (
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-slate-300 space-y-1.5">
                <div className="font-semibold text-cyan-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    Open Source Source & Academic Citation
                  </span>
                  {selectedItem.sourceUrl && (
                    <a
                      href={selectedItem.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-cyan-400 hover:text-cyan-200 flex items-center gap-1 underline"
                    >
                      Source Archive <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="text-[11px] font-semibold text-slate-200">
                  {selectedItem.sourceProject}
                </div>
                {selectedItem.sourceCitation && (
                  <div className="text-[10px] font-mono text-slate-400 bg-slate-950/80 p-2 rounded border border-slate-800/60 leading-relaxed">
                    "{selectedItem.sourceCitation}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Volumetric 3D Box-Counting Module from Latest Remote */}
      <VolumetricBoxCountPanel />
    </div>
  );
};
