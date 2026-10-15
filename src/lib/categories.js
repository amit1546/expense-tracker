export const CATEGORIES = [
  { id: 'food', name: 'אוכל', color: '#ff6b4a' },
  { id: 'transport', name: 'תחבורה', color: '#14b8a6' },
  { id: 'housing', name: 'דיור', color: '#6366f1' },
  { id: 'bills', name: 'חשבונות', color: '#f5b82e' },
  { id: 'fun', name: 'בילויים', color: '#a855f7' },
  { id: 'health', name: 'בריאות', color: '#06b6d4' },
  { id: 'shopping', name: 'קניות', color: '#ec4899' },
  { id: 'other', name: 'אחר', color: '#94a3b8' },
];

const byId = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id) {
  return byId[id] ?? byId.other;
}
