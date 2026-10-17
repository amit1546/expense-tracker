import { describe, it, expect } from 'vitest';
import { backupFilename, makeBackup, parseBackup } from './backup.js';

const data = {
  expenses: [{ id: 'e1', amount: 45, date: '2026-10-03', category: 'food', description: 'קפה' }],
  recurring: [
    {
      id: 'r1',
      amount: 200,
      category: 'health',
      description: 'חדר כושר',
      day: 5,
      startMonth: '2026-09',
      endMonth: '2026-12',
    },
  ],
  budgets: { total: 4000, categories: { food: 800 } },
};

describe('backup', () => {
  it('names the file after the app and the date', () => {
    expect(backupFilename('2026-10-17')).toBe('מעקב הוצאות 2026-10-17.json');
  });

  it('round-trips everything', () => {
    expect(parseBackup(makeBackup(data))).toEqual(data);
  });

  it('rejects files that are not ours', () => {
    expect(() => parseBackup('not json')).toThrow('אינו קובץ גיבוי תקין');
    expect(() => parseBackup(JSON.stringify({ hello: 1 }))).toThrow('אינו קובץ גיבוי של מעקב הוצאות');
  });

  it('drops broken rows and maps unknown categories to "other"', () => {
    const text = JSON.stringify({
      app: 'expense-tracker',
      expenses: [
        { id: 'a', amount: -5, date: '2026-10-03', category: 'food' },
        { id: 'b', amount: 10, date: 'yesterday', category: 'food' },
        { id: 'c', amount: 10, date: '2026-10-03', category: 'housing' },
      ],
      recurring: [{ id: 'r', amount: 10, day: 40, startMonth: '2026-10', category: 'food' }],
    });
    const parsed = parseBackup(text);
    expect(parsed.expenses).toEqual([{ id: 'c', amount: 10, date: '2026-10-03', category: 'other', description: '' }]);
    expect(parsed.recurring).toEqual([]);
    expect(parsed.budgets).toEqual({ total: null, categories: {} });
  });
});
