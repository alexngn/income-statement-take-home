import assert from "node:assert/strict";
import { test } from "node:test";
import { loadLedger } from "../src/dao/ledgerFile.ts";
import { entryById, ledgerAfter } from "./realLedger.ts";

test("ledger load: the real ledger.json passes every check (15 accounts, 25 entries, amounts in cents)", () => {
  const ledger = loadLedger();
  assert.equal(ledger.accounts.length, 15);
  assert.equal(ledger.entries.length, 25);
  const je002 = ledger.entries.find((e) => e.id === "JE-002")!;
  assert.deepEqual(je002.lines, [
    { account: "1100", debit: 1245075n, credit: 0n },
    { account: "4000", debit: 0n, credit: 1245075n },
  ]);
});

// Each test below breaks one thing in the real ledger.json and expects the load to refuse it.

test("ledger load: refuses an entry whose debits and credits differ", () => {
  assert.throws(() => ledgerAfter((raw) => { entryById(raw, "JE-002").lines[1].credit = "12450.74"; }),
    /JE-002: debits do not equal credits/);
});

test("ledger load: refuses a line on an account that does not exist", () => {
  assert.throws(() => ledgerAfter((raw) => { entryById(raw, "JE-002").lines[1].account = "4001"; }),
    /JE-002: unknown account "4001"/);
});

test("ledger load: refuses a line with both debit and credit set", () => {
  assert.throws(() => ledgerAfter((raw) => {
    const lines = entryById(raw, "JE-002").lines;
    lines[0].credit = "1.00"; lines[1].debit = "1.00";
  }), /exactly one of debit or credit/);
});

test("ledger load: refuses an amount without exactly two decimals", () => {
  assert.throws(() => ledgerAfter((raw) => {
    const lines = entryById(raw, "JE-002").lines;
    lines[0].debit = "12450.750"; lines[1].credit = "12450.750";
  }), /Invalid amount/);
});

test("ledger load: refuses an impossible date and an unknown status", () => {
  assert.throws(() => ledgerAfter((raw) => { entryById(raw, "JE-014").date = "2026-02-30"; }), /JE-014: invalid date/);
  assert.throws(() => ledgerAfter((raw) => { entryById(raw, "JE-019").status = "pending"; }), /JE-019: unknown status/);
});

test("ledger load: refuses a duplicate entry id", () => {
  assert.throws(() => ledgerAfter((raw) => { entryById(raw, "JE-010").id = "JE-009"; }), /duplicate id/);
});

test("ledger load: refuses an unknown subtype instead of silently dropping the account", () => {
  assert.throws(() => ledgerAfter((raw) => { raw.accounts.find((a: any) => a.number === "7000").subtype = "interest"; }),
    /Account 7000: unknown subtype/);
});

test("ledger load: refuses a type that does not fit the subtype (an asset filed as COGS)", () => {
  assert.throws(() => ledgerAfter((raw) => { raw.accounts.find((a: any) => a.number === "1000").subtype = "cogs"; }),
    /Account 1000: type "asset" does not fit/);
});
