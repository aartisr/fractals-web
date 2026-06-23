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
  const currentYear = CURRENT_YEAR

  const audienceLinks = [
    { label: 'Students', to: '/workbench/fractals', note: 'Explore visually' },
    { label: 'Educators', to: '/workbench/discover', note: 'Teach with structure' },
    { label: 'Researchers', to: '/workbench/runs', note: 'Track and compare' },
  ]

  const referenceLinks = [
    { label: 'Original project', href: 'https://github.com/aartisr/fractals' },
    { label: 'Project wiki', href: 'https://github.com/aartisr/fractals/wiki' },
    { label: 'Author site', href: 'https://ai-aarti.com' },
    { label: 'School site', href: 'https://saugus.pioneercss.org' },
  ]

  return (
    <footer
      className="site-footer"
      data-active-module={activeModule?.id ?? 'fractals'}
    >
      {/* Rainbow accent bar mirrors topbar's active-module tint */}
      <AccentStripe />

      <div className="ft-inner">
        <div className="ft-brand-block">
          <Link to="/" className="ft-brand-link" aria-label="Nexus Fractal Lab home">
            <FooterGlyph />
            <span className="ft-brand-name">Nexus Fractal Lab</span>
          </Link>
          <p className="ft-brand-desc">
            A compact web version of the original fractal project for students, educators, and researchers.
          </p>
          <div className="ft-status-row">
            <span className="tb-pulse" title="Backend status" aria-label="Backend connected" />
            <span className="ft-status-text">All systems operational</span>
          </div>
        </div>

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

        <div className="ft-meta-block">
          <p className="ft-nav-heading">Audiences</p>
          <ul className="ft-stack-list ft-stack-list--compact">
            {audienceLinks.map((link) => (
              <li key={link.label}>
                <Link to={link.to} className="ft-audience-link">
                  <strong>{link.label}</strong>
                  <span>{link.note}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="ft-meta-block">
          <p className="ft-nav-heading ft-nav-heading--spaced">Reference</p>
          <ul className="ft-stack-list">
            {referenceLinks.map((link) => (
              <li key={link.label}>
                <a href={link.href} target="_blank" rel="noreferrer" className="ft-reference-link">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="ft-bottom">
        <span className="ft-copy ft-copy-brand">
          <img src="/pcssii-logo.jpg" alt="Pioneer Charter School of Science II" className="pcssii-logo-inline" />
          © {currentYear}{' '}
          <a href="https://ai-aarti.com" target="_blank" rel="noreferrer">Aarti S Ravikumar</a>
          <span aria-hidden="true"> · </span>
          <a href="https://saugus.pioneercss.org" target="_blank" rel="noreferrer">
            Pioneer Charter School of Science II
          </a>
        </span>
        <span className="ft-pipe" aria-hidden="true" />
        <span className="ft-copy ft-copy--muted">Fast exploration, classroom clarity, reproducible research</span>
      </div>
    </footer>
  )
}
