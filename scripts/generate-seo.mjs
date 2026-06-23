import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const siteUrl = (
  process.env.VITE_SITE_URL ||
  process.env.SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  (process.env.URL ?? 'http://localhost:5173')
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
  `Fractals Web is the web version of the original fractals project by Aarti S Ravikumar.\n\n` +
  `## Purpose\n` +
  `A modular visual science workbench for students, educators, and researchers.\n\n` +
  `## Key Pages\n` +
  routes.map((route) => `- ${siteUrl}${route === '/' ? '' : route}`).join('\n') +
  '\n\n## Summary\n' +
  `Use this site to explore fractals, compare image evidence, document reproducible analysis, and share results.\n`

const publicDir = resolve(process.cwd(), 'public')

await mkdir(publicDir, { recursive: true })
await Promise.all([
  writeFile(resolve(publicDir, 'sitemap.xml'), sitemap, 'utf8'),
  writeFile(resolve(publicDir, 'robots.txt'), robots, 'utf8'),
  writeFile(resolve(publicDir, 'llms.txt'), llms, 'utf8'),
])

console.log(`SEO files generated for ${siteUrl}`)
