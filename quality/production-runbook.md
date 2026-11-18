# Production operations

## Releases

Application work uses `codex/` source branches and private PRs with role reports and local quality receipts. Prepare the public export only after those checks pass. Open a public delivery PR; `Delivery quality / delivery-checks` validates collector invariants, tracked-file hygiene, all internal links/anchors and browser reader journeys. Merge as the accountable owner, then verify the Pages run and live pages. Do not claim the private local receipt is a GitHub-attested source build.

Automated daily metadata uses the same collector and delivery checks before deployment. Its Git commits cannot require a human PR review without stopping the agreed unattended updates. Main blocks force pushes and deletion; contributor PR review is a process control, not a claim that every main write is branch-gated.

Public standard Ubuntu runners are free under GitHub's current policy. Private hosted Actions are disabled. No paid observability, larger runners, model calls, API keys or newsletter delivery are introduced by QA. Minimise artifact/cache storage; browser checks do not upload screenshots or private data. Existing Pages artifacts retain only their configured short lifetime.

## Failed release

The previous deployment stays live when validation fails before deploy. Check the failed Actions step and reproduce locally. Never force push an archive update over a newer release. If main changed during collection, rerun the workflow against latest after the current deployment finishes. Do not close an incident until the live reader journey and current index have been checked.

## Rollback

Choose the last successful deployment commit from Actions. For a reader-only regression, restore its affected public HTML/CSS/JS through a new PR and let delivery checks run. Preserve `news/YYYY-MM-DD.json` history and current metadata unless the incident is in those records. For a collector regression, revert the collector changes through a new PR, then manually run `Daily news and Pages`. For Worker changes, inspect and roll back the Cloudflare deployment separately; reverting static files does not roll back the private review database. Never paste Worker credentials or private links into an issue.

## Incident severity

P0: private data exposure, unexpected spending or widespread unavailable reading/review. Stop the affected path, preserve evidence privately and notify the owner through the existing GitHub account workflow. P1: a primary reading or collection journey fails. P2: a constrained rendering, language or secondary-flow defect. Open a sanitised incident with public URL, impact, detection, mitigation, owner and follow-up. Do not invent uptime or imply continuous monitoring; current checks run during PRs and the two daily production jobs.

## Health evidence

Actions status, `/news/health.json`, `/news/coverage-index.json`, a valid five-item daily cap, and browser smoke results. A successful HTTP request alone does not establish correct analysis, source completeness, translated accuracy or full-text extraction.

Production workflow failures create or update one sanitised public incident through `Production failure triage`. Only the main production workflow is eligible; PR failures do not open production incidents. The bot includes the run URL and conclusion, never logs or report text. It does not claim to diagnose, fix or close the incident. Recovery and follow-up remain a separate AI operating task.
