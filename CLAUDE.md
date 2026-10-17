# Expense tracker – project notes

Hebrew (RTL) expense tracker. React 18 + Vite + Recharts, data in `localStorage`, no backend.

## Commands
- `npm run dev` – dev server
- `npm test` – Vitest (pure logic in `src/lib`)
- `npm run build` – production build to `dist/`
- `npm run build:artifact` – also bundles everything into `dist/expense-tracker.html`, the single file
  published as a claude.ai Artifact

## Layout
- `src/lib/` – pure logic: `summary.js` (periods, recurring expansion, per-month series), `storage.js`,
  `categories.js`, `format.js`. Keep new calculations here, with tests.
- `src/hooks/useExpenses.js` – state for expenses and recurring items, persisted through `storage.js`.
- `src/components/` – `ExpenseForm` (top of the page), `PeriodControls` (a segmented control plus month arrows, right under the form), `CategoryFilter`, `Summary`, `Charts`, `ExpenseList`.

## Data model
- Expense: `{ id, amount, date: 'YYYY-MM-DD', category, description }`
- Recurring item: `{ id, amount, category, description, day, startMonth: 'YYYY-MM', endMonth? }`. It is not copied into
  the expense list; `recurringIn()` expands it into virtual rows (`recurring: true`) for each month it covers.
- Categories that no longer exist (e.g. the removed "housing") are loaded as `other` (`storage.js`).

## Decisions so far
- Periods are month / 6 months / year, counted back from the selected month; the arrows move a whole period.
- The category filter is applied to the data before any calculation, so totals, charts and the list always agree.
- Charts: the donut shows the period total in the middle with a legend. The bar chart is per day for a single month (`dailySeries`) and per month, with a total label above each bar, for 6 months / a year. Only the bar chart has a tooltip (our themed `.tip`); the donut deliberately has none, because on touch it stuck over the ring. Chart internals are forced `direction: ltr` (SVG text anchors flip in RTL).
- Look: sober and flat (solid navy header and buttons, small-radius chips with a colour dot, no emoji, no gradients, no entrance animations). Keep it that way. Touches that stay: toast after adding, a brief flash on the new row, a one-sentence summary at the top of the summary card. On phones the list becomes cards.
- No explanatory captions under headings or fields: the user asked for them to be removed. Category is a plain dropdown (the user prefers scrolling a list to a row of buttons).
- Forms are `noValidate` with our own message (iOS fails silently on native validation); the amount is a text field that accepts `12,5` and `₪ 12.50`. Adding an expense whose category is hidden by the filter clears the filter, and the summary card says when a filter is active.
- Recurring items can be stopped from a month on (earlier months keep their history) but not edited.
- Palette is navy / steel / teal with an amber highlight, defined as CSS tokens at the top of `src/index.css`
  (light, `prefers-color-scheme: dark`, and `[data-theme='dark']`). Use tokens, not literal colors.

## Running inside the Artifact viewer
The viewer blocks `window.confirm` and file downloads, so:
- confirmations are inline (see `ExpenseList`), not `confirm()`;
- there is no CSV export (it was removed; downloads don't work in the viewer anyway);
- data lives in that viewer's browser only (no sync between devices).

## Ideas not done yet
Sync/backup across devices, monthly budgets, custom categories, editing recurring items, search and sort in the
list, bank CSV import, Apple Pay capture (needs a regular hosted site: iOS Shortcuts "Transaction" automation opening a
prefilled link; the Artifact page can't receive URL parameters).
