import { Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { Topbar } from './Topbar'
import { Footer } from './Footer'
import { SeoManager } from './SeoManager'
import { ClarityTracker } from './ClarityTracker'
import { PostHogTracker } from './PostHogTracker'
import { RouteVisual } from './RouteVisual'
import { getWorkbenchModuleForPath } from './plugins/modules'
import { trackWorkbenchEvent } from './services/workbenchSharing'
import { trackProductEvent } from './services/productTelemetry'

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const lastTrackedPath = useRef<string | null>(null)

  useEffect(() => {
    if (lastTrackedPath.current === pathname) {
      return
    }

    lastTrackedPath.current = pathname
    const activeModule = getWorkbenchModuleForPath(pathname)

    trackWorkbenchEvent('module_viewed', {
      path: pathname,
      module: activeModule?.id ?? (pathname === '/' ? 'home' : 'unknown'),
    })
    trackProductEvent('page_view')
  }, [pathname])

  return (
    <div className="app-shell">
      <SeoManager />
      <ClarityTracker />
      <PostHogTracker />
      <a className="skip-link" href="#workspace-content">
        Skip to workbench content
      </a>
      <Topbar />
      <main id="workspace-content" className="workspace" tabIndex={-1}>
        <RouteVisual />
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
