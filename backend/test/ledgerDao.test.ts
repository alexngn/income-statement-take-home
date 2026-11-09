// LedgerDao.findLines is the only query the statement uses. Draft and void filtering
// has its own files (drafts.test.ts, voids.test.ts); this file covers dates and joins.
import assert from "node:assert/strict";
import { test } from "node:test";
import { LedgerDao } from "../src/dao/ledger.dao.ts";

const dao = LedgerDao.fromFile();
const entryIds = (start: string, end: string) =>
  [...new Set(dao.findLines({ start, end }).map((l) => l.entryId))];

test("DAO date range: the start day is included (2026-01-01 returns rent JE-007)", () => {
  assert.deepEqual(entryIds("2026-01-01", "2026-01-04"), ["JE-007"]);
});

test("DAO date range: the end day is included (ending 2026-01-31 returns JE-005 and JE-006)", () => {
  assert.deepEqual(entryIds("2026-01-21", "2026-01-31"), ["JE-005", "JE-006"]);
});

test("DAO date range: days outside the range are left out (2026-01-02 to 2026-01-04 is empty)", () => {
  assert.deepEqual(entryIds("2026-01-02", "2026-01-04"), []);
});

test("DAO date range: entries are returned in ledger order, not date order (JE-007 dated 01-01 comes after JE-006)", () => {
  assert.deepEqual(entryIds("2026-01-01", "2026-01-31"), ["JE-002", "JE-003", "JE-004", "JE-005", "JE-006", "JE-007", "JE-008"]);
});

test("DAO join: each line carries its entry id, date and full account (JE-002 debits 1100 Accounts Receivable 12450.75)", () => {
  const [first] = dao.findLines({ start: "2026-01-05", end: "2026-01-05" });
  assert.equal(first.entryId, "JE-002");
  assert.equal(first.date, "2026-01-05");
  assert.equal(first.account.number, "1100");
  assert.equal(first.account.name, "Accounts Receivable");
  assert.equal(first.account.type, "asset");
  assert.equal(first.debit, 1245075n);
  assert.equal(first.credit, 0n);
});

test("DAO date range: leaving out start includes everything up to end (through 2025-12-31 is JE-001 only)", () => {
  assert.deepEqual([...new Set(dao.findLines({ end: "2025-12-31" }).map((l) => l.entryId))], ["JE-001"]);
});

test("DAO accountNumbers: returns only lines on the listed accounts (2026-01-05 with 4000 and 5000 drops 1100 and 1200)", () => {
  const all = dao.findLines({ start: "2026-01-05", end: "2026-01-05" });
  const some = dao.findLines({ start: "2026-01-05", end: "2026-01-05", accountNumbers: ["4000", "5000"] });
  assert.deepEqual(all.map((l) => l.account.number), ["1100", "4000", "5000", "1200"]);
  assert.deepEqual(some.map((l) => l.account.number), ["4000", "5000"]);
});

test("DAO getAccounts: selects by subtype, by type, or both, in chart order", () => {
  const numbers = (selector: Parameters<typeof dao.getAccounts>[0]) => dao.getAccounts(selector).map((a) => a.number);
  assert.deepEqual(numbers({ subtypes: ["operating_expense"] }), ["6000", "6100", "6200", "6300"]);
  assert.deepEqual(numbers({ types: ["revenue"] }), ["4000", "4100", "4900", "7000"]);
  assert.deepEqual(numbers({ types: ["revenue"], subtypes: ["other_income"] }), ["7000"]);
  assert.equal(numbers({}).length, 15);
});
