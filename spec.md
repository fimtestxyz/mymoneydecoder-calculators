# MyMoneyDecoder — Spec v1.0 (launch suite)

Source requirement: Yumi's "Wealth & Freedom Calculators" brief, 2026-11-27.
Brand: **MyMoneyDecoder** — "Your wealth. Your numbers. Your freedom."
Positioning: a personal wealth intelligence platform, not a page of maths tools.
Currency: SGD (S$) throughout. Singapore context (CPF, HDB/private property).
All calculators are educational planning tools, not financial, legal or tax advice.

## 1. Scope — launch (v1.0)

Launch with the roadmap's first three, per the brief §6 (the brief also says
"six flagship tools" in §1; the next three — Wealth Compounding, Mortgage vs
Invest, Career Freedom — are wave 2, mapped as coming-soon cards).

Live in v1.0:
1. **Wealth Profile Assessment** — 5-question entry point; recommends 3 tools.
2. **Net Worth Decoder** (pillar 1, Wealth Foundations).
3. **Passive Income & Dividend Calculator** (pillar 2, Wealth Building).
4. **FIRE & Freedom Planner** (pillar 3, FIRE & Freedom — signature).
5. **My Wealth Report** — one consolidated view from the shared data model.
6. **Home** — hero, 6 pillars, 6 personas, full 12-calculator map
   (3 live, 9 coming soon with priority order).

Out of scope for v1.0 (mapped, not built): Cash Flow & Savings Decoder,
Wealth Compounding, Lifestyle Freedom, Portfolio Allocation Optimiser,
Mortgage vs Invest, Wealth Stress Test, Legacy & Wealth Transfer Planner,
Career Freedom, Family Wealth Planner.

## 2. Design principles (from the brief)

- One consistent four-part structure per calculator: inputs → assumptions →
  results → wealth insights.
- Simple mode (5–7 inputs) by default; Advanced mode reveals extra
  assumptions. Instant recalculation on any input change.
- Methodology + assumptions visible on every calculator; results explain
  what they mean in plain language.
- Visual results: bar/donut allocation, scenario comparison, projection chart.
- Save/export: results can be copied; no account needed.
- Calculators talk to each other through a shared data model: portfolio
  value, monthly expenses, age, savings entered once, pre-filled everywhere.
- Privacy: anonymous by default. Inputs are remembered on this device ONLY
  if the user opts in ("Remember my inputs on this device"). A "Clear my
  data" control deletes everything. No server, no tracking, no account.

## 3. Shared data model

Single localStorage key `mmd-shared-v1`, written only when the user opts in.
Fields (all optional, S$ unless noted): age, annualExpenses, monthlySavings,
portfolioValue, monthlyContribution, expectedReturn, cash, investments,
cpf, propertyValue, mortgage, otherLiabilities, dividendYield, rocPct,
reinvestPct, dividendGrowth, withdrawalRate.
Each calculator reads shared fields to pre-fill and writes back what the user
enters (when opted in). `app.js` owns the store; `calculators.js` owns pure
math (no DOM) so it can be unit-tested in Node.

## 4. Calculator specs

### 4.1 Net Worth Decoder
Inputs: cash & deposits; stocks/ETFs/bonds/funds; CPF balances; property
value; mortgage; other liabilities.
Outputs: total net worth; investable net worth (cash + investments, excludes
CPF + property); liquid assets (cash & deposits); debt-to-asset ratio;
asset allocation (donut: cash / investments / CPF / property, % of gross
assets); wealth composition bar.
Definitions shown on page: investable excludes CPF + primary property
because they are not readily deployable; liquid = cash & deposits only.

### 4.2 Passive Income & Dividend Calculator
Inputs (simple): portfolio value; expected annual distribution yield;
return-of-capital % (what share of distributions is ROC, not genuine
income); reinvestment %; expected dividend growth (advanced); annual
expenses (advanced, pre-filled from shared model, for coverage).
Outputs: annual distributions; monthly distributions; genuine annual income
(distributions × (1 − ROC%)); genuine monthly income; income coverage ratio
(genuine annual income ÷ annual expenses); 10-year reinvestment projection
(portfolio + income with growth + reinvestment); capital sustainability note
(whether withdrawals exceed genuine income).
Example from brief must reproduce: S$2,000,000 at 8.0% → S$160,000/yr,
S$13,333/mo before separating ROC.

### 4.3 FIRE & Freedom Planner (signature)
Modes: Lean FIRE, Coast FIRE, Barista FIRE, Traditional FIRE, Fat FIRE,
Income-based FIRE.
Inputs (simple): current age; target retirement age (for Coast);
annual expenses (lean/current/fat selectable via lifestyle preset);
current investable portfolio; monthly savings; expected real return;
withdrawal rate (advanced, default 4.0%).
Outputs: FIRE number (annual expenses ÷ withdrawal rate); earliest FIRE age
(year-by-year projection, max 60 years); freedom gap (FIRE number −
portfolio); passive income coverage; portfolio longevity (years the
portfolio lasts withdrawing annual expenses at the given return, capped
display at 60+); per-mode note:
- Lean: expenses × 0.7 as the target lifestyle.
- Coast: the "coast number" — portfolio needed TODAY so compounding alone
  reaches the FIRE number by target age, with no further contributions.
- Barista: part-time income input reduces the expenses the portfolio must
  cover (FIRE number computed on reduced expenses).
- Fat: expenses × 1.5 as the target lifestyle.
- Income-based: target monthly passive income input instead of expenses;
  FIRE number = monthly income × 12 ÷ withdrawal rate.
Projection chart: portfolio value by year until FIRE number (or age 70).

### 4.4 Wealth Profile Assessment
5 questions (exactly as briefed): age group; net worth band; main income
source; biggest financial goal; where you are today. No exact balances
required ("Prefer not to disclose" allowed).
Mapping: goal → primary pillar; net worth + age + income source → persona
(A Young Wealth Builder, B Family Wealth Builder, C Affluent Professional,
D Pre-Retiree, E Financially Independent, F Entrepreneur/Business Owner).
Output: persona name + one-line description; 3 recommended calculators
(from the full 12, marked Live or Coming soon); "your next milestone" line;
buttons into the live ones. Example from brief must reproduce: S$3m,
salary + dividend income, early-retirement goal → "The Affluent Wealth
Builder" → FIRE Planner, Passive Income, Mortgage vs Invest.

### 4.5 My Wealth Report
Reads the shared model only (never asks for new numbers): net worth
summary (if net-worth inputs present), passive income summary (if portfolio
+ yield present), FIRE progress (FIRE number, % of the way there, years to
go at current savings). If a section has no data, it says so and links to
the calculator that fills it. One "copy summary" button.

## 5. Home page
Hero (brief §8 copy): "Your wealth. Your numbers. Your freedom." +
"Where are you on your wealth journey?" + "Discover Your Wealth Profile →".
Six pillars with their calculators (live vs coming soon). Six personas with
key question + recommended tools. Three customer types (mass affluent /
affluent-HNW / financially independent). Footer disclaimer: educational
only, not financial advice.

## 6. Tech
Static site, no build step, no backend, no dependencies: `index.html`,
`assessment.html`, `net-worth.html`, `passive-income.html`, `fire.html`,
`report.html`, `styles.css`, `app.js` (store + formatting + shared UI),
`calculators.js` (pure math, also loaded by Node tests).
Hosting: GitHub repo `fimtestxyz/mymoneydecoder-calculators` (public), Vercel.
CI: `.github/workflows/ci.yml` runs `node --check` on all JS + `node
--test test/` on every push (uploaded via browser web UI — the GitHub App
cannot write workflows).

## 7. Acceptance criteria (v1.0 done = all true)
- [ ] All 5 live pages render; every input recalculates instantly.
- [ ] Net Worth math: worked example verified by test (cash 50k, inv 200k,
  CPF 150k, property 800k, mortgage 400k, other 20k → total 780k,
  investable 250k, liquid 50k, debt-to-asset 35%).
- [ ] Passive Income: S$2m @ 8% → S$160,000/yr, S$13,333/mo (test).
- [ ] FIRE: expenses S$60k/yr, 4% rule → FIRE number S$1.5m (test);
  projection reaches it and earliest FIRE age is sensible (test).
- [ ] Assessment: the brief's S$3m example → persona C (The Affluent
  Professional) with the three named recommendations (FIRE, Passive Income,
  Mortgage vs Invest) (test).
- [ ] Shared model: entering a portfolio value in one calculator pre-fills
  it in the others (manual check); opt-in off by default; Clear my data
  wipes localStorage.
- [ ] Live E2E on the deployed URL: assessment completes, all three
  calculators produce results, report page aggregates.
- [ ] No console errors on any page; mobile layout usable.
