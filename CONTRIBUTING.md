# Contributing to Fractals Web

Thank you for helping make visual inquiry clearer, more reproducible, and safer.

## Before opening a pull request

1. Keep clinical and biomedical language descriptive and non-diagnostic.
2. Add or update a focused test when changing a calculation, data contract, or safety gate.
3. Run `npm run lint`, `npm run test`, `npm run build`, and `npm run check:quality`.
4. Describe the user-facing behavior, validation performed, and any accessibility impact.

## Design and research expectations

- Prefer small, feature-local components and pure functions for calculations.
- Preserve provenance and uncertainty; do not turn exploratory output into a clinical claim.
- Never add patient data, credentials, or proprietary imaging without explicit authorization and an approved data-governance plan.
- Keep interfaces keyboard-operable and respect reduced-motion preferences.

## Pull-request checklist

- [ ] Scope is focused and documented.
- [ ] Tests cover changed behavior.
- [ ] No diagnostic, treatment, or performance claim is added without evidence.
- [ ] Documentation and citations are updated where needed.
