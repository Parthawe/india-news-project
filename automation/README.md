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
