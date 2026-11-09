# Code path: from the dates on the page to the backend and back

Line numbers are as of when this was written; the function names are the stable part.

## 1. The user picks dates (browser)

- `frontend/src/app/income-statement.service.ts` `IncomeStatementService`: owns the range as two signals, `start` and `end` (YYYY-MM-DD strings, default `2026-01-01` to `2026-03-31`).
- `frontend/src/app/app.html`: two `<input type="date">` boxes. Each shows the signal's value (`[value]="service.start()"`) and on `(change)` calls `setStart` / `setEnd` in `app.ts`, which `set()` the signal. There is no Show button.

## 2. The request is sent (automatically)

- `income-statement.service.ts` `statement = httpResource<IncomeStatement>(() => ...)`: the function reads `start()` and `end()`, so Angular reruns it whenever either signal changes and sends
  `GET /income-statement?start=2026-01-01&end=2026-03-31`. A request still in flight is cancelled. If a date box is cleared, it returns `undefined` and no request is made.
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

- The resource exposes it as signals: `statement.value()`, `statement.isLoading()`, `statement.error()`.
- Success: `app.html` draws the table when `statement.hasValue()`.
- Failure: `service.errorMessage(error)` picks the backend's `{ "error": "..." }` message (or a "backend not running" message), shown in red.

## 6. The page draws the statement

- `frontend/src/app/report-layout.ts` `REPORT_ROWS`: the seven rows, top to bottom: Revenue, Cost of goods sold, Gross profit, Operating expenses, Operating income, Other income, Net income. Each row is a `section` (looked up in `sections` by `key`) or a `subtotal` (read from the top-level field named `key`).
- `frontend/src/app/app.html` loops over `REPORT_ROWS`:
  - a section row prints its account lines (`section(statement, row.key).lines`) and its total, labelled with `row.totalLabel` (for example "Net revenue");
  - a subtotal row prints `subtotal(statement, row.key)` in bold.
- `frontend/src/app/money.pipe.ts` `MoneyPipe` formats each amount string: commas, two decimals, negatives in parentheses (`"-44480.14"` -> `(44,480.14)`). It never converts to a number.

To add a line to the statement (for example "Income before taxes"), have the backend return it, then add one entry to `REPORT_ROWS`. No template change is needed.

## Running it

```sh
cd backend && npm install && npm start      # http://localhost:3000
cd frontend && npm install && npm start     # http://localhost:4200, proxies to the backend
```
