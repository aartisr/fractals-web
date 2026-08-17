import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const failures = []
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}
const read = (path) => readFile(resolve(root, path), 'utf8')

const [manifestText, document, worker, manager, vercel] = await Promise.all([
  read('public/manifest.webmanifest'),
  read('index.html'),
  read('public/sw.js'),
  read('src/core/PwaManager.tsx'),
  read('vercel.json'),
])
const topbar = await read('src/core/Topbar.tsx')

let manifest
try {
  manifest = JSON.parse(manifestText)
} catch {
  failures.push('manifest.webmanifest must contain valid JSON.')
}

if (manifest) {
  expect(typeof manifest.id === 'string' && manifest.id.startsWith('/'), 'The manifest needs a stable root-relative id.')
  expect(typeof manifest.name === 'string' && manifest.name.length > 0, 'The manifest needs an application name.')
  expect(typeof manifest.short_name === 'string' && manifest.short_name.length > 0, 'The manifest needs a short application name.')
  expect(manifest.start_url === '/', 'The manifest start_url should be root-relative.')
  expect(manifest.scope === '/', 'The manifest scope should cover the application.')
  expect(['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display), 'The manifest needs an app-like display mode.')
  expect(/^#[0-9a-f]{6}$/i.test(manifest.theme_color ?? ''), 'The manifest needs a six-digit theme color.')
  expect(/^#[0-9a-f]{6}$/i.test(manifest.background_color ?? ''), 'The manifest needs a six-digit background color.')

  for (const size of ['192x192', '512x512']) {
    const icon = manifest.icons?.find((candidate) => candidate.sizes === size && candidate.type === 'image/png')
    expect(Boolean(icon), `The manifest needs a ${size} PNG icon.`)
    if (icon) {
      try { await access(resolve(root, 'public', icon.src.replace(/^\//, ''))) } catch { failures.push(`The ${size} icon file is missing.`) }
    }
  }
}

expect(/rel="manifest" href="\/manifest\.webmanifest"/.test(document), 'The document must link the web manifest.')
expect(/apple-mobile-web-app-capable/.test(document), 'The document needs iOS standalone metadata.')
expect(/pwa-icon-192\.png/.test(topbar), 'The product header must use the PWA brand icon.')
expect(/navigator\.serviceWorker\.register\('\/sw\.js'/.test(manager), 'The app must register its service worker.')
expect(/beforeinstallprompt/.test(manager), 'The app must support Chromium’s install prompt.')
expect(/SKIP_WAITING/.test(manager) && /controllerchange/.test(manager), 'The app must provide a safe update path.')
expect(/addEventListener\('fetch'/.test(worker), 'The service worker must handle fetches.')
expect(/request\.mode === 'navigate'/.test(worker), 'The service worker must provide offline navigation fallback.')
expect(/\/models\//.test(worker), 'The service worker must cache local model assets on demand.')
expect(/Service-Worker-Allowed/.test(vercel) && /no-cache, no-store, must-revalidate/.test(vercel), 'The deployment config must prevent stale service workers.')

if (failures.length) {
  console.error(`PWA readiness checks failed:\n- ${failures.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log('PWA readiness checks passed.')
}
