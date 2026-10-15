import { describe, it, expect } from 'vitest';
import { toCSV } from './csv.js';

describe('toCSV', () => {
  it('writes a Hebrew header and sorts rows by date', () => {
    const csv = toCSV([
      { id: '2', amount: 5, date: '2026-10-02', category: 'transport', description: 'אוטובוס' },
      { id: '1', amount: 12.5, date: '2026-10-01', category: 'food', description: 'קפה' },
    ]);
    expect(csv.split('\r\n')).toEqual([
      'תאריך,קטגוריה,תיאור,סכום',
      '2026-10-01,אוכל,קפה,12.5',
      '2026-10-02,תחבורה,אוטובוס,5',
    ]);
  });

  it('escapes commas and quotes', () => {
    const csv = toCSV([{ id: '1', amount: 1, date: '2026-10-01', category: 'other', description: 'a, "b"' }]);
    expect(csv.split('\r\n')[1]).toBe('2026-10-01,אחר,"a, ""b""",1');
  });
});
