import { test, expect } from '@playwright/test';

// A stand-in for the claude.ai `db` and `user` capabilities. The "cloud" lives in localStorage under its own key,
// so it survives reloads and survives wiping the app's own data, just like a server would.
function installFakeCloud({ seed, noDb, failWrites }) {
  const KEY = '__fake_cloud__';
  if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(seed));
  const load = () => JSON.parse(localStorage.getItem(KEY));
  const save = (d) => localStorage.setItem(KEY, JSON.stringify(d));
  const listeners = new Set();
  const emit = () => listeners.forEach((l) => l());
  const writes = [];
  const snapshot = () => ({
    docs: Object.entries(load()).map(([id, body]) => ({ id, exists: true, data: () => body })),
    metadata: { fromCache: false, hasPendingWrites: false },
  });
  const collection = {
    get: async () => snapshot(),
    onSnapshot(next) {
      const l = () => next(snapshot());
      listeners.add(l);
      setTimeout(l, 0);
      return () => listeners.delete(l);
    },
    doc: (id) => ({
      set: async (body) => {
        if (window.__failWrites ?? failWrites) throw { code: 'resource_exhausted', message: 'nope' };
        const d = load();
        d[id] = JSON.parse(JSON.stringify(body));
        save(d);
        writes.push(`set:${id}`);
        emit();
      },
      delete: async () => {
        const d = load();
        delete d[id];
        save(d);
        writes.push(`delete:${id}`);
        emit();
      },
    }),
  };
  window.claude = {
    use: async (name) => {
      if (name === 'db') return noDb ? null : { collection: () => collection };
      if (name === 'user') return { id: async () => 'u_test' };
      return null;
    },
  };
  window.__cloud = {
    read: load,
    writes,
    push(id, body) {
      const d = load();
      d[id] = body;
      save(d);
      emit();
    },
  };
}

const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const NOW = new Date();
const CUR = ym(NOW);
const CATEGORIES = [
  { id: 'food', name: 'אוכל', color: '#e08a2e' },
  { id: 'transport', name: 'תחבורה', color: '#2a9d9d' },
  { id: 'bills', name: 'חשבונות', color: '#3b6fb6' },
  { id: 'fun', name: 'בילויים', color: '#7a6fd0' },
  { id: 'health', name: 'בריאות', color: '#3f9d6b' },
  { id: 'shopping', name: 'קניות', color: '#c0503f' },
  { id: 'other', name: 'אחר', color: '#7b8794' },
];
const meta = {
  categories: CATEGORIES,
  recurring: [],
  budgets: { total: null, categories: {} },
  meta: { lastBackup: null, firstUse: '2026-01-01', snoozedUntil: null },
};
const cloudDocs = (expenses = []) => ({
  meta,
  ...(expenses.length ? { [`ex-${CUR}`]: { month: CUR, expenses } } : {}),
});
const food = { id: 'a', amount: 120, date: `${CUR}-05`, category: 'food', description: 'סופר' };

async function open(page, { cloud = {}, local = null, dirty = false, noDb = false, failWrites = false } = {}) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(installFakeCloud, { seed: cloud, noDb, failWrites });
  await page.addInitScript(
    ([l, d]) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      if (l) localStorage.setItem('expense-tracker:v1:expenses', JSON.stringify(l));
      if (d) localStorage.setItem('expense-tracker:v1:unsynced', 'true');
    },
    [local, dirty],
  );
  await page.goto('/');
  return errors;
}

const form = (page) => page.locator('.form-card');
const rows = (page) => page.locator('tbody tr');
const wipeLocal = (page) =>
  page.evaluate(() =>
    Object.keys(localStorage)
      .filter((k) => k.startsWith('expense-tracker:'))
      .forEach((k) => localStorage.removeItem(k)),
  );

test.describe('cloud copy', () => {
  test('a wiped device gets its data back from the cloud', async ({ page }) => {
    const errors = await open(page, { cloud: cloudDocs([food]) });
    await expect(page.locator('.sync')).toContainText('נשמר בענן');
    await expect(rows(page)).toHaveCount(1);
    await expect(page.locator('tbody tr', { hasText: 'סופר' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('this is the phone bug: local storage emptied between visits, data still there', async ({ page }) => {
    await open(page);
    await form(page).locator('input[inputmode=decimal]').fill('75');
    await form(page).locator('input[placeholder^="למשל"]').fill('קפה');
    await form(page).locator('button[type=submit]').click();
    await expect(rows(page)).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => Object.keys(window.__cloud.read()))).toContain(`ex-${CUR}`);
    await wipeLocal(page); // what leaving the app does on the phone
    await page.reload();
    await expect(page.locator('tbody tr', { hasText: 'קפה' })).toBeVisible();
  });

  test('only changed documents are written, and an emptied month is deleted', async ({ page }) => {
    await open(page, { cloud: cloudDocs([food]) });
    await expect(page.locator('.sync')).toContainText('נשמר בענן');
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__cloud.writes)).toEqual([]); // opening writes nothing
    await page.locator('tbody tr', { hasText: 'סופר' }).locator('button', { hasText: 'מחיקה' }).click();
    await expect.poll(() => page.evaluate(() => window.__cloud.writes)).toContain(`delete:ex-${CUR}`);
    expect(await page.evaluate(() => Object.keys(window.__cloud.read()))).toEqual(['meta']);
  });

  test('a device with unsynced changes uploads them instead of being overwritten', async ({ page }) => {
    const mine = { id: 'mine', amount: 33, date: `${CUR}-06`, category: 'fun', description: 'שלי' };
    await open(page, { cloud: cloudDocs([food]), local: [mine], dirty: true });
    await expect(page.locator('tbody tr', { hasText: 'שלי' })).toBeVisible();
    await expect
      .poll(() => page.evaluate((m) => JSON.stringify(window.__cloud.read()[`ex-${m}`]), CUR))
      .toContain('שלי');
  });

  test('existing local data is uploaded the first time when the cloud is empty', async ({ page }) => {
    const mine = { id: 'mine', amount: 33, date: `${CUR}-06`, category: 'fun', description: 'שלי' };
    await open(page, { cloud: {}, local: [mine] });
    await expect
      .poll(() => page.evaluate((m) => JSON.stringify(window.__cloud.read()[`ex-${m}`] ?? null), CUR))
      .toContain('שלי');
  });

  test('a change made on another device shows up live', async ({ page }) => {
    await open(page, { cloud: cloudDocs([food]) });
    await expect(rows(page)).toHaveCount(1);
    await page.evaluate(
      ([m, e]) => window.__cloud.push(`ex-${m}`, { month: m, expenses: e }),
      [CUR, [food, { id: 'z', amount: 9, date: `${CUR}-07`, category: 'fun', description: 'מהטלפון השני' }]],
    );
    await expect(page.locator('tbody tr', { hasText: 'מהטלפון השני' })).toBeVisible();
  });

  test('without a cloud the app says it only saves on the device and still works', async ({ page }) => {
    await open(page, { noDb: true });
    await expect(page.locator('.sync')).toContainText('במכשיר בלבד');
    await form(page).locator('input[inputmode=decimal]').fill('5');
    await form(page).locator('button[type=submit]').click();
    await expect(rows(page)).toHaveCount(1);
  });

  test('a failing save is reported and the data stays on screen', async ({ page }) => {
    await open(page, { failWrites: true });
    await form(page).locator('input[inputmode=decimal]').fill('5');
    await form(page).locator('button[type=submit]').click();
    await expect(page.locator('.sync')).toContainText('נכשלה');
    await expect(rows(page)).toHaveCount(1);
  });
});
