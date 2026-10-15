export const CATEGORIES = [
  { id: 'food', name: 'אוכל', color: '#e76f51' },
  { id: 'transport', name: 'תחבורה', color: '#2a9d8f' },
  { id: 'housing', name: 'דיור', color: '#577590' },
  { id: 'bills', name: 'חשבונות', color: '#e9c46a' },
  { id: 'fun', name: 'בילויים', color: '#9b5de5' },
  { id: 'health', name: 'בריאות', color: '#00b4d8' },
  { id: 'shopping', name: 'קניות', color: '#f15bb5' },
  { id: 'other', name: 'אחר', color: '#8d99ae' },
];

const byId = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id) {
  return byId[id] ?? byId.other;
}
