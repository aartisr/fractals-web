# Search Discovery and IndexNow Operations

Fractals Web publishes two distinct public surfaces. Keep their canonical URLs, sitemaps, and IndexNow verification keys separate.

| Surface | Canonical URL | Sitemap source | Deployment path |
| --- | --- | --- | --- |
| Product application | `https://fractals.ai-aarti.com` | `public/sitemap.xml` | Vercel production deployment |
| Public guide | `https://aartisr.github.io/fractals-web/` | `pages/sitemap.xml` | GitHub Pages workflow |

## Crawl discovery

Each surface publishes a `robots.txt` that references its sitemap. Submit both sitemap URLs to the matching site properties in Google Search Console and Bing Webmaster Tools. A sitemap supports crawler discovery; it does not replace a search-engine submission or guarantee indexing.

## IndexNow automation

The tracked verification-key files are intentionally public. Their file names, contents, and `keyLocation` values must agree.

- **GitHub Pages:** `Deploy GitHub Pages` deploys `pages/`, then submits every URL in `pages/sitemap.xml` to IndexNow.
- **Canonical site:** `Submit Canonical Sitemap to IndexNow` runs after a successful GitHub deployment-status event for the Vercel `Production` environment, then submits every URL in `public/sitemap.xml`.
- **Manual fallback:** Run `Submit Canonical Sitemap to IndexNow` from the Actions tab after the canonical Vercel deployment is live. This is required when the Vercel integration does not publish a qualifying GitHub deployment-status event.

IndexNow acceptance means the endpoint accepted or queued the URL notification; it does not guarantee search indexing.

## Generic submission command

`npm run submit:indexnow` extracts every `<loc>` from a sitemap, rejects mixed-host URL lists, and sends the JSON request to `https://api.indexnow.org/indexnow`.

```sh
npm run submit:indexnow -- \
  --key <public-indexnow-key> \
  --key-location https://example.com/<public-indexnow-key>.txt \
  --sitemap public/sitemap.xml \
  --dry-run
```

Remove `--dry-run` to make the request. The command also accepts `INDEXNOW_KEY`, `INDEXNOW_KEY_LOCATION`, `INDEXNOW_SITEMAP`, and optional `INDEXNOW_ENDPOINT` environment variables. Use `npm run submit:indexnow -- --help` to display the interface.

Run the dry check before changing an automation workflow. It reports the exact `host`, `keyLocation`, and complete URL list without contacting IndexNow.

## Release verification

After deployment, verify all of the following before considering search-discovery work complete:

1. The live sitemap and `robots.txt` use the intended host.
2. The live key URL returns the exact key text.
3. The relevant GitHub Actions run reports an accepted IndexNow response (`200` or `202`).
4. The analytics-free crawl path works without visitor consent; analytics configuration must never block SEO assets or application routes.
