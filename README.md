# Fractals Web

Author: ![Pioneer Charter School of Science II](public/pcssii-logo.jpg) Aarti S Ravikumar · Pioneer Charter School of Science II  
Status: Work in Progress

Fractals Web is a visual science workbench for learning, teaching, and research. It helps people move from curiosity to explanation with interactive fractals, box counting, image comparison, tumor detection, shareable result cards, and a growing discovery layer.

If the original [aartisr/fractals](https://github.com/aartisr/fractals) project is about exploring the beauty and rigor of fractals, this app takes that idea further by making it easier to use in a classroom, easier to present in a lab, and easier to share with other people.

## Why This Exists

Fractals Web is designed around one simple loop:

1. Explore something visual.
2. Measure or compare what changed.
3. Explain the evidence.
4. Share the result.
5. Let someone else remix it.

That loop is what makes the product useful for students, credible for educators, and reproducible for researchers.

## Who It Is For

### Students

Students get a fast, rewarding place to experiment with patterns and transformations.

They can:

- Generate fractals and zoom into details
- Compare results side by side
- Save interesting outputs as share cards
- Use guided prompts to explain what they observed
- Build a portfolio of work they are actually proud to show

### Educators

Educators get a classroom-friendly workflow that reduces setup and increases clarity.

They can:

- Launch lessons from a clean workspace
- Use guided kickoff panels and challenge pages
- Share examples, rubrics, and prompts
- Keep language safe and instructional
- Review student work with context instead of guesswork

### Researchers

Researchers get a reproducible analysis environment with exportable evidence.

They can:

- Track runs and compare settings over time
- Export methods snapshots, CSV, JSON, and markdown summaries
- Preserve provenance for future review
- Document image comparison and box-counting workflows
- Turn exploratory work into something that can support a paper, poster, or report

## What Makes It Convincing

Fractals Web is trying to be more than a demo.

It is built around a few product principles:

- Every result should be teachable.
- Every result should be shareable.
- Every result should be reproducible.
- Every result should be remixable.
- The advanced path should feel as easy as the beginner path.

That is the difference between a nice visualization tool and a product people return to.

## What You Can Do

- Explore Mandelbrot, Julia, Burning Ship, Newton, Barnsley Fern, and Sierpinski variants
- Run box-counting analysis on image regions of interest
- Compare images and surface a complexity story
- Inspect tumor detection outputs with evidence and caution
- Save and reopen runs from the history view
- Share result cards and challenge pages
- Bookmark examples and revisit them later

## Product Story

The original fractals project established a powerful story: mathematical beauty can become a rigorous, practical tool when you combine visualization, measurement, and interpretation.

This web version makes that story more accessible:

- It starts with interactive discovery instead of documentation-first navigation.
- It packages outputs as cards that can be shown, shared, and reused.
- It supports classroom use without making the interface feel like a training manual.
- It keeps the research trail intact so the work can stand up to review.

In short: it is a learning studio, a teaching surface, and a research notebook in one place.

## Quick Start

```bash
npm install
npm run dev
```

Then open the local URL Vite prints in the terminal.

## Stack

- React 19
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- TanStack Form
- TanStack Table
- ONNX Runtime for browser-side tumor inference

## Project Structure

```text
src/
  components/
  core/
    hooks/
    plugins/
    services/
  modules/
    home/
    discovery/
    fractals/
    box-count/
    compare/
    tumor/
    runs/
```

## Key Surfaces

- Home: a launchpad for students, educators, and researchers
- Fractals: interactive generation and analysis
- Discovery: shared examples, challenge pages, bookmarks, and analytics
- Box Count: ROI-based fractal dimension analysis
- Compare: structured image comparison and interpretation
- Tumor Detection: guided, caution-aware biomedical evidence view
- Runs: searchable run history and export hub

## Scripts

- `npm run dev` starts local development
- `npm run build` compiles and bundles production assets
- `npm run preview` serves the built app locally
- `npm run lint` runs ESLint checks
- `npm run test` runs the Node test suite

## Deployment

This repo is Vercel-ready for SPA routing.

- Build command: `npm run build`
- Output directory: `dist`
- Dynamic routes such as `/workbench/fractals`, `/workbench/discover`, and `/workbench/runs/:id` are rewritten to `index.html`

Before deploying, run the production build locally to verify the bundle and route setup.

## Notes

- API-backed features connect through `src/core/services/api.ts`.
- Run history and shared artifacts use localStorage fallbacks so the app stays usable even when backend state is limited.
- Tumor detection runs in the browser with bundled ONNX weights under `public/models/`.
- The ONNX Runtime browser bundle is vendored under `public/vendor/ort/` so the app can work offline without a CDN dependency.
- The homepage, discovery feed, and result cards are designed to keep the product easy to understand on first visit and easy to revisit later.

## Documentation

- Feature strategy and research plan: [docs/fractals-web-feature-strategy.md](docs/fractals-web-feature-strategy.md)
- Phase roadmap: [docs/fractals-web-phase-roadmap.md](docs/fractals-web-phase-roadmap.md)
- Image compare guide: [docs/image-compare-guide.md](docs/image-compare-guide.md)
- Original fractals project: [aartisr/fractals](https://github.com/aartisr/fractals)
- Original project wiki: [aartisr/fractals/wiki](https://github.com/aartisr/fractals/wiki)

## Acknowledgments

This project builds on the spirit of the original fractals work: use math to explore the world, but package the results so other people can learn from them too.

Special thanks to the original project direction, its wiki-driven documentation approach, and the broader science-education community that makes tools like this worth building.
