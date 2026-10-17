import { useEffect, useState } from 'react';
import { loadExpenses, loadRecurring, saveExpenses, saveRecurring } from '../lib/storage.js';
import { shiftMonth } from '../lib/summary.js';

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function useExpenses() {
  const [expenses, setExpenses] = useState(loadExpenses);
  const [recurring, setRecurring] = useState(loadRecurring);

  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    saveRecurring(recurring);
  }, [recurring]);

  const add = (expense) => {
    const id = newId();
    setExpenses((list) => [...list, { ...expense, id }]);
    return id;
  };
  const update = (id, changes) =>
    setExpenses((list) => list.map((e) => (e.id === id ? { ...e, ...changes } : e)));
  const remove = (id) => setExpenses((list) => list.filter((e) => e.id !== id));

  const addRecurring = (item) => setRecurring((list) => [...list, { ...item, id: newId() }]);
  // Ends the item the month before `fromMonth`; earlier months keep their history.
  const stopRecurring = (id, fromMonth) =>
    setRecurring((list) =>
      list.flatMap((r) => {
        if (r.id !== id) return [r];
        const endMonth = shiftMonth(fromMonth, -1);
        return endMonth < r.startMonth ? [] : [{ ...r, endMonth }];
      }),
    );

  return { expenses, recurring, add, update, remove, addRecurring, stopRecurring };
}
