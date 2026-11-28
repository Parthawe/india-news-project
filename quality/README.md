# Delivery quality

Public GitHub Actions run the collector tests, guard tests, static link/anchor checks and Playwright reader smoke tests on standard Ubuntu runners. No model inference or reader submission is sent. The browser blocks external requests and checks opt-in history, deletion, source filters, Qwen URL prefill, coverage search and Hindi 320px layouts.

`npm ci --prefix quality --ignore-scripts`

`npm test --prefix quality`

`node quality/check-site.mjs .`

`QA_BASE_URL=http://127.0.0.1:3121/india-news-project/ node quality/smoke.mjs`

On a fresh runner install Chromium with `quality/node_modules/.bin/playwright install --with-deps chromium`. Public workflow artifacts exclude this directory from the website.

Pages deployment uses GitHub's documented REST API after the same collector, hygiene, link and browser checks. It requires exactly one non-expired non-empty artifact from the current run, obtains a masked Actions OIDC token and polls until built. Duplicate artifacts, failed status and timeout fail the job; timeout also cancels deployment. This avoids the official Pages action's job-scoped artifact lookup returning zero while GitHub's REST listing confirms one. No quality or publication gate is skipped.
