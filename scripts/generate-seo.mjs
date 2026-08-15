import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const siteUrl = (
  process.env.VITE_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  (process.env.URL ?? 'https://fractals.ai-aarti.com')
).replace(/\/+$/, '')

const routes = [
  '/',
  '/workbench/fractals',
  '/workbench/discover',
  '/workbench/box-count',
  '/workbench/compare',
  '/workbench/tumor-detection',
  '/workbench/runs',
]

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
  routes.map((route) => `- ${siteUrl}${route === '/' ? '' : route}`).join('\n') +
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
  keyPages: routes.map((route) => `${siteUrl}${route === '/' ? '' : route}`),
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
