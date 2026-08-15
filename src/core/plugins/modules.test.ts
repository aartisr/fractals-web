import assert from 'node:assert/strict'
import test from 'node:test'
import { getWorkbenchModuleForPath, workbenchModules } from './modules.ts'

test('module registry has unique plug-in identities and complete presentation metadata', () => {
  assert.equal(new Set(workbenchModules.map((module) => module.id)).size, workbenchModules.length)
  assert.equal(new Set(workbenchModules.map((module) => module.path)).size, workbenchModules.length)
  assert.equal(new Set(workbenchModules.map((module) => module.navigationOrder)).size, workbenchModules.length)

  for (const module of workbenchModules) {
    assert.match(module.path, /^\/workbench\//)
    assert.ok(module.navLabel)
    assert.ok(module.routeVisual.asset)
    assert.ok(module.routeVisual.alt)
  }
})

test('module lookup preserves nested page ownership for shell, navigation, and route art', () => {
  assert.equal(getWorkbenchModuleForPath('/workbench/fractals')?.id, 'fractals')
  assert.equal(getWorkbenchModuleForPath('/workbench/discover/challenge-1')?.id, 'discover')
  assert.equal(getWorkbenchModuleForPath('/workbench/runs/example-run')?.id, 'runs')
  assert.equal(getWorkbenchModuleForPath('/unknown'), undefined)
})
