import { DEFAULT_CATEGORIES, FALLBACK_ID, lookup, normalizeCategories } from './categories.js';
import { normalizeBudgets } from './budget.js';
import { normalizeMeta } from './meta.js';

// The cloud copy is a set of small documents (each must stay well under 256 KiB):
//   meta        – categories, recurring items, budgets and app facts
//   ex-YYYY-MM  – the expenses of one month
export const META_DOC = 'meta';
const MONTH_PREFIX = 'ex-';

export function toDocs({ categories, expenses, recurring, budgets, meta }) {
  const docs = { [META_DOC]: { categories, recurring, budgets, meta } };
  const months = {};
  for (const e of expenses) (months[e.date.slice(0, 7)] ??= []).push(e);
  for (const [month, list] of Object.entries(months)) docs[MONTH_PREFIX + month] = { month, expenses: list };
  return docs;
}

// docs: { id: body } as read from the cloud. Anything unusable is repaired or dropped.
export function fromDocs(docs, today) {
  const m = docs[META_DOC] ?? {};
  const categories = normalizeCategories(m.categories ?? DEFAULT_CATEGORIES);
  const known = lookup(categories);
  const fix = (item) => (known.has(item.category) ? item : { ...item, category: FALLBACK_ID });
  const list = (v) => (Array.isArray(v) ? v : []);
  return {
    categories,
    expenses: Object.keys(docs)
      .filter((id) => id.startsWith(MONTH_PREFIX))
      .sort()
      .flatMap((id) => list(docs[id]?.expenses))
      .map(fix),
    recurring: list(m.recurring).map(fix),
    budgets: normalizeBudgets(m.budgets),
    meta: normalizeMeta(m.meta, today),
  };
}

// JSON with sorted keys, so two copies of the same data always compare equal.
export function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export const stableMap = (docs) => Object.fromEntries(Object.entries(docs).map(([id, body]) => [id, stable(body)]));

export function sameMap(a, b) {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
}

// What has to be written so that the cloud (as last known: id -> stable JSON) matches `target` (id -> body).
export function diffDocs(last, target) {
  const stableTarget = stableMap(target);
  return {
    stableTarget,
    set: Object.keys(target).filter((id) => last[id] !== stableTarget[id]),
    remove: Object.keys(last).filter((id) => !(id in target) && id !== META_DOC),
  };
}

export const hasData = ({ expenses, recurring }) => expenses.length > 0 || recurring.length > 0;
