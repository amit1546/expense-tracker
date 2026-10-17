import { DEFAULT_CATEGORIES, FALLBACK_ID, lookup, normalizeCategories } from './categories.js';
import { normalizeBudgets } from './budget.js';

const KEYS = {
  expenses: 'expense-tracker:v1:expenses',
  recurring: 'expense-tracker:v1:recurring',
  budgets: 'expense-tracker:v1:budgets',
  categories: 'expense-tracker:v1:categories',
  meta: 'expense-tracker:v1:meta',
};

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode / quota) – keep working in memory
  }
}

const list = (key) => {
  const data = read(key);
  return Array.isArray(data) ? data : [];
};

export const loadCategories = () => normalizeCategories(read(KEYS.categories) ?? DEFAULT_CATEGORIES);
export const saveCategories = (categories) => write(KEYS.categories, categories);

// Items whose category no longer exists are shown under the fallback category.
const withKnownCategory = (categories) => {
  const known = lookup(categories);
  return (item) => (known.has(item.category) ? item : { ...item, category: FALLBACK_ID });
};

export const loadExpenses = (categories) => list(KEYS.expenses).map(withKnownCategory(categories));
export const saveExpenses = (expenses) => write(KEYS.expenses, expenses);

export const loadRecurring = (categories) => list(KEYS.recurring).map(withKnownCategory(categories));
export const saveRecurring = (recurring) => write(KEYS.recurring, recurring);

export const loadBudgets = () => normalizeBudgets(read(KEYS.budgets));
export const saveBudgets = (budgets) => write(KEYS.budgets, budgets);

// { lastBackup, firstUse, snoozedUntil } as ISO dates; firstUse starts the clock for the first reminder.
export function loadMeta(today) {
  const m = read(KEYS.meta) ?? {};
  const date = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  return { lastBackup: date(m.lastBackup), firstUse: date(m.firstUse) ?? today, snoozedUntil: date(m.snoozedUntil) };
}
export const saveMeta = (meta) => write(KEYS.meta, meta);
