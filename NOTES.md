# Notes

## Q1 2026 net income (2026-01-01 to 2026-03-31)

**Net income: (44,480.14)**

| | |
| --- | ---: |
| Net revenue | 37,850.50 |
| Total cost of goods sold | 14,272.75 |
| Gross profit | 23,577.75 |
| Total operating expenses | 68,100.07 |
| Operating income | (44,522.32) |
| Total other income | 42.18 |
| **Net income** | **(44,480.14)** |

## Decisions and assumptions

About the data:

- The data is well formatted. The server still checks it at startup and refuses to start if an entry does not balance or points at an unknown account.
- The ledger fits in a single file, is loaded once into memory, and the app is run locally.

How the statement is built:

1. **Only posted entries count.** Drafts (JE-019, the 5,000.00 bonus accrual) and voids (JE-009, the duplicate 8,200.00 sale; JE-025, the returned check) are left out.
2. **Both ends of the date range are included.** Dates stay `YYYY-MM-DD` strings, so time zones cannot shift a day.
3. **Entries are reported as recorded, nothing is re-accrued.** JE-007 books January to March rent (9,000.00) on 2026-01-01, so all of it lands in January. JE-004 bills 12,000.00 to Deferred Revenue, a liability, so it is not revenue; only the monthly 1,000.00 recognitions are.
4. **The inactive account 6300 Marketing (legacy) is still shown.** Inactive only blocks new postings; its history counts.
5. **The section comes from the account's `subtype`, the sign from its `type`.** Interest Income is type revenue with subtype other_income, so it sits under Other income.
6. **Contra revenue (4900) is a negative line inside Revenue,** and the section total is labelled Net revenue.
7. **Negative balances are shown as they are.** The vendor credit JE-020 nets Software down to 1,099.97.
8. **Accounts with no activity in the range are hidden; every section and subtotal is always shown,** even at 0.00.

## How I checked the numbers

- I did not trust that the filters were done correctly, so I checked the dates by hand to make sure the statement did not include the draft and void journal entries.
- A spreadsheet (`scripts/ledger-check.xlsx`) holds the raw journal lines and computes the statement with its own formulas (SUMIFS by account, status and date). A diff tool (`cd backend && npm run diff`) compares it row by row with the app for whatever dates the spreadsheet has.
- Tests run on the real `ledger.json` with amounts worked out by hand, each commented with the journal entries behind it: every line for Q1 and each month, plus one-day, boundary and empty ranges.
- Dedicated tests show drafts and voids are filtered out at the data access, service and HTTP layers. Breaking the filter on purpose makes them fail.
- Rules that hold for any range: January + February + March equals Q1, and net income equals the net change of the accounts not on the statement.

## Where AI helped, and where it went wrong

- It helped scaffold the Express and Angular apps, write the spreadsheet formulas and the diff tool, and draft tests.
- It struggled to question whether a POST request was necessary when a GET request already did the same thing. That led to churn, and I had to remove the POST request.
- It named tests after what the test does, not what it was testing for. That gave overly technical names instead of names that simply say draft and voided entries are filtered out, so I had them renamed.

## With more time

- Spend more time on the validation tool: reliably take the data, convert it to a CSV, and validate the values in both the app and the CSV.
- Make sure the AI-written code stays extensible for features like a balance sheet. The statement is already built from a layout and a period, so a new statement should be a new layout plus a route.
- Add end-to-end tests that drive the page in a browser against the running backend.
- Add observability: request logs, latency and error-rate metrics for the endpoint.
