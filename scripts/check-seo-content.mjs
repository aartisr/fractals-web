import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const sitemaps = [
  { path: 'public/sitemap.xml', output: 'dist', basePath: '' },
  { path: 'pages/sitemap.xml', output: 'pages', basePath: '/fractals-web' },
]
const failures = []
let checkedUrlCount = 0
const minimumStaticContentByPath = {
  '/workbench/fractals': 2_000,
}

for (const sitemapSource of sitemaps) {
  const sitemap = await readFile(resolve(root, sitemapSource.path), 'utf8')
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, value]) => new URL(value))

  for (const url of urls) {
    const path = url.pathname.replace(new RegExp(`^${sitemapSource.basePath}`), '') || '/'
    const outputPath = path === '/'
      ? resolve(root, sitemapSource.output, 'index.html')
      : resolve(root, sitemapSource.output, path.slice(1), 'index.html')
    const html = await readFile(outputPath, 'utf8')
    const headings = html.match(/<h1\b[^>]*>/gi) ?? []
    const content = sitemapSource.output === 'dist'
      ? html.match(/<div id="root">([\s\S]*?)<\/div>/i)?.[1] ?? ''
      : html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? ''
    const visibleText = content
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (headings.length !== 1) {
      failures.push(`${url.href} must contain exactly one static <h1>; found ${headings.length}.`)
    }
    const minimumStaticContent = minimumStaticContentByPath[path] ?? 300
    if (visibleText.length < minimumStaticContent) {
      failures.push(`${url.href} has only ${visibleText.length} characters of static content; at least ${minimumStaticContent} are required.`)
    }
    checkedUrlCount += 1
  }
}

if (failures.length) {
  console.error(`SEO content checks failed:\n- ${failures.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log(`SEO content checks passed for ${checkedUrlCount} sitemap URLs.`)
}