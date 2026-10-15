import { getCategory } from './categories.js';

function escapeCell(value) {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(expenses) {
  const header = ['תאריך', 'קטגוריה', 'תיאור', 'סכום'];
  const rows = [...expenses]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => [e.date, getCategory(e.category).name, e.description, e.amount]);
  return [header, ...rows].map((r) => r.map(escapeCell).join(',')).join('\r\n');
}

export function downloadCSV(expenses, filename) {
  // BOM so Excel opens Hebrew text as UTF-8
  const blob = new Blob(['﻿' + toCSV(expenses)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
