import { readFile } from 'node:fs/promises'

const path = process.argv[2]
if (!path) throw new Error('Usage: npm run benchmark:validate -- <manifest.json>')

const manifest = JSON.parse(await readFile(path, 'utf8'))
const roles = new Set(manifest.cohorts?.map((cohort) => cohort.role))
const required = ['studyId', 'dataStatus', 'primaryQuestion']
const missing = required.filter((key) => !manifest[key])

if (manifest.schemaVersion !== 1) missing.push('schemaVersion: 1')
if (!Array.isArray(manifest.cohorts) || manifest.cohorts.length < 2) missing.push('at least two cohorts')
if (!roles.has('development')) missing.push('a development cohort')
if (!roles.has('external-validation')) missing.push('an external-validation cohort')
if (manifest.dataStatus !== 'approved-deidentified' && manifest.dataStatus !== 'example-only') missing.push('a valid dataStatus')

if (missing.length) throw new Error(`Benchmark manifest is incomplete: ${missing.join(', ')}`)
console.log(`Benchmark manifest is structurally valid for study: ${manifest.studyId}`)
