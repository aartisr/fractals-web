import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { workbenchModules } from './plugins/modules'

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <header className="brand">
          <p>Nexus Fractal Lab</p>
          <h1>Research Workbench</h1>
        </header>

        <nav className="module-nav" aria-label="Workbench modules">
          {workbenchModules.map((module) => {
            const active = pathname === module.path || pathname.startsWith(`${module.path}/`)
            return (
              <Link
                key={module.id}
                to={module.path}
                className="module-link"
                style={{
                  borderColor: active ? module.accent : 'transparent',
                  boxShadow: active ? `inset 0 0 0 1px ${module.accent}` : 'none',
                }}
              >
                <strong>{module.title}</strong>
                <span>{module.tagline}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <p>Highly modular, route-driven and responsive scientific workspace.</p>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
