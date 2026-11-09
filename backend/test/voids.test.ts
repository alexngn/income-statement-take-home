// Void entries were cancelled. They stay in the data for the audit trail but must never
// reach the income statement. ledger.json has two:
//
//   JE-009  2026-02-03  void  "February product sales (entered twice)"
//           1100 Accounts Receivable  debit  8200.00
//           4000 Product Revenue      credit 8200.00
//     The duplicate of JE-010 (posted, same day, same amounts). Counting it would double February sales.
//
//   JE-025  2026-03-18  void  "Payment received from Blue Door Cafe (check returned unsigned)"
//           1000 Cash                 debit  3200.00
//           1100 Accounts Receivable  credit 3200.00
//     Balance sheet accounts only, so it could not change the income statement either way.
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

const DUPLICATE_DAY = "2026-02-03"; // JE-009 (void), JE-010 and JE-011 (posted)
const RETURNED_CHECK_DAY = "2026-03-18"; // JE-025 (void) only
const ledger = loadLedger();
const dao = new LedgerDao(ledger);
const statement = (l = ledger, start = "2026-01-01", end = "2026-03-31") =>
  toResponse(incomeStatementFor(l, start, end));
const productRevenue = (s: ReturnType<typeof statement>) =>
  s.sections.flatMap((x) => x.lines).find((l) => l.account === "4000")?.amount;
const entryIds = (lines: { entryId: string }[]) => [...new Set(lines.map((l) => l.entryId))];

test("voids: ledger.json has void JE-009 (duplicate sale) and JE-025 (returned check)", () => {
  const je009 = ledger.entries.find((e) => e.id === "JE-009")!;
  const je025 = ledger.entries.find((e) => e.id === "JE-025")!;
  assert.deepEqual([je009.status, je009.date], ["void", DUPLICATE_DAY]);
  assert.deepEqual(je009.lines.map((l) => [l.account, l.debit, l.credit]), [["1100", 820000n, 0n], ["4000", 0n, 820000n]]);
  assert.deepEqual([je025.status, je025.date], ["void", RETURNED_CHECK_DAY]);
  assert.deepEqual(je025.lines.map((l) => [l.account, l.debit, l.credit]), [["1000", 320000n, 0n], ["1100", 0n, 320000n]]);
});

// DAO

test("voids are filtered out: DAO findLines never returns JE-009 or JE-025", () => {
  const lines = dao.findLines({ start: "2025-01-01", end: "2026-12-31" });
  assert.ok(!lines.some((l) => l.entryId === "JE-009" || l.entryId === "JE-025"));
  assert.deepEqual(entryIds(dao.findLines({ start: DUPLICATE_DAY, end: DUPLICATE_DAY })), ["JE-010", "JE-011"]);
  assert.deepEqual(dao.findLines({ start: RETURNED_CHECK_DAY, end: RETURNED_CHECK_DAY }), []);
});

test("voids are filtered out: DAO returns JE-009 and JE-025 only when asked for status void", () => {
  const voids = dao.findLines({ start: "2025-01-01", end: "2026-12-31", status: "void" });
  assert.deepEqual(entryIds(voids), ["JE-009", "JE-025"]);
});

// Service

test("voids are filtered out: service February product revenue is 8200.00, not 16400.00", () => {
  assert.equal(productRevenue(statement(ledger, "2026-02-01", "2026-02-28")), "8200.00"); // JE-010 only
  assert.equal(productRevenue(statement()), "35650.75"); // Q1: JE-002 + JE-010 + JE-016
});

test("voids are filtered out: service net income for 2026-02-03 is 4920.00, not 13120.00", () => {
  assert.equal(statement(ledger, DUPLICATE_DAY, DUPLICATE_DAY).netIncome, "4920.00");
});

test("voids are filtered out: the same entry posted doubles the February sale", () => {
  const posted = ledgerAfter((raw) => { entryById(raw, "JE-009").status = "posted"; });
  assert.equal(productRevenue(statement(posted, "2026-02-01", "2026-02-28")), "16400.00");
  assert.equal(statement(posted, DUPLICATE_DAY, DUPLICATE_DAY).netIncome, "13120.00");
  assert.equal(statement(posted).netIncome, "-36280.14"); // -44480.14 + 8200.00
});

test("voids are filtered out: returned check JE-025 never shows (balance sheet only)", () => {
  assert.equal(statement(ledger, RETURNED_CHECK_DAY, RETURNED_CHECK_DAY).netIncome, "0.00");
  const posted = ledgerAfter((raw) => { entryById(raw, "JE-025").status = "posted"; });
  const day = statement(posted, RETURNED_CHECK_DAY, RETURNED_CHECK_DAY);
  assert.ok(day.sections.every((s) => s.lines.length === 0)); // cash and receivables are balance sheet accounts
  assert.equal(statement(posted).netIncome, "-44480.14");
});

test("voids are filtered out: voiding the real sale JE-010 removes its 8200.00", () => {
  const voided = ledgerAfter((raw) => { entryById(raw, "JE-010").status = "void"; });
  assert.equal(productRevenue(statement(voided, "2026-02-01", "2026-02-28")), undefined); // no 4000 line at all
  assert.equal(statement(voided).netIncome, "-52680.14"); // -44480.14 - 8200.00
});

test("voids are filtered out: a ledger of only voids gives an all-zero statement", () => {
  const allVoid = ledgerAfter((raw) => { for (const e of raw.journal_entries) e.status = "void"; });
  const everything = statement(allVoid, "2025-01-01", "2026-12-31");
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

test("voids are filtered out: HTTP GET for 2026-02-03 counts the sale once", async () => {
  const body = await (await fetch(`${base}/income-statement?start=${DUPLICATE_DAY}&end=${DUPLICATE_DAY}`)).json();
  assert.equal(productRevenue(body), "8200.00");
  assert.equal(body.netIncome, "4920.00");
});

test("voids are filtered out: HTTP GET for February shows product revenue 8200.00", async () => {
  const body = await (await fetch(`${base}/income-statement?start=2026-02-01&end=2026-02-28`)).json();
  assert.equal(productRevenue(body), "8200.00");
  assert.equal(body.netIncome, "-13230.25");
});
