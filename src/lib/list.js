import { getCategory } from './categories.js';

export const SORTS = [
  { id: 'date-desc', label: 'תאריך: מהחדש לישן' },
  { id: 'date-asc', label: 'תאריך: מהישן לחדש' },
  { id: 'amount-desc', label: 'סכום: מהגבוה לנמוך' },
  { id: 'amount-asc', label: 'סכום: מהנמוך לגבוה' },
];

const COMPARE = {
  'date-desc': (a, b) => b.date.localeCompare(a.date),
  'date-asc': (a, b) => a.date.localeCompare(b.date),
  'amount-desc': (a, b) => b.amount - a.amount || b.date.localeCompare(a.date),
  'amount-asc': (a, b) => a.amount - b.amount || b.date.localeCompare(a.date),
};

// Search matches the description, the category name and the amount.
export function filterAndSort(rows, { query = '', sort = 'date-desc' } = {}) {
  const q = query.trim().toLowerCase();
  const matches = q
    ? rows.filter((r) => `${r.description} ${getCategory(r.category).name} ${r.amount}`.toLowerCase().includes(q))
    : [...rows];
  return matches.sort(COMPARE[sort] ?? COMPARE['date-desc']);
}
