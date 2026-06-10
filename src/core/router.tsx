import { Navigate, Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { AppShell } from './AppShell'
import { BoxCountPage } from '../modules/box-count/BoxCountPage'
import { ComparePage } from '../modules/compare/ComparePage'
import { FractalsPage } from '../modules/fractals/FractalsPage'
import { RunDetailPage } from '../modules/runs/RunDetailPage'
import { RunsPage } from '../modules/runs/RunsPage'
import { TumorPage } from '../modules/tumor/TumorPage'

const rootRoute = createRootRoute({
  component: AppShell,
})

const workbenchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workbench',
  component: Outlet,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Navigate to="/workbench/fractals" />,
})

const fractalsRoute = createRoute({
  getParentRoute: () => workbenchRoute,
  path: 'fractals',
  component: FractalsPage,
})

const boxCountRoute = createRoute({
  getParentRoute: () => workbenchRoute,
  path: 'box-count',
  component: BoxCountPage,
})

const compareRoute = createRoute({
  getParentRoute: () => workbenchRoute,
  path: 'compare',
  component: ComparePage,
})

const tumorRoute = createRoute({
  getParentRoute: () => workbenchRoute,
  path: 'tumor-detection',
  component: TumorPage,
})

const runsRoute = createRoute({
  getParentRoute: () => workbenchRoute,
  path: 'runs',
  component: RunsPage,
})

const runDetailRoute = createRoute({
  getParentRoute: () => workbenchRoute,
  path: 'runs/$runId',
  component: RunDetailPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  workbenchRoute.addChildren([fractalsRoute, boxCountRoute, compareRoute, tumorRoute, runsRoute, runDetailRoute]),
])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
