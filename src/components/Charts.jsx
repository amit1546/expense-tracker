import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getCategory } from '../lib/categories.js';
import { formatMoney, formatMonthShort } from '../lib/format.js';
import { lastMonthsTotals, totalsByCategory } from '../lib/summary.js';

export default function Charts({ monthExpenses, expenses, recurring, month }) {
  const pieData = totalsByCategory(monthExpenses).map((d) => ({
    ...d,
    name: getCategory(d.category).name,
    color: getCategory(d.category).color,
  }));
  const barData = lastMonthsTotals(expenses, recurring, month, 6).map((d) => ({
    ...d,
    label: formatMonthShort(d.month),
  }));

  return (
    <div className="charts">
      <div className="chart">
        <h3>לפי קטגוריה</h3>
        {pieData.length === 0 ? (
          <p className="empty">אין נתונים להצגה</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="total" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2} stroke="var(--card)">
                {pieData.map((d) => (
                  <Cell key={d.category} fill={d.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatMoney(v)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="chart">
        <h3>6 חודשים אחרונים</h3>
        <ResponsiveContainer width="100%" height={260}>
          {/* reversed so the newest month is on the left, matching RTL reading order */}
          <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <XAxis dataKey="label" reversed tick={{ fill: 'var(--muted)' }} />
            <YAxis orientation="right" axisLine={false} tickLine={false} tickMargin={8} tick={{ fill: 'var(--muted)' }} width={60} />
            <Tooltip formatter={(v) => formatMoney(v)} labelFormatter={(l) => l} cursor={{ fill: 'var(--hover)' }} />
            <Bar dataKey="total" name="סה״כ" fill="var(--bar)" radius={[6, 6, 0, 0]}>
              {barData.map((d) => (
                <Cell key={d.month} fill={d.month === month ? 'var(--pop)' : 'var(--bar)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
