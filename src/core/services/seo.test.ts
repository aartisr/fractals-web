import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSeoForPath } from './seo.ts'

test('gives every public workbench route an intent-specific description', () => {
  const routes = [
    '/',
    '/workbench/fractals',
    '/workbench/discover',
    '/workbench/discover/fractals-self-similarity',
    '/workbench/discover/compare-evidence-story',
    '/workbench/discover/box-count-methods',
    '/workbench/discover/tumor-safety-audit',
    '/workbench/box-count',
    '/workbench/compare',
    '/workbench/tumor-detection',
  ]
  const pages = routes.map(buildSeoForPath)

  assert.equal(new Set(pages.map((page) => page.description)).size, pages.length)
  assert.ok(pages.every((page) => page.description.length >= 150 && page.description.length <= 160))
  assert.ok(pages.every((page) => !page.noindex))
})

test('keeps local, missing, and unrecognized pages out of search indexes', () => {
  assert.equal(buildSeoForPath('/workbench/runs').noindex, true)
  assert.equal(buildSeoForPath('/workbench/runs/example-run').noindex, true)
  assert.equal(buildSeoForPath('/workbench/discover/not-a-challenge').noindex, true)
  assert.equal(buildSeoForPath('/not-a-route').noindex, true)
})
