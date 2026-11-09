// Draft entries are waiting for approval and are not in the books, so they must never
// reach the income statement. The only draft in ledger.json is:
//
//   JE-019  2026-03-15  draft  "Q1 bonus accrual (pending approval)"
//           6000 Salaries          debit  5000.00
//           2000 Accounts Payable  credit 5000.00
//
// Each layer is tested on its own: DAO, service, and the HTTP endpoint.

import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.ts";
import { LedgerDao } from "../src/dao/ledger.dao.ts";
import { loadLedger } from "../src/dao/ledgerFile.ts";
import { toResponse } from "../src/helpers/format.ts";
import { entryById, incomeStatementFor, ledgerAfter, serviceFor } from "./realLedger.ts";

const DRAFT_DAY = "2026-03-15";
const ledger = loadLedger();
const dao = new LedgerDao(ledger);
const statement = (l = ledger, start = "2026-01-01", end = "2026-03-31") =>
  toResponse(incomeStatementFor(l, start, end));
const salaries = (s: ReturnType<typeof statement>) =>
  s.sections.flatMap((x) => x.lines).find((l) => l.account === "6000")?.amount;

test("drafts: ledger.json has draft JE-019 (5000.00 bonus) on 2026-03-15", () => {
  const je019 = ledger.entries.find((e) => e.id === "JE-019")!;
  assert.equal(je019.status, "draft");
  assert.equal(je019.date, DRAFT_DAY);
  assert.deepEqual(je019.lines.map((l) => [l.account, l.debit, l.credit]), [["6000", 500000n, 0n], ["2000", 0n, 500000n]]);
});

// DAO

test("drafts are filtered out: DAO findLines never returns JE-019", () => {
  const lines = dao.findLines({ start: "2025-01-01", end: "2026-12-31" });
  assert.ok(lines.every((l) => l.status === "posted"));
  assert.ok(!lines.some((l) => l.entryId === "JE-019"));
  assert.deepEqual(dao.findLines({ start: DRAFT_DAY, end: DRAFT_DAY }), []);
});

test("drafts are filtered out: DAO returns JE-019 only when asked for status draft", () => {
  const drafts = dao.findLines({ start: "2025-01-01", end: "2026-12-31", status: "draft" });
  assert.deepEqual([...new Set(drafts.map((l) => l.entryId))], ["JE-019"]);
});

// Service

test("drafts are filtered out: service Q1 salaries are 55500.00, without the 5000.00 draft bonus", () => {
  const q1 = statement();
  assert.equal(salaries(q1), "55500.00"); // JE-006 + JE-015 + JE-022
  assert.equal(q1.netIncome, "-44480.14");
});

test("drafts are filtered out: service statement for 2026-03-15 is empty", () => {
  const day = statement(ledger, DRAFT_DAY, DRAFT_DAY);
  assert.ok(day.sections.every((s) => s.lines.length === 0 && s.total === "0.00"));
  assert.equal(day.netIncome, "0.00");
});

test("drafts are filtered out: the same entry posted adds exactly 5000.00 to salaries", () => {
  const posted = ledgerAfter((raw) => { entryById(raw, "JE-019").status = "posted"; });
  assert.equal(salaries(statement(posted)), "60500.00");
  assert.equal(statement(posted).netIncome, "-49480.14");
  assert.equal(statement(posted, DRAFT_DAY, DRAFT_DAY).netIncome, "-5000.00");
});

test("drafts are filtered out: turning posted JE-023 into a draft removes its 42.18 interest", () => {
  const drafted = ledgerAfter((raw) => { entryById(raw, "JE-023").status = "draft"; });
  const q1 = statement(drafted);
  assert.deepEqual(q1.sections.find((s) => s.key === "other_income")!.lines, []);
  assert.equal(q1.netIncome, "-44522.32"); // -44480.14 without the 42.18 of interest
});

test("drafts are filtered out: a ledger of only drafts gives an all-zero statement", () => {
  const allDrafts = ledgerAfter((raw) => { for (const e of raw.journal_entries) e.status = "draft"; });
  const everything = statement(allDrafts, "2025-01-01", "2026-12-31");
  assert.ok(everything.sections.every((s) => s.lines.length === 0));
  assert.deepEqual([everything.grossProfit, everything.operatingIncome, everything.netIncome], ["0.00", "0.00", "0.00"]);
});

// HTTP

let base = "";
let close = () => {};
before(async () => {
  const server = createApp(serviceFor(ledger)).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
  close = () => server.close();
});
after(() => close());

test("drafts are filtered out: HTTP GET for 2026-03-15 returns no lines", async () => {
  const body = await (await fetch(`${base}/income-statement?start=${DRAFT_DAY}&end=${DRAFT_DAY}`)).json();
  assert.ok(body.sections.every((s: any) => s.lines.length === 0));
  assert.equal(body.netIncome, "0.00");
});

test("drafts are filtered out: HTTP GET for Q1 shows salaries 55500.00", async () => {
  const body = await (await fetch(`${base}/income-statement?start=2026-01-01&end=2026-03-31`)).json();
  assert.equal(salaries(body), "55500.00");
  assert.equal(body.netIncome, "-44480.14");
});
