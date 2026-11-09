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

Flow: request -> Express router -> service -> DAO -> service -> aggregate helpers -> router -> response.

- `backend/src/index.ts`: wiring at startup. `LedgerDao.fromFile()` reads `ledger.json` through `loadLedger()` (`backend/src/dao/ledgerFile.ts`), which validates it and turns every amount into BigInt cents (`toCents`, `backend/src/helpers/money.ts`). Bad data stops the server from starting. Then `new IncomeStatementService(dao)` and `createApp(service)`.
- `backend/src/app.ts` `createApp`: mounts the router at `/income-statement`, plus a JSON error handler for unexpected errors (500).
- `backend/src/routes/incomeStatement.routes.ts` `incomeStatementRouter`:
  - `GET /` reads `start` and `end` from the query string.
  - `parseDateRange` (`backend/src/helpers/dateRange.ts`): both must be real `YYYY-MM-DD` dates (`isValidDate`, `helpers/dates.ts`) and `start <= end`, else **400** `{ "error": "..." }`.
  - Calls `service.getIncomeStatement(start, end)`, then `res.json(toResponse(statement))`.

## 4. The accounting

`backend/src/services/incomeStatement.service.ts` `IncomeStatementService.getIncomeStatement(start, end)`:

1. **Data from the DAO** (`backend/src/dao/ledger.dao.ts` `LedgerDao`):
   - `getCompany()`, `getAccounts({ incomeStatementOnly: true })` (chart order).
   - `findLines({ start, end, incomeStatementOnly: true })`: like a SQL query over a view. It returns journal lines of `posted` entries dated `start..end` (both days included), each already joined with its entry id, date and account. Drafts, voids and balance sheet accounts are filtered out here.
2. **Numbers from the aggregate helpers** (`backend/src/helpers/aggregate.ts`):
   - `sumByAccount(lines)`: nets each account with `signedAmount`: revenue is credit minus debit, expenses are debit minus credit.
   - `groupIntoSections(accounts, amounts)`: the four `SECTIONS` (revenue, cogs, operating_expenses, other_income) by account `subtype`; accounts with no activity are left out, every section is kept.
   - `computeSubtotals(sections)`:
     - Gross profit = Revenue - Cost of goods sold
     - Operating income = Gross profit - Operating expenses
     - Net income = Operating income + Other income
3. Back in the router, `toResponse` (`backend/src/helpers/format.ts`) turns every cents value into a decimal string such as `"-44480.14"` (`formatCents`), so no amount ever passes through a JavaScript float.

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
