import { Link } from '@tanstack/react-router'
import { AnalyticsPreference } from './AnalyticsPreference'

const CURRENT_YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="ft-inner">
        <div className="ft-brand-block">
          <Link to="/" className="ft-brand-link">
            <span className="ft-brand-name">Fractals Web</span>
          </Link>
          <p className="ft-brand-desc">A calm place to create, measure, and discuss visual complexity.</p>
          <p className="ft-safety-note">Educational exploration only. Medical-image outputs are not clinical advice.</p>
          <Link to="/workbench/fractals" className="ft-primary-link">
            Open Fractal Lab <span aria-hidden="true">→</span>
          </Link>
        </div>

        <nav className="ft-nav-block" aria-label="Explore Fractals Web">
          <p className="ft-nav-heading">Explore</p>
          <Link to="/workbench/fractals">Create a fractal</Link>
          <Link to="/workbench/box-count">Measure an image</Link>
          <Link to="/workbench/compare">Compare images</Link>
          <Link to="/workbench/discover">Browse examples</Link>
        </nav>

        <nav className="ft-nav-block" aria-label="Project information">
          <p className="ft-nav-heading">Project</p>
          <Link to="/workbench/runs">Saved runs</Link>
          <a href="https://github.com/aartisr/fractals" target="_blank" rel="noreferrer noopener">Original project</a>
          <a href="https://ai-aarti.com" target="_blank" rel="noreferrer noopener">About the creator</a>
          <a href="https://saugus.pioneercss.org" target="_blank" rel="noreferrer noopener">Pioneer Charter School</a>
        </nav>
      </div>

      <div className="ft-bottom">
        <div className="ft-bottom-copy">
          <span>© {CURRENT_YEAR} Aarti S Ravikumar</span>
          <span>Built for curious, careful inquiry.</span>
        </div>
        <AnalyticsPreference />
      </div>
    </footer>
  )
}
