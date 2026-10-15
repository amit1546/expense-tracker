import { useState } from 'react';
import { useExpenses } from './hooks/useExpenses.js';
import { filterByMonth } from './lib/summary.js';
import { copyCSV, downloadCSV, toCSV } from './lib/csv.js';
import { todayISO } from './lib/format.js';
import ExpenseForm from './components/ExpenseForm.jsx';
import ExpenseList from './components/ExpenseList.jsx';
import MonthPicker from './components/MonthPicker.jsx';
import Summary from './components/Summary.jsx';
import Charts from './components/Charts.jsx';

export default function App() {
  const { expenses, add, update, remove } = useExpenses();
  const [month, setMonth] = useState(() => todayISO().slice(0, 7));
  const [editing, setEditing] = useState(null);
  const [csvText, setCsvText] = useState(null);
  const [copied, setCopied] = useState(false);

  const monthExpenses = filterByMonth(expenses, month);

  const handleSubmit = (data) => {
    if (editing) {
      update(editing.id, data);
      setEditing(null);
    } else {
      add(data);
    }
  };

  const handleDelete = (expense) => {
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
          <Charts monthExpenses={monthExpenses} allExpenses={expenses} month={month} />
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
                disabled={expenses.length === 0}
                onClick={() => downloadCSV(expenses, 'expenses-all.csv')}
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
