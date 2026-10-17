import { useEffect, useState } from 'react';
import { useExpenses } from './hooks/useExpenses.js';
import { dailySeries, monthlySeries, periodExpenses, rangeMonths, shiftMonth } from './lib/summary.js';
import { filterAndSort } from './lib/list.js';
import { getCategory } from './lib/categories.js';
import { formatMoney, formatMonth, todayISO } from './lib/format.js';
import ExpenseForm from './components/ExpenseForm.jsx';
import ExpenseList from './components/ExpenseList.jsx';
import ListControls from './components/ListControls.jsx';
import PeriodControls from './components/PeriodControls.jsx';
import CategoryFilter from './components/CategoryFilter.jsx';
import Summary from './components/Summary.jsx';
import Charts from './components/Charts.jsx';
import BackupCard from './components/BackupCard.jsx';

const LIST_TITLES = { 1: 'הוצאות החודש', 6: 'הוצאות ב-6 החודשים', 12: 'הוצאות השנה' };

export default function App() {
  const {
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
  } = useExpenses();
  const [month, setMonth] = useState(() => todayISO().slice(0, 7)); // last month of the period
  const [count, setCount] = useState(1); // months in the period: 1, 6 or 12
  const [categories, setCategories] = useState([]); // empty = all categories
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('date-desc');
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [flashId, setFlashId] = useState(null);

  // text, plus an optional undo function that adds a "ביטול" button to the toast
  const notify = (text, undo) => setToast({ id: Date.now(), text, undo });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.undo ? 6000 : 2600);
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
  const trend = count === 1 ? dailySeries(rows, month) : series;
  const prevTotal = prevRows.reduce((sum, e) => sum + e.amount, 0);
  const listRows = filterAndSort(rows, { query, sort });

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
    // a new expense must never end up hidden by the category filter
    const unhid = categories.length > 0 && !categories.includes(data.category);
    if (unhid) setCategories([]);
    const note = unhid ? ' (הסינון אופס)' : '';
    const editingRecurring = Boolean(editing?.recurring);
    if (editingRecurring) {
      // applies to this month and every later one; earlier months keep their old values
      const from = editing.date.slice(0, 7);
      const { amount, category, description, date } = data;
      const undo = editRecurringFrom(editing.recurringId, from, {
        amount,
        category,
        description,
        day: Number(date.slice(8, 10)),
      });
      setEditing(null);
      notify(`ההוצאה הקבועה עודכנה מ${formatMonth(from)} והלאה`, undo);
    } else if (editing) {
      update(editing.id, data);
      setEditing(null);
      setFlashId(editing.id);
      notify('ההוצאה עודכנה ✓');
    } else if (isRecurring) {
      const { amount, category, description, date } = data;
      addRecurring({ amount, category, description, day: Number(date.slice(8, 10)), startMonth: date.slice(0, 7) });
      notify(`נוספה הוצאה קבועה: ${money} ל${cat.name}${note}`);
    } else {
      setFlashId(add(data));
      notify(`נוסף: ${money} ל${cat.name}${note}`);
    }
    // make sure the new expense is on screen
    if (!editingRecurring && !rangeMonths(month, count).includes(data.date.slice(0, 7)))
      pickMonth(data.date.slice(0, 7));
  };

  const handleDelete = (expense) => {
    if (expense.recurring) {
      notify('ההוצאה הקבועה הופסקה מחודש זה', stopRecurring(expense.recurringId, expense.date.slice(0, 7)));
      return;
    }
    if (editing?.id === expense.id) setEditing(null);
    notify('ההוצאה נמחקה', remove(expense.id));
  };

  const searching = query.trim() !== '';

  return (
    <div className="app">
      <header className="app-header">
        <h1>מעקב הוצאות</h1>
      </header>

      <section className="card form-card">
        <h2>{editing ? (editing.recurring ? 'עריכת הוצאה קבועה' : 'עריכת הוצאה') : 'הוספת הוצאה'}</h2>
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
          <Summary
            rows={rows}
            count={count}
            series={series}
            prevTotal={prevTotal}
            filterNames={categories.map((id) => getCategory(id).name)}
            onClearFilter={() => setCategories([])}
            budgets={budgets}
            onBudgets={setBudgets}
          />
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
            {searching && (
              <span className="muted">
                {listRows.length} מתוך {rows.length}
              </span>
            )}
          </div>
          <ListControls query={query} sort={sort} onQuery={setQuery} onSort={setSort} />
          <ExpenseList
            expenses={listRows}
            highlightId={flashId}
            emptyText={searching ? 'לא נמצאו הוצאות שמתאימות לחיפוש.' : 'אין הוצאות בתקופה הזו.'}
            onEdit={startEdit}
            onDelete={handleDelete}
          />
        </section>

        <section className="card wide">
          <BackupCard
            data={{ expenses, recurring, budgets }}
            notify={notify}
            onRestore={(next) => {
              setEditing(null);
              notify('הנתונים שוחזרו מהגיבוי', replaceAll(next));
            }}
          />
        </section>
      </main>

      {toast && (
        <div className="toast" role="status" key={toast.id}>
          {toast.text}
          {toast.undo && (
            <button
              className="link"
              onClick={() => {
                toast.undo();
                setToast(null);
              }}
            >
              ביטול
            </button>
          )}
        </div>
      )}
    </div>
  );
}
