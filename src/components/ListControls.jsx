import { SORTS } from '../lib/list.js';

export default function ListControls({ query, sort, onQuery, onSort }) {
  return (
    <div className="list-controls">
      <input
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="חיפוש לפי תיאור, קטגוריה או סכום"
        aria-label="חיפוש"
      />
      <select value={sort} onChange={(e) => onSort(e.target.value)} aria-label="מיון">
        {SORTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
