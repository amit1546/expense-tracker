// state: 'ok' (under 80%), 'warn' (80% to the limit), 'over' (past it). null when there is no budget.
export function budgetStatus(spent, budget) {
  if (!(budget > 0)) return null;
  return {
    pct: Math.round((spent / budget) * 100),
    state: spent > budget ? 'over' : spent / budget >= 0.8 ? 'warn' : 'ok',
    remaining: Math.round((budget - spent) * 100) / 100,
  };
}

export const EMPTY_BUDGETS = { total: null, categories: {} };

// Keeps only positive numbers; anything else means "no budget".
export function normalizeBudgets(value) {
  const positive = (n) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null);
  const categories = {};
  for (const [id, n] of Object.entries(value?.categories ?? {})) {
    if (positive(n)) categories[id] = n;
  }
  return { total: positive(value?.total), categories };
}
