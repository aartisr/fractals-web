# Fractals TanStack Workbench

Author: Aarti S Ravikumar  
Status: Work in Progress

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

## Vercel Deployment

- This repo is Vercel-ready for SPA routing via `vercel.json`.
- Dynamic app routes like `/workbench/fractals`, `/workbench/runs`, and `/workbench/runs/:id` are rewritten to `index.html`.
- Static files are still served directly first via filesystem handling.

### Deploy Steps

1. Import the repository in Vercel.
2. Keep framework preset as `Vite` (or `Other` with defaults below).
3. Build command: `npm run build`
4. Output directory: `dist`
5. (Optional) Set `VITE_API_BASE_URL` in project environment variables.

### Local Preflight

- Run `npm run build` before deploy to verify production bundle integrity.

## Notes

- The frontend is wired to real HTTP endpoints through `src/core/services/api.ts`, then falls back to browser-local computation when the API is not available.
- Local fallback coverage includes Mandelbrot, Julia, Burning Ship, Newton, Barnsley Fern, Sierpinski Triangle, ROI box counting, image comparison, tumor-candidate overlays, and run history.
- Configure backend origin with `VITE_API_BASE_URL` (default: `http://127.0.0.1:8000`) when a Python/ONNX service is available.
- Job responses with `jobId` are automatically polled through `/api/jobs/:jobId`.
- Run history route (`/workbench/runs`) uses `/api/runs`, with localStorage fallback for resilience.
