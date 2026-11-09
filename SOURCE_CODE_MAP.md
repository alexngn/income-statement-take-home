# Source Code Map

## Overview
Campfire take-home: income statement (P&L) for any date range from `ledger.json`.
Planned stack: Node backend (`GET /income-statement?start&end`), Angular frontend. Local git only.

## Module map
- `ledger.json`: chart of accounts + journal entries (copied verbatim from the assignment README).
- `validation/export_ledger_to_xlsx.py`: writes `validation/ledger-check.xlsx`, a formula-only workbook for checking the numbers by hand.
  - Sheets: Income Statement (date inputs, per-account SUMIFS, subtotals, app-vs-sheet diff, balance-sheet cross-check), Checks (load/integrity checks), Accounts, Entries, Lines.
  - Run: `python3 -m venv .venv && .venv/bin/pip install openpyxl && .venv/bin/python validation/export_ledger_to_xlsx.py`

## Gotchas
- Only `posted` entries count; date range is inclusive on both ends.
- Section comes from account `subtype`, not `type` (Interest Income is type revenue, subtype other_income).
