import { Outlet, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { Topbar } from './Topbar'
import { Footer } from './Footer'
import { workbenchModules } from './plugins/modules'
import { trackWorkbenchEvent } from './services/workbenchSharing'

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const lastTrackedPath = useRef<string | null>(null)

  useEffect(() => {
    if (lastTrackedPath.current === pathname) {
      return
    }

    lastTrackedPath.current = pathname
    const activeModule = workbenchModules.find((module) => pathname === module.path || pathname.startsWith(`${module.path}/`))

    trackWorkbenchEvent('module_viewed', {
      path: pathname,
      module: activeModule?.id ?? (pathname === '/' ? 'home' : 'unknown'),
    })
  }, [pathname])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace-content">
        Skip to workbench content
      </a>
      <Topbar />
      <main id="workspace-content" className="workspace" tabIndex={-1}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
