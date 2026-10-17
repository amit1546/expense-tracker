import { useEffect, useMemo, useRef, useState } from 'react';
import { useExpenses } from './hooks/useExpenses.js';
import { CategoriesContext } from './hooks/CategoriesContext.js';
import { dailySeries, monthlySeries, periodExpenses, rangeMonths, shiftMonth } from './lib/summary.js';
import { filterAndSort } from './lib/list.js';
import { lookup } from './lib/categories.js';
import { categoryForMerchant, parsePayHash } from './lib/pay.js';
import { addDays, backupFilename, backupReminder, makeBackup } from './lib/backup.js';
import { saveTextFile } from './lib/files.js';
import { formatMoney, formatMonth, todayISO } from './lib/format.js';
import ExpenseForm from './components/ExpenseForm.jsx';
import ExpenseList from './components/ExpenseList.jsx';
import ListControls from './components/ListControls.jsx';
import PeriodControls from './components/PeriodControls.jsx';
import CategoryFilter from './components/CategoryFilter.jsx';
import CategoryManager from './components/CategoryManager.jsx';
import Summary from './components/Summary.jsx';
import Charts from './components/Charts.jsx';
import BackupCard from './components/BackupCard.jsx';
import BackupReminder from './components/BackupReminder.jsx';

const SYNC_LABELS = { cloud: 'נשמר בענן', local: 'נשמר במכשיר בלבד', error: 'השמירה בענן נכשלה, מנסה שוב' };
const LIST_TITLES = { 1: 'הוצאות החודש', 6: 'הוצאות ב-6 החודשים', 12: 'הוצאות השנה' };

export default function App() {
  const {
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
  } = useExpenses();
  const names = useMemo(() => ({ categories, getCategory: lookup(categories).get }), [categories]);
  const { getCategory } = names;

  const [month, setMonth] = useState(() => todayISO().slice(0, 7)); // last month of the period
  const [count, setCount] = useState(1); // months in the period: 1, 6 or 12
  const [filterIds, setFilterIds] = useState([]); // category filter; empty = all categories
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('date-desc');
  const [editing, setEditing] = useState(null);
  const [incoming, setIncoming] = useState(null); // a payment link waiting in the form
  const [waited, setWaited] = useState(false);
  const [linkTick, setLinkTick] = useState(0); // bumps when a payment link arrives while the app is open
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

  // A payment link (#pay-<amount>-<shop>) fills the add-expense form. It waits briefly for the cloud copy so the
  // category can be guessed from past expenses, and never saves anything by itself.
  const payLink = useRef(parsePayHash(window.location.hash));
  useEffect(() => {
    const read = () => {
      payLink.current = parsePayHash(window.location.hash);
      if (payLink.current) setLinkTick((n) => n + 1);
    };
    const t = setTimeout(() => setWaited(true), 3000);
    window.addEventListener('hashchange', read);
    return () => {
      clearTimeout(t);
      window.removeEventListener('hashchange', read);
    };
  }, []);
  useEffect(() => {
    const link = payLink.current;
    if (!link || (syncStatus === 'connecting' && !waited)) return;
    payLink.current = null;
    setEditing(null);
    setIncoming({
      key: Date.now(),
      amount: link.amount,
      description: link.merchant,
      category: categoryForMerchant(expenses, link.merchant),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [syncStatus, waited, linkTick]);

  const keep = (e) => filterIds.length === 0 || filterIds.includes(e.category);
  const shownExpenses = expenses.filter(keep);
  const shownRecurring = recurring.filter(keep);

  const rows = periodExpenses(shownExpenses, shownRecurring, month, count);
  const prevRows = periodExpenses(shownExpenses, shownRecurring, shiftMonth(month, -count), count);
  const series = monthlySeries(shownExpenses, shownRecurring, month, count);
  const trend = count === 1 ? dailySeries(rows, month) : series;
  const prevTotal = prevRows.reduce((sum, e) => sum + e.amount, 0);
  const listRows = filterAndSort(rows, { query, sort, categoryName: (id) => getCategory(id).name });

  const today = todayISO();
  const reminder = backupReminder(meta, today, expenses.length > 0 || recurring.length > 0);

  const toggleCategory = (id) =>
    setFilterIds((list) => (list.includes(id) ? list.filter((c) => c !== id) : [...list, id]));

  const pickMonth = (m) => {
    setMonth(m);
    setCount(1);
  };

  const toTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const startEdit = (expense) => {
    setIncoming(null);
    setEditing(expense);
    toTop();
  };

  const saveBackup = async () => {
    const result = await saveTextFile(backupFilename(today), makeBackup({ expenses, recurring, budgets, categories }));
    if (result === 'saved') {
      markBackedUp();
      notify('הגיבוי נשמר');
    }
    return result;
  };

  const handleSubmit = (data, { recurring: isRecurring } = {}) => {
    const cat = getCategory(data.category);
    const money = formatMoney(data.amount);
    // a new expense must never end up hidden by the category filter
    const unhid = filterIds.length > 0 && !filterIds.includes(data.category);
    if (unhid) setFilterIds([]);
    const note = unhid ? ' (הסינון אופס)' : '';
    const editingRecurring = Boolean(editing?.recurring);
    setIncoming(null);
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

  const handleAddCategory = (name, color) => {
    notify(`נוספה הקטגוריה "${name}"`, addCategory(name, color));
  };

  const searching = query.trim() !== '';

  return (
    <CategoriesContext.Provider value={names}>
      <div className="app">
        <header className="app-header">
          <h1>מעקב הוצאות</h1>
          {SYNC_LABELS[syncStatus] && <span className={`sync ${syncStatus}`}>{SYNC_LABELS[syncStatus]}</span>}
        </header>

        {reminder && (
          <BackupReminder
            status={reminder}
            onBackup={async () => {
              if ((await saveBackup()) === 'unavailable') notify('שמירת קבצים לא זמינה כאן');
            }}
            onSnooze={() => {
              snoozeReminder(addDays(today, 7));
              notify('אזכיר לך בעוד שבוע');
            }}
          />
        )}

        <section className="card form-card">
          <h2>{editing ? (editing.recurring ? 'עריכת הוצאה קבועה' : 'עריכת הוצאה') : 'הוספת הוצאה'}</h2>
          <ExpenseForm
            key={editing?.id ?? (incoming ? `pay-${incoming.key}` : 'new')}
            initial={editing}
            prefill={incoming}
            onSubmit={handleSubmit}
            onCancel={editing ? () => setEditing(null) : incoming ? () => setIncoming(null) : undefined}
          />
        </section>

        <section className="period-bar">
          <PeriodControls month={month} count={count} onMonth={setMonth} onCount={setCount} />
        </section>

        <CategoryFilter selected={filterIds} onToggle={toggleCategory} onClear={() => setFilterIds([])} />

        <main className="layout">
          <section className="card wide">
            <Summary
              rows={rows}
              count={count}
              series={series}
              prevTotal={prevTotal}
              filterNames={filterIds.map((id) => getCategory(id).name)}
              onClearFilter={() => setFilterIds([])}
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

          <section className="quiet">
            <CategoryManager categories={categories} onAdd={handleAddCategory} />
          </section>

          <section className="card wide">
            <BackupCard
              lastBackup={meta.lastBackup}
              onSave={saveBackup}
              onRestore={(next) => {
                setEditing(null);
                setIncoming(null);
                setFilterIds([]);
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
    </CategoriesContext.Provider>
  );
}
