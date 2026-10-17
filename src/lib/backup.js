import { normalize } from './storage.js';
import { normalizeBudgets } from './budget.js';
import { newId } from './id.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;
const isMoney = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function backupFilename(isoDate) {
  return `מעקב הוצאות ${isoDate}.json`;
}

export function makeBackup({ expenses, recurring, budgets }, now = new Date()) {
  return JSON.stringify(
    { app: 'expense-tracker', version: 1, savedAt: now.toISOString(), expenses, recurring, budgets },
    null,
    2,
  );
}

const asExpense = (e) =>
  normalize({
    id: typeof e.id === 'string' ? e.id : newId(),
    amount: e.amount,
    date: e.date,
    category: e.category,
    description: typeof e.description === 'string' ? e.description : '',
  });

const asRecurring = (r) => {
  const item = normalize({
    id: typeof r.id === 'string' ? r.id : newId(),
    amount: r.amount,
    category: r.category,
    description: typeof r.description === 'string' ? r.description : '',
    day: r.day,
    startMonth: r.startMonth,
  });
  return MONTH.test(r.endMonth ?? '') ? { ...item, endMonth: r.endMonth } : item;
};

// Throws an Error with a user-facing Hebrew message when the text is not one of our backups.
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('הקובץ אינו קובץ גיבוי תקין');
  }
  if (data?.app !== 'expense-tracker' || !Array.isArray(data.expenses) || !Array.isArray(data.recurring)) {
    throw new Error('הקובץ אינו קובץ גיבוי של מעקב הוצאות');
  }
  return {
    expenses: data.expenses.filter((e) => isMoney(e?.amount) && DATE.test(e?.date ?? '')).map(asExpense),
    recurring: data.recurring
      .filter(
        (r) =>
          isMoney(r?.amount) &&
          Number.isInteger(r?.day) &&
          r.day >= 1 &&
          r.day <= 31 &&
          MONTH.test(r?.startMonth ?? ''),
      )
      .map(asRecurring),
    budgets: normalizeBudgets(data.budgets),
  };
}
