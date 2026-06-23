export type ModuleId = 'fractals' | 'discover' | 'box-count' | 'compare' | 'tumor-detection' | 'runs'

export interface WorkbenchModule {
  id: ModuleId
  title: string
  tagline: string
  path: string
  accent: string
}
