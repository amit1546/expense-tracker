import { describe, it, expect } from 'vitest';
import { budgetStatus, normalizeBudgets } from './budget.js';

describe('budgetStatus', () => {
  it('has no status without a budget', () => {
    expect(budgetStatus(100, null)).toBeNull();
    expect(budgetStatus(100, 0)).toBeNull();
  });

  it('is ok below 80%, warns from 80%, and is over past the limit', () => {
    expect(budgetStatus(790, 1000)).toEqual({ pct: 79, state: 'ok', remaining: 210 });
    expect(budgetStatus(800, 1000).state).toBe('warn');
    expect(budgetStatus(1000, 1000).state).toBe('warn');
    expect(budgetStatus(1200.5, 1000)).toEqual({ pct: 120, state: 'over', remaining: -200.5 });
  });
});

describe('normalizeBudgets', () => {
  it('keeps positive numbers only', () => {
    expect(normalizeBudgets({ total: 4000, categories: { food: 800, fun: 0, bills: 'x' } })).toEqual({
      total: 4000,
      categories: { food: 800 },
    });
    expect(normalizeBudgets(null)).toEqual({ total: null, categories: {} });
  });
});
