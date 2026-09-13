import React, { useState, useRef } from 'react';
import { Box, Layers, CheckCircle2, AlertCircle, FileCode } from 'lucide-react';
import { analyzeMeshVolume, analyzeDicomStack, VolumeBoxCountResult } from '../services/volumeAnalysis';

export const VolumetricBoxCountPanel: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'mesh' | 'dicom'>('mesh');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VolumeBoxCountResult | null>(null);

  const meshInputRef = useRef<HTMLInputElement>(null);
  const dicomInputRef = useRef<HTMLInputElement>(null);

  const handleMeshUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsLoading(true);
    try {
      const res = await analyzeMeshVolume(file);
      setResult(res);
    } catch (err) {
      setError((err as Error).message || 'Failed to analyze 3D mesh volume.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDicomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length < 2) {
      setError('Please select at least 2 DICOM slice files to construct a volumetric stack.');
      return;
    }
    const files: File[] = Array.from(fileList);
    setError(null);
    setIsLoading(true);
    try {
      const res = await analyzeDicomStack(files);
      setResult(res);
    } catch (err) {
      setError((err as Error).message || 'Failed to analyze DICOM stack volume.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Volumetric 3D Box-Counting Engine
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Latest v2.0
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Direct 3D voxel grid analysis for STL/OBJ surface meshes & clinical DICOM slice stacks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => { setActiveMode('mesh'); setError(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'mesh'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3D Mesh (.obj, .stl)
          </button>
          <button
            onClick={() => { setActiveMode('dicom'); setError(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'dicom'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DICOM Stack (.dcm)
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-7">
          {activeMode === 'mesh' ? (
            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl p-6 text-center transition-colors bg-slate-950/40">
              <input
                ref={meshInputRef}
                type="file"
                accept=".obj,.stl"
                onChange={handleMeshUpload}
                className="hidden"
              />
              <FileCode className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-200">
                Upload 3D Mesh Geometry
              </div>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                Supports Wavefront OBJ and Binary/ASCII STL vertex clouds. Five-phase translated-voxel-grid box counting will evaluate D_volumetric.
              </p>
              <button
                onClick={() => meshInputRef.current?.click()}
                disabled={isLoading}
                className="mt-3 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                {isLoading ? 'Processing Mesh 3D...' : 'Select OBJ or STL File'}
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl p-6 text-center transition-colors bg-slate-950/40">
              <input
                ref={dicomInputRef}
                type="file"
                multiple
                accept=".dcm"
                onChange={handleDicomUpload}
                className="hidden"
              />
              <Layers className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-200">
                Upload Volumetric DICOM Series
              </div>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                Select 2 or more sequential uncompressed DICOM slices (.dcm). Automatic intensity thresholding and 3D voxel space evaluation will execute.
              </p>
              <button
                onClick={() => dicomInputRef.current?.click()}
                disabled={isLoading}
                className="mt-3 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                {isLoading ? 'Processing DICOM Stack...' : 'Select DICOM Slice Files'}
              </button>
            </div>
          )}
        </div>

        {/* Status / Output Summary */}
        <div className="md:col-span-5 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Volumetric Telemetry</span>
            {result && (
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Complete ({result.elapsedSeconds}s)
              </span>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result ? (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-cyan-400">
                  D₃ = {result.fractalDimension.toFixed(4)}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {result.pointCount.toLocaleString()} 3D Vertices
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Source Kind</div>
                  <div className="font-bold uppercase text-cyan-300">{result.sourceKind}</div>
                </div>
                <div className="p-2 rounded bg-slate-900 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">3D Extents</div>
                  <div>{result.bounds.x.toFixed(1)} × {result.bounds.y.toFixed(1)} × {result.bounds.z.toFixed(1)}</div>
                </div>
              </div>

              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                <div className="text-slate-500">Box Count Progression (r → N(r))</div>
                <div className="flex flex-wrap gap-1 mt-1 text-slate-300">
                  {result.boxCounts.map((b) => (
                    <span key={b.size} className="px-1 py-0.5 bg-slate-950 rounded border border-slate-800">
                      s={b.size}: {b.count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs">
              Upload a 3D geometry file or DICOM stack to compute 3-dimensional Minkowski fractal dimension.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
