import { useEffect, useState } from 'react';
import { loadBudgets, loadExpenses, loadRecurring, saveBudgets, saveExpenses, saveRecurring } from '../lib/storage.js';
import { shiftMonth } from '../lib/summary.js';
import { newId } from '../lib/id.js';

// Mutations that can be undone return a function that undoes them.
export function useExpenses() {
  const [expenses, setExpenses] = useState(loadExpenses);
  const [recurring, setRecurring] = useState(loadRecurring);
  const [budgets, setBudgets] = useState(loadBudgets);

  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    saveRecurring(recurring);
  }, [recurring]);

  useEffect(() => {
    saveBudgets(budgets);
  }, [budgets]);

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

  const replaceAll = (next) => {
    const previous = { expenses, recurring, budgets };
    setExpenses(next.expenses);
    setRecurring(next.recurring);
    setBudgets(next.budgets);
    return () => {
      setExpenses(previous.expenses);
      setRecurring(previous.recurring);
      setBudgets(previous.budgets);
    };
  };

  return {
    expenses,
    recurring,
    budgets,
    setBudgets,
    add,
    update,
    remove,
    addRecurring,
    stopRecurring,
    editRecurringFrom,
    replaceAll,
  };
}
