import { describe, it, expect } from 'vitest';
import { filterByMonth, total, totalsByCategory, shiftMonth, lastMonthsTotals } from './summary.js';

const expenses = [
  { id: '1', amount: 10.1, date: '2026-10-01', category: 'food', description: '' },
  { id: '2', amount: 20.2, date: '2026-10-15', category: 'food', description: '' },
  { id: '3', amount: 100, date: '2026-10-20', category: 'bills', description: '' },
  { id: '4', amount: 50, date: '2026-09-30', category: 'food', description: '' },
];

describe('summary', () => {
  it('filters by month', () => {
    expect(filterByMonth(expenses, '2026-10').map((e) => e.id)).toEqual(['1', '2', '3']);
  });

  it('totals without float noise', () => {
    expect(total(filterByMonth(expenses, '2026-10'))).toBe(130.3);
  });

  it('totals by category, sorted descending', () => {
    expect(totalsByCategory(filterByMonth(expenses, '2026-10'))).toEqual([
      { category: 'bills', total: 100 },
      { category: 'food', total: 30.3 },
    ]);
  });

  it('shifts months across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
  });

  it('builds last-N-months series', () => {
    expect(lastMonthsTotals(expenses, '2026-10', 3)).toEqual([
      { month: '2026-08', total: 0 },
      { month: '2026-09', total: 50 },
      { month: '2026-10', total: 130.3 },
    ]);
  });
});
