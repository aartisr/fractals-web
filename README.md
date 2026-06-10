# Fractals TanStack Workbench

> **Work in Progress** — This project is actively under development. Features, APIs, and UI are subject to change.

Responsive, modular scientific workbench scaffolded as a sibling project to support fractal generation, box counting, image comparison, and tumor detection workflows.

## Stack

- React + TypeScript + Vite
- TanStack Router
- TanStack Query
- TanStack Form
- TanStack Table (installed for history/grid integration)

## Project Goals

- Plug-and-play pillar modules with a shared module registry
- Highly maintainable feature boundaries and shared service contracts
- Mobile-first responsive workspace shell
- Full workflow parity structure for Fractals, Box Count, Compare, Tumor Detection

## Structure

```text
src/
  components/
  core/
    plugins/
    services/
  modules/
    fractals/
    box-count/
    compare/
    tumor/
```

## Scripts

- `npm run dev` starts local development
- `npm run build` compiles and bundles production build
- `npm run preview` serves built assets locally
- `npm run lint` runs ESLint checks

## Notes

- The frontend is wired to real HTTP endpoints through `src/core/services/api.ts`.
- Configure backend origin with `VITE_API_BASE_URL` (default: `http://127.0.0.1:8000`).
- Job responses with `jobId` are automatically polled through `/api/jobs/:jobId`.
- Run history route (`/workbench/runs`) uses `/api/runs`, with localStorage fallback for resilience.
