# Fractals Web Phase Roadmap

Author: [Aarti S Ravikumar](https://ai-aarti.com) · [Pioneer Charter School of Science II](https://saugus.pioneercss.org)

This roadmap breaks the feature strategy into phases so we can ship value early, reduce risk, and keep the app coherent as it grows.

## How To Use This Roadmap

- Phase 0 makes the codebase ready for expansion.
- Phases 1 to 2 unlock the biggest adoption wins.
- Phases 3 to 4 add the deeper collaboration and research features.
- Phase 5 hardens the platform and adds growth loops.

Each phase should end with a usable product slice, not just internal plumbing.

## Phase 0: Platform Foundations

Goal: make the app easy to extend, save, share, and observe.

Ship:

- A shared run metadata model across all modules
- A unified export contract for PNG, SVG, CSV, and JSON
- Stable “result card” data structure for public sharing
- Route/query-state persistence for deep links
- Analytics hooks for usage and feature discovery
- Basic authoring conventions for module copy, warnings, and safety notes

Primary modules to touch:

- `src/core/services/contracts.ts`
- `src/core/services/api.ts`
- `src/core/router.tsx`
- `src/modules/runs/`
- `src/modules/fractals/export.ts`
- `src/modules/compare/`
- `src/modules/box-count/`

Exit criteria:

- Every major analysis can be re-opened from a URL or saved run.
- Export formats are consistent across modules.
- New features can be added without inventing new data shapes.

## Phase 1: Student Delight And Shareability

Goal: make the app exciting enough that students want to explore and share it.

Ship:

- Share cards for fractal zooms, box-count results, compare outputs, and tumor evidence summaries
- “Remix from this result” flow for fractals and compare
- Guided prompts that explain what changed and why it matters
- Highlighted exemplar gallery for best-looking or most instructive results
- Short links and QR codes for classroom demos

Primary modules to touch:

- `src/modules/fractals/FractalsPage.tsx`
- `src/modules/compare/ComparePage.tsx`
- `src/modules/box-count/BoxCountPage.tsx`
- `src/modules/runs/RunDetailPage.tsx`

Exit criteria:

- A student can generate, save, and share a visually compelling artifact in under a minute.
- Shared artifacts preserve method context and safety notes.
- Result pages are understandable without a live instructor.

## Phase 2: Educator Workflow And Classroom Mode

Goal: reduce teacher friction and make the app usable in real lessons.

Ship:

- Lesson templates for fractals, box counting, image comparison, and safe biomedical interpretation
- Instructor view with class progress, assignment overview, and submission status
- Rubrics for reasoning, evidence use, and communication quality
- Safe interpretation mode defaults for classroom-facing pages
- One-click handout / slide summary exports

Integration targets:

- Google Classroom share and assignment workflows
- LTI Advantage launch and roster support

Primary modules to touch:

- `src/core/AppShell.tsx`
- `src/core/Topbar.tsx`
- `src/modules/runs/`
- `src/modules/compare/`
- `src/modules/box-count/`
- `src/modules/tumor/`

Exit criteria:

- A teacher can launch an activity, collect work, and review it without manual copy-paste.
- The app has a classroom-safe voice and consistent warning language.

## Phase 3: Research Workbench And Reproducibility

Goal: make the app credible for lab notes, posters, papers, and reproducible experiments.

Ship:

- Versioned runs with parameter provenance
- Methods snapshot generator
- CSV/JSON export with normalized schemas
- Publication-ready figure export
- Side-by-side cohort comparison with annotations
- Evidence summaries for tumor and compare workflows

Primary modules to touch:

- `src/modules/runs/`
- `src/modules/fractals/research-analysis.ts`
- `src/modules/fractals/research-guides.ts`
- `src/modules/compare/`
- `src/modules/box-count/`
- `src/modules/tumor/tumorEvidence.ts`

Exit criteria:

- A researcher can reproduce a run from saved settings.
- Exports are suitable for appendices, figures, and method sections.
- The app explains confidence and caveats clearly.

## Phase 4: Collaboration And Peer Review

Goal: make learning social without losing scientific rigor.

Ship:

- Comment threads on saved runs
- Peer-review rubrics for student critique
- Shared galleries with moderation
- Teacher comments and annotations on result cards
- “Compare my answer to a classmate’s” workflow

Primary modules to touch:

- `src/modules/runs/`
- `src/modules/compare/`
- `src/modules/fractals/`
- `src/modules/box-count/`

Exit criteria:

- A class can review and discuss work inside the app.
- Feedback is structured enough to be useful, not just free-form chat.

## Phase 5: Platform Growth And Trust

Goal: make the product durable, observable, and easy to distribute.

Ship:

- Public discovery feed for shared artifacts
- Bookmarkable examples and challenge pages
- Feature usage analytics and funnel tracking
- Accessibility and mobile polish pass
- Privacy and moderation controls for public sharing
- Documentation updates and onboarding flows

Primary modules to touch:

- `src/core/`
- `src/components/`
- `src/modules/runs/`
- `src/modules/fractals/`

Exit criteria:

- Users can discover, reuse, and trust the content surface.
- The app is polished enough for classroom demos and public sharing.

## Suggested Delivery Order

If we want the highest return first, build in this order:

1. Phase 0: foundations
2. Phase 1: student delight and shareability
3. Phase 3: research workbench
4. Phase 2: educator workflow
5. Phase 4: collaboration
6. Phase 5: growth and trust

That order gets us a highly shareable product early while we build the deeper instructional and research layers.

## Definition Of Done For Each Phase

- The phase ships something a real user would notice.
- The phase adds value without breaking existing workflows.
- The phase has at least one test, validation check, or documented manual QA step.
- The phase leaves the app in a cleaner state than before.

## Phase 5 Delivery Notes

Phase 5 is now implemented in the app as a trust-first growth layer:

- Discovery feed at `/workbench/discover` with bookmarkable examples and challenge cards
- Challenge detail routes at `/workbench/discover/$challengeId`
- Lightweight telemetry for module views, bookmark actions, and export activity
- Public moderation controls for shared artifacts and hidden-item filtering
- Accessibility polish with a skip link and broader mobile-friendly layouts
- Documentation updates so the strategy and roadmap stay in sync with the shipped code

This makes the app easier to demo, easier to teach with, and easier to extend without turning the product surface into one-off special cases.
