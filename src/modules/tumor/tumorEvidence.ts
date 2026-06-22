export const tumorFractalEvidenceSources = [
  {
    label: 'Cancer staging via tissue microarrays',
    url: 'https://arxiv.org/abs/2012.13993',
    summary: 'Reported fractal dimension separating cancer stages across pancreatic, breast, colon, and prostate tissue microarrays.',
  },
  {
    label: 'Pancreatic tissue diagnostics',
    url: 'https://arxiv.org/abs/1812.10883',
    summary: 'Showed that fractal dimension of stained pancreatic tissue could distinguish early cancer tissue patterns.',
  },
  {
    label: 'Tumor growth and fractal cell space',
    url: 'https://arxiv.org/abs/1610.05789',
    summary: 'Modeled tumor growth with fractal space distributions, supporting complexity as a real structural property of tumors.',
  },
  {
    label: 'Fractal dimension estimation review',
    url: 'https://arxiv.org/abs/1101.1444',
    summary: 'Explains that fractal estimates are useful but sensitive to noise, sample size, and estimation method.',
  },
]

export function formatTumorFractalDelta(delta: number) {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(4)}`
}
