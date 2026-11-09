// Expected amounts are worked out by hand from ledger.json. The comment on each number
// names the journal entries it comes from, so it can be checked without running anything.
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildIncomeStatement, toResponse, type IncomeStatement } from "../src/incomeStatement.ts";
import { loadLedger } from "../src/ledger.ts";
import { ledgerAfter, entryById } from "./realLedger.ts";

const ledger = loadLedger();
const statement = (start: string, end: string) => toResponse(buildIncomeStatement(ledger, start, end));

/** The statement as plain rows: { "4000": "35650.75", ..., revenue: "...", netIncome: "..." }. */
function rows(s: ReturnType<typeof statement>) {
  const out: Record<string, string> = {};
  for (const section of s.sections) {
    for (const line of section.lines) out[line.account] = line.amount;
    out[section.key] = section.total;
  }
  out.grossProfit = s.grossProfit;
  out.operatingIncome = s.operatingIncome;
  out.netIncome = s.netIncome;
  return out;
}

test("Q1 2026 (2026-01-01 to 2026-03-31)", () => {
  assert.deepEqual(rows(statement("2026-01-01", "2026-03-31")), {
    "4000": "35650.75", // JE-002 12450.75 + JE-010 8200.00 + JE-016 15000.00 (JE-009 is void)
    "4100": "3000.00", // JE-005 + JE-014 + JE-021, 1000.00 each
    "4900": "-800.25", // JE-012 650.25 + JE-016 150.00, contra revenue so negative
    revenue: "37850.50",
    "5000": "14272.75", // JE-003 4980.30 + JE-011 3280.00 + JE-017 6012.45
    cogs: "14272.75",
    grossProfit: "23577.75",
    "6000": "55500.00", // JE-006 + JE-015 + JE-022, 18500.00 each (JE-019 bonus is a draft)
    "6100": "9000.00", // JE-007, three months of rent booked on 2026-01-01
    "6200": "1099.97", // JE-018 1199.97 - JE-020 credit 100.00
    "6300": "2500.10", // JE-008, inactive account but a posted entry
    operating_expenses: "68100.07",
    operatingIncome: "-44522.32",
    "7000": "42.18", // JE-023
    other_income: "42.18",
    netIncome: "-44480.14",
  });
});

test("January 2026", () => {
  assert.deepEqual(rows(statement("2026-01-01", "2026-01-31")), {
    "4000": "12450.75", // JE-002
    "4100": "1000.00", // JE-005 (JE-004 billing goes to deferred revenue, a balance sheet account)
    revenue: "13450.75",
    "5000": "4980.30", // JE-003
    cogs: "4980.30",
    grossProfit: "8470.45",
    "6000": "18500.00", // JE-006
    "6100": "9000.00", // JE-007
    "6300": "2500.10", // JE-008
    operating_expenses: "30000.10",
    operatingIncome: "-21529.65",
    other_income: "0.00",
    netIncome: "-21529.65",
  });
});

test("February 2026: the voided duplicate sale is left out", () => {
  assert.deepEqual(rows(statement("2026-02-01", "2026-02-28")), {
    "4000": "8200.00", // JE-010 only; JE-009 is the void duplicate
    "4100": "1000.00", // JE-014
    "4900": "-650.25", // JE-012
    revenue: "8549.75",
    "5000": "3280.00", // JE-011
    cogs: "3280.00",
    grossProfit: "5269.75",
    "6000": "18500.00", // JE-015
    operating_expenses: "18500.00",
    operatingIncome: "-13230.25",
    other_income: "0.00",
    netIncome: "-13230.25",
  });
});

test("March 2026: draft bonus left out, vendor credit nets against software", () => {
  assert.deepEqual(rows(statement("2026-03-01", "2026-03-31")), {
    "4000": "15000.00", // JE-016
    "4100": "1000.00", // JE-021
    "4900": "-150.00", // JE-016 volume discount
    revenue: "15850.00",
    "5000": "6012.45", // JE-017
    cogs: "6012.45",
    grossProfit: "9837.55",
    "6000": "18500.00", // JE-022 (JE-019 is a draft)
    "6200": "1099.97", // JE-018 1199.97 - JE-020 100.00
    operating_expenses: "19599.97",
    operatingIncome: "-9762.42",
    "7000": "42.18", // JE-023
    other_income: "42.18",
    netIncome: "-9720.24",
  });
});

test("net income for other ranges, including one-day and boundary ranges", () => {
  const cases: [start: string, end: string, netIncome: string, why: string][] = [
    ["2026-01-01", "2026-01-01", "-9000.00", "start day included: JE-007 rent only"],
    ["2026-02-03", "2026-02-03", "4920.00", "JE-010 8200.00 - JE-011 3280.00; void JE-009 on the same day left out"],
    ["2026-03-15", "2026-03-15", "0.00", "only the draft JE-019 is on this day"],
    ["2026-03-18", "2026-03-18", "0.00", "only the void JE-025, which touches the balance sheet anyway"],
    ["2026-03-31", "2026-04-01", "-8357.82", "JE-021 1000 + JE-023 42.18 + JE-024 9100 - JE-022 18500"],
    ["2025-12-01", "2025-12-31", "5000.00", "JE-001"],
    ["2026-04-01", "2026-04-30", "9100.00", "JE-024"],
    ["2025-01-01", "2026-12-31", "-30380.14", "everything: 5000.00 + Q1 -44480.14 + 9100.00"],
    ["2027-01-01", "2027-12-31", "0.00", "no entries"],
  ];
  for (const [start, end, netIncome, why] of cases) {
    assert.equal(statement(start, end).netIncome, netIncome, `${start}..${end}: ${why}`);
  }
});

test("a range with no entries still has every section, all zero", () => {
  const s = statement("2027-01-01", "2027-12-31");
  assert.deepEqual(s.sections.map((x) => [x.key, x.lines.length, x.total]), [
    ["revenue", 0, "0.00"], ["cogs", 0, "0.00"], ["operating_expenses", 0, "0.00"], ["other_income", 0, "0.00"],
  ]);
});

test("accounts appear in chart-of-accounts order with their names", () => {
  const revenue = statement("2026-01-01", "2026-03-31").sections[0];
  assert.deepEqual(revenue.lines.map((l) => `${l.account} ${l.name}`),
    ["4000 Product Revenue", "4100 Subscription Revenue", "4900 Sales Returns & Discounts"]);
});

test("if the draft bonus were posted, Q1 net income would drop by exactly 5000.00", () => {
  const withBonus = ledgerAfter((raw) => { entryById(raw, "JE-019").status = "posted"; });
  assert.equal(toResponse(buildIncomeStatement(withBonus, "2026-01-01", "2026-03-31")).netIncome, "-49480.14");
});

// Rules that must hold for any range. They back up the hand-worked numbers above.
const RANGES: [string, string][] = [
  ["2025-01-01", "2026-12-31"], ["2026-01-01", "2026-03-31"], ["2026-02-03", "2026-02-03"], ["2026-03-31", "2026-04-01"],
];
const raw = (start: string, end: string): IncomeStatement => buildIncomeStatement(ledger, start, end);

test("net income equals the net debit change of balance sheet accounts (double entry)", () => {
  for (const [start, end] of RANGES) {
    let balanceSheet = 0n;
    for (const e of ledger.entries) {
      if (e.status !== "posted" || e.date < start || e.date > end) continue;
      for (const l of e.lines) if (ledger.accountsByNumber.get(l.account)!.section === null) balanceSheet += l.debit - l.credit;
    }
    assert.equal(raw(start, end).netIncome, balanceSheet, `${start}..${end}`);
  }
});

test("January + February + March equals Q1, for every account and subtotal", () => {
  const months = [raw("2026-01-01", "2026-01-31"), raw("2026-02-01", "2026-02-28"), raw("2026-03-01", "2026-03-31")];
  const q1 = raw("2026-01-01", "2026-03-31");
  const amount = (s: IncomeStatement, account: string) =>
    s.sections.flatMap((x) => x.lines).find((l) => l.account === account)?.amount ?? 0n;
  for (const account of ledger.accounts) {
    assert.equal(months.reduce((t, m) => t + amount(m, account.number), 0n), amount(q1, account.number), account.number);
  }
  for (const key of ["grossProfit", "operatingIncome", "netIncome"] as const) {
    assert.equal(months.reduce((t, m) => t + m[key], 0n), q1[key], key);
  }
});
