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
import { compactMoney, formatMoney, formatMonth, formatMonthName } from '../lib/format.js';
import { total, totalsByCategory } from '../lib/summary.js';

const BAR_TITLES = { 1: '6 החודשים האחרונים', 6: 'הוצאות לפי חודש', 12: 'הוצאות לפי חודש' };

function MonthTick({ x, y, payload, inRange }) {
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

function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const parts = payload.filter((p) => p.dataKey !== 'total' && p.value > 0).reverse();
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
  const sum = total(rows);
  const pieData = totalsByCategory(rows).map((d) => ({
    ...d,
    name: getCategory(d.category).name,
    icon: getCategory(d.category).icon,
    color: getCategory(d.category).color,
    share: sum ? Math.round((d.total / sum) * 100) : 0,
  }));
  const usedCategories = CATEGORIES.filter((c) => trend.some((m) => m[c.id] > 0));

  return (
    <div className="charts">
      <div className="chart">
        <h3>לאן הלך הכסף</h3>
        <p className="sub">לחיצה על קטגוריה מסננת את המסך אליה.</p>
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
                  <Tooltip formatter={(v) => formatMoney(v)} />
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
                  <button className="legend-item" style={{ '--chip': d.color }} onClick={() => onToggleCategory(d.category)}>
                    <span className="swatch" />
                    <span aria-hidden="true">{d.icon}</span>
                    {d.name}
                    <strong className="num">{d.share}%</strong>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="chart">
        <h3>{BAR_TITLES[count]}</h3>
        <p className="sub">
          {count === 1 ? 'החודש שבחרת מודגש. ' : ''}לחיצה על עמודה פותחת את החודש.
        </p>
        <ResponsiveContainer width="100%" height={290}>
          {/* reversed so the newest month is on the left, matching RTL reading order */}
          <ComposedChart data={trend} margin={{ top: 22, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              reversed
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              interval={0}
              tick={(props) => <MonthTick {...props} inRange={inRange} />}
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
                {trend.map((d) => (
                  <Cell key={d.month} fill={c.color} fillOpacity={inRange.includes(d.month) ? 1 : 0.3} />
                ))}
              </Bar>
            ))}
            {/* invisible line that only carries the total label above each stack */}
            <Line
              dataKey="total"
              name="סה״כ"
              stroke="none"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              label={{
                position: 'top',
                fill: 'var(--text)',
                fontSize: 12,
                fontWeight: 600,
                formatter: (v) => (v > 0 ? compactMoney(v) : ''),
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <ul className="legend">
          {usedCategories.map((c) => (
            <li key={c.id} className="legend-item static" style={{ '--chip': c.color }}>
              <span className="swatch" />
              <span aria-hidden="true">{c.icon}</span>
              {c.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
