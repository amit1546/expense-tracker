import { useState } from 'react';
import { useExpenses } from './hooks/useExpenses.js';
import { allWithRecurring, monthlySeries, periodExpenses, rangeMonths, shiftMonth } from './lib/summary.js';
import { copyCSV, downloadCSV, toCSV } from './lib/csv.js';
import { todayISO } from './lib/format.js';
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
  const [csvText, setCsvText] = useState(null);
  const [copied, setCopied] = useState(false);

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

  const handleSubmit = (data, { recurring: isRecurring } = {}) => {
    if (editing) {
      update(editing.id, data);
      setEditing(null);
    } else if (isRecurring) {
      const { amount, category, description, date } = data;
      addRecurring({ amount, category, description, day: Number(date.slice(8, 10)), startMonth: date.slice(0, 7) });
    } else {
      add(data);
    }
  };

  const handleDelete = (expense) => {
    if (expense.recurring) {
      stopRecurring(expense.recurringId, expense.date.slice(0, 7));
      return;
    }
    remove(expense.id);
    if (editing?.id === expense.id) setEditing(null);
  };

  const handleCopy = async () => {
    if (await copyCSV(rows)) {
      setCsvText(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCsvText(toCSV(rows));
    }
  };

  const periodLabel = month + (count > 1 ? `_${rangeMonths(month, count)[0]}` : '');

  return (
    <div className="app">
      <header className="app-header">
        <h1>מעקב הוצאות</h1>
        <PeriodControls month={month} count={count} onMonth={setMonth} onCount={setCount} />
      </header>

      <CategoryFilter selected={categories} onToggle={toggleCategory} onClear={() => setCategories([])} />

      <main className="layout">
        <section className="card">
          <h2>{editing ? 'עריכת הוצאה' : 'הוספת הוצאה'}</h2>
          <ExpenseForm
            key={editing?.id ?? 'new'}
            initial={editing}
            onSubmit={handleSubmit}
            onCancel={editing ? () => setEditing(null) : undefined}
          />
        </section>

        <section className="card">
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
          <div className="list-header">
            <h2>{LIST_TITLES[count]}</h2>
            <div className="actions">
              <button
                className="secondary"
                disabled={rows.length === 0}
                onClick={() => downloadCSV(rows, `expenses-${periodLabel}.csv`)}
              >
                ייצוא התקופה ל-CSV
              </button>
              <button
                className="secondary"
                disabled={expenses.length === 0 && recurring.length === 0}
                onClick={() =>
                  downloadCSV(allWithRecurring(expenses, recurring, todayISO().slice(0, 7)), 'expenses-all.csv')
                }
              >
                ייצוא הכול
              </button>
              <button className="secondary" disabled={rows.length === 0} onClick={handleCopy}>
                {copied ? 'הועתק ✓' : 'העתקת CSV'}
              </button>
            </div>
          </div>
          {csvText && (
            <div className="csv-box">
              <span className="muted">לא ניתן להעתיק אוטומטית. סמן את הטקסט והעתק אותו:</span>
              <textarea readOnly value={csvText} onFocus={(e) => e.target.select()} />
            </div>
          )}
          <ExpenseList expenses={rows} onEdit={setEditing} onDelete={handleDelete} />
        </section>
      </main>
    </div>
  );
}
