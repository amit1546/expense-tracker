import { useEffect, useRef, useState } from 'react';
import {
  loadBudgets,
  loadCategories,
  loadExpenses,
  loadMeta,
  loadRecurring,
  saveBudgets,
  saveCategories,
  saveExpenses,
  saveMeta,
  saveRecurring,
} from '../lib/storage.js';
import { insertCategory, newCategoryId, removeCategoryFrom } from '../lib/categories.js';
import { shiftMonth } from '../lib/summary.js';
import { useCloudSync } from './useCloudSync.js';
import { todayISO } from '../lib/format.js';
import { newId } from '../lib/id.js';

// Mutations that can be undone return a function that undoes them.
export function useExpenses() {
  const [categories, setCategories] = useState(loadCategories);
  const [expenses, setExpenses] = useState(() => loadExpenses(categories));
  const [recurring, setRecurring] = useState(() => loadRecurring(categories));
  const [budgets, setBudgets] = useState(loadBudgets);
  const [meta, setMeta] = useState(() => loadMeta(todayISO()));

  useEffect(() => saveCategories(categories), [categories]);
  useEffect(() => saveExpenses(expenses), [expenses]);
  useEffect(() => saveRecurring(recurring), [recurring]);
  useEffect(() => saveBudgets(budgets), [budgets]);
  useEffect(() => saveMeta(meta), [meta]);

  // keeps a copy in the cloud when this view offers one; `syncStatus` says how that is going
  const syncStatus = useCloudSync({ categories, expenses, recurring, budgets, meta }, (next) => {
    setCategories(next.categories);
    setExpenses(next.expenses);
    setRecurring(next.recurring);
    setBudgets(next.budgets);
    setMeta(next.meta);
  });

  const add = (expense) => {
    const id = newId();
    setExpenses((list) => [...list, { ...expense, id }]);
    return id;
  };
  const update = (id, changes) => setExpenses((list) => list.map((e) => (e.id === id ? { ...e, ...changes } : e)));
  const remove = (id) => {
    const item = expenses.find((e) => e.id === id);
    setExpenses((list) => list.filter((e) => e.id !== id));
    return () => setExpenses((list) => (list.some((e) => e.id === id) ? list : [...list, item]));
  };

  const addRecurring = (item) => setRecurring((list) => [...list, { ...item, id: newId() }]);

  // Puts `before` back and removes any items created by the change being undone.
  const revertRecurring = (before, createdIds = []) =>
    setRecurring((list) => {
      const rest = list.filter((r) => !createdIds.includes(r.id));
      return rest.some((r) => r.id === before.id)
        ? rest.map((r) => (r.id === before.id ? before : r))
        : [...rest, before];
    });

  // Ends the item the month before `fromMonth`; earlier months keep their history.
  const stopRecurring = (id, fromMonth) => {
    const before = recurring.find((r) => r.id === id);
    const endMonth = shiftMonth(fromMonth, -1);
    setRecurring((list) =>
      list.flatMap((r) => {
        if (r.id !== id) return [r];
        return endMonth < r.startMonth ? [] : [{ ...r, endMonth }];
      }),
    );
    return () => revertRecurring(before);
  };

  // Applies `changes` from `fromMonth` on: the old item ends the month before and a new one continues it.
  const editRecurringFrom = (id, fromMonth, changes) => {
    const before = recurring.find((r) => r.id === id);
    if (fromMonth <= before.startMonth) {
      setRecurring((list) => list.map((r) => (r.id === id ? { ...r, ...changes } : r)));
      return () => revertRecurring(before);
    }
    const tailId = newId();
    setRecurring((list) =>
      list.flatMap((r) =>
        r.id === id
          ? [
              { ...r, endMonth: shiftMonth(fromMonth, -1) },
              { ...r, ...changes, id: tailId, startMonth: fromMonth },
            ]
          : [r],
      ),
    );
    return () => revertRecurring(before, [tailId]);
  };

  // Everything that a backup holds, replaced in one go.
  const restoreAll = (state) => {
    setCategories(state.categories);
    setExpenses(state.expenses);
    setRecurring(state.recurring);
    setBudgets(state.budgets);
  };
  const snapshot = () => ({ categories, expenses, recurring, budgets });
  const latest = useRef(null);
  latest.current = snapshot();

  const replaceAll = (next) => {
    const previous = snapshot();
    restoreAll(next);
    return () => restoreAll(previous);
  };

  // Returns an undo function. It removes the category again and moves anything that already uses it to "other".
  const addCategory = (name, color) => {
    const id = newCategoryId();
    setCategories((list) => insertCategory(list, { id, name: name.trim(), color }));
    return () => restoreAll(removeCategoryFrom(latest.current, id));
  };

  const markBackedUp = () => setMeta((m) => ({ ...m, lastBackup: todayISO(), snoozedUntil: null }));
  const snoozeReminder = (until) => setMeta((m) => ({ ...m, snoozedUntil: until }));

  return {
    categories,
    expenses,
    recurring,
    budgets,
    meta,
    syncStatus,
    setBudgets,
    add,
    update,
    remove,
    addRecurring,
    stopRecurring,
    editRecurringFrom,
    replaceAll,
    addCategory,
    markBackedUp,
    snoozeReminder,
  };
}
