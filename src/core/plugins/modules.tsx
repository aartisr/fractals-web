import { BoxCountPage } from '../../modules/box-count/BoxCountPage'
import { ComparePage } from '../../modules/compare/ComparePage'
import { FractalsPage } from '../../modules/fractals/FractalsPage'
import { RunsPage } from '../../modules/runs/RunsPage'
import { TumorPage } from '../../modules/tumor/TumorPage'
import type { WorkbenchModule } from './types'

export const workbenchModules: WorkbenchModule[] = [
  {
    id: 'fractals',
    title: 'Fractal Generator',
    tagline: 'Generate Mandelbrot, Julia, Burning Ship, Newton, Fern, and Sierpinski variants.',
    path: '/workbench/fractals',
    accent: '#ff7b4a',
    component: FractalsPage,
  },
  {
    id: 'box-count',
    title: 'Box Counter',
    tagline: 'ROI-based box counting with fractal dimension and processing metrics.',
    path: '/workbench/box-count',
    accent: '#ffd166',
    component: BoxCountPage,
  },
  {
    id: 'compare',
    title: 'Image Compare',
    tagline: 'Dual image analysis with complexity delta and interpretation output.',
    path: '/workbench/compare',
    accent: '#41d6a4',
    component: ComparePage,
  },
  {
    id: 'tumor-detection',
    title: 'Tumor Detection',
    tagline: 'Axial/coronal/sagittal model views with confidence-box overlays.',
    path: '/workbench/tumor-detection',
    accent: '#64b5f6',
    component: TumorPage,
  },
  {
    id: 'runs',
    title: 'Run History',
    tagline: 'Searchable execution history for all modules and workflows.',
    path: '/workbench/runs',
    accent: '#b78dff',
    component: RunsPage,
  },
]
