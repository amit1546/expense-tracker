import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const NOW = new Date();
const CUR = ym(NOW);
const PREV = ym(new Date(NOW.getFullYear(), NOW.getMonth() - 1, 1));
const FOUR_AGO = ym(new Date(NOW.getFullYear(), NOW.getMonth() - 4, 1));

const food = { id: 'a', amount: 1800, date: `${CUR}-05`, category: 'food', description: 'סופר' };
const bills = { id: 'b', amount: 400, date: `${CUR}-09`, category: 'bills', description: 'חשמל' };
const fun = { id: 'c', amount: 90, date: `${CUR}-11`, category: 'fun', description: 'קולנוע' };
const gym = { id: 'r1', amount: 200, category: 'health', description: 'חדר כושר', day: 3, startMonth: PREV };

// Loads the app with data already in localStorage (seeded once, so reloads keep what the test did).
async function open(page, { expenses = [], recurring = [], budgets = null } = {}) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(
    ([e, r, b]) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('expense-tracker:v1:expenses', JSON.stringify(e));
      localStorage.setItem('expense-tracker:v1:recurring', JSON.stringify(r));
      if (b) localStorage.setItem('expense-tracker:v1:budgets', JSON.stringify(b));
    },
    [expenses, recurring, budgets],
  );
  await page.goto('/');
  return errors;
}

const form = (page) => page.locator('.form-card');
const amountField = (page) => form(page).locator('input[inputmode=decimal]');
const rowFor = (page, text) => page.locator('tbody tr', { hasText: text });
const rowCount = (page) => page.locator('tbody tr').count();
const num = async (locator) => (await locator.textContent()).replace(/[^\d.]/g, '');

async function addExpense(page, { amount, category, description = '' }) {
  await amountField(page).fill(amount);
  if (category) await form(page).locator('select').selectOption(category);
  if (description) await form(page).locator('input[placeholder^="למשל"]').fill(description);
  await form(page).locator('button[type=submit]').click();
}

test.describe('layout', () => {
  test('blocks come in the agreed order and nothing explanatory or CSV is left', async ({ page }) => {
    const errors = await open(page, { expenses: [food] });
    const order = await page.evaluate(() => [...document.querySelectorAll('.app > *')].map((e) => e.className.split(' ')[0]));
    expect(order.slice(0, 5)).toEqual(['app-header', 'card', 'period-bar', 'filters', 'layout']);
    await expect(page.locator('button', { hasText: 'CSV' })).toHaveCount(0);
    await expect(page.locator('.sub, .hint')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('category is a single dropdown', async ({ page }) => {
    await open(page);
    await expect(form(page).locator('select option')).toHaveCount(7);
    await expect(page.locator('.cat-btn')).toHaveCount(0);
  });

  test('no horizontal scrolling in any period', async ({ page }) => {
    await open(page, { expenses: [food, bills, fun, { ...fun, id: 'old', date: `${FOUR_AGO}-10` }], recurring: [gym] });
    for (const label of ['חודש', '6 חודשים', 'שנה']) {
      await page.locator('.seg').getByRole('button', { name: label, exact: true }).click();
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });
});

test.describe('adding', () => {
  test('adds an expense with a description, confirms it and returns to the amount field', async ({ page }) => {
    await open(page);
    await addExpense(page, { amount: '45', category: 'food', description: 'קפה ומאפה' });
    await expect(page.locator('.toast')).toContainText('נוסף');
    await expect(rowFor(page, 'קפה ומאפה')).toHaveCount(1);
    await expect(amountField(page)).toBeFocused();
    await expect(amountField(page)).toHaveValue('');
  });

  test('accepts a comma decimal', async ({ page }) => {
    await open(page);
    await addExpense(page, { amount: '12,5', description: 'מונית' });
    await expect(rowFor(page, 'מונית').locator('.num')).toContainText('12.50');
  });

  test('says what is wrong instead of failing silently', async ({ page }) => {
    await open(page);
    await form(page).locator('button[type=submit]').click();
    await expect(page.locator('.form-card .error')).toContainText('סכום');
    expect(await rowCount(page)).toBe(0);
  });

  test('an expense hidden by the category filter clears the filter', async ({ page }) => {
    await open(page, { expenses: [food] });
    await page.locator('.filters button', { hasText: 'אוכל' }).click();
    await expect(page.locator('.filter-note')).toBeVisible();
    await addExpense(page, { amount: '300', category: 'bills', description: 'ארנונה' });
    await expect(page.locator('.toast')).toContainText('הסינון אופס');
    await expect(page.locator('.filter-note')).toHaveCount(0);
    await expect(rowFor(page, 'ארנונה')).toHaveCount(1);
  });

  test('a date in another month jumps to that month', async ({ page }) => {
    await open(page);
    await form(page).locator('input[type=date]').fill(`${PREV}-10`);
    await addExpense(page, { amount: '70', description: 'חודש קודם' });
    await expect(rowFor(page, 'חודש קודם')).toHaveCount(1);
  });
});

test.describe('deleting and undo', () => {
  test('delete is immediate and can be undone', async ({ page }) => {
    await open(page, { expenses: [food, bills, fun] });
    await rowFor(page, 'קולנוע').locator('button', { hasText: 'מחיקה' }).click();
    await expect(rowFor(page, 'קולנוע')).toHaveCount(0);
    await page.locator('.toast button').click();
    await expect(rowFor(page, 'קולנוע')).toHaveCount(1);
  });
});

test.describe('recurring expenses', () => {
  test('appears in later months and is flagged', async ({ page }) => {
    await open(page, { recurring: [gym] });
    await expect(rowFor(page, 'חדר כושר').locator('.chip.fixed')).toHaveCount(1);
    await page.locator('[aria-label="תקופה הבאה"]').click();
    await expect(rowFor(page, 'חדר כושר')).toHaveCount(1);
  });

  test('an edit applies from that month on and leaves earlier months alone; undo restores it', async ({ page }) => {
    await open(page, { recurring: [gym] });
    await rowFor(page, 'חדר כושר').locator('button', { hasText: 'עריכה' }).click();
    await expect(page.locator('.form-card h2')).toContainText('קבועה');
    await amountField(page).fill('260');
    await form(page).locator('button[type=submit]').click();
    await expect(rowFor(page, 'חדר כושר').locator('.num')).toContainText('260.00');
    await page.locator('[aria-label="תקופה קודמת"]').click();
    await expect(rowFor(page, 'חדר כושר').locator('.num')).toContainText('200.00');
    await page.locator('[aria-label="תקופה הבאה"]').click();
    await page.locator('.toast button').click();
    await expect(rowFor(page, 'חדר כושר').locator('.num')).toContainText('200.00');
  });

  test('stopping removes it from this month on only', async ({ page }) => {
    await open(page, { recurring: [gym] });
    await rowFor(page, 'חדר כושר').locator('button', { hasText: 'הפסקה' }).click();
    await expect(rowFor(page, 'חדר כושר')).toHaveCount(0);
    await page.locator('[aria-label="תקופה קודמת"]').click();
    await expect(rowFor(page, 'חדר כושר')).toHaveCount(1);
  });
});

test.describe('periods and charts', () => {
  const data = { expenses: [{ ...fun, id: 'x1', amount: 100 }, { ...fun, id: 'x2', amount: 50, date: `${PREV}-10` }, { ...fun, id: 'x3', amount: 25, date: `${FOUR_AGO}-10` }] };

  test('month, 6 months and a year add up and use matching chart titles', async ({ page }) => {
    await open(page, data);
    await expect(page.locator('.total')).toContainText('100.00');
    const barTitle = page.locator('.charts .chart').nth(1).locator('h3');
    await expect(barTitle).toHaveText('הוצאות לפי יום');
    await page.locator('.seg').getByRole('button', { name: '6 חודשים', exact: true }).click();
    await expect(page.locator('.total')).toContainText('175.00');
    await expect(barTitle).toHaveText('הוצאות לפי חודש');
    await page.locator('.seg').getByRole('button', { name: 'שנה', exact: true }).click();
    await expect(page.locator('.total')).toContainText('175.00');
  });

  test('the donut has no tooltip box over it', async ({ page }) => {
    await open(page, { expenses: [food, bills] });
    const box = await page.locator('.donut svg').first().boundingBox();
    await page.mouse.move(box.x + box.width / 2 + 85, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 2);
    await page.waitForTimeout(300);
    await expect(page.locator('.donut .tip')).toHaveCount(0);
    await expect(page.locator('.recharts-default-tooltip')).toHaveCount(0);
  });
});

test.describe('list', () => {
  test('search matches description, category and amount; sort changes the order', async ({ page }) => {
    await open(page, { expenses: [food, bills, fun] });
    const search = page.locator('input[type=search]');
    await search.fill('חשמל');
    expect(await rowCount(page)).toBe(1);
    await search.fill('אוכל');
    await expect(rowFor(page, 'סופר')).toHaveCount(1);
    await search.fill('90');
    await expect(rowFor(page, 'קולנוע')).toHaveCount(1);
    await search.fill('zzz');
    await expect(page.locator('.empty')).toContainText('לא נמצאו');
    await search.fill('');
    await page.locator('select[aria-label="מיון"]').selectOption('amount-asc');
    await expect(page.locator('tbody tr').first()).toContainText('קולנוע');
    await page.locator('select[aria-label="מיון"]').selectOption('amount-desc');
    await expect(page.locator('tbody tr').first()).toContainText('סופר');
  });
});

test.describe('budgets', () => {
  test('progress bars turn amber near the limit and red past it', async ({ page }) => {
    await open(page, { expenses: [food, bills, fun], recurring: [gym] }); // 2,490 this month
    await page.locator('.summary-head button').click();
    await page.locator('.budget-total input').fill('3000');
    await page.locator('.budget-grid label', { hasText: 'אוכל' }).locator('input').fill('1500');
    await page.locator('.budget-editor button[type=submit]').click();
    await expect(page.locator('.budget .bar span')).toHaveClass('warn');
    await expect(page.locator('.budget-left')).toContainText('נותרו');
    await expect(page.locator('.category-list li', { hasText: 'אוכל' }).locator('.bar span')).toHaveClass('over');
  });

  test('a total of 2,000 is exceeded', async ({ page }) => {
    await open(page, { expenses: [food, bills, fun], budgets: { total: 2000, categories: {} } });
    await expect(page.locator('.budget .bar span')).toHaveClass('over');
    await expect(page.locator('.budget-left')).toContainText('חריגה');
  });

  test('is hidden while a category filter is on', async ({ page }) => {
    await open(page, { expenses: [food, bills], budgets: { total: 2000, categories: {} } });
    await page.locator('.filters button', { hasText: 'אוכל' }).click();
    await expect(page.locator('.budget')).toHaveCount(0);
  });

  test('rejects a bad amount', async ({ page }) => {
    await open(page);
    await page.locator('.summary-head button').click();
    await page.locator('.budget-total input').fill('abc');
    await page.locator('.budget-editor button[type=submit]').click();
    await expect(page.locator('.budget-editor .error')).toBeVisible();
  });
});

test.describe('backup', () => {
  test('saves a file, restores it after a wipe, undo works, and a wrong file is refused', async ({ page }, testInfo) => {
    await open(page, { expenses: [food, bills], recurring: [gym], budgets: { total: 3000, categories: {} } });
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('button', { hasText: 'שמירת גיבוי' }).click()]);
    const file = testInfo.outputPath('backup.json');
    await download.saveAs(file);
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(saved.expenses).toHaveLength(2);
    expect(saved.recurring).toHaveLength(1);
    expect(saved.budgets.total).toBe(3000);

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    expect(await rowCount(page)).toBe(0);

    await page.setInputFiles('input[type=file]', file);
    await expect(page.locator('.confirm-row')).toContainText('2 הוצאות');
    await page.locator('.confirm-row button', { hasText: 'שחזור' }).click();
    await expect(rowFor(page, 'סופר')).toHaveCount(1);
    await expect(page.locator('.budget')).toBeVisible();
    await page.locator('.toast button').click();
    expect(await rowCount(page)).toBe(0);

    const bad = testInfo.outputPath('bad.json');
    fs.writeFileSync(bad, '{"hello":1}');
    await page.setInputFiles('input[type=file]', bad);
    await expect(page.locator('.backup .error')).toContainText('אינו קובץ גיבוי');
  });
});

test.describe('data safety', () => {
  test('data survives a reload', async ({ page }) => {
    await open(page);
    await addExpense(page, { amount: '60', description: 'נשמר' });
    await page.reload();
    await expect(rowFor(page, 'נשמר')).toHaveCount(1);
  });
});
