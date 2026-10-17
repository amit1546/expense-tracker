import { describe, it, expect } from 'vitest';
import {
  filterByMonth,
  total,
  totalsByCategory,
  shiftMonth,
  rangeMonths,
  periodExpenses,
  monthlySeries,
  dailySeries,
  recurringIn,
  monthExpenses,
} from './summary.js';

const expenses = [
  { id: '1', amount: 10.1, date: '2026-10-01', category: 'food', description: '' },
  { id: '2', amount: 20.2, date: '2026-10-15', category: 'food', description: '' },
  { id: '3', amount: 100, date: '2026-10-20', category: 'bills', description: '' },
  { id: '4', amount: 50, date: '2026-09-30', category: 'food', description: '' },
];

const gym = { id: 'g', amount: 200, category: 'health', description: 'חדר כושר', day: 31, startMonth: '2026-09' };

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

  it('lists the months of a range, oldest first', () => {
    expect(rangeMonths('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('collects every expense in a multi-month period', () => {
    expect(periodExpenses(expenses, [], '2026-10', 2).map((e) => e.id)).toEqual(['4', '1', '2', '3']);
    expect(total(periodExpenses(expenses, [], '2026-10', 6))).toBe(180.3);
  });

  it('builds a per-month series split by category', () => {
    expect(monthlySeries(expenses, [], '2026-10', 3)).toEqual([
      { month: '2026-08', total: 0 },
      { month: '2026-09', total: 50, food: 50 },
      { month: '2026-10', total: 130.3, food: 30.3, bills: 100 },
    ]);
  });
});

describe('recurring', () => {
  it('applies from its start month on, not before', () => {
    expect(recurringIn([gym], '2026-08')).toEqual([]);
    expect(recurringIn([gym], '2026-09')).toHaveLength(1);
    expect(recurringIn([gym], '2027-03')).toHaveLength(1);
  });

  it('stops after its end month', () => {
    const ended = { ...gym, endMonth: '2026-10' };
    expect(recurringIn([ended], '2026-10')).toHaveLength(1);
    expect(recurringIn([ended], '2026-11')).toEqual([]);
  });

  it('clamps the day to the length of the month', () => {
    expect(recurringIn([gym], '2026-09')[0].date).toBe('2026-09-30');
    expect(recurringIn([gym], '2027-02')[0].date).toBe('2027-02-28');
  });

  it('adds to monthly totals and the trend series', () => {
    expect(total(monthExpenses(expenses, [gym], '2026-10'))).toBe(330.3);
    expect(monthlySeries(expenses, [gym], '2026-10', 3).map((m) => m.total)).toEqual([0, 250, 330.3]);
  });

});

describe('dailySeries', () => {
  it('has one entry per day of the month, with totals split by category', () => {
    const days = dailySeries(filterByMonth(expenses, '2026-10'), '2026-10');
    expect(days).toHaveLength(31);
    expect(days[0]).toEqual({ date: '2026-10-01', total: 10.1, food: 10.1 });
    expect(days[1]).toEqual({ date: '2026-10-02', total: 0 });
    expect(days[19]).toEqual({ date: '2026-10-20', total: 100, bills: 100 });
  });

  it('follows the length of February', () => {
    expect(dailySeries([], '2027-02')).toHaveLength(28);
  });
});
