import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const siteUrl = (
  process.env.VITE_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  (process.env.URL ?? 'https://fractals.ai-aarti.com')
).replace(/\/+$/, '')

const publicPages = [
  {
    path: '/',
    summary: 'Start a visual science exploration with fractals, image complexity measurement, evidence comparison, and reproducible context.',
  },
  {
    path: '/workbench/fractals',
    summary: 'Explore interactive Mandelbrot, Julia, Burning Ship, Newton, Barnsley Fern, and Sierpinski fractals.',
  },
  {
    path: '/workbench/discover',
    summary: 'Browse curated learning challenges and shared visual-science examples.',
  },
  {
    path: '/workbench/discover/fractals-self-similarity',
    summary: 'Find and explain repeated structure across scale in a guided fractal challenge.',
  },
  {
    path: '/workbench/discover/compare-evidence-story',
    summary: 'Build a clear, evidence-led comparison between two visual artifacts.',
  },
  {
    path: '/workbench/discover/box-count-methods',
    summary: 'Practice a reproducible ROI-based box-counting workflow and export a method record.',
  },
  {
    path: '/workbench/discover/tumor-safety-audit',
    summary: 'Practice cautious, non-diagnostic interpretation of an AI image overlay.',
  },
  {
    path: '/workbench/box-count',
    summary: 'Estimate image-region fractal dimension with visible box counts and fit-quality checks.',
  },
  {
    path: '/workbench/compare',
    summary: 'Compare matched images with consistent settings and a careful evidence summary.',
  },
  {
    path: '/workbench/tumor-detection',
    summary: 'Explore a clearly scoped educational prototype for AI localization and complementary fractal-morphology research.',
  },
]

const routes = publicPages.map(({ path }) => path)

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  routes.map((route) => `  <url><loc>${siteUrl}${route === '/' ? '' : route}</loc></url>`).join('\n') +
  '\n</urlset>\n'

const robots = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`

const llms = `# Fractals Web\n\n` +
  `Fractals Web is an open visual science workbench by Aarti S Ravikumar.\n\n` +
  `## Purpose\n` +
  `A modular visual science workbench for students, educators, and researchers to explore fractals, measure image complexity, compare visual evidence, and preserve reproducible research context.\n\n` +
  `## Important scope\n` +
  `The tumor-complexity workflow is an educational research prototype. It is not a diagnostic, prognostic, treatment, or clinically validated tool. It presents AI localization and fractal-morphology measurements as a testable research hypothesis that requires external validation.\n\n` +
  `## Key Pages\n` +
  publicPages.map(({ path, summary }) => `- [${siteUrl}${path === '/' ? '' : path}](${siteUrl}${path === '/' ? '' : path}): ${summary}`).join('\n') +
  '\n\n## Summary\n' +
  `Use this site to explore fractals, compare image evidence, document reproducible analysis, and share results. Cite the source page, method, parameters, and limitations when discussing outputs.\n`

const aiContext = JSON.stringify({
  name: 'Fractals Web',
  canonicalUrl: siteUrl,
  description: 'Open visual science workbench for fractals, box counting, image comparison, and reproducible research exploration.',
  audiences: ['students', 'educators', 'researchers'],
  capabilities: [
    'Interactive fractal generation',
    'ROI-based box-counting dimension estimates',
    'Image comparison with fit-quality checks',
    'Run provenance and research exports',
    'Cautious AI-plus-morphology research demonstration',
  ],
  biomedicalScope: {
    status: 'educational research prototype',
    allowedClaim: 'Fractal morphology is a candidate complementary imaging feature to study alongside AI localization.',
    disallowedClaims: ['diagnosis', 'prognosis', 'treatment recommendation', 'clinical validation'],
    validationPlan: 'See the repository documentation for the tumor-complexity validation protocol.',
  },
  keyPages: publicPages.map(({ path, summary }) => ({
    url: `${siteUrl}${path === '/' ? '' : path}`,
    summary,
  })),
}, null, 2) + '\n'

const humans = `/* TEAM */\nCreator: Aarti S Ravikumar\nProject: Fractals Web\nSchool: Pioneer Charter School of Science II\n\n/* TECHNOLOGY */\nReact, TypeScript, Vite, TanStack, ONNX Runtime Web\n\n/* RESEARCH STATUS */\nEducational and exploratory research prototype; not a clinical decision-support system.\n`

const publicDir = resolve(process.cwd(), 'public')

await mkdir(publicDir, { recursive: true })
await Promise.all([
  writeFile(resolve(publicDir, 'sitemap.xml'), sitemap, 'utf8'),
  writeFile(resolve(publicDir, 'robots.txt'), robots, 'utf8'),
  writeFile(resolve(publicDir, 'llms.txt'), llms, 'utf8'),
  writeFile(resolve(publicDir, 'ai-context.json'), aiContext, 'utf8'),
  writeFile(resolve(publicDir, 'humans.txt'), humans, 'utf8'),
])

console.log(`SEO files generated for ${siteUrl}`)
