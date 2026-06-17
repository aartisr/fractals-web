import { Link, useRouterState } from '@tanstack/react-router'
import { workbenchModules } from './plugins/modules'

// ─── Inline brand glyph (same geometric DNA as Topbar) ────────────────────────

function FooterGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="ft-glyph">
      <path
        d="M12 1.5L21.5 7V17L12 22.5L2.5 17V7L12 1.5Z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path
        d="M12 5.5V9M12 15V18.5M5.5 12H9M15 12H18.5"
        stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".4"
      />
    </svg>
  )
}

// ─── Module accent stripe ─────────────────────────────────────────────────────

function AccentStripe() {
  return (
    <div className="ft-accent-stripe" aria-hidden="true">
      {workbenchModules.map((mod) => (
        <span key={mod.id} className="ft-accent-band" data-module-id={mod.id} />
      ))}
    </div>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear()

export function Footer() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const activeModule = workbenchModules.find(
    (m) => pathname === m.path || pathname.startsWith(`${m.path}/`),
  )

  return (
    <footer
      className="site-footer"
      data-active-module={activeModule?.id ?? 'fractals'}
    >
      {/* Rainbow accent bar mirrors topbar's active-module tint */}
      <AccentStripe />

      <div className="ft-inner">
        {/* ── Left — brand block ── */}
        <div className="ft-brand-block">
          <Link to="/workbench/fractals" className="ft-brand-link" aria-label="Nexus Fractal Lab home">
            <FooterGlyph />
            <span className="ft-brand-name">Nexus Fractal Lab</span>
          </Link>
          <p className="ft-brand-desc">
            Compact, figure-first environment for exploratory analysis,
            reproducible runs, and educational interpretation of fractal geometry.
          </p>
          <div className="ft-status-row">
            <span className="tb-pulse" title="Backend status" aria-label="Backend connected" />
            <span className="ft-status-text">All systems operational</span>
          </div>
        </div>

        {/* ── Center — module quick-links ── */}
        <nav className="ft-nav-block" aria-label="Footer module navigation">
          <p className="ft-nav-heading">Modules</p>
          <ul className="ft-nav-list">
            {workbenchModules.map((mod, i) => {
              const active = pathname === mod.path || pathname.startsWith(`${mod.path}/`)
              return (
                <li key={mod.id}>
                  <Link
                    to={mod.path}
                    className={`ft-nav-link${active ? ' ft-nav-link--active' : ''}`}
                    data-module-id={mod.id}
                  >
                    <span className="ft-nav-dot" />
                    {mod.title}
                    <kbd className="ft-nav-kbd">{i + 1}</kbd>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* ── Right — meta / stack info ── */}
        <div className="ft-meta-block">
          <p className="ft-nav-heading">Stack</p>
          <ul className="ft-stack-list">
            <li>React 19 + TanStack Router</li>
            <li>Vite 8 · TypeScript 6</li>
            <li>WebGL fractal renderer</li>
            <li>TanStack Query + Table</li>
          </ul>
          <p className="ft-nav-heading ft-nav-heading--spaced">Keyboard</p>
          <ul className="ft-stack-list">
            <li><kbd className="ft-kbd">1</kbd>–<kbd className="ft-kbd">5</kbd> Jump to module</li>
            <li><kbd className="ft-kbd">Esc</kbd> Close menus</li>
          </ul>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="ft-bottom">
        <span className="ft-copy ft-copy-brand">
          <img src="/pcssii-logo.jpg" alt="PCSS II School" className="pcssii-logo-inline" />
          © {CURRENT_YEAR} Aarti S Ravikumar · PCSS II School · Work in Progress
        </span>
        <span className="ft-pipe" aria-hidden="true" />
        <span className="ft-copy ft-copy--muted">
          Built with curiosity and too much caffeine
        </span>
      </div>
    </footer>
  )
}
