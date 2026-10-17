import { useState } from 'react';
import { FALLBACK_ID, isNameTaken, nextColor } from '../lib/categories.js';

const MAX_NAME = 24;

function CategoryRow({ category, count, categories, onUpdate, onRemove, onError }) {
  const [name, setName] = useState(category.name);

  // commits the new name on blur or Enter; a bad name goes back to the old one
  const commit = () => {
    const next = name.trim();
    if (next === category.name) return;
    if (!next) {
      onError('יש להזין שם לקטגוריה');
    } else if (isNameTaken(categories, next, category.id)) {
      onError('כבר יש קטגוריה בשם הזה');
    } else {
      onError('');
      onUpdate(category.id, { name: next });
      return;
    }
    setName(category.name);
  };

  return (
    <li className="cat-row">
      <input
        type="color"
        value={category.color}
        onChange={(e) => onUpdate(category.id, { color: e.target.value })}
        aria-label={`צבע ל${category.name}`}
      />
      <input
        type="text"
        value={name}
        maxLength={MAX_NAME}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label={`שם הקטגוריה ${category.name}`}
      />
      <span className="muted num">{count}</span>
      {category.id !== FALLBACK_ID ? (
        <button className="link danger" onClick={() => onRemove(category.id)}>
          מחיקה
        </button>
      ) : (
        <span />
      )}
    </li>
  );
}

// counts: number of expenses (including recurring items) per category id
export default function CategoryManager({ categories, counts, onAdd, onUpdate, onRemove }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(() => nextColor(categories));
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const next = name.trim();
    if (!next) return setError('יש להזין שם לקטגוריה');
    if (isNameTaken(categories, next)) return setError('כבר יש קטגוריה בשם הזה');
    onAdd(next, color);
    setName('');
    setColor(nextColor([...categories, null]));
    setError('');
  };

  return (
    <div className="cat-manager">
      <h2>קטגוריות</h2>
      <ul className="cat-list">
        {categories.map((c) => (
          <CategoryRow
            key={c.id}
            category={c}
            count={counts[c.id] ?? 0}
            categories={categories}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onError={setError}
          />
        ))}
      </ul>
      <form className="cat-add" onSubmit={submit} noValidate>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="צבע לקטגוריה חדשה" />
        <input
          type="text"
          value={name}
          maxLength={MAX_NAME}
          placeholder="קטגוריה חדשה"
          onChange={(e) => setName(e.target.value)}
          aria-label="שם קטגוריה חדשה"
        />
        <button type="submit">הוספה</button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
