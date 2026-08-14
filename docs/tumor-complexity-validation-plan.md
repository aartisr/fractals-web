# Tumor complexity as a complementary imaging biomarker

## Claim under test

For a pre-specified brain-tumor imaging task, does adding a standardized fractal-morphology feature set (fractal dimension and lacunarity) to an AI localization model improve performance, calibration, or clinical decision utility compared with the AI model alone?

This is a research hypothesis. It is not a diagnostic, prognostic, grading, or treatment claim.

## Why this is worth testing

AI localization and fractal morphology answer different questions:

- AI localization: where is a candidate region in this image?
- Fractal morphology: how irregular or space-filling is a defined region under a fixed measurement protocol?

The complementarity is scientifically useful only if it is demonstrated on a locked, external evaluation cohort. A useful feature must add incremental value beyond model confidence, volume, and conventional radiomics—not merely correlate with them.

## Product role

The app is a transparent hypothesis-generation interface. For every run, it must display:

1. The image and AI-proposed region.
2. The full-scan and candidate-region measurement, the delta, and fit quality.
3. A clear statement when a result is unstable or withheld.
4. The separation between a measurable geometric observation and a clinical conclusion.
5. Provenance sufficient to reproduce the feature extraction.

## Validation protocol

### 1. Lock the question and protocol

- Pick one clinical endpoint and reference standard before touching the held-out data.
- Define MRI sequence(s), resampling, normalization, ROI source, 2D/3D feature definition, box sizes, and quality thresholds.
- Use expert-reviewed segmentations and report inter-reader sensitivity.
- Include FD and lacunarity as pre-specified features; do not select thresholds after seeing outcomes.

### 2. Establish technical reliability

- Test repeatability and reproducibility across readers, scanners, sites, and sequences.
- Compare this implementation against a documented reference implementation or digital phantom where possible.
- Report failed or withheld measurements and their causes.
- Record preprocessing and model versions with every result.

### 3. Test incremental value

Compare these locked models on an untouched evaluation set:

| Model | Inputs |
| --- | --- |
| Baseline | clinical variables or conventional imaging features, as appropriate |
| AI-only | baseline + AI localization/confidence |
| Complexity-only | baseline + FD/lacunarity features |
| Combined | baseline + AI + FD/lacunarity |

Report discrimination, calibration, confidence intervals, decision-curve utility, subgroup performance, and error cases. A combined model is interesting only if the benefit is statistically and practically meaningful, calibrated, and stable across sites.

### 4. External validation and translation gate

- Evaluate on a multi-site cohort not used for feature choice, thresholding, or model tuning.
- Publish the protocol, code, exclusions, performance degradation, and fairness/subgroup analyses.
- Seek clinical review and prospective evaluation before any workflow claim.

## Candidate public research resources

- BraTS datasets and other expert-annotated MRI collections can support development and external evaluation, subject to their data-use terms.
- The product must not treat public benchmark success as clinical validation.

## Evidence base

- Battalapalli et al., 2023: MRI FD measures investigated as potential glioma biomarkers. https://pubmed.ncbi.nlm.nih.gov/37528895/
- Hasse et al., 2021: FD/lacunarity of glioblastoma imaging abnormalities and outcome associations. https://pubmed.ncbi.nlm.nih.gov/34853344/
- Smitha et al., 2015: MRI fractal analysis for glioma-grade differentiation. https://pubmed.ncbi.nlm.nih.gov/26305773/
- Zwanenburg et al., 2020: Image Biomarker Standardisation Initiative reproducibility framework. https://pubmed.ncbi.nlm.nih.gov/32154773/
- Collins et al., 2024: TRIPOD+AI reporting guidance for prediction models. https://pmc.ncbi.nlm.nih.gov/articles/PMC11019967/

## Non-negotiable guardrails

- No individual diagnostic, grade, prognosis, or treatment recommendation.
- No claim that a higher or lower FD is universally “worse.”
- No performance claim without an explicitly named dataset, endpoint, reference standard, and evaluation method.
- No claim of AI-plus-FD benefit unless the combined model is compared against AI-only on external data.
