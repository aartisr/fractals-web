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

> Research status: Fractals Web is an educational and exploratory research prototype. Its tumor-complexity workflow generates hypotheses about image morphology; it is not validated for diagnosis, grading, prognosis, treatment selection, or clinical use.

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

## Biomedical Research Scope

The tumor-complexity workflow is designed to study a precise, testable question: whether standardized fractal-morphology features can add measurable value beyond AI localization for a pre-specified imaging task. The product keeps these signals separate, records measurement quality, withholds unstable estimates, and preserves run provenance.

This is promising because fractal dimension and lacunarity provide interpretable descriptors of image geometry that can be evaluated alongside AI confidence. It is not yet proof of clinical value. That proof requires a locked protocol, expert reference labels, comparison with AI-only baselines, and independent multi-site evaluation. See the [validation plan](docs/tumor-complexity-validation-plan.md) and [research-readiness dossier](docs/research-readiness.md).

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
- AI-plus-complexity evidence chain with fit-quality gates and explicit validation requirements
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
- Microsoft Clarity is supported through the optional `VITE_CLARITY_PROJECT_ID` environment variable
- The homepage and discovery surfaces are designed to feel polished on first visit and useful on repeat visits

## Documentation

- Feature strategy and research plan: [docs/fractals-web-feature-strategy.md](docs/fractals-web-feature-strategy.md)
- Phase roadmap: [docs/fractals-web-phase-roadmap.md](docs/fractals-web-phase-roadmap.md)
- Image compare guide: [docs/image-compare-guide.md](docs/image-compare-guide.md)
- Tumor-complexity validation plan: [docs/tumor-complexity-validation-plan.md](docs/tumor-complexity-validation-plan.md)
- Research-readiness dossier: [docs/research-readiness.md](docs/research-readiness.md)
- Original fractals project: [aartisr/fractals](https://github.com/aartisr/fractals)
- Original project wiki: [aartisr/fractals/wiki](https://github.com/aartisr/fractals/wiki)

## Public Guide and Wiki

The GitHub Pages guide is intentionally a concise orientation surface. It points every action back to the canonical [Fractals Web site](https://fractals.ai-aarti.com/) so that learners and search engines reach the current product rather than a duplicate experience.

- Public guide: [aartisr.github.io/fractals-web](https://aartisr.github.io/fractals-web/)
- Project Wiki: [aartisr/fractals-web/wiki](https://github.com/aartisr/fractals-web/wiki)
- Wiki source (kept in this repository): [wiki/](wiki/)

After the first merge, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**, and enable **Settings → General → Features → Wikis**. The included workflows then publish the Pages guide and synchronize the repository-managed Wiki pages without deleting manually authored Wiki material.

### Wiki sync credential

GitHub stores a Wiki as a separate Git repository. Before using the **Sync Wiki source** workflow, create a fine-grained personal access token owned by a maintainer, limit it to `aartisr/fractals-web`, grant **Contents: Read and write**, and save it as the repository Actions secret `WIKI_SYNC_TOKEN` under **Settings → Secrets and variables → Actions**. The workflow intentionally requires this separate credential because the built-in Actions token cannot reliably clone the Wiki repository. After adding the secret, run **Actions → Sync Wiki source → Run workflow** once; subsequent changes to `wiki/*.md` synchronize automatically.

### Discoverability

The Pages guide is indexable, has its own canonical URL, and publishes a sitemap, crawl rules, social metadata, structured data, and AI-readable `llms.txt` and `ai-context.json` files. Its content points readers to the canonical Fractal Lab for product use.

Repository-level discoverability still requires these GitHub settings after publication:

- Set the repository description to: `Open visual science workbench for fractals, box counting, image comparison, and reproducible research.`
- Add topics: `fractals`, `fractal-dimension`, `box-counting`, `image-analysis`, `stem-education`, `reproducible-research`, `visual-science`, `ai-literacy`.
- Upload [pages/social-preview.png](pages/social-preview.png) in **Settings → Social preview** (1200 × 630 PNG, 114 KB).
- Submit `https://aartisr.github.io/fractals-web/sitemap.xml` to Google Search Console and Bing Webmaster Tools after Pages is live.

## Acknowledgments

This project is a web implementation and extension of the original fractals work created by <a href="https://ai-aarti.com">Aarti S Ravikumar</a>:

- Original repository: [aartisr/fractals](https://github.com/aartisr/fractals)
- Original wiki: [aartisr/fractals/wiki](https://github.com/aartisr/fractals/wiki)

Fractals Web builds on that foundation while adapting the experience for modern browsers, classroom use, and shareable research workflows.

The aim is simple: make the work beautiful enough to invite attention, rigorous enough to earn trust, and clear enough to be used again.

## A Grand Scientific Ambition, Grounded in Evidence

Some of the most consequential advances in science begin by making a difficult phenomenon measurable. Fractals Web is built around that tradition. Its ambition is not to declare that every complex image has a single hidden answer. Its ambition is to give students, educators, and researchers a transparent way to ask better questions about structure, irregularity, scale, and change.

The Fractal Lab makes a powerful idea concrete: visual complexity can be measured, inspected, challenged, and reproduced. A pattern that once looked merely intricate can become a documented observation with a region of interest, a measurement method, quality checks, a comparison, and a record of how the result was produced. That shift—from impression to accountable measurement—is where useful science starts.

This work is especially promising for research because it connects three strengths that are too often separated:

1. **Human understanding.** The visual canvas lets a learner or investigator see the pattern before assigning meaning to a number.
2. **Quantitative evidence.** Box counting, fractal dimension, fit quality, image comparison, and provenance turn visual observations into testable measurements.
3. **Responsible computation.** AI localization, when used, is shown alongside the original image and an explicit complexity measurement instead of being treated as an unexplained verdict.

In the tumor-complexity workflow, this distinction is essential. AI can propose a candidate region. Fractal morphology can characterize the geometry of a defined region. Neither output, by itself or together in this prototype, diagnoses a person or determines treatment. The research opportunity is to test—openly and rigorously—whether a standardized complexity feature adds useful information beyond AI localization for a clearly defined task. If it does, that result must be demonstrated through preregistered evaluation, reproducibility testing, independent cohorts, calibration, and clinical oversight. If it does not, that finding is equally valuable and should be reported.

That is the kind of ambition worthy of serious scientific support: not a promise of a predetermined breakthrough, but a well-instrumented path to discovering whether a new measurement can improve how we understand complex biological structure.

## Why the Fractal Lab Is Useful

Fractal Lab is useful because it shortens the distance between curiosity and a defensible result.

| Need | Fractal Lab response |
| --- | --- |
| “I can see a difference, but can I measure it?” | Select a region, estimate complexity, inspect fit quality, and retain the exact settings. |
| “Does this pattern repeat across scale?” | Explore fractals interactively, compare images, and inspect multi-scale box counts. |
| “Can someone else understand or reproduce my result?” | Save run provenance, export structured artifacts, and share a cautious evidence summary. |
| “Could AI and interpretable morphology complement each other?” | View the original image, AI-proposed region, complexity measurement, quality gate, and validation requirements in one evidence chain. |
| “How do we teach rigorous visual inquiry?” | Use guided experiments, challenge prompts, classroom-safe language, and discussion-ready artifacts. |

The product is intentionally useful before any high-stakes research claim is made. It can teach scale and self-similarity, support exploratory image analysis, document a hypothesis, and organize reproducible work. Its biomedical workflow adds a disciplined research scaffold: it displays what was measured, how stable the measurement is, what remains unknown, and what future study would be required to make a stronger claim.

## What Success Would Look Like

The strongest possible future outcome is not a dramatic interface claim. It is a sequence of independently checkable achievements:

1. A standardized, reproducible complexity-measurement protocol.
2. Transparent results on representative development and external evaluation cohorts.
3. Evidence that a combined AI-plus-morphology approach adds value beyond AI alone for a pre-specified task.
4. Clear reporting of uncertainty, failure modes, subgroup performance, and negative findings.
5. Independent replication, clinical collaboration, and responsible translation only if the evidence supports it.

That standard makes the project more than a visualization tool. It makes Fractals Web a durable research instrument: one designed to invite bold questions while demanding evidence strong enough to withstand them.
