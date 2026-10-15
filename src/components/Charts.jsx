import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CATEGORIES, getCategory } from '../lib/categories.js';
import { formatMoney, formatMonth, formatMonthShort } from '../lib/format.js';
import { totalsByCategory } from '../lib/summary.js';

const BAR_TITLES = { 1: '6 חודשים אחרונים', 6: 'לפי חודש', 12: 'לפי חודש' };

function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const parts = payload.filter((p) => p.value > 0).reverse();
  return (
    <div className="tip">
      <strong>{formatMonth(row.month)}</strong>
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

// rows: expenses of the period; trend: monthly series (stacked by category); inRange: months inside the period
export default function Charts({ rows, trend, inRange, count, onPickMonth, onToggleCategory }) {
  const pieData = totalsByCategory(rows).map((d) => ({
    ...d,
    name: getCategory(d.category).name,
    color: getCategory(d.category).color,
  }));
  const barData = trend.map((d) => ({ ...d, label: formatMonthShort(d.month) }));

  return (
    <div className="charts">
      <div className="chart">
        <h3>לפי קטגוריה</h3>
        {pieData.length === 0 ? (
          <p className="empty">אין נתונים להצגה</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="total"
                nameKey="name"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
                stroke="var(--card)"
                onClick={(d) => onToggleCategory(d.category ?? d.payload?.category)}
              >
                {pieData.map((d) => (
                  <Cell key={d.category} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatMoney(v)} />
            </PieChart>
          </ResponsiveContainer>
        )}
        <p className="hint center">לחיצה על פלח מסננת לפי הקטגוריה</p>
      </div>
      <div className="chart">
        <h3>{BAR_TITLES[count]}</h3>
        <ResponsiveContainer width="100%" height={260}>
          {/* reversed so the newest month is on the left, matching RTL reading order */}
          <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <XAxis dataKey="label" reversed tick={{ fill: 'var(--muted)' }} />
            <YAxis orientation="right" axisLine={false} tickLine={false} tickMargin={8} tick={{ fill: 'var(--muted)' }} width={60} />
            <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--hover)' }} />
            {CATEGORIES.map((c) => (
              <Bar
                key={c.id}
                dataKey={c.id}
                name={c.name}
                stackId="months"
                fill={c.color}
                onClick={(d) => onPickMonth(d.payload?.month ?? d.month)}
              >
                {barData.map((d) => (
                  <Cell key={d.month} fill={c.color} fillOpacity={inRange.includes(d.month) ? 1 : 0.3} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
        <p className="hint center">לחיצה על עמודה פותחת את החודש הזה</p>
      </div>
    </div>
  );
}
