import { formatMonth } from '../lib/format.js';
import { shiftMonth } from '../lib/summary.js';

export default function MonthPicker({ month, onChange }) {
  return (
    <div className="month-picker">
      {/* RTL: "previous" sits on the right */}
      <button className="secondary" onClick={() => onChange(shiftMonth(month, -1))} aria-label="חודש קודם">
        ›
      </button>
      <span className="month-label">{formatMonth(month)}</span>
      <button className="secondary" onClick={() => onChange(shiftMonth(month, 1))} aria-label="חודש הבא">
        ‹
      </button>
    </div>
  );
}
