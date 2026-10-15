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

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
