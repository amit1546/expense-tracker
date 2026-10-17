import { describe, it, expect } from 'vitest';
import { addDays, backupFilename, backupReminder, daysBetween, makeBackup, parseBackup } from './backup.js';
import { DEFAULT_CATEGORIES } from './categories.js';

const data = {
  categories: DEFAULT_CATEGORIES,
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

describe('categories in backups', () => {
  it('carries custom categories and sends expenses of unknown ones to "other"', () => {
    const custom = [
      { id: 'c_1', name: 'ספרים', color: '#112233' },
      { id: 'other', name: 'שונות', color: '#7b8794' },
    ];
    const text = makeBackup({
      ...data,
      categories: custom,
      expenses: [
        { id: 'e1', amount: 9, date: '2026-10-03', category: 'c_1', description: '' },
        { id: 'e2', amount: 9, date: '2026-10-03', category: 'food', description: '' },
      ],
    });
    const parsed = parseBackup(text);
    expect(parsed.categories).toEqual(custom);
    expect(parsed.expenses.map((e) => e.category)).toEqual(['c_1', 'other']);
  });

  it('reads old files that have no categories', () => {
    const old = JSON.stringify({ app: 'expense-tracker', version: 1, expenses: [], recurring: [] });
    expect(parseBackup(old).categories).toEqual(DEFAULT_CATEGORIES);
  });
});

describe('weekly reminder', () => {
  it('counts days and adds days across month ends', () => {
    expect(daysBetween('2026-10-01', '2026-10-08')).toBe(7);
    expect(addDays('2026-10-28', 7)).toBe('2026-11-04');
  });

  it('stays quiet without data, and for the first 6 days', () => {
    expect(backupReminder({ lastBackup: null, firstUse: '2026-10-01' }, '2026-10-20', false)).toBeNull();
    expect(backupReminder({ lastBackup: '2026-10-10', firstUse: '2026-09-01' }, '2026-10-16', true)).toBeNull();
  });

  it('is due a week after the last backup, or after first use when there was none', () => {
    expect(backupReminder({ lastBackup: '2026-10-10', firstUse: '2026-09-01' }, '2026-10-17', true)).toEqual({
      never: false,
      days: 7,
    });
    expect(backupReminder({ lastBackup: null, firstUse: '2026-10-01' }, '2026-10-09', true)).toEqual({
      never: true,
      days: 8,
    });
  });

  it('is hidden while snoozed and returns when the snooze ends', () => {
    const meta = { lastBackup: '2026-09-01', firstUse: '2026-09-01', snoozedUntil: '2026-10-24' };
    expect(backupReminder(meta, '2026-10-17', true)).toBeNull();
    expect(backupReminder(meta, '2026-10-24', true)).not.toBeNull();
  });
});
