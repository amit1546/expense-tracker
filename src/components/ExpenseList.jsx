import { useState } from 'react';
import { getCategory } from '../lib/categories.js';
import { formatDate, formatMoney } from '../lib/format.js';

export default function ExpenseList({ expenses, onEdit, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);

  if (expenses.length === 0) {
    return <p className="empty">אין הוצאות בחודש הזה עדיין.</p>;
  }

  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="table-wrap">
      <table className="expense-table">
        <thead>
          <tr>
            <th>תאריך</th>
            <th>קטגוריה</th>
            <th>תיאור</th>
            <th>סכום</th>
            <th aria-label="פעולות" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => {
            const cat = getCategory(e.category);
            return (
              <tr key={e.id}>
                <td>{formatDate(e.date)}</td>
                <td>
                  <span className="chip" style={{ '--chip': cat.color }}>
                    <span className="dot" />
                    {cat.name}
                  </span>
                </td>
                <td>{e.description}</td>
                <td className="num">{formatMoney(e.amount)}</td>
                <td className="row-actions">
                  {confirmId === e.id ? (
                    <span className="confirm">
                      למחוק?
                      <button
                        className="link danger"
                        onClick={() => {
                          onDelete(e);
                          setConfirmId(null);
                        }}
                      >
                        כן, מחיקה
                      </button>
                      <button className="link" onClick={() => setConfirmId(null)}>
                        ביטול
                      </button>
                    </span>
                  ) : (
                    <>
                      <button className="link" onClick={() => onEdit(e)}>
                        עריכה
                      </button>
                      <button className="link danger" onClick={() => setConfirmId(e.id)}>
                        מחיקה
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
