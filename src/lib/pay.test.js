import { describe, it, expect } from 'vitest';
import { categoryForMerchant, parsePayHash } from './pay.js';

describe('parsePayHash', () => {
  it('reads the amount and the merchant', () => {
    expect(parsePayHash('#pay-45.50-Shufersal_City')).toEqual({ amount: '45.5', merchant: 'Shufersal City' });
    expect(parsePayHash('#pay-120')).toEqual({ amount: '120', merchant: '' });
    expect(parsePayHash('#pay-12,5-Cafe-Nimrod')).toEqual({ amount: '12.5', merchant: 'Cafe-Nimrod' });
  });

  it('decodes encoded merchants and caps their length', () => {
    expect(parsePayHash('#pay-9-%D7%A7%D7%A4%D7%94')).toEqual({ amount: '9', merchant: 'קפה' });
    expect(parsePayHash(`#pay-9-${'a'.repeat(100)}`).merchant).toHaveLength(40);
  });

  it('ignores anything else', () => {
    for (const h of ['', '#', '#top', '#pay', '#pay-', '#pay-abc', '#pay-0', '#pay-0.00-x', '#paying-5', undefined]) {
      expect(parsePayHash(h)).toBeNull();
    }
  });
});

describe('categoryForMerchant', () => {
  const expenses = [
    { id: '1', amount: 10, date: '2026-09-01', category: 'food', description: 'Cafe Nimrod' },
    { id: '2', amount: 10, date: '2026-10-01', category: 'fun', description: 'cafe nimrod ' },
    { id: '3', amount: 10, date: '2026-10-02', category: 'bills', description: 'חשמל' },
  ];

  it('uses the most recent expense with the same description, ignoring case and spaces', () => {
    expect(categoryForMerchant(expenses, 'Cafe Nimrod')).toBe('fun');
    expect(categoryForMerchant(expenses, 'חשמל')).toBe('bills');
  });

  it('knows nothing about a new shop', () => {
    expect(categoryForMerchant(expenses, 'Unknown')).toBeUndefined();
    expect(categoryForMerchant(expenses, '')).toBeUndefined();
  });
});
