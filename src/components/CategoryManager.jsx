import { useState } from 'react';
import { isNameTaken, nextColor } from '../lib/categories.js';

// A single compact row for adding a category; onAdd(name, color) adds it.
export default function CategoryManager({ categories, onAdd }) {
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
      <form className="cat-add" onSubmit={submit} noValidate>
        <h2>קטגוריה חדשה</h2>
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="צבע לקטגוריה חדשה" />
        <input
          type="text"
          value={name}
          maxLength={24}
          placeholder="שם"
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
