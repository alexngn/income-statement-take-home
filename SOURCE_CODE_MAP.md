# Source Code Map

## Overview
Campfire take-home: income statement (P&L) for any date range from `ledger.json`.
Planned stack: Node backend (`GET /income-statement?start&end`), Angular frontend. Local git only.

## Module map
- `ledger.json`: chart of accounts + journal entries (copied verbatim from the assignment README).
- `scripts/export_ledger_to_xlsx.py`: writes `scripts/ledger-check.xlsx`, a formula-only workbook for checking the numbers by hand.
  - Sheets: Income Statement (date inputs, per-account SUMIFS, subtotals, app-vs-sheet diff, balance-sheet cross-check), Checks (load/integrity checks), Accounts, Entries, Lines.
  - Run: `python3 -m venv .venv && .venv/bin/pip install openpyxl && .venv/bin/python scripts/export_ledger_to_xlsx.py`

- `backend/` (Node 26, Express 5, TypeScript run directly by Node, no build step).
  Flow: request -> router -> service -> DAO -> service -> aggregate helpers -> router (format) -> response.
  - `src/index.ts`: entry; wires `LedgerDao.fromFile()` -> `StatementService` -> `createApp`, listens on PORT (default 3000).
  - `src/app.ts`: `createApp(service)`: mounts the router at `/income-statement`, JSON 500 handler.
  - `src/routes/incomeStatement.routes.ts`: `incomeStatementRouter(service)`: `GET /?start&end`, 400 via `parseDateRange`, passes `INCOME_STATEMENT`. GET only.
  - `src/layouts/layout.ts`: `StatementLayout` (`sections[{key,title,accounts: AccountSelector}]`, `subtotals[{key,plus,minus}]`). `src/layouts/incomeStatement.ts`: `INCOME_STATEMENT`. A new statement = a new layout + route.
  - `src/services/statement.service.ts`: `StatementService.getStatement(layout, {start?, end})` (cents, `Statement` with `subtotals` map); refuses an account in two sections.
  - `src/dao/ledger.dao.ts`: `LedgerDao` (`fromFile`, `getCompany`, `getAccounts(selector)`, `findLines({start?, end, status, accountNumbers})` -> `LedgerLine` joined with entry + account), `AccountSelector`, `matchesSelector`. Only place that touches raw data.
  - `src/dao/ledgerFile.ts`: `loadLedger`/`parseLedger`, `LEDGER_PATH`, `TYPES_BY_SUBTYPE`, ledger types; validates data, amounts to BigInt cents.
  - `src/helpers/aggregate.ts`: `signedAmount` (normal balance by type), `sumByAccount`, `buildSection`, `computeSubtotals`.
  - `src/helpers/format.ts` (`toResponse`, `StatementResponse`), `src/helpers/dateRange.ts` (`parseDateRange`), `src/helpers/money.ts` (`toCents`, `formatCents`), `src/helpers/dates.ts` (`isValidDate`).
  - `src/tools/diffSpreadsheet.ts`: `npm run diff [-- path]`, compares the sheet's Income Statement tab (.xlsx via headless LibreOffice, .numbers via Numbers/osascript, or .csv) with the service; no path = newest of ~/Desktop/ledger-check.numbers and scripts/ledger-check.xlsx.
  - `test/*.test.ts`: node:test on the real ledger.json; `test/realLedger.ts` gives mutable copies, `serviceFor`, `incomeStatementFor`. `drafts.test.ts` / `voids.test.ts` prove status filtering at DAO, service and HTTP layers; `layouts.test.ts` passes made-up layouts and open-start periods.
  - Run: `cd backend && npm install && npm start`; test: `npm test`; types: `npm run typecheck`.

- `frontend/` (Angular 22, standalone, no router, loose TS on purpose, no ternaries):
  - `src/app/report-layout.ts`: `REPORT_ROWS`, the statement's row order (section or subtotal, with `totalLabel`). Add rows here.
  - `src/app/income-statement.service.ts`: response interfaces; `IncomeStatementService` with `start`/`end` signals and `statement = httpResource(...)` that refetches when either changes; `errorMessage()`.
  - `src/app/money.pipe.ts`: `MoneyPipe` (`| money`), string-only formatting, negatives in parentheses.
  - `src/app/app.ts` / `app.html` / `app.css`: date inputs set the service signals (`setStart`/`setEnd`), table from `service.statement`, `section()`, `subtotal()`.
  - `proxy.conf.json`: dev server forwards `/income-statement` to `localhost:3000`.
  - Run: `cd frontend && npm install && npm start` (port 4200); build: `npx ng build`.
- `CODE_PATH.md`: step-by-step path from the date inputs through the backend and back to the table.

## Data flow
date input -> service `start`/`end` signals -> `httpResource` refetches -> GET /income-statement (proxied to :3000) -> table via `REPORT_ROWS` + `MoneyPipe`.
router validates dates -> `getStatement(INCOME_STATEMENT, range)` -> DAO `getAccounts` per section + `findLines` (posted, start..end, those accounts) -> `sumByAccount` (normal balance by type) -> `buildSection` -> `computeSubtotals` -> router `toResponse` -> JSON.

## Gotchas
- Only `posted` entries count; date range is inclusive on both ends.
- Section placement comes from the layout's selectors (by `subtype` for the income statement), the sign from the account `type` (Interest Income is type revenue, subtype other_income).
