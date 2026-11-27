// MyMoneyDecoder — calculation engine (pure functions, no DOM).
// Works in the browser (window.MMD) and in Node (module.exports) for tests.
// All money in SGD. All rates in percent per year unless noted.
(function (root) {
  'use strict';

  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : (fallback || 0);
  }
  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  // ---- 01. Net Worth Decoder -------------------------------------------
  // investable = cash + investments (excludes CPF + property: not readily
  // deployable). liquid = cash & deposits only.
  function netWorth(input) {
    const cash = Math.max(0, num(input.cash));
    const investments = Math.max(0, num(input.investments));
    const cpf = Math.max(0, num(input.cpf));
    const property = Math.max(0, num(input.property));
    const mortgage = Math.max(0, num(input.mortgage));
    const other = Math.max(0, num(input.otherLiabilities));
    const grossAssets = cash + investments + cpf + property;
    const liabilities = mortgage + other;
    const total = grossAssets - liabilities;
    const investable = cash + investments;
    const liquid = cash;
    const debtToAsset = grossAssets > 0 ? liabilities / grossAssets : 0;
    const allocation = grossAssets > 0
      ? { cash: cash / grossAssets, investments: investments / grossAssets,
          cpf: cpf / grossAssets, property: property / grossAssets }
      : { cash: 0, investments: 0, cpf: 0, property: 0 };
    return { grossAssets, liabilities, total, investable, liquid,
      debtToAsset, allocation };
  }

  // ---- 04. Passive Income & Dividend Calculator -------------------------
  // Model: distributions = portfolio x yield. Genuine income excludes the
  // return-of-capital share. Each year the portfolio grows by dividend
  // growth, plus reinvested distributions; the return-of-capital share
  // that is NOT reinvested drains capital.
  function passiveIncome(input) {
    const portfolio = Math.max(0, num(input.portfolio));
    const yieldPct = clamp(num(input.yieldPct), 0, 30);
    const rocPct = clamp(num(input.rocPct), 0, 100);
    const reinvestPct = clamp(num(input.reinvestPct), 0, 100);
    const divGrowthPct = clamp(num(input.divGrowthPct), -10, 20);
    const annualExpenses = Math.max(0, num(input.annualExpenses));
    const y = yieldPct / 100, roc = rocPct / 100, re = reinvestPct / 100;
    const g = divGrowthPct / 100;

    const annualDist = portfolio * y;
    const monthlyDist = annualDist / 12;
    const genuineAnnual = annualDist * (1 - roc);
    const genuineMonthly = genuineAnnual / 12;
    const coverage = annualExpenses > 0 ? genuineAnnual / annualExpenses : null;

    // 10-year projection.
    const projection = [];
    let p = portfolio;
    for (let yr = 1; yr <= 10; yr++) {
      const dist = p * y;
      const reinvested = dist * re;
      const rocDrain = dist * roc * (1 - re);
      p = p * (1 + g) + reinvested - rocDrain;
      if (p < 0) p = 0;
      projection.push({ year: yr, portfolio: p, income: dist * (1 - roc) });
    }

    // Capital sustainability: the portfolio shrinks when the
    // return-of-capital drain exceeds growth + reinvestment.
    // Net yearly change rate = g + y*reinvest - y*roc*(1-reinvest).
    // If negative, capital halves in ln(0.5)/ln(1+rate) years.
    const netRate = g + y * re - y * roc * (1 - re);
    const sustainable = netRate >= 0;
    const yearsToHalve = !sustainable
      ? Math.log(0.5) / Math.log(1 + netRate) : null;
    return { annualDist, monthlyDist, genuineAnnual, genuineMonthly,
      coverage, projection, sustainable, yearsToHalve };
  }

  // ---- 05. FIRE & Freedom Planner ---------------------------------------
  // FIRE number = effective annual expenses / withdrawal rate.
  // Modes adjust the expenses the portfolio must cover:
  //  lean: expenses x 0.7 | fat: expenses x 1.5 |
  //  barista: expenses minus part-time income | income-based: target
  //  monthly passive income x 12 replaces expenses entirely.
  // Coast FIRE: coast number = FIRE number discounted to today at the
  // real return, with no further contributions.
  function firePlan(input) {
    const age = clamp(num(input.age, 30), 18, 80);
    const targetAge = clamp(num(input.targetAge, 60), age, 80);
    const annualExpenses = Math.max(0, num(input.annualExpenses));
    const portfolio = Math.max(0, num(input.portfolio));
    const monthlySavings = Math.max(0, num(input.monthlySavings));
    const realReturnPct = clamp(num(input.realReturnPct, 5), -5, 15);
    const withdrawalRatePct = clamp(num(input.withdrawalRatePct, 4), 1, 10);
    const mode = (input.mode || 'traditional').toString();
    const partTimeMonthly = Math.max(0, num(input.partTimeMonthly));
    const targetMonthlyIncome = Math.max(0, num(input.targetMonthlyIncome));
    const r = realReturnPct / 100;
    const wr = withdrawalRatePct / 100;

    let effectiveExpenses = annualExpenses;
    if (mode === 'lean') effectiveExpenses = annualExpenses * 0.7;
    if (mode === 'fat') effectiveExpenses = annualExpenses * 1.5;
    if (mode === 'barista') {
      effectiveExpenses = Math.max(0, annualExpenses - partTimeMonthly * 12);
    }
    if (mode === 'income') effectiveExpenses = targetMonthlyIncome * 12;

    const fireNumber = wr > 0 ? effectiveExpenses / wr : 0;
    const freedomGap = Math.max(0, fireNumber - portfolio);
    const coverage = effectiveExpenses > 0
      ? (portfolio * wr) / effectiveExpenses : 0;

    // Year-by-year projection (contributions added after growth each year).
    const projection = [];
    let p = portfolio;
    let yearsToFire = null;
    const MAX_YEARS = 60;
    for (let yr = 1; yr <= MAX_YEARS; yr++) {
      p = p * (1 + r) + monthlySavings * 12;
      projection.push({ year: yr, age: age + yr, value: p });
      if (yearsToFire === null && fireNumber > 0 && p >= fireNumber) {
        yearsToFire = yr;
      }
      if (yearsToFire !== null && yr >= yearsToFire + 5) break;
      if (yr >= 40 && yearsToFire === null) break;
    }
    const fireAge = yearsToFire !== null ? age + yearsToFire : null;

    // Portfolio longevity: withdraw effectiveExpenses yearly, portfolio
    // grows at r. Cap at 100 years (reported as 60+).
    let longevityYears = null;
    {
      let q = portfolio;
      for (let yr = 1; yr <= 100; yr++) {
        q = q * (1 + r) - effectiveExpenses;
        if (q <= 0) { longevityYears = yr; break; }
      }
      if (longevityYears === null) longevityYears = 100; // effectively perpetual
    }

    // Coast number: what you need TODAY so compounding alone reaches the
    // FIRE number by targetAge.
    const coastYears = Math.max(0, targetAge - age);
    const coastNumber = fireNumber > 0
      ? fireNumber / Math.pow(1 + r, coastYears) : 0;

    return { mode, effectiveExpenses, fireNumber, freedomGap, coverage,
      yearsToFire, fireAge, longevityYears, coastNumber, targetAge,
      projection };
  }

  // ---- Wealth Profile Assessment ----------------------------------------
  // 12 calculators, each with a status for v1.0.
  const CALCULATORS = {
    'net-worth':      { id: 'net-worth', title: 'Net Worth Decoder', pillar: 1, live: true, url: 'net-worth.html' },
    'cash-flow':      { id: 'cash-flow', title: 'Cash Flow & Savings Decoder', pillar: 1, live: false },
    'compounding':    { id: 'compounding', title: 'Wealth Compounding Calculator', pillar: 2, live: false },
    'passive-income': { id: 'passive-income', title: 'Passive Income & Dividend Calculator', pillar: 2, live: true, url: 'passive-income.html' },
    'fire':           { id: 'fire', title: 'FIRE & Freedom Planner', pillar: 3, live: true, url: 'fire.html' },
    'lifestyle':      { id: 'lifestyle', title: 'Lifestyle Freedom Calculator', pillar: 3, live: false },
    'portfolio-opt':  { id: 'portfolio-opt', title: 'Portfolio Allocation Optimiser', pillar: 4, live: false },
    'mortgage':       { id: 'mortgage', title: 'Mortgage vs Invest Calculator', pillar: 4, live: false },
    'stress-test':    { id: 'stress-test', title: 'Wealth Stress Test Calculator', pillar: 5, live: false },
    'legacy':         { id: 'legacy', title: 'Legacy & Wealth Transfer Planner', pillar: 5, live: false },
    'career':         { id: 'career', title: 'Career Freedom Calculator', pillar: 6, live: false },
    'family':         { id: 'family', title: 'Family Wealth Planner', pillar: 6, live: false },
  };

  const PERSONAS = {
    A: { id: 'A', name: 'The Young Wealth Builder',
      tagline: 'Building your first S$100k–500k, growing salary and savings.',
      question: 'How do I build my first million?',
      tools: ['net-worth', 'cash-flow', 'compounding'] },
    B: { id: 'B', name: 'The Family Wealth Builder',
      tagline: 'Mortgage and children, dual income, planning education and retirement together.',
      question: 'Can I build wealth while enjoying family life?',
      tools: ['family', 'mortgage', 'fire'] },
    C: { id: 'C', name: 'The Affluent Professional',
      tagline: 'S$1M–5M+ wealth, high income, multiple assets, eyeing early retirement.',
      question: 'Have I accumulated enough wealth to buy back my time?',
      tools: ['passive-income', 'fire', 'portfolio-opt'] },
    D: { id: 'D', name: 'The Pre-Retiree',
      tagline: 'Wealth accumulated, CPF and retirement planning, moving from salary to passive income.',
      question: 'Can I retire comfortably without running out of money?',
      tools: ['fire', 'stress-test', 'passive-income'] },
    E: { id: 'E', name: 'The Financially Independent',
      tagline: 'Assets already accumulated, living from investment income, protecting capital and legacy.',
      question: 'How do I preserve my wealth while enjoying it?',
      tools: ['passive-income', 'legacy', 'stress-test'] },
    F: { id: 'F', name: 'The Entrepreneur / Business Owner',
      tagline: 'Irregular income, business equity, concentrated wealth, uncertain exit timing.',
      question: 'How do I turn business success into personal financial freedom?',
      tools: ['fire', 'mortgage', 'compounding'] },
  };

  const GOAL_TOOLS = {
    'first-million': ['net-worth', 'compounding', 'cash-flow'],
    'grow-optimise': ['portfolio-opt', 'passive-income', 'compounding'],
    'financial-independence': ['fire', 'passive-income', 'compounding'],
    'retire-comfortably': ['fire', 'stress-test', 'passive-income'],
    'preserve-transfer': ['legacy', 'stress-test', 'passive-income'],
    'career-freedom': ['career', 'fire', 'passive-income'],
  };

  const GOAL_MILESTONES = {
    'first-million': 'Your next milestone: reach your first S$100k, then let compounding do the heavy lifting.',
    'grow-optimise': 'Your next milestone: find the one allocation change that adds the most return per unit of risk.',
    'financial-independence': 'Your next milestone: determine whether your investment income can replace your employment income.',
    'retire-comfortably': 'Your next milestone: confirm your portfolio survives a 30-year retirement, even in a bad decade.',
    'preserve-transfer': 'Your next milestone: put a number on what you want to leave behind, then work backwards.',
    'career-freedom': 'Your next milestone: build enough runway to choose your next chapter instead of being pushed into it.',
  };

  // Net worth bands: 'under-100k' | '100k-500k' | '500k-1m' | '1m-3m' |
  // '3m-5m' | 'over-5m' | 'prefer-not-to-say'. Age groups: 'under-30' |
  // '30-39' | '40-49' | '50-59' | '60-plus'. Income: 'salary' |
  // 'business' | 'salary-investment' | 'investment' | 'retirement'.
  function assessProfile(a) {
    const ageGroup = (a.ageGroup || '').toString();
    const nw = (a.netWorthBand || '').toString();
    const income = (a.incomeSource || '').toString();
    const goal = (a.goal || 'financial-independence').toString();
    const stage = (a.stage || '').toString();

    let personaId;
    if (income === 'business') personaId = 'F';
    else if (income === 'investment' || income === 'retirement' ||
      stage === 'independent') personaId = 'E';
    else if ((nw === '1m-3m' || nw === '3m-5m' || nw === 'over-5m') &&
      (ageGroup === '40-49' || ageGroup === '50-59' || ageGroup === '60-plus')) personaId = 'C';
    else if (ageGroup === '50-59' || ageGroup === '60-plus' ||
      stage === 'preparing-retirement') personaId = 'D';
    else if (ageGroup === 'under-30' || nw === 'under-100k' ||
      stage === 'building') personaId = 'A';
    else personaId = 'B';

    // Brief's worked example: S$3m, salary + dividend income, early
    // retirement goal -> Affluent Wealth Builder with FIRE, Passive
    // Income, Mortgage vs Invest.
    let recommendedIds;
    if (personaId === 'C' && income === 'salary-investment' &&
      (nw === '1m-3m' || nw === '3m-5m' || nw === 'over-5m') &&
      goal === 'financial-independence') {
      recommendedIds = ['fire', 'passive-income', 'mortgage'];
    } else {
      const seen = new Set();
      recommendedIds = [];
      const pools = [GOAL_TOOLS[goal] || GOAL_TOOLS['financial-independence'],
        PERSONAS[personaId].tools];
      for (const pool of pools) {
        for (const id of pool) {
          if (!seen.has(id) && recommendedIds.length < 3) {
            seen.add(id);
            recommendedIds.push(id);
          }
        }
      }
    }

    return {
      persona: PERSONAS[personaId],
      recommendations: recommendedIds.map(id => CALCULATORS[id]),
      milestone: GOAL_MILESTONES[goal] || GOAL_MILESTONES['financial-independence'],
    };
  }

  const api = { netWorth, passiveIncome, firePlan, assessProfile,
    CALCULATORS, PERSONAS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MMD = api;
})(typeof window !== 'undefined' ? window : globalThis);
