import { describe, it, expect } from 'vitest';
import { filterAndSort as search } from './list.js';

const names = { food: 'אוכל', bills: 'חשבונות' };
const filterAndSort = (rows, opts = {}) => search(rows, { categoryName: (id) => names[id] ?? id, ...opts });

const rows = [
  { id: 'a', amount: 50, date: '2026-10-03', category: 'food', description: 'פיצה' },
  { id: 'b', amount: 300, date: '2026-10-09', category: 'bills', description: 'חשמל' },
  { id: 'c', amount: 120, date: '2026-10-05', category: 'food', description: 'סופר' },
];

describe('filterAndSort', () => {
  it('sorts by date, newest first, by default', () => {
    expect(filterAndSort(rows).map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by amount in both directions', () => {
    expect(filterAndSort(rows, { sort: 'amount-desc' }).map((r) => r.id)).toEqual(['b', 'c', 'a']);
    expect(filterAndSort(rows, { sort: 'amount-asc' }).map((r) => r.id)).toEqual(['a', 'c', 'b']);
    expect(filterAndSort(rows, { sort: 'date-asc' }).map((r) => r.id)).toEqual(['a', 'c', 'b']);
  });

  it('searches the description, the category name and the amount', () => {
    expect(filterAndSort(rows, { query: 'חשמל' }).map((r) => r.id)).toEqual(['b']);
    expect(filterAndSort(rows, { query: 'אוכל' }).map((r) => r.id)).toEqual(['c', 'a']);
    expect(filterAndSort(rows, { query: '120' }).map((r) => r.id)).toEqual(['c']);
    expect(filterAndSort(rows, { query: '  ' })).toHaveLength(3);
  });

  it('does not change the input', () => {
    const copy = [...rows];
    filterAndSort(rows, { sort: 'amount-asc' });
    expect(rows).toEqual(copy);
  });
});
