import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCents, toCents } from "../src/money.ts";

test("toCents parses two-decimal strings exactly", () => {
  assert.equal(toCents("12450.75"), 1245075n);
  assert.equal(toCents("0.00"), 0n);
  assert.equal(toCents("0.10"), 10n);
});

test("toCents rejects anything that is not a plain two-decimal amount", () => {
  for (const bad of ["12.5", "12", "-1.00", "1,000.00", "1e3", "", "abc"]) {
    assert.throws(() => toCents(bad), /Invalid amount/, bad);
  }
});

test("formatCents writes negatives, small amounts and zero", () => {
  assert.equal(formatCents(-4448014n), "-44480.14");
  assert.equal(formatCents(5n), "0.05");
  assert.equal(formatCents(-5n), "-0.05");
  assert.equal(formatCents(0n), "0.00");
});

test("sums do not drift the way floats do", () => {
  // In floats, 0.1 + 0.2 === 0.30000000000000004.
  let cents = 0n;
  for (let i = 0; i < 1000; i++) cents += toCents("0.10") + toCents("0.20");
  assert.equal(formatCents(cents), "300.00");
});
