import { formatMonth } from '../lib/format.js';
import { shiftMonth } from '../lib/summary.js';

export const PERIODS = [
  { count: 1, label: 'חודש' },
  { count: 6, label: '6 חודשים' },
  { count: 12, label: 'שנה' },
];

// The period is the `count` months ending at `month`; the arrows move a whole period at a time.
export default function PeriodControls({ month, count, onMonth, onCount }) {
  const label =
    count === 1 ? formatMonth(month) : `${formatMonth(shiftMonth(month, -(count - 1)))} – ${formatMonth(month)}`;

  return (
    <div className="controls">
      <div className="seg" role="group" aria-label="תקופה">
        {PERIODS.map((p) => (
          <button key={p.count} aria-pressed={p.count === count} onClick={() => onCount(p.count)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="month-picker">
        {/* RTL: "previous" sits on the right */}
        <button onClick={() => onMonth(shiftMonth(month, -count))} aria-label="תקופה קודמת">
          ›
        </button>
        <span className="month-label">{label}</span>
        <button onClick={() => onMonth(shiftMonth(month, count))} aria-label="תקופה הבאה">
          ‹
        </button>
      </div>
    </div>
  );
}
