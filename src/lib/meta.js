// App-level facts that should follow the data: { lastBackup, firstUse, snoozedUntil } as ISO dates.
const date = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export function normalizeMeta(value, today) {
  return {
    lastBackup: date(value?.lastBackup),
    firstUse: date(value?.firstUse) ?? today,
    snoozedUntil: date(value?.snoozedUntil),
  };
}
