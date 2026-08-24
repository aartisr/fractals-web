import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEducatorMode } from './hooks/useEducatorMode'
import { getWorkbenchModuleForPath, workbenchModules } from './plugins/modules'
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

export function Topbar() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [moreOpenForPath, setMoreOpenForPath] = useState<string | null>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const { educatorMode, setEducatorMode } = useEducatorMode()
  const byNavigationOrder = (left: typeof workbenchModules[number], right: typeof workbenchModules[number]) => left.navigationOrder - right.navigationOrder
  const primaryModules = workbenchModules.filter((module) => module.primaryNavigation).sort(byNavigationOrder)
  const moreModules = workbenchModules.filter((module) => !module.primaryNavigation).sort(byNavigationOrder)
  const moreOpen = moreOpenForPath === pathname

  const closeMore = useCallback((returnFocus = false) => {
    setMoreOpenForPath(null)
    if (returnFocus) requestAnimationFrame(() => moreButtonRef.current?.focus())
  }, [])

  useEffect(() => {
    if (!moreOpen) return

    const closeWhenLeaving = (target: EventTarget | null) => {
      if (target instanceof Node && !moreRef.current?.contains(target)) closeMore()
    }

    const onPointerDown = (event: PointerEvent) => closeWhenLeaving(event.target)
    const onFocusIn = (event: FocusEvent) => closeWhenLeaving(event.target)

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [moreOpen, closeMore])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const index = Number.parseInt(event.key, 10) - 1
      if (index >= 0 && index < workbenchModules.length) {
        navigate({ to: workbenchModules[index].path })
        setDrawerOpen(false)
        closeMore()
      }
      if (event.key === 'Escape') {
        setDrawerOpen(false)
        closeMore(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, closeMore])

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`)

  return (
    <header className="topbar" data-active-module={getWorkbenchModuleForPath(pathname)?.id ?? 'home'}>
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
              title={`${module.title} (${module.navigationOrder})`}
              onFocus={() => closeMore()}
              onPointerEnter={() => closeMore()}
              onClick={() => closeMore()}
            >
              {module.navLabel}
            </Link>
          ))}
          <div className="tb-more" ref={moreRef}>
            <button
              ref={moreButtonRef}
              type="button"
              className="tb-more-button"
              aria-expanded={moreOpen}
              aria-controls="tb-more-menu"
              onClick={() => setMoreOpenForPath(moreOpen ? null : pathname)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  closeMore(true)
                }
                if (event.key === 'ArrowDown' && !moreOpen) {
                  event.preventDefault()
                  setMoreOpenForPath(pathname)
                  requestAnimationFrame(() => {
                    moreRef.current?.querySelector<HTMLAnchorElement>('.tb-more-menu a')?.focus()
                  })
                }
              }}
            >
              More
            </button>
            <div id="tb-more-menu" className="tb-more-menu" hidden={!moreOpen}>
              {moreModules.map((module) => (
                <Link
                  key={module.id}
                  to={module.path}
                  className={isActive(module.path) ? 'is-active' : undefined}
                  onClick={() => closeMore()}
                >
                  <strong>{module.title}</strong>
                  <span>{module.tagline}</span>
                </Link>
              ))}
            </div>
          </div>
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
          onClick={() => {
            closeMore()
            setDrawerOpen((value) => !value)
          }}
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
                title={`${module.title} (${module.navigationOrder})`}
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
