// The service builds whatever layout it is given. These tests pass in small made-up
// layouts to show that sections, subtotals and the period are parameters, not code.
import assert from "node:assert/strict";
import { test } from "node:test";
import { loadLedger } from "../src/dao/ledgerFile.ts";
import { formatCents } from "../src/helpers/money.ts";
import type { StatementLayout } from "../src/layouts/layout.ts";
import { serviceFor } from "./realLedger.ts";

const service = serviceFor(loadLedger());

test("layout: any sections and subtotals can be passed in (all revenue-type accounts in Q1 total 37892.68)", () => {
  const layout: StatementLayout = {
    sections: [
      { key: "income", title: "Income", accounts: { types: ["revenue"] } },
      { key: "costs", title: "Costs", accounts: { types: ["expense"] } },
    ],
    subtotals: [{ key: "result", plus: ["income"], minus: ["costs"] }],
  };
  const s = service.getStatement(layout, { start: "2026-01-01", end: "2026-03-31" });
  // 4000 35650.75 + 4100 3000.00 + 4900 -800.25 + 7000 42.18
  assert.equal(formatCents(s.sections[0].total), "37892.68");
  assert.deepEqual(s.sections[0].lines.map((l) => l.account), ["4000", "4100", "4900", "7000"]);
  // Same accounts and dates as the income statement, so the result must equal its net income.
  assert.equal(formatCents(s.subtotals.result), "-44480.14");
});

test("layout: leaving out start includes everything up to end (cash through January is -27500.00)", () => {
  const layout: StatementLayout = {
    sections: [{ key: "cash", title: "Cash", accounts: { types: ["asset"] } }],
    subtotals: [],
  };
  const s = service.getStatement(layout, { end: "2026-01-31" });
  // Debit-normal: JE-006 payroll -18500.00 and JE-007 rent -9000.00 are the only cash lines so far.
  const cash = s.sections[0].lines.find((l) => l.account === "1000")!;
  assert.equal(formatCents(cash.amount), "-27500.00");
  assert.equal(s.start, undefined);
});

test("layout: credit-normal accounts show increases from credits as positive (accounts payable through March is 3600.07)", () => {
  const layout: StatementLayout = {
    sections: [{ key: "owed", title: "Owed", accounts: { types: ["liability"] } }],
    subtotals: [],
  };
  const lines = service.getStatement(layout, { end: "2026-03-31" }).sections[0].lines;
  // 2000: JE-008 2500.10 + JE-018 1199.97 - JE-020 100.00 (JE-019 is a draft)
  assert.equal(formatCents(lines.find((l) => l.account === "2000")!.amount), "3600.07");
});

test("layout: an account in two sections is refused, so nothing is counted twice", () => {
  const layout: StatementLayout = {
    sections: [
      { key: "a", title: "A", accounts: { types: ["revenue"] } },
      { key: "b", title: "B", accounts: { subtypes: ["other_income"] } },
    ],
    subtotals: [],
  };
  assert.throws(() => service.getStatement(layout, { end: "2026-03-31" }), /more than one section/);
});

test("layout: a subtotal that names an unknown key is refused", () => {
  const layout: StatementLayout = {
    sections: [{ key: "a", title: "A", accounts: { types: ["revenue"] } }],
    subtotals: [{ key: "x", plus: ["a", "typo"], minus: [] }],
  };
  assert.throws(() => service.getStatement(layout, { end: "2026-03-31" }), /unknown key "typo"/);
});
