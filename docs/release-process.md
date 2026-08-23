# Release process

1. Confirm the quality workflow is green: lint, unit tests, production build, publication checks, accessibility contracts, PWA readiness checks, and bundle budget.
2. Review biomedical wording against the evidence hub; no release may imply clinical validation that has not occurred.
3. Record user-visible and research-method changes in `CHANGELOG.md`.
4. Create a signed release tag and archive the generated build metadata and research exports when applicable.
5. After publishing, verify the canonical site, GitHub Pages guide, sitemap, and Wiki backlinks.
6. Verify each deployed IndexNow key URL returns its matching key content. Confirm the Pages deployment workflow accepted its sitemap submission. For the canonical site, confirm the `Submit Canonical Sitemap to IndexNow` workflow ran after the Vercel `Production` deployment; manually run it if Vercel did not emit a GitHub deployment-status event.
7. In both Google Search Console and Bing Webmaster Tools, verify the published sitemap is available for the corresponding domain.
8. On a real browser over HTTPS, install the PWA, load a second route offline, and confirm the release-update notice appears after a service-worker change.

Repository branch protection must be enabled by a repository administrator in GitHub settings. Require the **Quality gate / Lint, test, build, and publication checks** status before merging to `main`.
