const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });

export function formatMoney(amount) {
  return currency.format(amount);
}

export function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

const monthName = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });

// month is 'YYYY-MM'
export function formatMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return monthName.format(new Date(y, m - 1, 1));
}

export function formatMonthShort(month) {
  const [y, m] = month.split('-');
  return `${m}/${y.slice(2)}`;
}

const monthShort = new Intl.DateTimeFormat('he-IL', { month: 'short' });

// month is 'YYYY-MM' -> short Hebrew month name
export function formatMonthName(month) {
  const [y, m] = month.split('-').map(Number);
  return monthShort.format(new Date(y, m - 1, 1));
}

// 850 -> '850', 1600 -> '1.6K', 12000 -> '12K'
export function compactMoney(n) {
  return n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(Math.round(n));
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Accepts "45", "12,5", "₪ 12.50"; returns NaN when there is no usable number.
export function parseAmount(text) {
  const cleaned = String(text ?? '')
    .replace(/[^\d.,]/g, '')
    .replace(',', '.');
  return cleaned ? Number(cleaned) : NaN;
}
