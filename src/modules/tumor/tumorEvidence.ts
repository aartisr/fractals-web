export const tumorFractalEvidenceSources = [
  {
    label: 'Glioma FD as a candidate MRI biomarker',
    url: 'https://pubmed.ncbi.nlm.nih.gov/37528895/',
    summary: 'A retrospective MRI study evaluated structural, boundary, and skeleton FD measures alongside texture features for glioma-grade discrimination.',
  },
  {
    label: 'Fractal morphology and glioblastoma outcomes',
    url: 'https://pubmed.ncbi.nlm.nih.gov/34853344/',
    summary: 'A 402-patient cohort studied FD and lacunarity across MRI abnormalities and their association with outcomes; it does not establish an individual clinical decision rule.',
  },
  {
    label: '3D FD and lacunarity of glioma subcomponents',
    url: 'https://pubmed.ncbi.nlm.nih.gov/39367752/',
    summary: 'A study of enhancing, necrotic, and edema subcomponents explored FD and lacunarity in relation to grade and IDH status.',
  },
  {
    label: 'Radiomics reproducibility standard',
    url: 'https://pubmed.ncbi.nlm.nih.gov/32154773/',
    summary: 'The Image Biomarker Standardisation Initiative shows why defined preprocessing, segmentation, and reproducibility testing are prerequisites for trustworthy quantitative imaging.',
  },
]

export type TumorEvidenceSummary = {
  title: string
  summary: string
  cautions: string[]
  sources: typeof tumorFractalEvidenceSources
}

export function formatTumorFractalDelta(delta: number) {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(4)}`
}

export function buildTumorEvidenceSummary(input: {
  view: 'axial' | 'coronal' | 'sagittal'
  threshold: number
  detectionCount: number
  strongestConfidence: string
  confidenceSummary?: { high: number; medium: number; low: number } | null
}): TumorEvidenceSummary {
  const { view, threshold, detectionCount, strongestConfidence, confidenceSummary } = input
  return {
    title: `Tumor evidence snapshot: ${view}`,
    summary: confidenceSummary
      ? `Detection confidence bands: high ${confidenceSummary.high}, medium ${confidenceSummary.medium}, low ${confidenceSummary.low}. Strongest confidence: ${strongestConfidence}.`
      : `Detected ${detectionCount} candidate regions at a ${Math.round(threshold * 100)}% threshold. Strongest confidence: ${strongestConfidence}.`,
    cautions: [
      'Educational support only, not diagnosis or treatment guidance.',
      'Interpret confidence with clinical context and expert review.',
      'Keep the fractal evidence as supporting context, not a standalone claim.',
    ],
    sources: tumorFractalEvidenceSources,
  }
}
