import type { ComponentType } from 'react'

export type ModuleId = 'fractals' | 'box-count' | 'compare' | 'tumor-detection' | 'runs'

export interface WorkbenchModule {
  id: ModuleId
  title: string
  tagline: string
  path: string
  accent: string
  component: ComponentType
}
