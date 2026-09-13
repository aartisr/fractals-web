import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  SplitSquareVertical, 
  Upload, 
  Layers, 
  Flame, 
  Sliders, 
  Activity, 
  Eye, 
  ArrowLeftRight, 
  CheckCircle2, 
  Compass,
  Database,
  ExternalLink
} from 'lucide-react';
import { SAMPLE_IMAGES } from '../data/sampleImages';
import { 
  rgbaToGrayscale, 
  computeSobelEdges, 
  computeCompareMetrics, 
  generateDiffHeatmap 
} from '../services/imageProcessing';
import { CompareMetrics, SampleImageItem } from '../types';

export const ImageCompareStudio: React.FC = () => {
  const allComparePairs = SAMPLE_IMAGES.filter(item => item.category === 'compare' && item.secondUrl);
  const [organFilter, setOrganFilter] = useState<'all' | 'brain' | 'heart' | 'eye' | 'dental' | 'liver'>('all');

  const comparePairs = organFilter === 'all'
    ? allComparePairs
    : allComparePairs.filter(item => item.organ === organFilter);

  const [selectedPair, setSelectedPair] = useState<SampleImageItem>(allComparePairs[0]);
  const [compareMode, setCompareMode] = useState<'split' | 'diff' | 'edge' | 'blend'>('split');
  const [splitPos, setSplitPos] = useState<number>(0.5); // 0 to 1
  const [blendAlpha, setBlendAlpha] = useState<number>(0.5);
  const [diffGain, setDiffGain] = useState<number>(2.5);
  const [metrics, setMetrics] = useState<CompareMetrics | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingSplit = useRef(false);

  const imageARef = useRef<HTMLImageElement | null>(null);
  const imageBRef = useRef<HTMLImageElement | null>(null);
  const grayARef = useRef<Uint8Array | null>(null);
  const grayBRef = useRef<Uint8Array | null>(null);

  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);

  // Load both images
  const loadPair = useCallback((urlA: string, urlB: string) => {
    let loadedCount = 0;
    const imgA = new Image();
    const imgB = new Image();
    imgA.crossOrigin = 'anonymous';
    imgB.crossOrigin = 'anonymous';

    const onComplete = () => {
      loadedCount++;
      if (loadedCount === 2) {
        imageARef.current = imgA;
        imageBRef.current = imgB;
        processImages(imgA, imgB);
      }
    };

    imgA.onload = onComplete;
    imgB.onload = onComplete;
    imgA.src = urlA;
    imgB.src = urlB;
  }, []);

  useEffect(() => {
    if (selectedPair && selectedPair.secondUrl) {
      loadPair(selectedPair.url, selectedPair.secondUrl);
    }
  }, [selectedPair, loadPair]);

  const processImages = (imgA: HTMLImageElement, imgB: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const width = 512;
    const height = 512;
    canvas.width = width;
    canvas.height = height;

    // Buffer A
    const offA = document.createElement('canvas');
    offA.width = width;
    offA.height = height;
    const ctxA = offA.getContext('2d')!;
    ctxA.drawImage(imgA, 0, 0, width, height);
    const dataA = ctxA.getImageData(0, 0, width, height).data;
    const grayA = rgbaToGrayscale(dataA);
    grayARef.current = grayA;

    // Buffer B
    const offB = document.createElement('canvas');
    offB.width = width;
    offB.height = height;
    const ctxB = offB.getContext('2d')!;
    ctxB.drawImage(imgB, 0, 0, width, height);
    const dataB = ctxB.getImageData(0, 0, width, height).data;
    const grayB = rgbaToGrayscale(dataB);
    grayBRef.current = grayB;

    // Compute quantitative metrics
    const calcMetrics = computeCompareMetrics(grayA, grayB, width, height);
    setMetrics(calcMetrics);

    renderCanvas(splitPos, blendAlpha, diffGain, compareMode);
  };

  const renderCanvas = (
    pos: number,
    alpha: number,
    gain: number,
    mode: 'split' | 'diff' | 'edge' | 'blend'
  ) => {
    const canvas = canvasRef.current;
    const imgA = imageARef.current;
    const imgB = imageBRef.current;
    const grayA = grayARef.current;
    const grayB = grayBRef.current;
    if (!canvas || !imgA || !imgB || !grayA || !grayB) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (mode === 'split') {
      // Draw image A on full canvas
      ctx.drawImage(imgA, 0, 0, w, h);

      // Clip and draw image B on right half
      const splitX = Math.round(pos * w);
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, w - splitX, h);
      ctx.clip();
      ctx.drawImage(imgB, 0, 0, w, h);
      ctx.restore();

      // Draw vertical divider bar
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, h);
      ctx.stroke();

      // Grab handle
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(splitX, h / 2, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('◄►', splitX, h / 2);
      ctx.restore();
    } else if (mode === 'diff') {
      // Differential heatmap
      const heat = generateDiffHeatmap(grayA, grayB, w, h, gain);
      ctx.drawImage(imgA, 0, 0, w, h);
      ctx.putImageData(heat, 0, 0);
    } else if (mode === 'edge') {
      // Edge overlay
      ctx.drawImage(imgA, 0, 0, w, h);
      const edgesB = computeSobelEdges(grayB, w, h);
      const edgeImg = ctx.createImageData(w, h);
      const data = edgeImg.data;
      for (let i = 0; i < edgesB.length; i++) {
        const val = edgesB[i];
        if (val > 40) {
          const idx = i * 4;
          data[idx] = 244; // R
          data[idx + 1] = 63; // G
          data[idx + 2] = 94; // B (hot pink edge)
          data[idx + 3] = Math.min(255, val * 2);
        }
      }
      ctx.putImageData(edgeImg, 0, 0);
    } else {
      // Opacity blend
      ctx.drawImage(imgA, 0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(imgB, 0, 0, w, h);
      ctx.restore();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (compareMode !== 'split') return;
    isDraggingSplit.current = true;
    updateSplitFromPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingSplit.current || compareMode !== 'split') return;
    updateSplitFromPointer(e);
  };

  const handlePointerUp = () => {
    isDraggingSplit.current = false;
  };

  const updateSplitFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const newPos = x / rect.width;
    setSplitPos(newPos);
    renderCanvas(newPos, blendAlpha, diffGain, compareMode);
  };

  // Re-render when parameters change
  useEffect(() => {
    renderCanvas(splitPos, blendAlpha, diffGain, compareMode);
  }, [compareMode, splitPos, blendAlpha, diffGain]);

  const handleCustomUploadA = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result && selectedPair) {
        setSelectedPair({
          ...selectedPair,
          title: `Custom Pair: ${file.name} vs Ref`,
          url: ev.target.result as string
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCustomUploadB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result && selectedPair) {
        setSelectedPair({
          ...selectedPair,
          title: `Custom Pair: Ref vs ${file.name}`,
          secondUrl: ev.target.result as string
        });
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
              <SplitSquareVertical className="w-3.5 h-3.5" />
              Structural Similarity & Registration Studio
            </span>
            <span className="text-xs font-mono text-slate-400">
              SSIM • ΔE Heatmap • Sobel Morphometry
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Multi-Modal Image Compare Studio
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            Compare hemodynamic contrast enhancement (T1 pre- vs post-gadolinium), AI segmentation ground truth against raw clinical scans, and edge morphometry with real-time quantitative indices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input ref={fileInputARef} type="file" accept="image/*" onChange={handleCustomUploadA} className="hidden" />
          <input ref={fileInputBRef} type="file" accept="image/*" onChange={handleCustomUploadB} className="hidden" />

          <button
            onClick={() => fileInputARef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload Image A</span>
          </button>
          <button
            onClick={() => fileInputBRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Upload Image B</span>
          </button>
        </div>
      </div>

      {/* Preloaded Real Sample Pairs with Organ Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['all', 'brain', 'heart', 'eye', 'dental', 'liver'] as const).map(org => (
              <button
                key={org}
                onClick={() => setOrganFilter(org)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  organFilter === org
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {org === 'all' ? 'All Comparison Pairs (7)' : `${org} Pairs`}
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono text-cyan-400">
            Top 3 Biomedical Open Source Citations (TCIA • MedMNIST • DRIVE/Tufts)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {comparePairs.map((pair) => {
            const isSelected = selectedPair.id === pair.id;
            return (
              <div
                key={pair.id}
                onClick={() => setSelectedPair(pair)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="relative flex-1 aspect-square rounded overflow-hidden bg-slate-950 border border-slate-800">
                      <img src={pair.url} alt="Scan A" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-slate-950/80 text-[8px] font-mono text-slate-300">A</span>
                    </div>
                    <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <div className="relative flex-1 aspect-square rounded overflow-hidden bg-slate-950 border border-slate-800">
                      <img src={pair.secondUrl} alt="Scan B" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-slate-950/80 text-[8px] font-mono text-cyan-300">B</span>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-slate-200 line-clamp-1">{pair.title}</div>
                  <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{pair.subCategory}</div>
                </div>

                <div className="text-[9px] font-mono text-cyan-400/80 mt-2 pt-1 border-t border-slate-800/60 line-clamp-1">
                  {pair.sourceProject ? pair.sourceProject.split('(')[0] : 'Open Benchmark'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workspace: Canvas & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Comparison Viewport */}
        <div className="lg:col-span-8 space-y-3">
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-3">
            {/* Mode Selector Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setCompareMode('split')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    compareMode === 'split'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <SplitSquareVertical className="w-3.5 h-3.5" />
                  <span>Curtain Split</span>
                </button>
                <button
                  onClick={() => setCompareMode('diff')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    compareMode === 'diff'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>ΔE Heatmap</span>
                </button>
                <button
                  onClick={() => setCompareMode('edge')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    compareMode === 'edge'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Sobel Boundary</span>
                </button>
                <button
                  onClick={() => setCompareMode('blend')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    compareMode === 'blend'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Alpha Blend</span>
                </button>
              </div>

              <div className="text-xs font-mono text-slate-400">
                {compareMode === 'split' ? `Divider: ${Math.round(splitPos * 100)}%` : `Mode: ${compareMode.toUpperCase()}`}
              </div>
            </div>

            {/* Interactive Canvas */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center select-none shadow-2xl">
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="max-w-full max-h-[480px] object-contain cursor-ew-resize block"
              />

              {/* HUD labels for split mode */}
              {compareMode === 'split' && (
                <>
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-md text-[10px] font-mono text-slate-300 border border-slate-800 pointer-events-none">
                    Reference A (Left)
                  </span>
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-slate-800 pointer-events-none">
                    Comparison B (Right)
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>
                {compareMode === 'split'
                  ? 'Drag cursor left / right across canvas to wipe comparison divider'
                  : 'Multi-spectral alignment active'}
              </span>
              <span className="font-mono text-cyan-400">{selectedPair.title}</span>
            </div>
          </div>
        </div>

        {/* Right: Quantitative Similarity Metrics */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/90 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Quantitative Registration Indices
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                Real-time
              </span>
            </div>

            {/* SSIM Metric Highlight */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Structural Similarity (SSIM)</span>
                <span className="text-[10px] font-mono text-slate-500">[0.00 - 1.00]</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-cyan-400">
                  {metrics ? metrics.ssim.toFixed(4) : '--'}
                </span>
                <span className="text-xs text-emerald-400 font-mono">
                  {metrics && metrics.ssim > 0.9 ? 'High Concordance' : 'Significant Lesion Delta'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
                Luminance, contrast, and structural covariance metric quantifying perceptual alignment.
              </p>
            </div>

            {/* Secondary Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                <div className="text-[10px] font-mono uppercase text-slate-400">PSNR (Peak SNR)</div>
                <div className="text-lg font-bold font-mono text-slate-200">
                  {metrics ? `${metrics.psnr.toFixed(2)} dB` : '--'}
                </div>
                <div className="text-[9px] text-slate-500">Signal-to-noise</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                <div className="text-[10px] font-mono uppercase text-slate-400">MSE (Mean Squared)</div>
                <div className="text-lg font-bold font-mono text-slate-200">
                  {metrics ? metrics.mse.toFixed(2) : '--'}
                </div>
                <div className="text-[9px] text-slate-500">Average squared error</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                <div className="text-[10px] font-mono uppercase text-slate-400">Mean Pixel Δ</div>
                <div className="text-lg font-bold font-mono text-slate-200">
                  {metrics ? metrics.meanDiff.toFixed(2) : '--'}
                </div>
                <div className="text-[9px] text-slate-500">Luma shift</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-0.5">
                <div className="text-[10px] font-mono uppercase text-slate-400">Max Local Delta</div>
                <div className="text-lg font-bold font-mono text-rose-400">
                  {metrics ? metrics.maxDiff : '--'} / 255
                </div>
                <div className="text-[9px] text-slate-500">Peak lesion contrast</div>
              </div>
            </div>

            {/* Mode-specific Sliders */}
            {compareMode === 'diff' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Difference Gain Multiplier</span>
                  <span className="font-mono text-cyan-400">{diffGain.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="0.2"
                  value={diffGain}
                  onChange={(e) => setDiffGain(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            )}

            {compareMode === 'blend' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">Alpha Blend Ratio</span>
                  <span className="font-mono text-cyan-400">{Math.round(blendAlpha * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={blendAlpha}
                  onChange={(e) => setBlendAlpha(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            )}

            {/* Context Notes */}
            {selectedPair.groundTruthNotes && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  Clinical & Scientific Rationale
                </div>
                <p className="leading-relaxed">{selectedPair.groundTruthNotes}</p>
              </div>
            )}

            {/* Top 3 Open Source Repository Provenance */}
            {selectedPair.sourceProject && (
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-slate-300 space-y-1.5">
                <div className="font-semibold text-cyan-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    Open Source Source & Academic Citation
                  </span>
                  {selectedPair.sourceUrl && (
                    <a
                      href={selectedPair.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-cyan-400 hover:text-cyan-200 flex items-center gap-1 underline"
                    >
                      Source Archive <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="text-[11px] font-semibold text-slate-200">
                  {selectedPair.sourceProject}
                </div>
                {selectedPair.sourceCitation && (
                  <div className="text-[10px] font-mono text-slate-400 bg-slate-950/80 p-2 rounded border border-slate-800/60 leading-relaxed">
                    "{selectedPair.sourceCitation}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
