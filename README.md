# Fractals Web

<p align="center">
  <a href="https://saugus.pioneercss.org">
    <img src="public/pcssii-logo.jpg" alt="Pioneer Charter School of Science II" width="220" />
  </a>
</p>

<p align="center">
  <strong>Visual science, made teachable, measurable, and shareable.</strong>
</p>

<p align="center">
  Built by <a href="https://ai-aarti.com">Aarti S Ravikumar</a> for <a href="https://saugus.pioneercss.org">Pioneer Charter School of Science II</a>
</p>

---

Fractals Web is the web version of the original `aartisr/fractals` project by the same author, <a href="https://ai-aarti.com">Aarti S Ravikumar</a>. It is a modular research and learning environment for exploring fractals, comparing visual evidence, documenting methods, and sharing results. It combines interactive geometry, reproducible analysis, and classroom-ready workflows in a responsive web application designed to serve students, educators, and researchers with equal care.

The project is grounded in a simple idea: when visual inquiry is easy to start, easy to explain, and easy to share, it becomes more powerful.

## Executive Summary

Fractals Web turns exploratory science into a complete workflow.

- Students can investigate patterns and produce work they are proud to show.
- Educators can guide learning with clarity, safety, and reusable structure.
- Researchers can preserve provenance, compare methods, and export evidence.

The result is a product that behaves like a learning studio, a teaching surface, and a research notebook at the same time.

## Why It Matters

The strongest scientific tools do more than display output. They help people move from observation to interpretation without friction.

Fractals Web is built around that standard:

1. Explore a concept or dataset.
2. Measure or compare what changed.
3. Explain the evidence.
4. Save the result in a reusable form.
5. Share it with someone else who can learn from it.

That workflow is the backbone of the application and the reason it can serve classrooms, labs, and independent learners without feeling like three separate products.

## Audience Value

### Students

Students get a visual environment that rewards curiosity and iteration.

They can:

- Generate and zoom into fractals
- Compare outputs side by side
- Save compelling results as share cards
- Use prompts to explain what they observed
- Build a portfolio of work that feels meaningful and personal

### Educators

Educators get a structured environment that reduces friction and increases clarity.

They can:

- Launch lessons from a clean workspace
- Use guided kickoff panels and challenge pages
- Share examples, bookmarks, and prompts
- Keep interpretation language safe and instructional
- Review student work with more context and less administrative overhead

### Researchers

Researchers get a reproducible environment for documenting methods and results.

They can:

- Track runs and revisit prior settings
- Export CSV, JSON, markdown, and share cards
- Preserve provenance and parameter state
- Compare runs, cohorts, and evidence summaries
- Turn exploratory work into lab-ready output

## Core Capabilities

Fractals Web is organized around a set of linked surfaces:

- Home: a premium launchpad that routes users into the right workflow
- Fractals: interactive geometry generation and analysis
- Discovery: shared examples, bookmarks, challenge pages, and analytics
- Box Count: ROI-based complexity estimation
- Compare: structured image comparison with interpretation support
- Tumor Detection: evidence-first biomedical visualization
- Runs: searchable history and export hub

## Product Principles

Fractals Web is designed to stay maintainable as it grows.

- Keep modules plug-and-play
- Use shared service contracts instead of one-off data shapes
- Make each page responsive by default
- Separate exploration, comparison, and research concerns
- Keep sharing useful rather than performative
- Ensure every exported artifact carries context

## Feature Set

- Interactive fractal generation and zoom exploration
- ROI-based box-counting analysis
- Side-by-side image comparison and interpretation
- Tumor detection evidence views with cautious framing
- Shareable result cards and discovery pages
- Run history, bookmarks, and reusable artifacts
- Classroom-friendly prompts and guided launch surfaces

## Technology Stack

- React 19
- TypeScript
- Vite
- TanStack Router
- TanStack Query
- TanStack Form
- TanStack Table
- ONNX Runtime in the browser for tumor inference

## Local Development

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Available Scripts

- `npm run dev` starts the development server
- `npm run build` creates a production build
- `npm run preview` serves the build locally
- `npm run lint` runs ESLint
- `npm run test` runs the Node test suite

## Repository Structure

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

## Deployment Notes

This repository is ready for Vercel-style SPA deployment.

- Build command: `npm run build`
- Output directory: `dist`
- Routes such as `/workbench/fractals`, `/workbench/discover`, and `/workbench/runs/:id` are configured to resolve through `index.html`

Before deploying, run the production build locally to validate routing and bundle integrity.

## Implementation Notes

- API-backed features connect through `src/core/services/api.ts`
- Run history and sharing use localStorage fallbacks when backend data is unavailable
- Tumor detection runs in the browser using bundled ONNX weights under `public/models/`
- The ONNX Runtime browser bundle is vendored under `public/vendor/ort/` so the app works without a CDN dependency
- The homepage and discovery surfaces are designed to feel polished on first visit and useful on repeat visits

## Documentation

- Feature strategy and research plan: [docs/fractals-web-feature-strategy.md](docs/fractals-web-feature-strategy.md)
- Phase roadmap: [docs/fractals-web-phase-roadmap.md](docs/fractals-web-phase-roadmap.md)
- Image compare guide: [docs/image-compare-guide.md](docs/image-compare-guide.md)
- Original fractals project: [aartisr/fractals](https://github.com/aartisr/fractals)
- Original project wiki: [aartisr/fractals/wiki](https://github.com/aartisr/fractals/wiki)

## Acknowledgments

This project is a web implementation and extension of the original fractals work created by <a href="https://ai-aarti.com">Aarti S Ravikumar</a>:

- Original repository: [aartisr/fractals](https://github.com/aartisr/fractals)
- Original wiki: [aartisr/fractals/wiki](https://github.com/aartisr/fractals/wiki)

Fractals Web builds on that foundation while adapting the experience for modern browsers, classroom use, and shareable research workflows.

The aim is simple: make the work beautiful enough to invite attention, rigorous enough to earn trust, and clear enough to be used again.
