# MyMoneyDecoder

**Your wealth. Your numbers. Your freedom.**

A personal wealth intelligence platform: interactive Wealth & Freedom
Calculators built around six permanent brand pillars — Wealth Foundations,
Wealth Building, FIRE & Freedom, Wealth Optimisation, Wealth Preservation,
Life & Money.

Live site: https://mymoneydecoder.vercel.app (after first deploy)

## Launch suite (v1.0)

| Page | What it does |
| --- | --- |
| `index.html` | Home: hero, 6 pillars, 6 personas, 12-calculator map |
| `assessment.html` | Wealth Profile Assessment — 5 questions, recommends 3 calculators |
| `net-worth.html` | Net Worth Decoder (Pillar 1) |
| `passive-income.html` | Passive Income & Dividend Calculator (Pillar 2) |
| `fire.html` | FIRE & Freedom Planner — Lean / Coast / Barista / Traditional / Fat / Income-based (Pillar 3) |
| `report.html` | My Wealth Report — one consolidated view from the shared model |

Wave 2 (mapped as coming soon): Wealth Compounding, Mortgage vs Invest,
Career Freedom. Then: Cash Flow & Savings, Lifestyle Freedom, Portfolio
Optimiser, Stress Test, Legacy, Family Wealth Planner.

## How it works

- **Static, no backend, no dependencies.** Open `index.html` or serve the folder.
- **Shared data model.** Numbers entered once are shared across calculators
  in the same tab (sessionStorage). They vanish when the tab closes.
- **Explicit consent for saving.** "Remember my inputs" writes to
  localStorage on this device only. "Clear my data" wipes everything.
- **Pure calculation engine.** `calculators.js` has no DOM and is unit-tested
  in Node (`node --test test/`). `app.js` owns the store, formatting and charts.

## Tests

```sh
node --check calculators.js app.js
node --test test/*.test.mjs
```

## Deploy

GitHub repo `fimtestxyz/mymoneydecoder-calculators` (public), branch `main`. Vercel
auto-deploys on push to `main`. See `spec.md` for the full v1.0 spec and
acceptance criteria.

Calculators are educational planning tools, not financial, legal or tax advice.
