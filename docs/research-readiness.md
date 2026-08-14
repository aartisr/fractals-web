# Research-readiness dossier: fractal morphology plus AI localization

## One-sentence project statement

This project is an open, browser-based research prototype for testing whether standardized fractal-morphology features can add reproducible, interpretable information to AI-localized brain-tumor imaging regions.

It is not an NIH-funded project, an NIH-endorsed product, a regulated medical device, or a clinically validated decision-support system.

## Significance

Tumor imaging contains morphology that is often described visually but difficult to quantify consistently. Fractal dimension (FD) and lacunarity provide candidate descriptors of irregularity and space filling. The scientific opportunity is not to replace AI localization, but to test whether a transparent morphology feature adds value beyond AI confidence and conventional features for a narrowly defined task.

Peer-reviewed studies have investigated FD/lacunarity in glioma MRI, including associations with grade-related groups and outcomes. Those findings motivate research; they do not establish a general clinical rule or validate this implementation for patient-level use.

## Specific aims

### Aim 1 — Establish reliable complexity measurement

Develop and version a pre-specified FD/lacunarity pipeline for defined MRI regions. Measure repeatability across re-runs, sensitivity to ROI choice, and reproducibility across readers, sites, scanners, sequences, and software.

**Success criterion:** pre-defined reproducibility thresholds are met and every result carries complete preprocessing, segmentation, software, and quality-control provenance.

### Aim 2 — Test incremental value beyond AI localization

For one locked clinical-research endpoint, compare baseline, AI-only, morphology-only, and combined models on a held-out evaluation set. Evaluate discrimination, calibration, uncertainty, subgroup performance, and decision-curve utility.

**Success criterion:** the combined model demonstrates a pre-specified, clinically meaningful improvement over AI-only, with confidence intervals and no unacceptable calibration or subgroup degradation.

### Aim 3 — Establish external validity and transparent sharing

Evaluate the locked pipeline on an independent multi-site cohort with expert reference labels. Release the protocol, code, feature definitions, aggregate results, failure analysis, and a governed data-sharing package.

**Success criterion:** results replicate on external data, limitations are disclosed, and all release conditions are approved by the responsible institution and data stewards.

## Current assets

- Browser-based local AI visualization with before/after review.
- Candidate-crop versus whole-image FD measurement, fit-quality gates, and result withholding.
- Versioned runs, method snapshots, JSON/CSV exports, and shareable research artifacts.
- An explicit AI-to-morphology evidence chain in the interface.
- A public validation protocol and non-diagnostic safety framing.

## Current limitations and work required

| Area | Current state | Required before a performance or clinical claim |
| --- | --- | --- |
| Endpoint | Not locked | Pre-specify a single task and reference standard |
| Data | No institutional cohort in this repository | IRB/data-use review and representative development/external cohorts |
| Measurement | 2D image/crop workflow | Defined MRI sequence, 3D ROI, FD/lacunarity implementation, and scanner/reader robustness testing |
| AI evaluation | No reported clinical performance study | Locked AI-only and combined baselines with calibration and utility analysis |
| Generalization | Not evaluated | Independent multi-site external validation |
| Clinical translation | Not applicable | Prospective evaluation, clinical oversight, regulatory assessment as appropriate |

## Rigor and reproducibility plan

The proposal should explicitly address NIH’s four rigor areas:

1. **Rigor of prior research:** distinguish encouraging retrospective literature from external clinical validation; discuss sample size, single-site bias, segmentation variation, and feature-definition variance.
2. **Rigorous design:** pre-register endpoint, inclusion/exclusion criteria, preprocessing, ROI rules, metrics, missing-data handling, model selection, and stopping rules.
3. **Biological variables:** evaluate sex, age, tumor subtype, site, scanner, sequence, acquisition protocol, and relevant clinical covariates when lawful and adequately powered.
4. **Authentication:** version and checksum model weights, software, reference masks, preprocessing configuration, and exported artifacts.

The evaluation report should follow an appropriate reporting framework such as TRIPOD+AI where applicable and make calibration, error analyses, and negative findings visible.

## Data management and sharing outline

This is an outline for institutional adaptation, not a substitute for an approved Data Management and Sharing Plan.

- **Data types:** de-identified imaging, approved segmentations, derived masks, features, model outputs, run manifests, code, and aggregate evaluation reports.
- **Standards:** document DICOM/NIfTI conversion, imaging sequence, preprocessing, ROI definition, feature equations, software version, and metadata dictionary.
- **Preservation and access:** use an institutionally approved repository and controlled-access mechanism when human-participant or restricted data require it.
- **Privacy and governance:** do not upload identifiable clinical images to this application; follow IRB, consent, DUAs, HIPAA and institutional policy before collection, sharing, or release.
- **Timing:** release code and protocol early; share permitted scientific data no later than the applicable NIH policy deadline and only after governance approval.
- **Budget:** include curation, de-identification, storage, repository, documentation, and personnel effort in the project budget.

## Evidence and standards

- NIH, [Guidance: Rigor and Reproducibility in Grant Applications](https://www.grants.nih.gov/policy-and-compliance/policy-topics/reproducibility/guidance).
- NIH, [Data Management & Sharing Policy Overview](https://www.grants.nih.gov/policy-and-compliance/policy-topics/sharing-policies/dms/policy-overview).
- Battalapalli et al. (2023), [FD as a potential neuroimaging biomarker for brain-tumor diagnosis](https://pubmed.ncbi.nlm.nih.gov/37528895/).
- Hasse et al. (2021), [morphological metrics of glioblastoma imaging abnormalities](https://pubmed.ncbi.nlm.nih.gov/34853344/).
- Zwanenburg et al. (2020), [Image Biomarker Standardisation Initiative](https://pubmed.ncbi.nlm.nih.gov/32154773/).
- Collins et al. (2024), [TRIPOD+AI statement](https://pmc.ncbi.nlm.nih.gov/articles/PMC11019967/).

## Responsible external-facing language

Use: “candidate imaging biomarker,” “research prototype,” “hypothesis generation,” “complementary morphology feature,” “requires external validation,” and “non-diagnostic.”

Avoid: “proves,” “revolutionary,” “clinical-grade,” “detects cancer,” “predicts outcome,” “improves care,” “NIH-ready,” or “NIH-endorsed,” unless each claim is supported by the corresponding completed study, institutional review, and applicable authorization.
