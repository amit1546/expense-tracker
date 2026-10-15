import { useEffect, useState } from 'react';
import { loadExpenses, saveExpenses } from '../lib/storage.js';

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function useExpenses() {
  const [expenses, setExpenses] = useState(loadExpenses);

  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  const add = (expense) => setExpenses((list) => [...list, { ...expense, id: newId() }]);
  const update = (id, changes) =>
    setExpenses((list) => list.map((e) => (e.id === id ? { ...e, ...changes } : e)));
  const remove = (id) => setExpenses((list) => list.filter((e) => e.id !== id));

  return { expenses, add, update, remove };
}
