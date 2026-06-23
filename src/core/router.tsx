import { Outlet, createRootRoute, createRoute, createRouter, lazyRouteComponent } from '@tanstack/react-router'
import { AppShell } from './AppShell'
import { HomePage } from '../modules/home/HomePage'

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
  component: HomePage,
})

const fractalsRoute = createRoute({
  getParentRoute: () => workbenchRoute,
  path: 'fractals',
  component: lazyRouteComponent(() => import('../modules/fractals/FractalsPage').then((mod) => ({ default: mod.FractalsPage }))),
})

const discoverRoute = createRoute({
  getParentRoute: () => workbenchRoute,
  path: 'discover',
  component: lazyRouteComponent(() => import('../modules/discovery/DiscoveryPage').then((mod) => ({ default: mod.DiscoveryPage }))),
})

const discoverChallengeRoute = createRoute({
  getParentRoute: () => workbenchRoute,
  path: 'discover/$challengeId',
  component: lazyRouteComponent(() =>
    import('../modules/discovery/DiscoveryChallengePage').then((mod) => ({ default: mod.DiscoveryChallengePage })),
  ),
})

const boxCountRoute = createRoute({
  getParentRoute: () => workbenchRoute,
  path: 'box-count',
  component: lazyRouteComponent(() => import('../modules/box-count/BoxCountPage').then((mod) => ({ default: mod.BoxCountPage }))),
})

const compareRoute = createRoute({
  getParentRoute: () => workbenchRoute,
  path: 'compare',
  component: lazyRouteComponent(() => import('../modules/compare/ComparePage').then((mod) => ({ default: mod.ComparePage }))),
})

const tumorRoute = createRoute({
  getParentRoute: () => workbenchRoute,
  path: 'tumor-detection',
  component: lazyRouteComponent(() => import('../modules/tumor/TumorPage').then((mod) => ({ default: mod.TumorPage }))),
})

const runsRoute = createRoute({
  getParentRoute: () => workbenchRoute,
  path: 'runs',
  component: lazyRouteComponent(() => import('../modules/runs/RunsPage').then((mod) => ({ default: mod.RunsPage }))),
})

const runDetailRoute = createRoute({
  getParentRoute: () => workbenchRoute,
  path: 'runs/$runId',
  component: lazyRouteComponent(() => import('../modules/runs/RunDetailPage').then((mod) => ({ default: mod.RunDetailPage }))),
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  workbenchRoute.addChildren([
    fractalsRoute,
    discoverRoute,
    discoverChallengeRoute,
    boxCountRoute,
    compareRoute,
    tumorRoute,
    runsRoute,
    runDetailRoute,
  ]),
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
