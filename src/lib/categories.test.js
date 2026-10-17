import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CATEGORIES,
  insertCategory,
  isNameTaken,
  lookup,
  normalizeCategories,
  removeCategoryFrom,
} from './categories.js';

describe('lookup', () => {
  it('finds categories and falls back to "other" for unknown ones', () => {
    const l = lookup(DEFAULT_CATEGORIES);
    expect(l.get('food').name).toBe('אוכל');
    expect(l.get('gone').id).toBe('other');
    expect(l.has('gone')).toBe(false);
  });
});

describe('normalizeCategories', () => {
  it('drops broken and duplicate entries and always keeps "other" last', () => {
    const list = normalizeCategories([
      { id: 'a', name: '  קפה ', color: '#112233' },
      { id: 'a', name: 'כפול', color: '#112233' },
      { id: 'b', name: '', color: '#112233' },
      { id: 'c', name: 'ספרים', color: 'red' },
    ]);
    expect(list).toEqual([
      { id: 'a', name: 'קפה', color: '#112233' },
      { id: 'c', name: 'ספרים', color: '#7b8794' },
      DEFAULT_CATEGORIES.at(-1),
    ]);
  });

  it('uses the defaults when there is nothing usable', () => {
    expect(normalizeCategories(null)).toEqual(DEFAULT_CATEGORIES);
    expect(normalizeCategories([])).toEqual(DEFAULT_CATEGORIES);
  });
});

describe('names and order', () => {
  it('detects a taken name regardless of case and spaces, except for the category itself', () => {
    expect(isNameTaken(DEFAULT_CATEGORIES, ' אוכל ')).toBe(true);
    expect(isNameTaken(DEFAULT_CATEGORIES, 'אוכל', 'food')).toBe(false);
    expect(isNameTaken(DEFAULT_CATEGORIES, 'משהו חדש')).toBe(false);
  });

  it('inserts new categories before "other"', () => {
    const list = insertCategory(DEFAULT_CATEGORIES, { id: 'x', name: 'חדש', color: '#111111' });
    expect(list.map((c) => c.id).slice(-2)).toEqual(['x', 'other']);
  });
});

describe('removeCategoryFrom', () => {
  const state = {
    categories: DEFAULT_CATEGORIES,
    expenses: [
      { id: '1', amount: 5, date: '2026-10-01', category: 'fun', description: '' },
      { id: '2', amount: 6, date: '2026-10-01', category: 'food', description: '' },
    ],
    recurring: [{ id: 'r', amount: 7, day: 1, startMonth: '2026-10', category: 'fun', description: '' }],
    budgets: { total: 100, categories: { fun: 50, food: 20 } },
  };

  it('moves the expenses to "other", drops the budget and the category', () => {
    const next = removeCategoryFrom(state, 'fun');
    expect(next.categories.some((c) => c.id === 'fun')).toBe(false);
    expect(next.expenses.map((e) => e.category)).toEqual(['other', 'food']);
    expect(next.recurring[0].category).toBe('other');
    expect(next.budgets).toEqual({ total: 100, categories: { food: 20 } });
  });

  it('never removes "other"', () => {
    expect(removeCategoryFrom(state, 'other')).toEqual(state);
  });
});
