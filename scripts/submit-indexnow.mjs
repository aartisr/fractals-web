import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const usage = `Usage: npm run submit:indexnow -- --key <key> --key-location <url> --sitemap <path> [--dry-run]

Options can also be set with INDEXNOW_KEY, INDEXNOW_KEY_LOCATION, INDEXNOW_SITEMAP,
and INDEXNOW_ENDPOINT. --dry-run prints the request body without submitting it.`

function readOptions(args) {
  const options = {}

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--help') {
      console.log(usage)
      process.exit(0)
    }
    if (argument === '--dry-run') {
      options.dryRun = true
      continue
    }

    const optionName = {
      '--key': 'key',
      '--key-location': 'keyLocation',
      '--sitemap': 'sitemapPath',
      '--endpoint': 'endpoint',
    }[argument]
    const value = args[index + 1]
    if (!optionName || !value) {
      throw new Error(`Unknown or incomplete option: ${argument}\n\n${usage}`)
    }

    options[optionName] = value
    index += 1
  }

  return options
}

const options = readOptions(process.argv.slice(2))
const key = options.key ?? process.env.INDEXNOW_KEY
const keyLocation = options.keyLocation ?? process.env.INDEXNOW_KEY_LOCATION
const sitemapPath = options.sitemapPath ?? process.env.INDEXNOW_SITEMAP
const endpoint = options.endpoint ?? process.env.INDEXNOW_ENDPOINT ?? 'https://api.indexnow.org/indexnow'

if (!key || !keyLocation || !sitemapPath) {
  throw new Error(`A key, key location, and sitemap are required.\n\n${usage}`)
}
if (!/^[a-z0-9]{8,128}$/i.test(key)) {
  throw new Error('The IndexNow key must contain 8 to 128 alphanumeric characters.')
}

const sitemap = await readFile(resolve(process.cwd(), sitemapPath), 'utf8')
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url)

if (urlList.length === 0) {
  throw new Error(`No URLs found in ${sitemapPath}.`)
}

const keyUrl = new URL(keyLocation)
const host = keyUrl.host
if (urlList.some((url) => new URL(url).host !== host)) {
  throw new Error('Every sitemap URL must use the same host as INDEXNOW_KEY_LOCATION.')
}

const request = { host, key, keyLocation, urlList }
if (options.dryRun || process.env.INDEXNOW_DRY_RUN === 'true') {
  console.log(JSON.stringify(request, null, 2))
  process.exit(0)
}

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(request),
})

if (![200, 202].includes(response.status)) {
  throw new Error(`IndexNow submission failed with HTTP ${response.status}: ${await response.text()}`)
}

console.log(`IndexNow accepted ${urlList.length} URL${urlList.length === 1 ? '' : 's'} (HTTP ${response.status}).`)