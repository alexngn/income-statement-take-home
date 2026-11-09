# Source Code Map

## Overview
Campfire take-home: income statement (P&L) for any date range from `ledger.json`.
Planned stack: Node backend (`GET /income-statement?start&end`), Angular frontend. Local git only.

## Module map
- `ledger.json`: chart of accounts + journal entries (copied verbatim from the assignment README).
- `validation/export_ledger_to_xlsx.py`: writes `validation/ledger-check.xlsx`, a formula-only workbook for checking the numbers by hand.
  - Sheets: Income Statement (date inputs, per-account SUMIFS, subtotals, app-vs-sheet diff, balance-sheet cross-check), Checks (load/integrity checks), Accounts, Entries, Lines.
  - Run: `python3 -m venv .venv && .venv/bin/pip install openpyxl && .venv/bin/python validation/export_ledger_to_xlsx.py`

- `backend/` (Node 26, Express 5, TypeScript run directly by Node, no build step):
  - `src/index.ts`: entry; loads ledger, listens on PORT (default 3000).
  - `src/app.ts`: `createApp(ledger)`, route `GET /income-statement?start&end`, 400s for bad dates.
  - `src/ledger.ts`: `loadLedger`/`parseLedger`, `LEDGER_PATH`, `SECTION_BY_SUBTYPE`; validates data, amounts to BigInt cents.
  - `src/incomeStatement.ts`: `buildIncomeStatement` (pure, cents), `toResponse` (decimal strings), `SECTIONS`.
  - `src/money.ts` (`toCents`, `formatCents`), `src/dates.ts` (`isValidDate`).
  - `src/diffSpreadsheet.ts`: `npm run diff -- file.csv`, compares a CSV export of the sheet's Income Statement tab with the app.
  - `test/*.test.ts`: node:test on the real ledger.json; `test/realLedger.ts` gives mutable copies for bad-data tests.
  - Run: `cd backend && npm install && npm start`; test: `npm test`; types: `npm run typecheck`.

## Data flow
date strings -> app.ts validates -> buildIncomeStatement filters posted entries in [start, end], sums cents per account (revenue credit-debit, expense debit-credit), groups by subtype -> toResponse -> JSON.

## Gotchas
- Only `posted` entries count; date range is inclusive on both ends.
- Section comes from account `subtype`, not `type` (Interest Income is type revenue, subtype other_income).
