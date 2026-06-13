import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { workbenchModules } from './plugins/modules'

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <div className="app-shell">
      <header className="research-topbar">
        <div className="brand">
          <p>Nexus Fractal Lab</p>
          <h1>Visual Research Workbench</h1>
        </div>

        <p className="lab-strap">
          Compact, figure-first environment for exploratory analysis, reproducible runs, and educational interpretation.
        </p>

        <nav className="module-ribbon" aria-label="Workbench modules">
          {workbenchModules.map((module) => {
            const active = pathname === module.path || pathname.startsWith(`${module.path}/`)
            return (
              <Link
                key={module.id}
                to={module.path}
                className="module-link"
                style={{
                  borderColor: active ? module.accent : 'transparent',
                  boxShadow: active ? `inset 0 0 0 1px ${module.accent}, 0 8px 20px rgba(6, 26, 41, 0.18)` : 'none',
                }}
              >
                <strong>{module.title}</strong>
                <span>{module.tagline}</span>
              </Link>
            )
          })}
        </nav>
      </header>

      <main className="workspace">
        <Outlet />
      </main>
    </div>
  )
}
