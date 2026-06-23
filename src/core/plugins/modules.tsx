import type { WorkbenchModule } from './types'

export const workbenchModules: WorkbenchModule[] = [
  {
    id: 'fractals',
    title: 'Fractal Generator',
    tagline: 'Generate Mandelbrot, Julia, Burning Ship, Newton, Fern, and Sierpinski variants.',
    path: '/workbench/fractals',
    accent: '#ff7b4a',
  },
  {
    id: 'discover',
    title: 'Discovery Feed',
    tagline: 'Browse shared examples, challenge pages, and trust-first analytics.',
    path: '/workbench/discover',
    accent: '#00a896',
  },
  {
    id: 'box-count',
    title: 'Box Counter',
    tagline: 'ROI-based box counting with fractal dimension and processing metrics.',
    path: '/workbench/box-count',
    accent: '#ffd166',
  },
  {
    id: 'compare',
    title: 'Image Compare',
    tagline: 'Dual image analysis with complexity delta and interpretation output.',
    path: '/workbench/compare',
    accent: '#41d6a4',
  },
  {
    id: 'tumor-detection',
    title: 'Tumor Detection',
    tagline: 'Axial/coronal/sagittal model views with confidence-box overlays.',
    path: '/workbench/tumor-detection',
    accent: '#64b5f6',
  },
  {
    id: 'runs',
    title: 'Run History',
    tagline: 'Searchable execution history for all modules and workflows.',
    path: '/workbench/runs',
    accent: '#b78dff',
  },
]
