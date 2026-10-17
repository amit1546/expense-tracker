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
// categoryName(id) gives the display name of a category.
export function filterAndSort(rows, { query = '', sort = 'date-desc', categoryName = (id) => id } = {}) {
  const q = query.trim().toLowerCase();
  const matches = q
    ? rows.filter((r) => `${r.description} ${categoryName(r.category)} ${r.amount}`.toLowerCase().includes(q))
    : [...rows];
  return matches.sort(COMPARE[sort] ?? COMPARE['date-desc']);
}
