import { getCategory } from '../lib/categories.js';
import { formatMoney } from '../lib/format.js';
import { total, totalsByCategory } from '../lib/summary.js';

export default function Summary({ expenses }) {
  const sum = total(expenses);
  const byCategory = totalsByCategory(expenses);

  return (
    <div className="summary">
      <h2>סיכום חודשי</h2>
      <p className="total">{formatMoney(sum)}</p>
      <p className="muted">{expenses.length} הוצאות</p>
      <ul className="category-list">
        {byCategory.map(({ category, total: catTotal }) => {
          const cat = getCategory(category);
          const pct = sum ? Math.round((catTotal / sum) * 100) : 0;
          return (
            <li key={category}>
              <span>
                <span className="dot" style={{ background: cat.color }} />
                {cat.name}
              </span>
              <span className="num">
                {formatMoney(catTotal)} <span className="muted">({pct}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
