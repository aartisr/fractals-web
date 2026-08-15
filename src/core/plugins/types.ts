export type ModuleId = 'fractals' | 'discover' | 'box-count' | 'compare' | 'tumor-detection' | 'runs'

export interface ModuleRouteVisual {
  asset: string
  alt: string
}

export interface WorkbenchModule {
  id: ModuleId
  title: string
  tagline: string
  path: string
  accent: string
  navLabel: string
  primaryNavigation: boolean
  navigationOrder: number
  routeVisual: ModuleRouteVisual
}
