import { getCategory } from '../lib/categories.js';
import { formatMoney, formatMonth } from '../lib/format.js';
import { total, totalsByCategory } from '../lib/summary.js';

const TITLES = { 1: 'סיכום חודשי', 6: 'סיכום ל-6 חודשים', 12: 'סיכום שנתי' };
const WHEN = { 1: 'בחודש הזה', 6: 'ב-6 החודשים האלה', 12: 'בשנה הזו' };
const PREVIOUS = { 1: 'החודש הקודם', 6: '6 החודשים הקודמים', 12: 'השנה הקודמת' };

// rows: every expense in the period; series: one entry per month of the period; prevTotal: the period before it
export default function Summary({ rows, count, series, prevTotal }) {
  const sum = total(rows);
  const byCategory = totalsByCategory(rows);
  const fixed = total(rows.filter((e) => e.recurring));
  const pct = prevTotal > 0 ? Math.round(((sum - prevTotal) / prevTotal) * 100) : null;
  const busiest = series.reduce((a, b) => (b.total > a.total ? b : a), series[0]);

  return (
    <div className="summary">
      <h2>{TITLES[count]}</h2>
      <p className="lead">
        {rows.length === 0 ? (
          'עוד לא נרשמו הוצאות בתקופה הזו. אפשר להתחיל מההוספה למעלה.'
        ) : (
          <>
            {WHEN[count]} הוצאת {formatMoney(sum)}
            {pct !== null && pct !== 0 && (
              <span className={`delta ${pct > 0 ? 'up' : 'down'}`}>
                {' '}
                · {pct > 0 ? '▲' : '▼'} {formatMoney(Math.abs(Math.round((sum - prevTotal) * 100) / 100))}{' '}
                {pct > 0 ? 'יותר' : 'פחות'} מ{PREVIOUS[count]} ({Math.abs(pct)}%)
              </span>
            )}
          </>
        )}
      </p>
      <div className="summary-body">
        <div>
          <p className="total">{formatMoney(sum)}</p>
          <p className="muted">
            {rows.length} הוצאות{fixed > 0 && ` · מתוכן קבועות ${formatMoney(fixed)}`}
          </p>
          {count > 1 && (
            <dl className="stats">
              <div>
                <dt>ממוצע חודשי</dt>
                <dd className="num">{formatMoney(Math.round((sum / count) * 100) / 100)}</dd>
              </div>
              {busiest.total > 0 && (
                <div>
                  <dt>החודש היקר ביותר</dt>
                  <dd>
                    {formatMonth(busiest.month)} <span className="num muted">({formatMoney(busiest.total)})</span>
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>
        <ul className="category-list">
          {byCategory.map(({ category, total: catTotal }) => {
            const cat = getCategory(category);
            const share = sum ? Math.round((catTotal / sum) * 100) : 0;
            return (
              <li key={category}>
                <div className="line">
                  <span className="chip" style={{ '--chip': cat.color }}>
                    <span className="icon" aria-hidden="true">
                      {cat.icon}
                    </span>
                    {cat.name}
                  </span>
                  <span className="num">
                    {formatMoney(catTotal)} <span className="muted">({share}%)</span>
                  </span>
                </div>
                <div className="bar" aria-hidden="true">
                  <span style={{ width: `${share}%`, background: cat.color }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
