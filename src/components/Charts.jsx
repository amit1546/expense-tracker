import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CATEGORIES, getCategory } from '../lib/categories.js';
import { compactMoney, formatDate, formatMoney, formatMonth, formatMonthName } from '../lib/format.js';
import { total, totalsByCategory } from '../lib/summary.js';

// A single month is drawn day by day; 6 months and a year are drawn month by month.
const TITLES = { days: 'הוצאות לפי יום', months: 'הוצאות לפי חודש' };

function AxisTick({ x, y, payload, mode, inRange }) {
  if (mode === 'days') {
    const day = Number(payload.value.slice(8, 10));
    if (day !== 1 && day % 5 !== 0) return null;
    return (
      <text x={x} y={y + 14} textAnchor="middle" fontSize={12} fill="var(--muted)">
        {day}
      </text>
    );
  }
  const on = inRange.includes(payload.value);
  return (
    <text
      x={x}
      y={y + 14}
      textAnchor="middle"
      fontSize={12}
      fontWeight={on ? 700 : 400}
      fill={on ? 'var(--text)' : 'var(--muted)'}
    >
      {formatMonthName(payload.value)}
    </text>
  );
}

function BarTooltip({ active, payload, mode }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  if (!row.total) return null;
  const parts = payload.filter((p) => p.dataKey !== 'total' && p.value > 0).reverse();
  return (
    <div className="tip">
      <strong>{mode === 'days' ? formatDate(row.date) : formatMonth(row.month)}</strong>
      {parts.map((p) => (
        <div key={p.dataKey} className="tip-row">
          <span>
            <span className="dot" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="num">{formatMoney(p.value)}</span>
        </div>
      ))}
      <div className="tip-row tip-total">
        <span>סה״כ</span>
        <span className="num">{formatMoney(row.total)}</span>
      </div>
    </div>
  );
}

// rows: expenses of the period; trend: series to stack by category (days of the month, or months);
// inRange: months inside the period (month mode only)
export default function Charts({ rows, trend, inRange, count, onPickMonth, onToggleCategory }) {
  const mode = count === 1 ? 'days' : 'months';
  const xKey = mode === 'days' ? 'date' : 'month';
  const sum = total(rows);
  const pieData = totalsByCategory(rows).map((d) => ({
    ...d,
    name: getCategory(d.category).name,
    color: getCategory(d.category).color,
    share: sum ? Math.round((d.total / sum) * 100) : 0,
  }));
  const usedCategories = CATEGORIES.filter((c) => trend.some((m) => m[c.id] > 0));

  return (
    <div className="charts">
      <div className="chart">
        <h3>לאן הלך הכסף</h3>
        {pieData.length === 0 ? (
          <p className="empty">אין נתונים להצגה</p>
        ) : (
          <>
            <div className="donut">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={72}
                    outerRadius={108}
                    paddingAngle={2}
                    stroke="var(--card)"
                    onClick={(d) => onToggleCategory(d.category ?? d.payload?.category)}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.category} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <span className="muted">סה״כ</span>
                <strong className="num">{formatMoney(sum)}</strong>
              </div>
            </div>
            <ul className="legend">
              {pieData.map((d) => (
                <li key={d.category}>
                  <button
                    className="legend-item"
                    style={{ '--chip': d.color }}
                    onClick={() => onToggleCategory(d.category)}
                  >
                    <span className="swatch" />
                    {d.name}
                    <strong className="num">{d.share}%</strong>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className={`chart ${mode}`}>
        <h3>{TITLES[mode]}</h3>
        <ResponsiveContainer width="100%" height={290}>
          {/* reversed so the newest bar is on the left, matching RTL reading order */}
          <ComposedChart data={trend} margin={{ top: 22, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey={xKey}
              reversed
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              interval={0}
              tick={(props) => <AxisTick {...props} mode={mode} inRange={inRange} />}
            />
            <YAxis
              orientation="right"
              axisLine={false}
              tickLine={false}
              tickMargin={6}
              width={44}
              tickFormatter={compactMoney}
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
            />
            <Tooltip content={<BarTooltip mode={mode} />} cursor={{ fill: 'var(--hover)', stroke: 'none' }} />
            {CATEGORIES.map((c) => (
              <Bar
                key={c.id}
                dataKey={c.id}
                name={c.name}
                stackId="stack"
                fill={c.color}
                onClick={mode === 'months' ? (d) => onPickMonth(d.payload?.month ?? d.month) : undefined}
              >
                {trend.map((d) => (
                  <Cell
                    key={d[xKey]}
                    fill={c.color}
                    fillOpacity={mode === 'days' || inRange.includes(d.month) ? 1 : 0.3}
                  />
                ))}
              </Bar>
            ))}
            {/* invisible line that only carries the total label above each month's stack */}
            <Line
              dataKey="total"
              name="סה״כ"
              stroke="none"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              label={
                mode === 'months'
                  ? {
                      position: 'top',
                      fill: 'var(--text)',
                      fontSize: 12,
                      fontWeight: 600,
                      formatter: (v) => (v > 0 ? compactMoney(v) : ''),
                    }
                  : false
              }
            />
          </ComposedChart>
        </ResponsiveContainer>
        <ul className="legend">
          {usedCategories.map((c) => (
            <li key={c.id} className="legend-item static" style={{ '--chip': c.color }}>
              <span className="swatch" />
              {c.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
