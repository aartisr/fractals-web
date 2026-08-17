import { Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, type CSSProperties } from 'react'
import { Topbar } from './Topbar'
import { Footer } from './Footer'
import { SeoManager } from './SeoManager'
import { ClarityTracker } from './ClarityTracker'
import { PostHogTracker } from './PostHogTracker'
import { PwaManager } from './PwaManager'
import { RouteVisual } from './RouteVisual'
import { ModuleWorkspaceHeader } from './ModuleWorkspaceHeader'
import { getWorkbenchModuleForPath } from './plugins/modules'
import { trackWorkbenchEvent } from './services/workbenchSharing'
import { trackProductEvent } from './services/productTelemetry'

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const activeModule = getWorkbenchModuleForPath(pathname)
  const lastTrackedPath = useRef<string | null>(null)

  useEffect(() => {
    if (lastTrackedPath.current === pathname) {
      return
    }

    lastTrackedPath.current = pathname
    trackWorkbenchEvent('module_viewed', {
      path: pathname,
      module: activeModule?.id ?? (pathname === '/' ? 'home' : 'unknown'),
    })
    trackProductEvent('page_view')
  }, [pathname, activeModule?.id])

  return (
    <div className="app-shell">
      <SeoManager />
      <ClarityTracker />
      <PostHogTracker />
      <PwaManager />
      <a className="skip-link" href="#workspace-content">
        Skip to workbench content
      </a>
      <Topbar />
      <main id="workspace-content"
        className="workspace"
        data-active-module={activeModule?.id ?? 'home'}
        style={{ '--module-accent': activeModule?.accent ?? '#0077b6' } as CSSProperties}
        tabIndex={-1}
      >
        <RouteVisual />
        {activeModule ? <ModuleWorkspaceHeader module={activeModule} /> : null}
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
