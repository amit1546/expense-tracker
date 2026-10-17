# Expense tracker – project notes

Hebrew (RTL) expense tracker. React 18 + Vite + Recharts, data in `localStorage`, no backend.

## Commands
- `npm run dev` – dev server
- `npm test` – Vitest (pure logic in `src/lib`)
- `npm run test:e2e` – Playwright against the real production build, in a desktop and a phone-sized dark-mode browser
  (`e2e/app.spec.js`, 21 scenarios x 2). Run it before publishing any UI change; add a scenario for every bug fixed.
  Needs the Chromium that comes with the environment (`PLAYWRIGHT_BROWSERS_PATH`); `webServer` in
  `playwright.config.js` builds and serves the app itself.
- `npm run build` – production build to `dist/`
- `npm run build:artifact` – also bundles everything into `dist/expense-tracker.html`, the single file
  published as a claude.ai Artifact

## Layout
- `src/lib/` – pure logic: `summary.js` (periods, recurring expansion, per-month and per-day series), `budget.js`,
  `list.js` (search and sort), `backup.js` (export/import format), `storage.js`, `categories.js`, `format.js`,
  `files.js` (saving a file), `id.js`. Keep new calculations here, with tests.
- `src/hooks/CategoriesContext.js` – components read the category list and `getCategory(id)` from `useCategories()`; pure `src/lib` code takes categories (or a name function) as an argument, never a global.
- `src/hooks/useExpenses.js` – state for expenses, recurring items and budgets, persisted through `storage.js`. Mutations that
  can be undone return an undo function; the toast shows it as a "ביטול" button.
- `src/components/` – `ExpenseForm` (top of the page), `PeriodControls` (a segmented control plus month arrows, right under the form), `CategoryFilter`, `Summary` (with `BudgetEditor`), `Charts`, `ListControls` + `ExpenseList`, `CategoryManager`, `BackupCard`, `BackupReminder`.

## Data model
- Expense: `{ id, amount, date: 'YYYY-MM-DD', category, description }`
- Recurring item: `{ id, amount, category, description, day, startMonth: 'YYYY-MM', endMonth? }`. It is not copied into
  the expense list; `recurringIn()` expands it into virtual rows (`recurring: true`) for each month it covers.
- Categories are user-editable `{ id, name, color }` (default ids are food/transport/bills/fun/health/shopping/other; new ones get `c_xxxxxxxx`). The `other` category is the fallback: it can be renamed and recoloured but not deleted, always sits last, and receives the expenses of any deleted or unknown category (`removeCategoryFrom`, `storage.js`, `backup.js`). Deleting a category is undoable and also drops its budget.
- App-level state is `{ lastBackup, firstUse, snoozedUntil }` in `…:meta`.

## Decisions so far
- Periods are month / 6 months / year, counted back from the selected month; the arrows move a whole period.
- The category filter is applied to the data before any calculation, so totals, charts and the list always agree.
- Charts: the donut shows the period total in the middle with a legend. The bar chart is per day for a single month (`dailySeries`) and per month, with a total label above each bar, for 6 months / a year. Only the bar chart has a tooltip (our themed `.tip`); the donut deliberately has none, because on touch it stuck over the ring. Chart internals are forced `direction: ltr` (SVG text anchors flip in RTL).
- Look: sober and flat (solid navy header and buttons, small-radius chips with a colour dot, no emoji, no gradients, no entrance animations). Keep it that way. Touches that stay: toast after adding, a brief flash on the new row, a one-sentence summary at the top of the summary card. On phones the list becomes cards.
- No explanatory captions under headings or fields: the user asked for them to be removed. Category is a plain dropdown (the user prefers scrolling a list to a row of buttons).
- Forms are `noValidate` with our own message (iOS fails silently on native validation); the amount is a text field that accepts `12,5` and `₪ 12.50`. Adding an expense whose category is hidden by the filter clears the filter, and the summary card says when a filter is active.
- Deleting (or stopping a recurring item) has no confirmation step; a 6-second undo in the toast replaces it.
- Editing a recurring item applies from the edited row's month on: the old item ends the month before and a new one continues it (`editRecurringFrom`). Earlier months keep their history.
- Budgets are monthly amounts (a total plus optional per-category ones) multiplied by the months in the period. 'ok' under 80%, 'warn' from 80%, 'over' past the limit. The total-budget bar is hidden while a category filter is active.
- The list has search (description, category name, amount) and sort; they only affect the list, not totals or charts.
- Duplicating an expense ("שכפול") puts its amount, category and description in the form with today's date; it is a normal add, not an edit. Recurring rows have no duplicate button.
- Weekly backup reminder (`backupReminder`): a banner at the top, shown when there is data and a week has passed since the last backup (or since first use if there never was one). "הזכר לי בעוד שבוע" hides it for 7 days. It can only appear while the app is open; there are no push notifications.
- Backup is a JSON file named `מעקב הוצאות YYYY-MM-DD.json` (`backup.js`). Restoring replaces everything, after an inline confirmation, and can be undone from the toast. There is no Telegram integration: the user sends the file to themselves.
- Palette is navy / steel / teal with an amber highlight, defined as CSS tokens at the top of `src/index.css`
  (light, `prefers-color-scheme: dark`, and `[data-theme='dark']`). Use tokens, not literal colors.

## Running inside the Artifact viewer
The viewer blocks `window.confirm` and direct file downloads, so:
- never use `confirm()`; use an inline step or an undo;
- files are saved through the `downloads` capability (`files.js`; the page is published with `capabilities: {downloads: true}` and the viewer asks the user to confirm). On a regular site `files.js` falls back to a normal download link;
- there is no CSV export (removed);
- data lives in that viewer's browser only (no sync between devices).

## Ideas not done yet
Automatic sync across devices (the `db` capability would do it), end-of-month forecast, bank CSV import, Apple Pay capture (needs a regular hosted site: iOS Shortcuts "Transaction" automation opening a
prefilled link; the Artifact page can't receive URL parameters).
