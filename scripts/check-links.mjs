import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (path) => readFile(resolve(root, path), 'utf8')
const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

const [readme, guide, wikiFooter, robots, sitemap] = await Promise.all([
  read('README.md'),
  read('pages/index.html'),
  read('wiki/_Footer.md'),
  read('public/robots.txt'),
  read('public/sitemap.xml'),
])

const canonical = 'https://fractals.ai-aarti.com/'
for (const [name, content] of Object.entries({ 'README.md': readme, 'Pages guide': guide, 'Wiki footer': wikiFooter, 'robots.txt': robots, 'sitemap.xml': sitemap })) {
  expect(!/ai-aaarti\.com|aaarti\.com/i.test(content), `${name} contains the misspelled ai-aaarti.com domain.`)
}

expect(guide.includes(canonical), 'The GitHub Pages guide must link to the canonical product URL.')
expect(wikiFooter.includes(canonical), 'The Wiki footer must link to the canonical product URL.')
expect(robots.includes(canonical), 'robots.txt must point crawlers to the canonical sitemap host.')
expect(sitemap.includes(canonical), 'sitemap.xml must contain canonical product URLs.')

for (const path of ['public/models/tumor_detector_axial.onnx', 'public/models/tumor_detector_coronal.onnx', 'public/models/tumor_detector_sagittal.onnx']) {
  const file = await stat(resolve(root, path))
  expect(file.size > 1_000_000, `${path} is unexpectedly small; do not publish a truncated inference model.`)
}

if (failures.length) {
  console.error(`Link and publication checks failed:\n- ${failures.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log('Link and publication checks passed.')
}
