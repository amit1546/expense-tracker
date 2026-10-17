import { useState } from 'react';
import { useCategories } from '../hooks/CategoriesContext.js';
import { formatMoney, formatMonth } from '../lib/format.js';
import { total, totalsByCategory } from '../lib/summary.js';
import { budgetStatus } from '../lib/budget.js';
import BudgetEditor from './BudgetEditor.jsx';

const TITLES = { 1: 'סיכום חודשי', 6: 'סיכום ל-6 חודשים', 12: 'סיכום שנתי' };
const WHEN = { 1: 'בחודש הזה', 6: 'ב-6 החודשים האלה', 12: 'בשנה הזו' };
const PREVIOUS = { 1: 'החודש הקודם', 6: '6 החודשים הקודמים', 12: 'השנה הקודמת' };
const BUDGET_TITLES = { 1: 'תקציב חודשי', 6: 'תקציב ל-6 חודשים', 12: 'תקציב שנתי' };

// rows: every expense in the period; series: one entry per month of the period; prevTotal: the period before it
// budgets: monthly amounts, multiplied here by the number of months in the period
export default function Summary({ rows, count, series, prevTotal, filterNames, onClearFilter, budgets, onBudgets }) {
  const { getCategory } = useCategories();
  const [editingBudget, setEditingBudget] = useState(false);
  const filtered = filterNames.length > 0;
  const sum = total(rows);
  const spentBy = totalsByCategory(rows);
  // categories that have a budget but no spending yet still show their (empty) progress bar
  const empty = filtered
    ? []
    : Object.keys(budgets.categories)
        .filter((id) => !spentBy.some((s) => s.category === id))
        .map((id) => ({ category: id, total: 0 }));
  const byCategory = [...spentBy, ...empty];
  const fixed = total(rows.filter((e) => e.recurring));
  const pct = prevTotal > 0 ? Math.round(((sum - prevTotal) / prevTotal) * 100) : null;
  const busiest = series.reduce((a, b) => (b.total > a.total ? b : a), series[0]);
  const totalBudget = budgets.total ? budgets.total * count : null;
  const totalStatus = filtered ? null : budgetStatus(sum, totalBudget);
  const hasBudget = budgets.total || Object.keys(budgets.categories).length > 0;

  return (
    <div className="summary">
      <div className="summary-head">
        <h2>{TITLES[count]}</h2>
        {!editingBudget && (
          <button className="link" onClick={() => setEditingBudget(true)}>
            {hasBudget ? 'עריכת תקציב' : 'הגדרת תקציב'}
          </button>
        )}
      </div>
      {editingBudget && (
        <BudgetEditor
          budgets={budgets}
          onSave={(next) => {
            onBudgets(next);
            setEditingBudget(false);
          }}
          onCancel={() => setEditingBudget(false)}
        />
      )}
      {filtered && (
        <p className="filter-note">
          מוצגות רק: {filterNames.join(', ')}
          <button className="link" onClick={onClearFilter}>
            הצג הכול
          </button>
        </p>
      )}
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
      {totalStatus && (
        <div className="budget">
          <div className="line">
            <span>{BUDGET_TITLES[count]}</span>
            <span className="num">
              {formatMoney(sum)} מתוך {formatMoney(totalBudget)}
            </span>
          </div>
          <div className="bar" aria-hidden="true">
            <span className={totalStatus.state} style={{ width: `${Math.min(100, totalStatus.pct)}%` }} />
          </div>
          <p className={`budget-left ${totalStatus.state}`}>
            {totalStatus.remaining < 0
              ? `חריגה של ${formatMoney(-totalStatus.remaining)}`
              : `נותרו ${formatMoney(totalStatus.remaining)}`}
          </p>
        </div>
      )}
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
            const catBudget = budgets.categories[category] ? budgets.categories[category] * count : null;
            const status = budgetStatus(catTotal, catBudget);
            return (
              <li key={category}>
                <div className="line">
                  <span className="chip" style={{ '--chip': cat.color }}>
                    <span className="dot" />
                    {cat.name}
                  </span>
                  <span className="num">
                    {formatMoney(catTotal)}{' '}
                    {status ? (
                      <span className={`muted ${status.state === 'over' ? 'over-text' : ''}`}>
                        מתוך {formatMoney(catBudget)}
                      </span>
                    ) : (
                      <span className="muted">({share}%)</span>
                    )}
                  </span>
                </div>
                <div className="bar" aria-hidden="true">
                  {status ? (
                    <span className={status.state} style={{ width: `${Math.min(100, status.pct)}%` }} />
                  ) : (
                    <span style={{ width: `${share}%`, background: cat.color }} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
