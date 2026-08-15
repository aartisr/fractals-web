import { useRouterState } from '@tanstack/react-router'

type RouteArt = { asset: string; alt: string }

const routeArt: Array<{ matches: (pathname: string) => boolean; art: RouteArt }> = [
  { matches: (pathname) => pathname === '/workbench/fractals', art: { asset: 'fractal-construction', alt: 'Recursive branching fractal emerging from a geometric construction field' } },
  { matches: (pathname) => pathname.startsWith('/workbench/discover'), art: { asset: 'discovery', alt: 'Curated collection of abstract fractal specimens' } },
  { matches: (pathname) => pathname === '/workbench/box-count', art: { asset: 'box-count', alt: 'Irregular boundary shown at several box-counting scales' } },
  { matches: (pathname) => pathname === '/workbench/compare', art: { asset: 'compare', alt: 'Two abstract patterns prepared for visual comparison' } },
  { matches: (pathname) => pathname === '/workbench/tumor-detection', art: { asset: 'tumor-research', alt: 'Abstract volumetric image-morphology research visualization' } },
  { matches: (pathname) => pathname.startsWith('/workbench/runs'), art: { asset: 'runs', alt: 'Abstract trail of connected research artifacts and provenance' } },
]

export function RouteVisual() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const entry = routeArt.find(({ matches }) => matches(pathname))
  if (!entry) return null

  const { asset, alt } = entry.art
  return (
    <figure className="route-visual">
      <picture>
        <source media="(prefers-reduced-data: reduce)" srcSet="/og-preview.svg" type="image/svg+xml" />
        <source media="(max-width: 720px)" srcSet={`/images/${asset}-mobile.webp`} type="image/webp" />
        <source srcSet={`/images/${asset}-wide.webp`} type="image/webp" />
        <img src="/og-preview.svg" width="1440" height="480" alt={alt} decoding="async" />
      </picture>
    </figure>
  )
}
