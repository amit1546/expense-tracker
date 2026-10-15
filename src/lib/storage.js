const KEY = 'expense-tracker:v1:expenses';

export function loadExpenses() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function saveExpenses(expenses) {
  try {
    localStorage.setItem(KEY, JSON.stringify(expenses));
  } catch {
    // storage unavailable (private mode / quota) – keep working in memory
  }
}
