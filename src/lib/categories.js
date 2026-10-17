import { newId } from './id.js';

// Unknown or deleted categories fall back to this one; it can be renamed but never deleted.
export const FALLBACK_ID = 'other';

export const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'אוכל', color: '#e08a2e' },
  { id: 'transport', name: 'תחבורה', color: '#2a9d9d' },
  { id: 'bills', name: 'חשבונות', color: '#3b6fb6' },
  { id: 'fun', name: 'בילויים', color: '#7a6fd0' },
  { id: 'health', name: 'בריאות', color: '#3f9d6b' },
  { id: 'shopping', name: 'קניות', color: '#c0503f' },
  { id: FALLBACK_ID, name: 'אחר', color: '#7b8794' },
];

// Colours offered to new categories, in this order.
const SWATCHES = ['#4e79a7', '#59a14f', '#b07aa1', '#9c755f', '#edc948', '#76b7b2', '#e15759', '#f28e2b'];
const HEX = /^#[0-9a-f]{6}$/i;

export const newCategoryId = () => `c_${newId().replace(/-/g, '').slice(0, 8)}`;
export const nextColor = (categories) => SWATCHES[categories.length % SWATCHES.length];

export function lookup(categories) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const fallback = byId.get(FALLBACK_ID) ?? categories[categories.length - 1] ?? DEFAULT_CATEGORIES.at(-1);
  return { get: (id) => byId.get(id) ?? fallback, has: (id) => byId.has(id) };
}

// Keeps valid entries only, drops duplicate ids, and makes sure the fallback category exists (last).
export function normalizeCategories(value) {
  if (!Array.isArray(value)) return DEFAULT_CATEGORIES;
  const seen = new Set();
  const list = [];
  for (const c of value) {
    const name = typeof c?.name === 'string' ? c.name.trim() : '';
    if (typeof c?.id !== 'string' || !c.id || !name || seen.has(c.id)) continue;
    seen.add(c.id);
    list.push({ id: c.id, name, color: HEX.test(c.color ?? '') ? c.color : '#7b8794' });
  }
  if (list.length === 0) return DEFAULT_CATEGORIES;
  if (!seen.has(FALLBACK_ID)) list.push(DEFAULT_CATEGORIES.at(-1));
  return list;
}

export const isNameTaken = (categories, name, exceptId) =>
  categories.some((c) => c.id !== exceptId && c.name.trim().toLowerCase() === name.trim().toLowerCase());

// New categories go before the fallback one, which stays last.
export function insertCategory(categories, category) {
  const i = categories.findIndex((c) => c.id === FALLBACK_ID);
  return i < 0 ? [...categories, category] : [...categories.slice(0, i), category, ...categories.slice(i)];
}

// Deleting a category moves its expenses and recurring items to the fallback and drops its budget.
export function removeCategoryFrom({ categories, expenses, recurring, budgets }, id) {
  if (id === FALLBACK_ID) return { categories, expenses, recurring, budgets };
  const move = (item) => (item.category === id ? { ...item, category: FALLBACK_ID } : item);
  const { [id]: _removed, ...rest } = budgets.categories;
  return {
    categories: categories.filter((c) => c.id !== id),
    expenses: expenses.map(move),
    recurring: recurring.map(move),
    budgets: { ...budgets, categories: rest },
  };
}
