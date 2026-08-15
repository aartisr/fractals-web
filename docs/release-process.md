# Release process

1. Confirm the quality workflow is green: lint, unit tests, production build, publication checks, accessibility contracts, and bundle budget.
2. Review biomedical wording against the evidence hub; no release may imply clinical validation that has not occurred.
3. Record user-visible and research-method changes in `CHANGELOG.md`.
4. Create a signed release tag and archive the generated build metadata and research exports when applicable.
5. After publishing, verify the canonical site, GitHub Pages guide, sitemap, and Wiki backlinks.

Repository branch protection must be enabled by a repository administrator in GitHub settings. Require the **Quality gate / Lint, test, build, and publication checks** status before merging to `main`.
