# nineteenseventytwo-web

The personal site at **sev.eightbitsaxlounge.com** — upcoming live music,
an 80s/90s anime watch list, 8 Bit Sax Lounge, and other projects, in a
deliberately 1996 visual register.

Static, built with Astro, served from S3 + CloudFront in `platform-prod`. The
infrastructure lives in `nineteenseventytwo-cloud`; the plan is
[`docs/plan/09-website.md`](https://github.com/nineteenseventytwo/nineteenseventytwo-platform/blob/main/docs/plan/09-website.md)
in `nineteenseventytwo-platform`.

## Working on it

```bash
npm ci
npm run dev        # http://localhost:4321
npm test           # type check, build, and the CSP inline check - what CI runs
```

Pages are `src/pages/`, the shared layout is `src/layouts/Base.astro`, and the
whole look is one stylesheet, `src/styles/site.css`. Anime and projects are
typed content collections under `src/content/` (schemas in
`src/content.config.ts`).

**No inline `<style>`, `<script>`, `style=` or `on*=` anywhere.** The site's
CSP is `script-src 'self'` / `style-src 'self'` with no `'unsafe-inline'`, set
as a CloudFront response header. `scripts/check-no-inline.mjs` fails the build
if any page would violate it.

Merging to `main` deploys (`.github/workflows/deploy.yml`).
