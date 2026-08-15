import { readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

const assetsDirectory = resolve(process.cwd(), 'dist/assets')
const entries = await readdir(assetsDirectory)
const javascript = entries.filter((entry) => entry.endsWith('.js'))
const maximumBytes = 1_500_000
const failures = []

for (const entry of javascript) {
  const size = (await stat(resolve(assetsDirectory, entry))).size
  if (size > maximumBytes) failures.push(`${entry} is ${(size / 1_000_000).toFixed(2)} MB; the per-chunk budget is 1.5 MB.`)
}

if (failures.length) {
  console.error(`Bundle budget failed:\n- ${failures.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log(`Bundle budget passed for ${javascript.length} JavaScript chunks.`)
}
