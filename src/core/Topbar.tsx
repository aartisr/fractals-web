import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEducatorMode } from './hooks/useEducatorMode'
import { workbenchModules } from './plugins/modules'

// ─── Module Icons ─────────────────────────────────────────────────────────────

function IconFractals() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2C10 2 15 5.5 15 10C15 14.5 10 18 10 18C10 18 5 14.5 5 10C5 5.5 10 2 10 2Z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
      />
      <path
        d="M2 10C4.5 8.5 7.5 9.5 10 10C12.5 10.5 15.5 11.5 18 10"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
      />
      <circle cx="10" cy="10" r="1.8" fill="currentColor" />
    </svg>
  )
}

function IconDiscover() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2.4 12.2 7.8 17.6 10 12.2 12.2 10 17.6 7.8 12.2 2.4 10 7.8 7.8 10 2.4Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M10 5.3 11.3 8.7 14.7 10 11.3 11.3 10 14.7 8.7 11.3 5.3 10 8.7 8.7 10 5.3Z"
        fill="currentColor"
        fillOpacity=".16"
      />
      <circle cx="10" cy="10" r="1.1" fill="currentColor" />
    </svg>
  )
}

function IconBoxCount() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="11" y="2" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2" y="11" width="7" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect
        x="11" y="11" width="7" height="7" rx="1.2"
        fill="currentColor" fillOpacity=".22"
        stroke="currentColor" strokeWidth="1.4"
      />
    </svg>
  )
}

function IconCompare() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="6.5" height="14" rx="1.4" stroke="currentColor" strokeWidth="1.4" />
      <rect
        x="11.5" y="3" width="6.5" height="14" rx="1.4"
        stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.8 1.6"
      />
      <path
        d="M9.75 10H10.25"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      />
    </svg>
  )
}

function IconTumor() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="10" cy="10" r="2.8" fill="currentColor" fillOpacity=".28" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 3.5V5.5M10 14.5V16.5M3.5 10H5.5M14.5 10H16.5"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
      />
    </svg>
  )
}

function IconRuns() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 6.5V10.5L12.8 12"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Brand Icon ───────────────────────────────────────────────────────────────

function FractalHexIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className="tb-brand-icon-svg">
      {/* Outer hexagon */}
      <path
        d="M16 2L28.1 9V23L16 30L3.9 23V9L16 2Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
      />
      {/* Inner hexagon */}
      <path
        d="M16 8L22 11.5V18.5L16 22L10 18.5V11.5L16 8Z"
        stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" opacity=".55"
      />
      {/* Innermost dot */}
      <circle cx="16" cy="16" r="2.4" fill="currentColor" />
      {/* Connecting lines to vertices */}
      <path
        d="M16 8V2M22 11.5L28.1 9M22 18.5L28.1 23M16 22V30M10 18.5L3.9 23M10 11.5L3.9 9"
        stroke="currentColor" strokeWidth="0.7" opacity=".28"
      />
    </svg>
  )
}

// ─── Icon map ─────────────────────────────────────────────────────────────────

const MODULE_ICONS: Record<string, React.ReactNode> = {
  fractals: <IconFractals />,
  discover: <IconDiscover />,
  'box-count': <IconBoxCount />,
  compare: <IconCompare />,
  'tumor-detection': <IconTumor />,
  runs: <IconRuns />,
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

export function Topbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const [drawerOpenAtPath, setDrawerOpenAtPath] = useState<string | null>(null)
  const [tooltipId, setTooltipId] = useState<string | null>(null)
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { educatorMode, setEducatorMode } = useEducatorMode()
  const mobileOpen = drawerOpenAtPath === pathname

  const activeModule = workbenchModules.find(
    (m) => pathname === m.path || pathname.startsWith(`${m.path}/`),
  )
  const activeModuleTitle = activeModule?.title ?? 'Home'
  const activeModuleTagline =
    activeModule?.tagline ??
    'Choose a path, launch a module, and keep the workbench calm, legible, and fast.'

  // ── Keyboard shortcuts 1–9 ─────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const idx = parseInt(e.key, 10) - 1
      if (idx >= 0 && idx < workbenchModules.length) {
        navigate({ to: workbenchModules[idx].path })
        setDrawerOpenAtPath(null)
      }
      if (e.key === 'Escape') setDrawerOpenAtPath(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  // ── Tooltip helpers ────────────────────────────────────────────────────────
  function showTooltip(id: string) {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
    tooltipTimeout.current = setTimeout(() => setTooltipId(id), 320)
  }
  function hideTooltip() {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current)
    setTooltipId(null)
  }

  return (
    <>
      <header className="topbar" data-active-module={activeModule?.id ?? 'fractals'}>
        <div className="tb-primary">
          <Link to="/" className="tb-brand" aria-label="Nexus Fractal Lab — home">
            <FractalHexIcon />
            <div className="tb-brand-text">
              <span className="tb-brand-name">Nexus Fractal Lab</span>
              <span className="tb-brand-sub">Visual Research Workbench</span>
            </div>
          </Link>

          <div className="tb-context" aria-label="Current workspace context">
            <span className="tb-context-kicker">Live workbench</span>
            <strong className="tb-context-title">{activeModuleTitle}</strong>
            <span
              className="tb-context-subtitle"
              title={activeModuleTagline}
              aria-label={activeModuleTagline}
            >
              {activeModuleTagline}
            </span>
          </div>

          <div className="tb-meta">
            <span className="tb-pulse" title="Backend status" aria-label="Backend connected" />
            <button
              type="button"
              className={`tb-classroom-toggle${educatorMode ? ' is-active' : ''}`}
              aria-pressed={educatorMode}
              aria-label={educatorMode ? 'Turn classroom mode off' : 'Turn classroom mode on'}
              onClick={() => setEducatorMode((value) => !value)}
            >
              {educatorMode ? 'Classroom mode on' : 'Classroom mode off'}
            </button>
          </div>
        </div>

        <div className="tb-secondary">
          <div className="tb-nav-shell">
            <nav className="tb-nav" aria-label="Workbench modules">
              {workbenchModules.map((mod, i) => {
                const active = pathname === mod.path || pathname.startsWith(`${mod.path}/`)
                return (
                  <div key={mod.id} className="tb-tab-wrap">
                    <Link
                      to={mod.path}
                      className={`tb-tab${active ? ' tb-tab--active' : ''}`}
                      data-module-id={mod.id}
                      aria-current={active ? 'page' : undefined}
                      onMouseEnter={() => showTooltip(mod.id)}
                      onMouseLeave={hideTooltip}
                      onFocus={() => showTooltip(mod.id)}
                      onBlur={hideTooltip}
                    >
                      <span className="tb-tab-icon">{MODULE_ICONS[mod.id]}</span>
                      <span className="tb-tab-label">{mod.title}</span>
                      <kbd className="tb-tab-kbd" aria-label={`Keyboard shortcut: ${i + 1}`}>
                        {i + 1}
                      </kbd>
                    </Link>

                    {tooltipId === mod.id ? (
                      <div className="tb-tooltip" role="tooltip" data-module-id={mod.id}>
                        <span className="tb-tooltip-dot" />
                        <span>{mod.tagline}</span>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </nav>
          </div>

          <div className="tb-surface-note">
            <span className="tb-surface-note-label">Keyboard-first</span>
            <span className="tb-surface-note-text">Press 1-{workbenchModules.length} to jump modules, Esc to close menus.</span>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className={`tb-hamburger${mobileOpen ? ' tb-hamburger--open' : ''}`}
          onClick={() => setDrawerOpenAtPath(mobileOpen ? null : pathname)}
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          aria-controls="tb-drawer"
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </header>

      {/* ── Mobile Drawer ────────────────────────────────────────────────────── */}
      {mobileOpen && (
        <nav
          id="tb-drawer"
          className="tb-drawer"
          aria-label="Mobile navigation"
        >
          {workbenchModules.map((mod, i) => {
            const active = pathname === mod.path || pathname.startsWith(`${mod.path}/`)
            return (
              <Link
                key={mod.id}
                to={mod.path}
                className={`tb-drawer-row${active ? ' tb-drawer-row--active' : ''}`}
                data-module-id={mod.id}
                onClick={() => setDrawerOpenAtPath(null)}
              >
                <span className="tb-drawer-icon">
                  {MODULE_ICONS[mod.id]}
                </span>
                <div className="tb-drawer-info">
                  <span className="tb-drawer-name">{mod.title}</span>
                  <span className="tb-drawer-tagline">{mod.tagline}</span>
                </div>
                <kbd className="tb-drawer-kbd">{i + 1}</kbd>
              </Link>
            )
          })}
          <div className="tb-drawer-footer">
            <span className="tb-pulse" />
            <span className="tb-meta-text">
              <img src="/pcssii-logo.jpg" alt="Pioneer Charter School of Science II" className="pcssii-logo-inline" />
              <a href="https://ai-aarti.com" target="_blank" rel="noreferrer">Aarti S Ravikumar</a>
              <span aria-hidden="true"> · </span>
              <a href="https://saugus.pioneercss.org" target="_blank" rel="noreferrer">Pioneer Charter School of Science II</a>
              <span aria-hidden="true"> · Work in Progress</span>
            </span>
          </div>
        </nav>
      )}
    </>
  )
}
