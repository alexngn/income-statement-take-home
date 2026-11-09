# Code path: from the dates on the page to the backend and back

Line numbers are as of when this was written; the function names are the stable part.

## 1. The user picks dates (browser)

- `frontend/src/app/app.html:7` and `:11`: two `<input type="date">` boxes bound with `[(ngModel)]` to `start` and `end`.
- `frontend/src/app/app.ts:19-20`: those fields, defaulting to `2026-01-01` and `2026-03-31`. The browser gives the value as a `YYYY-MM-DD` string.
- `frontend/src/app/app.html:4`: pressing **Show** submits the form, which calls `load()`. `load()` also runs once from the `constructor` (`app.ts:25`), so the page opens with Q1 2026 already shown.

## 2. The request is sent

- `frontend/src/app/app.ts:29` `App.load()`: clears any old error, then calls `IncomeStatementService.load(start, end)`.
- `frontend/src/app/income-statement.service.ts:11` `load()`: `HttpClient.get('/income-statement', { params: { start, end } })`, which becomes
  `GET /income-statement?start=2026-01-01&end=2026-03-31`.
- `frontend/proxy.conf.json`: in development, `ng serve` forwards `/income-statement` to `http://localhost:3000` (the backend), so the browser never needs CORS.

## 3. The backend receives it

- `backend/src/index.ts:4`: at startup, `loadLedger()` (`backend/src/ledger.ts:59`) reads `ledger.json`, validates it and turns every amount into BigInt cents (`toCents`, `backend/src/money.ts:7`). Bad data stops the server from starting.
- `backend/src/app.ts:10`: the `GET /income-statement` route.
  - `:12` both dates must pass `isValidDate` (`backend/src/dates.ts:7`), else **400**.
  - `:16` `start` must be on or before `end`, else **400**.
  - `:20` `res.json(toResponse(buildIncomeStatement(ledger, start, end)))`.

## 4. The accounting

`backend/src/incomeStatement.ts:42` `buildIncomeStatement(ledger, start, end)`, a pure function:

1. `:46-47` keeps only `posted` entries dated within `start..end` (both days included).
2. `:52` nets each income statement account: revenue is credit minus debit, expenses are debit minus credit. Balance sheet accounts are skipped.
3. `:58` groups accounts into the four sections in `SECTIONS` (revenue, cogs, operating_expenses, other_income) by account `subtype`.
4. `:68-70` subtotals:
   - Gross profit = Revenue - Cost of goods sold
   - Operating income = Gross profit - Operating expenses
   - Net income = Operating income + Other income

`:85` `toResponse` turns every cents value into a decimal string such as `"-44480.14"` (`formatCents`, `backend/src/money.ts:15`), so no amount ever passes through a JavaScript float.

## 5. The response comes back

```json
{
  "company": "Northwind Coffee Roasters",
  "currency": "USD",
  "start": "2026-01-01",
  "end": "2026-03-31",
  "sections": [
    { "key": "revenue", "title": "Revenue", "lines": [{ "account": "4000", "name": "Product Revenue", "amount": "35650.75" }], "total": "37850.50" }
  ],
  "grossProfit": "23577.75",
  "operatingIncome": "-44522.32",
  "netIncome": "-44480.14"
}
```

- Success: `app.ts:31` `next` stores it in the `statement` signal.
- Failure: `error` stores the backend's `{ "error": "..." }` message (or a "backend not running" message) in the `error` signal, which `app.html` shows in red.

## 6. The page draws the statement

- `frontend/src/app/report-layout.ts` `REPORT_ROWS`: the seven rows, top to bottom: Revenue, Cost of goods sold, Gross profit, Operating expenses, Operating income, Other income, Net income. Each row is a `section` (looked up in `sections` by `key`) or a `subtotal` (read from the top-level field named `key`).
- `frontend/src/app/app.html:24` loops over `REPORT_ROWS`:
  - a section row prints its account lines (`section(row.key).lines`, `app.ts:41`) and its total;
  - a subtotal row prints `subtotal(row.key)` (`app.ts:46`) in bold.
- Amounts are formatted with Angular's `currency` pipe using the statement's `currency`.

To add a line to the statement (for example "Income before taxes"), have the backend return it, then add one entry to `REPORT_ROWS`. No template change is needed.

## Running it

```sh
cd backend && npm install && npm start      # http://localhost:3000
cd frontend && npm install && npm start     # http://localhost:4200, proxies to the backend
```
