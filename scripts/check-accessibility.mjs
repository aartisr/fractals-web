import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const files = [
  'index.html',
  'pages/index.html',
  'src/core/AppShell.tsx',
  'src/core/Topbar.tsx',
  'src/core/Footer.tsx',
  'src/modules/home/HomePage.tsx',
]
const contents = await Promise.all(files.map(async (path) => [path, await readFile(resolve(root, path), 'utf8')]))
const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

const source = Object.fromEntries(contents)
expect(/<html lang="en">/.test(source['index.html']), 'The app document needs a declared language.')
expect(/name="viewport"/.test(source['index.html']), 'The app document needs a responsive viewport declaration.')
expect(/className="skip-link"/.test(source['src/core/AppShell.tsx']), 'The application needs a keyboard skip link.')
expect(/<main id="workspace-content"/.test(source['src/core/AppShell.tsx']), 'The application needs a single skip-link target main landmark.')
expect(/aria-label="Primary navigation"/.test(source['src/core/Topbar.tsx']), 'Primary navigation needs an accessible name.')
expect(/<footer className="site-footer"/.test(source['src/core/Footer.tsx']), 'The application needs a footer landmark.')
expect(/prefers-reduced-motion/.test(await readFile(resolve(root, 'src/index.css'), 'utf8')), 'Reduced-motion preferences must be respected.')

for (const [path, content] of contents) {
  const imageTags = content.match(/<img\b[\s\S]*?\/>/g) ?? []
  for (const tag of imageTags) expect(/\balt=/.test(tag), `${path} contains an image without alternative text.`)
}

if (failures.length) {
  console.error(`Accessibility contract checks failed:\n- ${failures.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log('Accessibility contract checks passed.')
}
