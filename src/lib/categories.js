export const CATEGORIES = [
  { id: 'food', name: 'אוכל', color: '#e08a2e' },
  { id: 'transport', name: 'תחבורה', color: '#2a9d9d' },
  { id: 'bills', name: 'חשבונות', color: '#3b6fb6' },
  { id: 'fun', name: 'בילויים', color: '#7a6fd0' },
  { id: 'health', name: 'בריאות', color: '#3f9d6b' },
  { id: 'shopping', name: 'קניות', color: '#c0503f' },
  { id: 'other', name: 'אחר', color: '#7b8794' },
];

const byId = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id) {
  return byId[id] ?? byId.other;
}

export function isKnownCategory(id) {
  return id in byId;
}
