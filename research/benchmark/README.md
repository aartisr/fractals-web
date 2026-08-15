# Reproducible benchmark framework

This directory is a protocol and validation scaffold, not evidence of clinical performance.

## What belongs here

- A versioned, de-identified cohort manifest with approval and provenance references.
- A locked analysis specification and pre-specified AI-only baseline.
- Reproducible code that computes measurement reliability and incremental value.
- A dated report of both positive and negative findings.

## What must not be committed

- Patient images, identifiers, or protected health information.
- Unapproved clinical data.
- Selectively curated results presented as external validation.

Run `npm run benchmark:validate -- research/benchmark/manifest.example.json` to validate a manifest's structure before analysis. The command intentionally does not infer, score, or report clinical performance.
