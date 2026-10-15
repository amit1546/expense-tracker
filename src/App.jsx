import { useState } from 'react';
import { useExpenses } from './hooks/useExpenses.js';
import { allWithRecurring, monthExpenses as monthRows } from './lib/summary.js';
import { copyCSV, downloadCSV, toCSV } from './lib/csv.js';
import { todayISO } from './lib/format.js';
import ExpenseForm from './components/ExpenseForm.jsx';
import ExpenseList from './components/ExpenseList.jsx';
import MonthPicker from './components/MonthPicker.jsx';
import Summary from './components/Summary.jsx';
import Charts from './components/Charts.jsx';

export default function App() {
  const { expenses, recurring, add, update, remove, addRecurring, stopRecurring } = useExpenses();
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));
  const [editing, setEditing] = useState(null);
  const [csvText, setCsvText] = useState(null);
  const [copied, setCopied] = useState(false);

  const monthExpenses = monthRows(expenses, recurring, month);

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
      stopRecurring(expense.recurringId, month);
      return;
    }
    remove(expense.id);
    if (editing?.id === expense.id) setEditing(null);
  };

  const handleCopy = async () => {
    if (await copyCSV(monthExpenses)) {
      setCsvText(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCsvText(toCSV(monthExpenses));
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>מעקב הוצאות</h1>
        <MonthPicker month={month} onChange={setMonth} />
      </header>

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
          <Summary expenses={monthExpenses} />
        </section>

        <section className="card wide">
          <Charts monthExpenses={monthExpenses} expenses={expenses} recurring={recurring} month={month} />
        </section>

        <section className="card wide">
          <div className="list-header">
            <h2>הוצאות החודש</h2>
            <div className="actions">
              <button
                className="secondary"
                disabled={monthExpenses.length === 0}
                onClick={() => downloadCSV(monthExpenses, `expenses-${month}.csv`)}
              >
                ייצוא החודש ל-CSV
              </button>
              <button
                className="secondary"
                disabled={expenses.length === 0 && recurring.length === 0}
                onClick={() => downloadCSV(allWithRecurring(expenses, recurring, todayISO().slice(0, 7)), 'expenses-all.csv')}
              >
                ייצוא הכול
              </button>
              <button className="secondary" disabled={monthExpenses.length === 0} onClick={handleCopy}>
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
          <ExpenseList expenses={monthExpenses} onEdit={setEditing} onDelete={handleDelete} />
        </section>
      </main>
    </div>
  );
}
