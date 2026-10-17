import { DEFAULT_CATEGORIES, FALLBACK_ID, lookup, normalizeCategories } from './categories.js';
import { normalizeBudgets } from './budget.js';
import { normalizeMeta } from './meta.js';

const KEYS = {
  expenses: 'expense-tracker:v1:expenses',
  recurring: 'expense-tracker:v1:recurring',
  budgets: 'expense-tracker:v1:budgets',
  categories: 'expense-tracker:v1:categories',
  meta: 'expense-tracker:v1:meta',
  dirty: 'expense-tracker:v1:unsynced',
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

export const loadMeta = (today) => normalizeMeta(read(KEYS.meta), today);
export const saveMeta = (meta) => write(KEYS.meta, meta);

// True while this device holds changes that have not reached the cloud copy yet.
export const isDirty = () => read(KEYS.dirty) === true;
export const setDirty = (value) => write(KEYS.dirty, value);
