import { useState } from 'react';
import { useCategories } from '../hooks/CategoriesContext.js';
import { parseAmount } from '../lib/format.js';

const toText = (n) => (n ? String(n) : '');

// Monthly amounts. An empty field means "no budget". Longer periods multiply them by the months in the period.
export default function BudgetEditor({ budgets, onSave, onCancel }) {
  const { categories } = useCategories();
  const [total, setTotal] = useState(toText(budgets.total));
  const [byCategory, setByCategory] = useState(() =>
    Object.fromEntries(categories.map((c) => [c.id, toText(budgets.categories[c.id])])),
  );
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const parse = (text) => (text.trim() === '' ? null : parseAmount(text));
    const values = {
      total: parse(total),
      ...Object.fromEntries(categories.map((c) => [c.id, parse(byCategory[c.id] ?? '')])),
    };
    if (Object.values(values).some((v) => v !== null && !(v > 0))) {
      setError('יש להזין סכומים חיוביים, או להשאיר ריק');
      return;
    }
    const limits = {};
    for (const c of categories) if (values[c.id]) limits[c.id] = values[c.id];
    onSave({ total: values.total, categories: limits });
  };

  return (
    <form className="budget-editor" onSubmit={handleSubmit} noValidate>
      <label className="budget-total">
        תקציב חודשי כולל (₪)
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="ללא"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
        />
      </label>
      <div className="budget-grid">
        {categories.map((c) => (
          <label key={c.id}>
            <span>
              <span className="dot" style={{ background: c.color }} />
              {c.name}
            </span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="ללא"
              value={byCategory[c.id] ?? ''}
              onChange={(e) => setByCategory((m) => ({ ...m, [c.id]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="submit">שמירה</button>
        <button type="button" className="secondary" onClick={onCancel}>
          ביטול
        </button>
      </div>
    </form>
  );
}
