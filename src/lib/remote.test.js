import { describe, it, expect } from 'vitest';
import { DEFAULT_CATEGORIES } from './categories.js';
import { diffDocs, fromDocs, sameMap, stable, stableMap, toDocs } from './remote.js';

const state = {
  categories: DEFAULT_CATEGORIES,
  expenses: [
    { id: 'a', amount: 10, date: '2026-10-03', category: 'food', description: 'קפה' },
    { id: 'b', amount: 20, date: '2026-09-30', category: 'bills', description: '' },
    { id: 'c', amount: 30, date: '2026-10-20', category: 'fun', description: '' },
  ],
  recurring: [{ id: 'r', amount: 5, category: 'health', description: '', day: 1, startMonth: '2026-01' }],
  budgets: { total: 100, categories: { food: 40 } },
  meta: { lastBackup: '2026-10-01', firstUse: '2026-09-01', snoozedUntil: null },
};

describe('toDocs / fromDocs', () => {
  it('splits expenses by month and keeps the rest in one meta document', () => {
    const docs = toDocs(state);
    expect(Object.keys(docs).sort()).toEqual(['ex-2026-09', 'ex-2026-10', 'meta']);
    expect(docs['ex-2026-10'].expenses.map((e) => e.id)).toEqual(['a', 'c']);
    expect(docs.meta.recurring).toHaveLength(1);
  });

  it('round-trips the data', () => {
    const back = fromDocs(toDocs(state), '2026-10-17');
    expect(back.categories).toEqual(state.categories);
    expect(back.recurring).toEqual(state.recurring);
    expect(back.budgets).toEqual(state.budgets);
    expect(back.meta).toEqual(state.meta);
    expect([...back.expenses].sort((x, y) => x.id.localeCompare(y.id))).toEqual(state.expenses);
  });

  it('survives missing or damaged documents', () => {
    const empty = fromDocs({}, '2026-10-17');
    expect(empty.expenses).toEqual([]);
    expect(empty.categories).toEqual(DEFAULT_CATEGORIES);
    expect(empty.meta.firstUse).toBe('2026-10-17');
    const odd = fromDocs({ meta: { recurring: 'x', budgets: 5 }, 'ex-2026-10': { expenses: 'nope' } }, '2026-10-17');
    expect(odd.expenses).toEqual([]);
    expect(odd.recurring).toEqual([]);
  });

  it('sends expenses of unknown categories to "other"', () => {
    const docs = toDocs({ ...state, expenses: [{ ...state.expenses[0], category: 'gone' }] });
    expect(fromDocs(docs, '2026-10-17').expenses[0].category).toBe('other');
  });
});

describe('stable', () => {
  it('ignores key order and undefined values', () => {
    expect(stable({ b: 1, a: [{ y: 2, x: undefined }] })).toBe(stable({ a: [{ y: 2 }], b: 1 }));
    expect(stable({ a: 1 })).not.toBe(stable({ a: 2 }));
  });

  it('compares maps', () => {
    expect(sameMap(stableMap({ a: { x: 1 } }), stableMap({ a: { x: 1 } }))).toBe(true);
    expect(sameMap(stableMap({ a: { x: 1 } }), stableMap({ a: { x: 2 } }))).toBe(false);
    expect(sameMap(stableMap({ a: 1 }), stableMap({ a: 1, b: 2 }))).toBe(false);
  });
});

describe('diffDocs', () => {
  it('writes only what changed and removes months that became empty, never the meta document', () => {
    const last = stableMap(toDocs(state));
    expect(diffDocs(last, toDocs(state))).toMatchObject({ set: [], remove: [] });

    const changed = { ...state, expenses: [{ ...state.expenses[1], amount: 99 }, state.expenses[0]] };
    const diff = diffDocs(last, toDocs(changed));
    expect(diff.set.sort()).toEqual(['ex-2026-09', 'ex-2026-10']);
    expect(diff.remove).toEqual([]);

    const onlySeptember = { ...state, expenses: [state.expenses[1]] };
    expect(diffDocs(last, toDocs(onlySeptember)).remove).toEqual(['ex-2026-10']);
    expect(diffDocs({ meta: '{}' }, {}).remove).toEqual([]);
  });
});
