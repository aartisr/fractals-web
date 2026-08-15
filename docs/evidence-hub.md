# Evidence hub: what Fractals Web establishes today

## Established in the software

Fractals Web provides transparent, browser-local exploratory workflows for fractal generation, ROI-based box counting, visual comparison, run provenance, and cautious display of AI localization alongside a separate morphology measurement.

The tumor-complexity interface keeps three distinct things visible: the uploaded image, an AI-proposed candidate region, and a fractal-morphology measurement with quality information. It is designed to support a testable research question, not to assert a clinical conclusion.

## Not established

The software does not establish diagnostic accuracy, clinical utility, prognosis, treatment selection, superiority to an AI-only model, generalizability, calibration, or safety in any clinical setting. It must not be used for patient care.

## Evidence still required

1. A preregistered protocol and locked analysis plan.
2. Technical reliability across operators, regions of interest, preprocessing choices, and acquisition settings.
3. Comparison with a pre-specified AI-only baseline on a held-out cohort.
4. Independent external validation, subgroup reporting, calibration, and clinical oversight.
5. Transparent reporting of failures and negative results.

## Reproduce and scrutinize

- Read the [validation plan](tumor-complexity-validation-plan.md).
- Read the [research-readiness dossier](research-readiness.md).
- Validate a cohort manifest with `npm run benchmark:validate -- research/benchmark/manifest.example.json`.
- Preserve exports, methods snapshots, and provenance whenever an exploratory figure is shared.
