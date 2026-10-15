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

// Everything up to and including `uptoMonth`, with recurring items expanded month by month.
export function allWithRecurring(expenses, recurring, uptoMonth) {
  const out = [...expenses];
  for (const r of recurring) {
    const last = r.endMonth && r.endMonth < uptoMonth ? r.endMonth : uptoMonth;
    for (let m = r.startMonth; m <= last; m = shiftMonth(m, 1)) out.push(...recurringIn([r], m));
  }
  return out;
}

// Totals for the `count` months ending at (and including) `endMonth`, oldest first.
export function lastMonthsTotals(expenses, recurring, endMonth, count = 6) {
  const months = [];
  for (let i = count - 1; i >= 0; i--) months.push(shiftMonth(endMonth, -i));
  return months.map((month) => ({ month, total: total(monthExpenses(expenses, recurring, month)) }));
}
