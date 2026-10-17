import { useRef, useState } from 'react';
import { CATEGORIES } from '../lib/categories.js';
import { todayISO } from '../lib/format.js';

export default function ExpenseForm({ initial, onSubmit, onCancel }) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0].id);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isRecurring, setIsRecurring] = useState(false);
  const [error, setError] = useState('');
  const amountRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('יש להזין סכום חיובי');
      return;
    }
    if (!date) {
      setError('יש לבחור תאריך');
      return;
    }
    onSubmit(
      { amount: Math.round(value * 100) / 100, date, category, description: description.trim() },
      { recurring: isRecurring },
    );
    if (!initial) {
      setAmount('');
      setDescription('');
      setIsRecurring(false);
      amountRef.current?.focus();
    }
    setError('');
  };

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <label>
        סכום (₪)
        <input
          ref={amountRef}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </label>
      <label>
        תאריך
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <label>
        תיאור
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="למשל: קניות בסופר"
        />
      </label>
      <fieldset className="cat-picker">
        <legend>קטגוריה</legend>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className="cat-btn"
            style={{ '--chip': c.color }}
            aria-pressed={category === c.id}
            onClick={() => setCategory(c.id)}
          >
            <span className="dot" />
            {c.name}
          </button>
        ))}
      </fieldset>
      {error && <p className="error">{error}</p>}
      <div className="form-foot">
        {!initial ? (
          <label className="check">
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
            <span>
              הוצאה קבועה (חוזרת כל חודש)
              {isRecurring && <span className="hint">תופיע בכל חודש מהתאריך שנבחר ואילך, באותו יום בחודש.</span>}
            </span>
          </label>
        ) : (
          <span />
        )}
        <div className="actions">
          <button type="submit">{initial ? 'שמירה' : 'הוספה'}</button>
          {onCancel && (
            <button type="button" className="secondary" onClick={onCancel}>
              ביטול
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
