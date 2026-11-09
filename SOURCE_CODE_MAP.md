# Source Code Map

## Overview
Campfire take-home: income statement (P&L) for any date range from `ledger.json`.
Planned stack: Node backend (`GET /income-statement?start&end`), Angular frontend. Local git only.

## Module map
- `ledger.json`: chart of accounts + journal entries (copied verbatim from the assignment README).
- `scripts/export_ledger_to_xlsx.py`: writes `scripts/ledger-check.xlsx`, a formula-only workbook for checking the numbers by hand.
  - Sheets: Income Statement (date inputs, per-account SUMIFS, subtotals, app-vs-sheet diff, balance-sheet cross-check), Checks (load/integrity checks), Accounts, Entries, Lines.
  - Run: `python3 -m venv .venv && .venv/bin/pip install openpyxl && .venv/bin/python scripts/export_ledger_to_xlsx.py`

- `backend/` (Node 26, Express 5, TypeScript run directly by Node, no build step):
  - `src/index.ts`: entry; loads ledger, listens on PORT (default 3000).
  - `src/app.ts`: `createApp(ledger)`, route `GET /income-statement?start&end`, 400s for bad dates.
  - `src/ledger.ts`: `loadLedger`/`parseLedger`, `LEDGER_PATH`, `SECTION_BY_SUBTYPE`; validates data, amounts to BigInt cents.
  - `src/incomeStatement.ts`: `buildIncomeStatement` (pure, cents), `toResponse` (decimal strings), `SECTIONS`.
  - `src/money.ts` (`toCents`, `formatCents`), `src/dates.ts` (`isValidDate`).
  - `src/diffSpreadsheet.ts`: `npm run diff [-- path]`, compares the sheet's Income Statement tab (.xlsx via headless LibreOffice, .numbers via Numbers/osascript, or .csv) with the app; no path = newest of ~/Desktop/ledger-check.numbers and scripts/ledger-check.xlsx.
  - `test/*.test.ts`: node:test on the real ledger.json; `test/realLedger.ts` gives mutable copies for bad-data tests.
  - Run: `cd backend && npm install && npm start`; test: `npm test`; types: `npm run typecheck`.

- `frontend/` (Angular 22, standalone, no router, loose TS on purpose, no ternaries):
  - `src/app/report-layout.ts`: `REPORT_ROWS`, the statement's row order (section or subtotal). Add rows here.
  - `src/app/income-statement.service.ts`: `IncomeStatementService.load(start, end)` -> `GET /income-statement`.
  - `src/app/app.ts` / `app.html` / `app.css`: date form, `load()`, `section(key)`, `subtotal(key)`, table.
  - `proxy.conf.json`: dev server forwards `/income-statement` to `localhost:3000`.
  - Run: `cd frontend && npm install && npm start` (port 4200); build: `npx ng build`.
- `CODE_PATH.md`: step-by-step path from the date inputs through the backend and back to the table.

## Data flow
date strings -> app.ts validates -> buildIncomeStatement filters posted entries in [start, end], sums cents per account (revenue credit-debit, expense debit-credit), groups by subtype -> toResponse -> JSON.

## Gotchas
- Only `posted` entries count; date range is inclusive on both ends.
- Section comes from account `subtype`, not `type` (Interest Income is type revenue, subtype other_income).
