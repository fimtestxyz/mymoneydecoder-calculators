import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import pkg from '../calculators.js';
const { netWorth, passiveIncome, firePlan, assessProfile } = pkg;

const approx = (actual, expected, tol = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= Math.abs(expected) * tol,
    `expected ${actual} to be within ${tol * 100}% of ${expected}`);

describe('Net Worth Decoder', () => {
  it('worked example from spec §7', () => {
    const r = netWorth({ cash: 50000, investments: 200000, cpf: 150000,
      property: 800000, mortgage: 400000, otherLiabilities: 20000 });
    assert.equal(r.grossAssets, 1200000);
    assert.equal(r.liabilities, 420000);
    assert.equal(r.total, 780000);
    assert.equal(r.investable, 250000);
    assert.equal(r.liquid, 50000);
    approx(r.debtToAsset, 0.35);
    approx(r.allocation.property, 800000 / 1200000);
    approx(r.allocation.cpf, 150000 / 1200000);
  });

  it('zero assets gives zero ratios, no NaN', () => {
    const r = netWorth({});
    assert.equal(r.total, 0);
    assert.equal(r.debtToAsset, 0);
  });
});

describe('Passive Income & Dividend Calculator', () => {
  it('brief example: S$2m at 8% -> S$160,000/yr, S$13,333/mo', () => {
    const r = passiveIncome({ portfolio: 2000000, yieldPct: 8, rocPct: 0,
      reinvestPct: 0, divGrowthPct: 0 });
    assert.equal(r.annualDist, 160000);
    approx(r.monthlyDist, 13333.33);
    assert.equal(r.genuineAnnual, 160000);
    assert.equal(r.sustainable, true);
  });

  it('return of capital reduces genuine income', () => {
    const r = passiveIncome({ portfolio: 1000000, yieldPct: 8, rocPct: 25,
      reinvestPct: 0, divGrowthPct: 0 });
    assert.equal(r.annualDist, 80000);
    assert.equal(r.genuineAnnual, 60000);
    // ROC drain (2%/yr of capital) with no growth and no reinvestment
    // shrinks capital: halves in ~34 years.
    assert.equal(r.sustainable, false);
    assert.ok(r.yearsToHalve > 30 && r.yearsToHalve < 40,
      `yearsToHalve ${r.yearsToHalve}`);
  });

  it('coverage ratio uses annual expenses', () => {
    const r = passiveIncome({ portfolio: 2000000, yieldPct: 8, rocPct: 0,
      reinvestPct: 0, divGrowthPct: 0, annualExpenses: 80000 });
    approx(r.coverage, 2.0);
  });
});

describe('FIRE & Freedom Planner', () => {
  it('S$60k/yr expenses at 4% -> FIRE number S$1.5m', () => {
    const r = firePlan({ age: 35, annualExpenses: 60000, portfolio: 0,
      monthlySavings: 0, realReturnPct: 5, withdrawalRatePct: 4 });
    assert.equal(r.fireNumber, 1500000);
    assert.equal(r.freedomGap, 1500000);
    assert.equal(r.yearsToFire, null);
  });

  it('projection: 35yo, S$500k, S$3k/mo, 5% real -> FIRE at 48', () => {
    const r = firePlan({ age: 35, annualExpenses: 60000, portfolio: 500000,
      monthlySavings: 3000, realReturnPct: 5, withdrawalRatePct: 4 });
    assert.equal(r.yearsToFire, 13);
    assert.equal(r.fireAge, 48);
    assert.equal(r.freedomGap, 1000000);
  });

  it('lean FIRE uses 70% of expenses; fat uses 150%', () => {
    const lean = firePlan({ age: 35, annualExpenses: 60000, portfolio: 0,
      monthlySavings: 0, mode: 'lean' });
    const fat = firePlan({ age: 35, annualExpenses: 60000, portfolio: 0,
      monthlySavings: 0, mode: 'fat' });
    assert.equal(lean.fireNumber, 1050000);
    assert.equal(fat.fireNumber, 2250000);
  });

  it('coast FIRE: S$1.5m by 60 at 5% needs ~S$443k today', () => {
    const r = firePlan({ age: 35, targetAge: 60, annualExpenses: 60000,
      portfolio: 0, monthlySavings: 0, realReturnPct: 5, mode: 'coast' });
    approx(r.coastNumber, 442973, 0.01);
  });

  it('barista FIRE subtracts part-time income from expenses', () => {
    const r = firePlan({ age: 40, annualExpenses: 60000, portfolio: 0,
      monthlySavings: 0, partTimeMonthly: 2000, mode: 'barista' });
    assert.equal(r.effectiveExpenses, 36000);
    assert.equal(r.fireNumber, 900000);
  });

  it('income-based FIRE uses target monthly income', () => {
    const r = firePlan({ age: 40, annualExpenses: 60000, portfolio: 0,
      monthlySavings: 0, targetMonthlyIncome: 8000, mode: 'income' });
    assert.equal(r.effectiveExpenses, 96000);
    assert.equal(r.fireNumber, 2400000);
  });

  it('longevity: 4% withdrawal at 5% return is effectively perpetual', () => {
    const r = firePlan({ age: 60, annualExpenses: 60000, portfolio: 1500000,
      monthlySavings: 0, realReturnPct: 5 });
    assert.equal(r.longevityYears, 100);
  });

  it('longevity: undersized portfolio depletes in the teens of years', () => {
    const r = firePlan({ age: 60, annualExpenses: 60000, portfolio: 600000,
      monthlySavings: 0, realReturnPct: 5 });
    assert.ok(r.longevityYears >= 12 && r.longevityYears <= 18,
      `longevity ${r.longevityYears}`);
  });
});

describe('Wealth Profile Assessment', () => {
  it("brief example: S$3m, salary+dividends, early retirement -> persona C, FIRE + Passive Income + Mortgage", () => {
    const r = assessProfile({ ageGroup: '40-49', netWorthBand: '3m-5m',
      incomeSource: 'salary-investment', goal: 'financial-independence',
      stage: 'growing' });
    assert.equal(r.persona.id, 'C');
    assert.deepEqual(
      r.recommendations.map(c => c.id),
      ['fire', 'passive-income', 'mortgage']);
    assert.match(r.milestone, /investment income can replace your employment income/);
  });

  it('young builder: under 30, under S$100k, first million -> persona A, Net Worth first', () => {
    const r = assessProfile({ ageGroup: 'under-30', netWorthBand: 'under-100k',
      incomeSource: 'salary', goal: 'first-million', stage: 'building' });
    assert.equal(r.persona.id, 'A');
    assert.equal(r.recommendations[0].id, 'net-worth');
  });

  it('business income -> entrepreneur persona F', () => {
    const r = assessProfile({ ageGroup: '40-49', netWorthBand: '1m-3m',
      incomeSource: 'business', goal: 'career-freedom', stage: 'growing' });
    assert.equal(r.persona.id, 'F');
  });

  it('already independent -> persona E', () => {
    const r = assessProfile({ ageGroup: '50-59', netWorthBand: 'over-5m',
      incomeSource: 'investment', goal: 'preserve-transfer',
      stage: 'independent' });
    assert.equal(r.persona.id, 'E');
    // Goal-first ordering: preserve-transfer leads with Legacy, and
    // Passive Income is still among the three.
    assert.equal(r.recommendations[0].id, 'legacy');
    assert.ok(r.recommendations.some(c => c.id === 'passive-income'));
  });
});
