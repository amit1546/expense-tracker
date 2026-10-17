import { useRef, useState } from 'react';
import { useCategories } from '../hooks/CategoriesContext.js';
import { parseAmount, todayISO } from '../lib/format.js';

// initial: an expense being edited. prefill: { amount, description, category? } to start a new expense from
// (for example from a payment link). Both are empty when adding from scratch.
export default function ExpenseForm({ initial, prefill, onSubmit, onCancel }) {
  const { categories } = useCategories();
  const [amount, setAmount] = useState(initial ? String(initial.amount) : (prefill?.amount ?? ''));
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [category, setCategory] = useState(initial?.category ?? prefill?.category ?? categories[0].id);
  const [description, setDescription] = useState(initial?.description ?? prefill?.description ?? '');
  const [isRecurring, setIsRecurring] = useState(false);
  const [error, setError] = useState('');
  const amountRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('יש להזין סכום חיובי, למשל 45 או 12.50');
      amountRef.current?.focus();
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
    <form className="expense-form" onSubmit={handleSubmit} noValidate>
      <label>
        סכום (₪)
        <input
          ref={amountRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <label>
        תאריך
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <label>
        קטגוריה
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
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
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-foot">
        {!initial ? (
          <label className="check">
            <input type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} />
            <span>הוצאה קבועה (חוזרת כל חודש)</span>
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
