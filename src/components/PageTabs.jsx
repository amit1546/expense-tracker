const PAGES = [
  { id: 'add', label: 'הוספת הוצאה' },
  { id: 'overview', label: 'סיכום והוצאות' },
];

// Two pages: adding an expense, and everything else.
export default function PageTabs({ page, onPage }) {
  return (
    <nav className="seg tabs" aria-label="עמודים">
      {PAGES.map((p) => (
        <button key={p.id} aria-pressed={p.id === page} onClick={() => onPage(p.id)}>
          {p.label}
        </button>
      ))}
    </nav>
  );
}
