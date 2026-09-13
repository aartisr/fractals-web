export type AppTab = 
  | 'evaluation'
  | 'roadmap'
  | 'fractals'
  | 'box-counter'
  | 'image-compare'
  | 'brain-tumors';

export interface AuditCategory {
  id: string;
  name: string;
  score: number; // 0-100
  status: 'EXCELLENT' | 'NEEDS_REFACTOR' | 'CRITICAL_BOTTLENECK' | 'ARCHITECTURAL_RISK';
  summary: string;
  strengths: string[];
  vulnerabilities: string[];
  nobelCadreRecommendation: string;
  codeSnippetRefactor?: {
    title: string;
    description: string;
    currentCode: string;
    nobelCode: string;
  };
}

export interface WebGLRoadmapPhase {
  phase: number;
  title: string;
  targetThroughput: string;
  timeframe: string;
  description: string;
  mathematicalFoundations: string;
  keyTechniques: string[];
  deliverables: string[];
  sampleImplementation: string;
}

export interface SampleImageItem {
  id: string;
  title: string;
  category: 'fractal' | 'box-counting' | 'compare' | 'tumor';
  organ?: 'brain' | 'heart' | 'eye' | 'dental' | 'liver' | 'fractal' | 'geology';
  condition?: 'normal' | 'diseased' | 'benchmark';
  subCategory?: string;
  description: string;
  url: string;
  secondUrl?: string; // for compare pairs or ground truth mask
  theoreticalDimension?: number;
  groundTruthNotes?: string;
  sourceProject: string; // e.g. "The Cancer Imaging Archive (TCIA)", "MedMNIST v2", "DRIVE / Tufts Dental"
  sourceCitation: string; // Official DOI / publication citation quote
  sourceUrl?: string;
  clinicalMetadata?: {
    plane?: 'axial' | 'coronal' | 'sagittal' | 'panoramic' | 'fundus' | 'short-axis';
    modality: 'T1' | 'T1+Gd' | 'T2-FLAIR' | 'Retinal Fundus' | 'Cardiac Cine MRI' | 'Abdominal CT' | 'Dental OPG' | 'Micro-CT';
    diagnosis: string;
    conditionSummary?: string;
    grade?: string;
    roughnessExpected: string;
    estimatedAreaMm2?: number;
    estimatedPerimeterMm?: number;
    recommendedWindowLevel?: { window: number; level: number };
  };
}

export interface BoxCountResult {
  scales: number[]; // box sizes in pixels
  counts: number[]; // non-empty box count
  logScales: number[];
  logCounts: number[];
  dimension: number; // Slope (-logN / log(1/s))
  rSquared: number;
  stdError: number;
  lacunarity: number;
  totalBoxesAtFineScale: number;
  foregroundPixelCount: number;
  roi: { x: number; y: number; width: number; height: number };
}

export interface CompareMetrics {
  ssim: number;
  mse: number;
  psnr: number;
  meanDiff: number;
  maxDiff: number;
}

export interface FractalPreset {
  id: string;
  name: string;
  type: 'mandelbrot' | 'julia' | 'burningship' | 'newton';
  centerX: number;
  centerY: number;
  zoom: number;
  maxIterations: number;
  juliaCr?: number;
  juliaCi?: number;
  description: string;
  colorScheme: 'cosmic' | 'gold' | 'thermal' | 'ocean' | 'obsidian' | 'turbo';
}
