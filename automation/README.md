# Daily official news links

This job collects at most five distinct, attributed PIB release headlines for each India calendar day. It does not produce AI summaries, political assessments or independently verified reporting. The Ganga comparison is separately researched and labelled as an editorial draft.

## Cloud operation

`.github/workflows/daily-news.yml` runs on GitHub's standard Ubuntu runner in this public repository. It runs at 08:15 and 14:15 Asia/Kolkata; GitHub can delay scheduled jobs. The afternoon run fills missing slots without replacing or increasing the day's five. Manual **Run workflow** uses the same cap. A push deploys the prepared reading site without collecting another batch.

The runner uses Node 24, installs the locked dependencies, runs selection tests, retrieves publisher metadata, commits the public daily archive, and deploys GitHub Pages. No personal computer, model API key, paid VM or paid Actions runner is required. GitHub may disable scheduled workflows after 60 days without repository activity; daily archive commits normally keep this repository active.

## Records and failures

`news/YYYY-MM-DD.json` retains each daily batch in Git. `news/latest.json`, `health.json` and the English/Hindi HTML fragments describe the current batch. Both homepage HTML files are refreshed as well, so headlines work without JavaScript. Browser refreshes also fetch the current fragment from the same Pages origin. Private article reviews and submissions are never exported here.

The publication date is parsed from each PIB release, separately from the collection timestamp. Eligible releases are from the selection date or preceding two calendar days and have not appeared in earlier batches. Releases are deduplicated by PIB ID and normalised headline. If fewer than five qualify, the site shows the actual count. A complete retrieval failure fails the workflow and leaves the previous deployment intact. Source metadata identifies collection failures. The Actions run log and `health.json` are the operational checks; no claim is made that every day must contain five eligible releases.

## Permissions and scope

The source list links the publisher's reproduction policy and official feed directory. Only publisher headlines, links, ministry and dates are republished. No article bodies, photographs or video are copied. PIB is a government source; this feed must not be presented as a politically representative sample of Indian journalism. Original headlines retain their source language in both interfaces. Additional publishers require a recorded permission review before enabling automatic republication.

`npm ci --prefix automation --ignore-scripts`

`npm test --prefix automation`

`node automation/daily-news.mjs .`

For future manual site releases, preserve existing `news/` history when copying the new export. The export script carries forward a newer cloud edition, but must not be used to delete previous daily files.

## Source index and related-report candidates

The collector now retains every valid inspected PIB headline in `news/coverage-index.json`, separately from the five daily selections. It keeps at most 2,000 metadata records from 30 days, with first/last seen timestamps and SHA-256 of the observed title. Prior snapshots remain in Git. It does not retain full article text.

Headline-overlap matching examines the latest 250 records from seven days. It requires at least three meaningful shared tokens, 0.70 Dice similarity, the same source language and publication dates no more than two days apart. Generic government terms are excluded; incompatible numeric headlines are separated. Complete-link grouping avoids chaining unrelated reports through one intermediate headline. This is a conservative candidate-generation heuristic, not verified event clustering or evidence of coordinated reporting. Cross-language grouping is not implemented.

Every candidate remains `awaiting_editor`, `confirmedSameEvent: false`, `publicationAllowed: false`. Its revision hashes member IDs and observed headline hashes. Changed membership or wording therefore invalidates that revision. The public coverage desk shows provenance and offers a URL-prefilled route into the existing private Qwen reviewer; the model runs only after submission and retains the existing shared free-plan cap. No automatic analysis publication or outlet assessment is enabled by this job.

## Reviewed source samples and monitored gaps

`source-profiles.json` separates pending research from provisional AI editorial assessments. The v2 eligibility check requires twelve complete examined articles across three topics and two identified bylines, bilingual article annotations, counterexamples, explicit edition scope, an evidence-linked rationale and an expiring approval checksum. An approval is AI-attributed, not human review. A publisher declaration or ownership relationship cannot grant eligibility. Raw article bodies remain private.

Six additional publisher RSS feeds supply attributed headline metadata only; automated full-text analysis remains disabled for these sources. The Wire English has a reviewed sample but is outside automatic monitoring because an appropriate current feed/permission scope has not been established. No English assessment transfers to a separate language edition.

Blindspot v2 uses `news/coverage-corpus.json`, reconstructed from all stored intake metadata in the seven-day India publication window before the 500-link reader cap. Successful recovery means stored records were recovered, not that every publisher archive was searched. Only fresh, healthy, active, assessed publisher groups enter cohorts. A group with no captured publication after an event began is excluded from that event’s denominator. New matching titles not yet reviewed suppress findings; an expired event review also suppresses findings. Shared wire material measures coverage, not independent confirmation. A reviewed comparison can correctly produce no qualifying blindspot.

The first reviewed comparison examines seven articles from four publishers about the 24 November 2026 Thiruparankundram ceremony and subsequent compliance dispute. The weekly publication has no later captured publication and is excluded from its denominator. The remaining cohort is below the published screening floor, so no political blindspot is asserted.

## Expanded pending-source review

The next review adds twelve qualifying English articles each for Janata Weekly, India Development Review and Mongabay India. Janata receives a provisional Left assessment of its selected commentary and credited republications. IDR is issue-dependent; Mongabay remains politically unassessed after completed review. Neither mixed contributors nor a specialist/scientific remit establish Centre. The source directory distinguishes completed review from a missing sample, access restrictions, a permission review and official communication. Research counts include retrieved candidates separately from qualifying, fully annotated articles; unexamined media does not satisfy the floor.

Blindspot method v3 adds continuous observation history. `coverage-observation.mjs` begins at the first actual successful capture, not the publication date of a backfilled article. A legacy snapshot cannot backdate history. Failed or empty feeds, excluded metadata, a feed horizon beyond the previous successful poll, or a gap longer than two hours interrupt the interval. Only sources continuously observed from an event’s start enter its gap denominator. They must also have a later captured publication opportunity. Old comparisons remain readable, but a retrospective absence cannot become a political blindspot without established observation.

Janata’s public RSS is added for attributed headline metadata only, with automatic article analysis disabled. The observed feed issue dates are older than the current seven-day publication window; it does not enlarge current political cohorts. Source monitoring and source classification are separate checks.
