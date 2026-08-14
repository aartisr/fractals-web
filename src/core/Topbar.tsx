import { useEffect, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEducatorMode } from './hooks/useEducatorMode'
import { workbenchModules } from './plugins/modules'
import { SiteShareButton } from './SiteShareButton'

function FractalMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className="tb-brand-icon-svg">
      <path d="M16 2 28.1 9v14L16 30 3.9 23V9L16 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m16 8 6 3.5v7L16 22l-6-3.5v-7L16 8Z" stroke="currentColor" strokeWidth="1.1" opacity=".55" />
      <circle cx="16" cy="16" r="2.35" fill="currentColor" />
    </svg>
  )
}

const primaryModuleIds = ['fractals', 'box-count', 'compare', 'discover']

export function Topbar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { educatorMode, setEducatorMode } = useEducatorMode()
  const primaryModules = workbenchModules.filter((module) => primaryModuleIds.includes(module.id))
  const moreModules = workbenchModules.filter((module) => !primaryModuleIds.includes(module.id))

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const index = Number.parseInt(event.key, 10) - 1
      if (index >= 0 && index < workbenchModules.length) {
        navigate({ to: workbenchModules[index].path })
        setDrawerOpen(false)
      }
      if (event.key === 'Escape') setDrawerOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`)

  return (
    <header className="topbar" data-active-module={workbenchModules.find((module) => isActive(module.path))?.id ?? 'home'}>
      <div className="tb-primary">
        <Link to="/" className="tb-brand" aria-label="Nexus Fractal Lab home">
          <FractalMark />
          <span className="tb-brand-text">
            <span className="tb-brand-name">Nexus</span>
            <span className="tb-brand-sub">Fractal Lab</span>
          </span>
        </Link>

        <nav className="tb-nav" aria-label="Primary navigation">
          {primaryModules.map((module) => (
            <Link
              key={module.id}
              to={module.path}
              className={`tb-tab${isActive(module.path) ? ' tb-tab--active' : ''}`}
              aria-current={isActive(module.path) ? 'page' : undefined}
            >
              {module.id === 'fractals' ? 'Create' : module.id === 'box-count' ? 'Measure' : module.id === 'compare' ? 'Compare' : 'Explore'}
            </Link>
          ))}
          <details className="tb-more">
            <summary>More</summary>
            <div className="tb-more-menu">
              {moreModules.map((module) => (
                <Link key={module.id} to={module.path} className={isActive(module.path) ? 'is-active' : undefined}>
                  <strong>{module.title}</strong>
                  <span>{module.tagline}</span>
                </Link>
              ))}
            </div>
          </details>
        </nav>

        <button
          type="button"
          className={`tb-classroom-toggle${educatorMode ? ' is-active' : ''}`}
          aria-pressed={educatorMode}
          aria-label={educatorMode ? 'Turn classroom mode off' : 'Turn classroom mode on'}
          onClick={() => setEducatorMode((value) => !value)}
        >
          Classroom
        </button>

        <SiteShareButton className="tb-site-share--top" />

        <button
          type="button"
          className={`tb-hamburger${drawerOpen ? ' tb-hamburger--open' : ''}`}
          onClick={() => setDrawerOpen((value) => !value)}
          aria-label={drawerOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={drawerOpen}
          aria-controls="tb-drawer"
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      {drawerOpen ? (
        <nav id="tb-drawer" className="tb-drawer" aria-label="All tools">
          {workbenchModules.map((module) => (
            <Link
              key={module.id}
              to={module.path}
              className={`tb-drawer-row${isActive(module.path) ? ' tb-drawer-row--active' : ''}`}
              onClick={() => setDrawerOpen(false)}
            >
              <span className="tb-drawer-name">{module.title}</span>
              <span className="tb-drawer-tagline">{module.tagline}</span>
            </Link>
          ))}
          <SiteShareButton className="tb-site-share--drawer" />
        </nav>
      ) : null}
    </header>
  )
}
