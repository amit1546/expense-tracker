import { isKnownCategory } from './categories.js';

const EXPENSES_KEY = 'expense-tracker:v1:expenses';
const RECURRING_KEY = 'expense-tracker:v1:recurring';

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode / quota) – keep working in memory
  }
}

// Categories that no longer exist (e.g. a removed one) are shown under "other".
const normalize = (e) => (isKnownCategory(e.category) ? e : { ...e, category: 'other' });

export const loadExpenses = () => read(EXPENSES_KEY).map(normalize);
export const saveExpenses = (expenses) => write(EXPENSES_KEY, expenses);

export const loadRecurring = () => read(RECURRING_KEY).map(normalize);
export const saveRecurring = (recurring) => write(RECURRING_KEY, recurring);
