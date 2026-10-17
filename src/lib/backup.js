import { DEFAULT_CATEGORIES, FALLBACK_ID, lookup, normalizeCategories } from './categories.js';
import { normalizeBudgets } from './budget.js';
import { newId } from './id.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;
const isMoney = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function backupFilename(isoDate) {
  return `מעקב הוצאות ${isoDate}.json`;
}

export function makeBackup({ expenses, recurring, budgets, categories }, now = new Date()) {
  return JSON.stringify(
    { app: 'expense-tracker', version: 2, savedAt: now.toISOString(), categories, expenses, recurring, budgets },
    null,
    2,
  );
}

const text = (v) => (typeof v === 'string' ? v : '');

// Throws an Error with a user-facing Hebrew message when the text is not one of our backups.
// Older files (version 1) have no categories; they get the default ones.
export function parseBackup(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('הקובץ אינו קובץ גיבוי תקין');
  }
  if (data?.app !== 'expense-tracker' || !Array.isArray(data.expenses) || !Array.isArray(data.recurring)) {
    throw new Error('הקובץ אינו קובץ גיבוי של מעקב הוצאות');
  }
  const categories = Array.isArray(data.categories) ? normalizeCategories(data.categories) : DEFAULT_CATEGORIES;
  const known = lookup(categories);
  const category = (c) => (known.has(c) ? c : FALLBACK_ID);
  return {
    categories,
    expenses: data.expenses
      .filter((e) => isMoney(e?.amount) && DATE.test(e?.date ?? ''))
      .map((e) => ({
        id: typeof e.id === 'string' ? e.id : newId(),
        amount: e.amount,
        date: e.date,
        category: category(e.category),
        description: text(e.description),
      })),
    recurring: data.recurring
      .filter(
        (r) =>
          isMoney(r?.amount) &&
          Number.isInteger(r?.day) &&
          r.day >= 1 &&
          r.day <= 31 &&
          MONTH.test(r?.startMonth ?? ''),
      )
      .map((r) => ({
        id: typeof r.id === 'string' ? r.id : newId(),
        amount: r.amount,
        category: category(r.category),
        description: text(r.description),
        day: r.day,
        startMonth: r.startMonth,
        ...(MONTH.test(r.endMonth ?? '') ? { endMonth: r.endMonth } : {}),
      })),
    budgets: normalizeBudgets(data.budgets),
  };
}

// ---- weekly backup reminder
const DAY = 86_400_000;
const utc = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

export const daysBetween = (fromIso, toIso) => Math.round((utc(toIso) - utc(fromIso)) / DAY);

export function addDays(iso, n) {
  const d = new Date(utc(iso) + n * DAY);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// meta: { lastBackup, firstUse, snoozedUntil } (ISO dates or null). Returns null when nothing is due, else
// { never, days }: `days` since the last backup (or since first use when there was never one).
export function backupReminder(meta, today, hasData) {
  if (!hasData) return null;
  if (meta.snoozedUntil && today < meta.snoozedUntil) return null;
  const since = meta.lastBackup ?? meta.firstUse ?? today;
  const days = daysBetween(since, today);
  return days >= 7 ? { never: !meta.lastBackup, days } : null;
}
