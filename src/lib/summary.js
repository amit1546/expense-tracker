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

function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

// A recurring item is { id, amount, category, description, day, startMonth, endMonth? }.
// It counts in every month from startMonth through endMonth (open-ended when unset).
// Returns it as regular expense rows for `month`, flagged with recurring: true.
export function recurringIn(recurring, month) {
  return recurring
    .filter((r) => r.startMonth <= month && (!r.endMonth || month <= r.endMonth))
    .map((r) => ({
      id: `${r.id}:${month}`,
      recurringId: r.id,
      recurring: true,
      amount: r.amount,
      category: r.category,
      description: r.description,
      date: `${month}-${String(Math.min(r.day, daysInMonth(month))).padStart(2, '0')}`,
    }));
}

export function monthExpenses(expenses, recurring, month) {
  return [...filterByMonth(expenses, month), ...recurringIn(recurring, month)];
}

// The `count` months ending at (and including) `endMonth`, oldest first.
export function rangeMonths(endMonth, count) {
  const months = [];
  for (let i = count - 1; i >= 0; i--) months.push(shiftMonth(endMonth, -i));
  return months;
}

export function periodExpenses(expenses, recurring, endMonth, count) {
  return rangeMonths(endMonth, count).flatMap((m) => monthExpenses(expenses, recurring, m));
}

const round2 = (n) => Math.round(n * 100) / 100;

// One row per month: { month, total, [categoryId]: amount, ... } – ready for a stacked chart.
export function monthlySeries(expenses, recurring, endMonth, count) {
  return rangeMonths(endMonth, count).map((month) => {
    const rows = monthExpenses(expenses, recurring, month);
    const byCategory = {};
    for (const r of rows) byCategory[r.category] = (byCategory[r.category] ?? 0) + r.amount;
    for (const k of Object.keys(byCategory)) byCategory[k] = round2(byCategory[k]);
    return { month, total: total(rows), ...byCategory };
  });
}
