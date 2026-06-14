/**
 * research-guides.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Academic research guides for each fractal type.
 * Sourced from: Wikipedia Fractals, Paul Bourke's work, ChaosBook.org
 */

import type { FractalType } from '../../core/services/contracts'

export type ResearchGuide = {
  title: string
  mathematical: string // Mathematical definition
  historicalContext: string
  keyResearchers: string[]
  naturalExamples: string[]
  researchApplications: string[]
  interestingCoordinates: Array<{
    name: string
    description: string
    xMin: number
    xMax: number
    yMin: number
    yMax: number
  }>
  keyPapers: string[]
  dimensionRange: { min: number; max: number }
}

export const RESEARCH_GUIDES: Record<FractalType, ResearchGuide> = {
  Mandelbrot: {
    title: 'Mandelbrot Set',
    mathematical:
      'Defined as the set of complex numbers c for which the iteration z_{n+1} = z_n² + c (starting with z_0 = 0) remains bounded. The escape time (iterations before divergence) is colored to create the visualization.',
    historicalContext:
      'First studied by Gaston Julia and Pierre Fatou in 1918 as part of dynamical systems research. Benoît Mandelbrot visualized the full set in 1980 using computer graphics, revealing its boundary as a fractal curve.',
    keyResearchers: ['Benoît Mandelbrot', 'Gaston Julia', 'Pierre Fatou', 'Heinz-Otto Peitgen'],
    naturalExamples: [
      'Coastlines and geographical boundaries',
      'Lightning branching patterns',
      'Tree root systems',
      'River networks and tributaries',
    ],
    researchApplications: [
      'Chaos theory and dynamical systems',
      'Image compression (fractal compression)',
      'Antenna design (fractal antennas)',
      'Percolation theory in physics',
      'Pattern recognition in medical imaging',
    ],
    interestingCoordinates: [
      {
        name: 'Seahorse Valley',
        description:
          'Classic zoom target showing spiral minibrot copies with intricate filaments. Demonstrates quasi-self-similarity.',
        xMin: -0.75,
        xMax: -0.74,
        yMin: 0.085,
        yMax: 0.095,
      },
      {
        name: 'Spiral Island',
        description: 'Deep zoom into a miniature copy of the full set surrounded by chaotic spirals.',
        xMin: -0.7469,
        xMax: -0.7463,
        yMin: 0.0889,
        yMax: 0.0895,
      },
      {
        name: 'Main Cardioid',
        description:
          'The primary body of the set. Boundary has Hausdorff dimension ≈ 2.0 (fills 2D space).',
        xMin: -0.8,
        xMax: -0.4,
        yMin: -0.2,
        yMax: 0.2,
      },
    ],
    keyPapers: [
      'Mandelbrot, B. (1980). "The Fractal Geometry of Nature"',
      'Peitgen, H., & Richter, P. (1986). "The Beauty of Fractals"',
      'Julia, G. (1918). "Mémoire sur l\'itération des fonctions rationnelles"',
    ],
    dimensionRange: { min: 1.9, max: 2.0 },
  },

  Julia: {
    title: 'Julia Set',
    mathematical:
      'For a fixed complex parameter c, the Julia set is the boundary between points whose iterations z_{n+1} = z_n² + c escape to infinity and those that remain bounded. Different c values produce entirely different Julia sets.',
    historicalContext:
      'Independently discovered by Gaston Julia and Pierre Fatou in 1918. Named after Julia who published his classification of rational functions. Rediscovered by Benoit Mandelbrot in the 1980s as the complement of the Mandelbrot set boundary.',
    keyResearchers: ['Gaston Julia', 'Pierre Fatou', 'Benoît Mandelbrot', 'Adrien Douady'],
    naturalExamples: ['Snowflake-like crystal formations', 'Branching neural networks'],
    researchApplications: [
      'Complex dynamics and iteration theory',
      'Parameter space exploration',
      'Bifurcation analysis',
      'Connected vs. disconnected Julia sets',
    ],
    interestingCoordinates: [
      {
        name: 'Classic c = -0.7 + 0.27i',
        description: 'Connected Julia set with fine spiral filaments',
        xMin: -1.5,
        xMax: 1.5,
        yMin: -1.5,
        yMax: 1.5,
      },
      {
        name: 'Dendrite (c ≈ -0.162 + 1.04i)',
        description: 'Tree-like structure; example of disconnected Julia set',
        xMin: -2,
        xMax: 2,
        yMin: -2,
        yMax: 2,
      },
    ],
    keyPapers: [
      'Julia, G. (1918). "Mémoire sur l\'itération"',
      'Douady, A. (1994). "Algorithms for computing angles in the Mandelbrot set"',
    ],
    dimensionRange: { min: 1.5, max: 2.0 },
  },

  'Burning Ship': {
    title: 'Burning Ship Fractal',
    mathematical:
      'Variant of Mandelbrot set using z_{n+1} = (|Re(z_n)| + i|Im(z_n)|)² + c. Taking absolute values of real and imaginary parts creates a ship-shaped structure with different self-similarity properties.',
    historicalContext:
      'Discovered by Michael Michelitsch and Otto Östlund in 1992. Named for its distinctive ship-like appearance, particularly in the main bulbous region.',
    keyResearchers: ['Michael Michelitsch', 'Otto Östlund'],
    naturalExamples: ['Asymmetric crystal formations'],
    researchApplications: [
      'Study of non-holomorphic dynamical systems',
      'Asymmetric fractal properties',
      'Comparison with standard complex dynamics',
    ],
    interestingCoordinates: [
      {
        name: 'Main Body',
        description: 'The ship-like structure showing distinct non-symmetry',
        xMin: -1.8,
        xMax: -1.6,
        yMin: -0.2,
        yMax: 0,
      },
      {
        name: 'Filament Detail',
        description: 'Fine structures extending from the main set',
        xMin: -1.76,
        xMax: -1.74,
        yMin: -0.1,
        yMax: -0.08,
      },
    ],
    keyPapers: ['Michelitsch, M., & Östlund, S. (1992). "The Burning Ship"'],
    dimensionRange: { min: 1.8, max: 2.0 },
  },

  Newton: {
    title: 'Newton Fractal',
    mathematical:
      'Visualizes Newton-Raphson root-finding iterations z_{n+1} = z_n - f(z_n)/f\'(z_n) for a polynomial. Colors indicate which root each starting point converges to. Boundaries between basins are fractals.',
    historicalContext:
      'Classical Newton-Raphson method (1665) applied to complex numbers. The fractal boundary (Newton basin boundary) discovered when computing in the complex plane.',
    keyResearchers: ['Isaac Newton', 'Joseph Raphson'],
    naturalExamples: ['Boundary patterns in potential fields', 'Attractors in dynamical systems'],
    researchApplications: [
      'Numerical root-finding analysis',
      'Basin of attraction studies',
      'Chaos theory and bifurcation',
      'Critical point theory',
    ],
    interestingCoordinates: [
      {
        name: 'p=3 Overview',
        description: 'Finding roots of z³ - 1 = 0; three primary basins meet at boundaries',
        xMin: -2,
        xMax: 2,
        yMin: -2,
        yMax: 2,
      },
    ],
    keyPapers: ['Devaney, R. (1992). "A First Course in Chaotic Dynamical Systems"'],
    dimensionRange: { min: 1.5, max: 2.0 },
  },

  'Barnsley Fern': {
    title: 'Barnsley Fern (IFS)',
    mathematical:
      'Iterated Function System: four affine transformations applied probabilistically (with weighted probabilities) to generate a point cloud. Demonstrates the Chaos Game algorithm.',
    historicalContext:
      'Discovered by Michael Barnsley in 1988. Striking for perfectly replicating the appearance of an actual black spleenwort fern, showing that natural structures can emerge from simple iterative rules.',
    keyResearchers: ['Michael Barnsley', 'Stephen Demko', 'Benoit Mandelbrot'],
    naturalExamples: ['Black spleenwort fern (Asplenium adiantum-nigrum)', 'Plant leaf branching'],
    researchApplications: [
      'IFS theory and attractors',
      'Probabilistic rendering',
      'Image compression (Barnsley\'s compression)',
      'Modeling natural branching structures',
      'L-systems in biology',
    ],
    interestingCoordinates: [
      {
        name: 'Full Fern',
        description: 'Complete view of the fern attractor showing self-similar fronds',
        xMin: -2.8,
        xMax: 2.8,
        yMin: 0,
        yMax: 10,
      },
    ],
    keyPapers: [
      'Barnsley, M. (1988). "Fractals Everywhere"',
      'Barnsley, M. (1992). "Fractal Image Compression"',
    ],
    dimensionRange: { min: 1.5, max: 1.8 },
  },

  'Sierpinski Triangle': {
    title: 'Sierpinski Triangle (Chaos Game)',
    mathematical:
      'Generated via Chaos Game: start with random point, repeatedly move halfway toward a randomly chosen corner. Despite random process, deterministically generates the Sierpinski triangle attractor.',
    historicalContext:
      'Described by Wacław Sierpiński in 1915. Demonstrates that complexity can emerge from simple random processes—a key insight in chaos theory.',
    keyResearchers: ['Wacław Sierpiński', 'Michael Barnsley', 'Heinz-Otto Peitgen'],
    naturalExamples: [
      'Pascal\'s triangle (modulo 2)',
      'Cellular automata (Rule 90)',
      'Coastal erosion patterns',
    ],
    researchApplications: [
      'Chaos game algorithm',
      'Attractor theory',
      'Cellular automata',
      'Sierpinski carpet variants (2D/3D)',
      'Space-filling curve analysis',
    ],
    interestingCoordinates: [
      {
        name: 'Main Triangle',
        description: 'Full view showing three identical subtriangles. Exact self-similarity at all scales.',
        xMin: -0.05,
        xMax: 1.05,
        yMin: -0.05,
        yMax: 1.1,
      },
    ],
    keyPapers: [
      'Sierpiński, W. (1915). "Sur une courbe dont tout point est un point de ramification"',
      'Barnsley, M., & Rising, H. (1993). "Fractals Everywhere"',
    ],
    dimensionRange: { min: 1.58, max: 1.59 },
  },
}

/**
 * Get comprehensive research guide for a fractal type.
 * Useful for educational panels and learning materials.
 */
export const getResearchGuide = (type: FractalType): ResearchGuide => {
  return RESEARCH_GUIDES[type]
}

/**
 * Generate a markdown summary of research findings for export.
 */
export const generateResearchReport = (
  type: FractalType,
  viewport: { xMin: number; xMax: number; yMin: number; yMax: number },
  dimension: number,
  lacunarity: number,
  selfSimilarity: number,
): string => {
  const guide = getResearchGuide(type)
  return `# Fractal Research Report: ${guide.title}

## Viewport Information
- **Center X**: ${((viewport.xMin + viewport.xMax) / 2).toExponential(6)}
- **Center Y**: ${((viewport.yMin + viewport.yMax) / 2).toExponential(6)}
- **Width**: ${(viewport.xMax - viewport.xMin).toExponential(6)}
- **Span**: ${Math.pow(10, Math.log10((viewport.xMax - viewport.xMin) * 100)).toFixed(1)}x magnification

## Fractal Characteristics
- **Estimated Dimension**: ${dimension.toFixed(3)} (range: ${guide.dimensionRange.min.toFixed(2)}-${guide.dimensionRange.max.toFixed(2)})
- **Lacunarity**: ${lacunarity.toFixed(3)} (gap distribution measure)
- **Self-Similarity Score**: ${(selfSimilarity * 100).toFixed(1)}%

## Mathematical Definition
${guide.mathematical}

## Historical Context
${guide.historicalContext}

## Key Researchers
${guide.keyResearchers.map((r) => `- ${r}`).join('\n')}

## Research Applications
${guide.researchApplications.map((a) => `- ${a}`).join('\n')}

## References
${guide.keyPapers.map((p) => `- ${p}`).join('\n')}
`
}
