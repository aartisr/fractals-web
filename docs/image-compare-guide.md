# Image Compare User Guide

![PCSS II School](../public/pcssii-logo.jpg) Aarti S Ravikumar · PCSS II School

This guide explains how to use Image Compare in the Fractals TanStack Workbench.

## What Image Compare Does

Image Compare estimates structural complexity across 2 to 5 images using box-counting fractal analysis.

You get:
- Shared preprocessing across all selected images
- Per-scale occupied box counts (8, 16, 32)
- Log-log scaling plots
- Fractal Dimension (D) and fit quality (R2)
- A staged interpretation workflow for communication and reporting

Important: this is a quantitative analysis aid. It is not a standalone medical diagnosis tool.

## Where to Open It

1. Start the app with `npm run dev`.
2. Open the Compare module from the top navigation.
3. Use the 4-step compare workflow in the page.

## Before You Start

For best results, keep inputs consistent:
- Same imaging modality/sequence family
- Similar resolution and preprocessing path
- Comparable framing and scale

Differences caused by scanner settings, sequence changes, or inconsistent preprocessing can distort comparisons.

## Step-by-Step Workflow

## Step 1: Load and Align

In this step, you configure the cohort and labels.

Actions:
1. Upload at least 2 images (up to 5).
2. Use Add image slot / Remove last slot to adjust cohort size.
3. Optional: set custom labels for each image.
4. Choose Label mode:
- Filename labels
- Image A-E labels
5. Click Compare N Images.

You also get:
- Compact preview rail for uploaded images
- Overlay toggle to show/hide visual overlays later

Tips:
- Use meaningful labels (for example: Control, Tumor Core, Peritumoral Edema).
- If comparing a cohort, keep one reference image in Slot 1.

## Step 2: Preprocess and Count

The app applies the same preprocessing to each image and performs box counting at fixed scales.

Per image, you can inspect:
- Original
- Greyscale
- Binarized
- Overlays for box sizes 8, 16, 32
- Occupied box count at each size

Interpretation intent:
- Smaller boxes capture finer detail.
- Occupied-box behavior across scales drives the complexity estimate.

## Step 3: Fit the Scaling Law

The app computes a log-log fit for each image and reports:
- Fractal Dimension (D)
- R2 (fit quality)
- Number of points in the scaling fit

The chart uses:
- x = log(1 / box size)
- y = log(box count)

Legend behavior:
- Click a series label to focus/highlight one image and fade others.
- Click again to clear focus.

Reading the results:
- D is the complexity descriptor for that image under the selected method.
- Higher R2 usually indicates a cleaner linear scale-law fit.

## Step 4: Interpret the Results

Step 4 contains both summary interpretation and a 3-stage documentation workflow.

### Summary Interpretation Panel

This panel explains results for:
- Student audience
- Research audience
- Community audience

It adapts to:
- Pairwise mode (2 images)
- Cohort mode (3 to 5 images)

### Stage 1: Demo Protocol (2-5 Images)

Purpose:
- Structure your demonstration consistently.

Recommended protocol:
1. Choose one baseline/reference image.
2. Add 1 to 4 comparison images.
3. Keep modality and preprocessing consistent.
4. Rank complexity using Stage 3 metrics before writing conclusions.

### Stage 2: Reporting Template

Purpose:
- Standardize communication and reduce over-claiming.

Includes:
- Research question placeholder
- Modality/preprocessing placeholder
- Fixed scale set
- Auto-inserted key result summary
- Per-image metrics (D, R2, points)
- Safety note

Use Copy Stage 2 report to copy the template to your clipboard for reports, notes, or slides.

### Stage 3: Dataset Acquisition Guide

Purpose:
- Help build reproducible comparisons.

Current reference links include:
- OASIS (healthy/control structural MRI cohorts)
- IXI (healthy multi-sequence MRI)
- TCIA access portal
- BraTS overview paper (heterogeneous tumor subregions)

## Safety Interpretation Mode

Toggle: Safe interpretation mode (Step 4)

When enabled:
- Interpretation language is softened
- Non-diagnostic framing is emphasized

Recommended practice:
- Keep this mode enabled for teaching, reporting, and stakeholder communication unless you are drafting method-focused internal notes.

## Keyboard Shortcuts (Step 4)

When analysis results are present:
- Press 1 -> jump to Stage 1
- Press 2 -> jump to Stage 2
- Press 3 -> jump to Stage 3

Shortcut guards:
- Shortcuts are ignored while typing in input, textarea, select, or editable fields.

## Output Fields You Should Report

Minimum recommended fields:
- Image label
- Fractal Dimension (D)
- R2
- Box sizes used
- Occupied box counts by scale

For cohorts (3 to 5 images), also include:
- Highest and lowest D
- Spread (max - min)
- Mean D
- Standard deviation

## Suggested Analysis Patterns

## Pattern A: Pairwise Comparison

Use when you need a direct A vs B structural comparison.

Checklist:
1. Verify same modality and preprocessing.
2. Compare D and R2 together.
3. Use chart focus to inspect each line.
4. Report absolute and percent delta carefully.

## Pattern B: Cohort Ranking (3-5 Images)

Use when exploring group diversity.

Checklist:
1. Keep one reference image fixed.
2. Compare rank order by D.
3. Use spread and standard deviation for variability.
4. Flag outliers for deeper review.

## Pattern C: Communication-First Reporting

Use when sharing with mixed audiences.

Checklist:
1. Keep Safe interpretation mode enabled.
2. Use Stage 2 template as canonical summary.
3. Add sequence/modality caveat in conclusions.
4. Avoid diagnostic wording.

## Troubleshooting

## Compare button disabled

Cause:
- Fewer than 2 active uploaded images.

Fix:
- Upload at least two images in active slots.

## Unexpectedly different results

Common causes:
- Modality mismatch
- Different preprocessing pipelines
- Different crop/field-of-view scale

Fix:
- Recreate a consistent cohort and rerun.

## Poor fit quality (low R2)

Cause:
- Weak linear scaling behavior across selected box sizes.

Fix:
- Verify image quality and preprocessing consistency.
- Treat interpretation as low confidence.

## Clipboard copy does not work

Cause:
- Browser/permission restrictions.

Fix:
- Copy manually from the Stage 2 template block.

## Visual overload in Step 3 chart

Fix:
- Click legend items to isolate one series and fade others.

## FAQ

## Is a higher D always better?

No. D is a structural complexity descriptor, not a quality score.

## Can I use this alone for clinical decisions?

No. Use as a quantitative support signal with domain expertise and full clinical context.

## Why fixed box sizes (8, 16, 32)?

A fixed shared scale set improves comparability across images in this workflow.

## Version Notes

This guide reflects the current Compare UI with:
- 2-5 image workflow
- 4-step analysis layout
- 3-stage interpretation module
- Safe interpretation mode
- Stage shortcuts (1/2/3)

If the UI changes, update this guide with matching controls and labels.
