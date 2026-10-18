# Expense tracker – project notes

Hebrew (RTL) expense tracker. React 18 + Vite + Recharts. Data lives in `localStorage` (a cache) and, inside the claude.ai
Artifact viewer, also in the artifact's private `db` (the cloud copy). There is no server of our own.

## Commands
- `npm run dev` – dev server
- `npm test` – Vitest (pure logic in `src/lib`)
- `npm run test:e2e` – Playwright against the real production build, in a desktop and a phone-sized dark-mode browser
  (`e2e/app.spec.js` and `e2e/cloud.spec.js`, 48 scenarios x 2). Run it before publishing any UI change; add a scenario for every bug fixed.
  Needs the Chromium that comes with the environment (`PLAYWRIGHT_BROWSERS_PATH`); `webServer` in
  `playwright.config.js` builds and serves the app itself.
- `npm run build` – production build to `dist/`
- `npm run build:artifact` – also bundles everything into `dist/expense-tracker.html`, the single file
  published as a claude.ai Artifact

## Layout
- `src/lib/` – pure logic: `summary.js` (periods, recurring expansion, per-month and per-day series), `budget.js`,
  `list.js` (search and sort), `backup.js` (export/import format), `storage.js`, `categories.js`, `format.js`,
  `files.js` (saving a file), `remote.js` (how data is split into cloud documents), `pay.js` (payment link parsing), `meta.js`, `id.js`. Keep new calculations here, with tests.
- `src/hooks/CategoriesContext.js` – components read the category list and `getCategory(id)` from `useCategories()`; pure `src/lib` code takes categories (or a name function) as an argument, never a global.
- `src/hooks/useCloudSync.js` – keeps the cloud copy in step; returns `'connecting' | 'cloud' | 'local' | 'error'`, shown as a small label in the header.
- `src/hooks/useExpenses.js` – state for expenses, recurring items and budgets, persisted through `storage.js`. Mutations that
  can be undone return an undo function; the toast shows it as a "ביטול" button.
- `src/components/` – `PageTabs`, `ExpenseForm`, `PeriodControls` (a segmented control plus month arrows, first thing on the overview), `CategoryFilter`, `Summary` (with `BudgetEditor`), `Charts`, `ListControls` + `ExpenseList`, `CategoryManager` (one small "new category" row), `BackupCard`, `BackupReminder`.

## Data model
- Expense: `{ id, amount, date: 'YYYY-MM-DD', category, description }`
- Recurring item: `{ id, amount, category, description, day, startMonth: 'YYYY-MM', endMonth? }`. It is not copied into
  the expense list; `recurringIn()` expands it into virtual rows (`recurring: true`) for each month it covers.
- Categories are `{ id, name, color }`, and the user can only ADD them (a small row on the overview page, above the backup card; there is no list, rename or delete UI: the user asked for it to be removed, they rarely touch categories; the toast after adding has an undo) (default ids are food/transport/bills/fun/health/shopping/other; new ones get `c_xxxxxxxx`). The `other` category is the fallback: it can be renamed and recoloured but not deleted, always sits last, and receives the expenses of any deleted or unknown category (`removeCategoryFrom`, `storage.js`, `backup.js`). `removeCategoryFrom` is what the add-undo uses (it also drops a budget and moves expenses to `other`).
- App-level state is `{ lastBackup, firstUse, snoozedUntil }` in `…:meta`.

## Decisions so far
- Two pages, switched with the tabs under the header (state in `App`, no routing): "הוספת הוצאה" (only the form, made big on purpose: 72px amount field, 54px inputs, full-width 56px button; fields in the order amount, description, category, date; this is where the app opens) and "סיכום והוצאות" (backup reminder, period bar, category filter, summary, charts, list, the small new-category row, backup card). Editing a list row opens it on the add page and saving or cancelling returns to the overview; a payment link always lands on the add page. Tests start on the overview via `open(page)` and use `showAdd`/`showOverview`; a reload goes back to the add page.
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
- There is no "duplicate expense" button (it was added and removed at the user's request).
- Weekly backup reminder (`backupReminder`): a banner at the top, shown when there is data and a week has passed since the last backup (or since first use if there never was one). "הזכר לי בעוד שבוע" hides it for 7 days. It can only appear while the app is open; there are no push notifications.
- Backup is a JSON file named `מעקב הוצאות YYYY-MM-DD.json` (`backup.js`). Restoring replaces everything, after an inline confirmation, and can be undone from the toast. There is no Telegram integration: the user sends the file to themselves.
- Cloud copy (the fix for "the data disappears when I leave the app on my phone": localStorage is not durable in the iOS viewer): documents under `data/users/<id>/` (private to the viewer, shared by their devices): `meta` (categories, recurring, budgets, app facts) and `ex-YYYY-MM` (one per month, so each stays far below the 256 KiB limit and only changed months are written). Rules, all covered by `e2e/cloud.spec.js` with a fake `db`: nothing is written before the cloud has been read (an empty device can never overwrite it); on opening the cloud wins unless this device has unsynced changes (the `…:unsynced` flag); expenses added while connecting are kept; opening writes nothing; an emptied month's document is deleted; a snapshot that arrives while a save is running is re-read afterwards; an empty snapshot is never treated as a deletion. localStorage stays as the offline cache and fallback. Without `db`/`user` (a normal site, or signed out) the label says the data is on the device only.
- Payment link: `<artifact url>#pay-<amount>-<shop>` fills the add-expense form (never saves). The viewer passes only a plain `#anchor` (letters, digits, `. _ ~ -`) to the page, so the format is limited to that; the category is guessed from the last expense with the same description (`pay.js`). The iPhone side is a Shortcuts automation, described in `docs/apple-pay-shortcut.md`. Not verified on a real device or through the viewer's hash handling.
- Palette is navy / steel / teal with an amber highlight, defined as CSS tokens at the top of `src/index.css`
  (light, `prefers-color-scheme: dark`, and `[data-theme='dark']`). Use tokens, not literal colors.

## Running inside the Artifact viewer
The viewer blocks `window.confirm` and direct file downloads, so:
- never use `confirm()`; use an inline step or an undo;
- files are saved through the `downloads` capability (`files.js`; the page is published with `capabilities: {downloads: true}` and the viewer asks the user to confirm). On a regular site `files.js` falls back to a normal download link;
- there is no CSV export (removed);
- the page is published with `capabilities: {downloads: true, db: {}, user: {}}`; `db` needs `user` so that the private `data/users/<id>/` path can be addressed;
- localStorage alone is not reliable there, which is why the cloud copy exists.

## Ideas not done yet
End-of-month forecast, bank CSV import, an Apple Pay automation that works without a signed-in browser.
