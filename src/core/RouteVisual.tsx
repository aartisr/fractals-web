import { useRouterState } from '@tanstack/react-router'
import { getWorkbenchModuleForPath } from './plugins/modules'

export function RouteVisual() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const module = getWorkbenchModuleForPath(pathname)
  if (!module) return null

  const { asset, alt } = module.routeVisual
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
