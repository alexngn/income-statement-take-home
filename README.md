# Income statement

An income statement (P&L) for Northwind Coffee Roasters, for any date range, built from `ledger.json`.

- **Backend:** Node + Express, `GET /income-statement?start=YYYY-MM-DD&end=YYYY-MM-DD` on port 3000
- **Frontend:** Angular, on port 4200

## Versions used

| Tool | Version |
| --- | --- |
| Node.js | 26.13.0 (any version 24 or newer works) |
| npm | 11.20.0 |
| Angular / Angular CLI | 22.2 |
| Express | 5.3 |

## 1. Install Node.js and Angular

Install Node.js 24 or newer from https://nodejs.org, or with Homebrew on a Mac:

```sh
brew install node
```

Install the Angular CLI (optional; the project also brings its own copy):

```sh
npm install -g @angular/cli
```

## 2. Install everything and run the app

From the project folder:

```sh
npm install && npm start
```

`npm install` installs the root, `backend/` and `frontend/`. `npm start` runs the backend and the frontend together. Open **http://localhost:4200**. Stop both with Ctrl+C.

## Tests

```sh
npm test
```

Runs the backend tests (Node's built-in test runner, on the real `ledger.json`).

## Try the API directly

```sh
curl 'http://localhost:3000/income-statement?start=2026-01-01&end=2026-03-31'
```

## Project layout

```
backend/    Express server: routes -> service -> DAO -> helpers
frontend/   Angular page: date signals + httpResource
scripts/    ledger-check.xlsx, a spreadsheet for checking the numbers by hand
ledger.json the data
NOTES.md    Q1 net income, assumptions, how the numbers were checked
```

`npm run diff` compares the spreadsheet with the app (needs LibreOffice or Numbers).
