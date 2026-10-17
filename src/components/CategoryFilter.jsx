import { CATEGORIES } from '../lib/categories.js';

export default function CategoryFilter({ selected, onToggle, onClear }) {
  return (
    <div className="filters" role="group" aria-label="סינון לפי קטגוריה">
      <span className="muted">הצג רק:</span>
      {CATEGORIES.map((c) => {
        const on = selected.includes(c.id);
        return (
          <button
            key={c.id}
            className="chip"
            style={{ '--chip': c.color }}
            aria-pressed={on}
            onClick={() => onToggle(c.id)}
          >
            <span className="icon" aria-hidden="true">
              {c.icon}
            </span>
            {on && '✓ '}
            {c.name}
          </button>
        );
      })}
      {selected.length > 0 && (
        <button className="link" onClick={onClear}>
          נקה סינון
        </button>
      )}
    </div>
  );
}
