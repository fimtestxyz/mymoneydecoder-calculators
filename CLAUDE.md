# CLAUDE.md — MyMoneyDecoder

## Architecture

Static site, no build step, no backend, no dependencies.

- `calculators.js` — pure calculation engine. No DOM. UMD: `window.MMD` in
  the browser, `module.exports` in Node. All money in SGD, rates in %/yr.
  Change math here, never inline in a page script.
- `app.js` — shared store, formatting, charts, consent UI.
  - Store: sessionStorage key `mmd-shared-v1` (shared across pages in one
    tab, gone on close). localStorage copy ONLY when the user opts in via
    "Remember my inputs". `Clear my data` wipes both.
  - Never persist anything without consent. Never send numbers anywhere.
- One HTML file per calculator, same four-part structure: inputs →
  assumptions → results → insights, plus a methodology box.
- `test/calculators.test.mjs` — Node built-in test runner. Every number in
  spec §7 has a test. Run before every push.

## Conventions

- Spec first: `spec.md` holds scope + acceptance criteria. Update it when
  scope changes.
- Tests before push: `node --check calculators.js app.js && node --test test/*.test.mjs`
  must be green. CI runs the same on every push to `main`.
- Currency: SGD (S$) everywhere. Singapore context (CPF, HDB/private property).
- Calculators are educational tools: every page carries the not-financial-advice
  line; never present a figure as a guarantee.
- Money inputs are plain `<input type="number">`; parse with
  `MMDApp.parseMoney` (strips commas / S$).

## Pushing

- Local dir `~/workspace/mymoneydecoder/` is NOT a git repo; push via the
  GitHub App `push-files` with `--source-dir`, paths file NUL-delimited
  with trailing NUL, kept under `~/workspace`. Target repo:
  `fimtestxyz/mymoneydecoder-calculators` (public). Do NOT push to
  `fimtestxyz/mymoneydecoder` — that is a different project (bank interest
  rate event pipeline, private, 7 commits) and must be left untouched.
- Verify remote head with `list_commits` before pushing; append to
  `~/workspace/mymoneydecoder.muse-github-snapshot-sync.json` after.
- The App cannot write `.github/workflows/` (403, whole batch fails) and
  cannot create repos or upload binaries. Workflow files go through the
  GitHub web UI in the browser; repo creation goes through the signed-in
  browser session.
- Production branch is `main`. Vercel auto-deploys on push to `main`.
- Approval cards time out at 30 min — if a push approval expires, re-issue;
  never retry a push blindly, verify head first.
