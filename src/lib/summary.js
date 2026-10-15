// month is 'YYYY-MM'
export function monthOf(isoDate) {
  return isoDate.slice(0, 7);
}

export function filterByMonth(expenses, month) {
  return expenses.filter((e) => monthOf(e.date) === month);
}

export function total(expenses) {
  return Math.round(expenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;
}

// Returns [{ category, total }] sorted by total, descending.
export function totalsByCategory(expenses) {
  const map = new Map();
  for (const e of expenses) {
    map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  }
  return [...map.entries()]
    .map(([category, sum]) => ({ category, total: Math.round(sum * 100) / 100 }))
    .sort((a, b) => b.total - a.total);
}

export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Totals for the `count` months ending at (and including) `endMonth`, oldest first.
export function lastMonthsTotals(expenses, endMonth, count = 6) {
  const months = [];
  for (let i = count - 1; i >= 0; i--) months.push(shiftMonth(endMonth, -i));
  return months.map((month) => ({ month, total: total(filterByMonth(expenses, month)) }));
}
