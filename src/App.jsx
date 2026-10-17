import { useEffect, useState } from 'react';
import { useExpenses } from './hooks/useExpenses.js';
import { monthlySeries, periodExpenses, rangeMonths, shiftMonth } from './lib/summary.js';
import { getCategory } from './lib/categories.js';
import { formatMoney, todayISO } from './lib/format.js';
import ExpenseForm from './components/ExpenseForm.jsx';
import ExpenseList from './components/ExpenseList.jsx';
import PeriodControls from './components/PeriodControls.jsx';
import CategoryFilter from './components/CategoryFilter.jsx';
import Summary from './components/Summary.jsx';
import Charts from './components/Charts.jsx';

const LIST_TITLES = { 1: 'הוצאות החודש', 6: 'הוצאות ב-6 החודשים', 12: 'הוצאות השנה' };

export default function App() {
  const { expenses, recurring, add, update, remove, addRecurring, stopRecurring } = useExpenses();
  const [month, setMonth] = useState(() => todayISO().slice(0, 7)); // last month of the period
  const [count, setCount] = useState(1); // months in the period: 1, 6 or 12
  const [categories, setCategories] = useState([]); // empty = all categories
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [flashId, setFlashId] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!flashId) return;
    const t = setTimeout(() => setFlashId(null), 1800);
    return () => clearTimeout(t);
  }, [flashId]);

  const keep = (e) => categories.length === 0 || categories.includes(e.category);
  const shownExpenses = expenses.filter(keep);
  const shownRecurring = recurring.filter(keep);

  const rows = periodExpenses(shownExpenses, shownRecurring, month, count);
  const prevRows = periodExpenses(shownExpenses, shownRecurring, shiftMonth(month, -count), count);
  const series = monthlySeries(shownExpenses, shownRecurring, month, count);
  const trend = count === 1 ? monthlySeries(shownExpenses, shownRecurring, month, 6) : series;
  const prevTotal = prevRows.reduce((sum, e) => sum + e.amount, 0);

  const toggleCategory = (id) =>
    setCategories((list) => (list.includes(id) ? list.filter((c) => c !== id) : [...list, id]));

  const pickMonth = (m) => {
    setMonth(m);
    setCount(1);
  };

  const startEdit = (expense) => {
    setEditing(expense);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (data, { recurring: isRecurring } = {}) => {
    const cat = getCategory(data.category);
    const money = formatMoney(data.amount);
    if (editing) {
      update(editing.id, data);
      setEditing(null);
      setFlashId(editing.id);
      setToast({ id: Date.now(), text: 'ההוצאה עודכנה ✓' });
    } else if (isRecurring) {
      const { amount, category, description, date } = data;
      addRecurring({ amount, category, description, day: Number(date.slice(8, 10)), startMonth: date.slice(0, 7) });
      setToast({ id: Date.now(), text: `נוספה הוצאה קבועה: ${money} ל${cat.name}` });
    } else {
      setFlashId(add(data));
      setToast({ id: Date.now(), text: `נוסף: ${money} ל${cat.name}` });
    }
    // make sure the new expense is on screen
    if (!rangeMonths(month, count).includes(data.date.slice(0, 7))) pickMonth(data.date.slice(0, 7));
  };

  const handleDelete = (expense) => {
    if (expense.recurring) {
      stopRecurring(expense.recurringId, expense.date.slice(0, 7));
      return;
    }
    remove(expense.id);
    if (editing?.id === expense.id) setEditing(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>מעקב הוצאות</h1>
      </header>

      <section className="card form-card">
        <h2>{editing ? 'עריכת הוצאה' : 'הוספת הוצאה'}</h2>
        <ExpenseForm
          key={editing?.id ?? 'new'}
          initial={editing}
          onSubmit={handleSubmit}
          onCancel={editing ? () => setEditing(null) : undefined}
        />
      </section>

      <section className="period-bar">
        <PeriodControls month={month} count={count} onMonth={setMonth} onCount={setCount} />
      </section>

      <CategoryFilter selected={categories} onToggle={toggleCategory} onClear={() => setCategories([])} />

      <main className="layout">
        <section className="card wide">
          <Summary rows={rows} count={count} series={series} prevTotal={prevTotal} />
        </section>

        <section className="card wide">
          <Charts
            rows={rows}
            trend={trend}
            inRange={rangeMonths(month, count)}
            count={count}
            onPickMonth={pickMonth}
            onToggleCategory={toggleCategory}
          />
        </section>

        <section className="card wide">
          <h2>{LIST_TITLES[count]}</h2>
          <ExpenseList expenses={rows} highlightId={flashId} onEdit={startEdit} onDelete={handleDelete} />
        </section>
      </main>

      {toast && (
        <div className="toast" role="status" key={toast.id}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
