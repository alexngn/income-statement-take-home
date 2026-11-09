import assert from "node:assert/strict";
import { test } from "node:test";
import { formatCents, toCents } from "../src/helpers/money.ts";

test("money: toCents turns \"12450.75\" into exactly 1245075 cents", () => {
  assert.equal(toCents("12450.75"), 1245075n);
  assert.equal(toCents("0.00"), 0n);
  assert.equal(toCents("0.10"), 10n);
});

test("money: toCents rejects amounts without exactly two decimals, negatives, commas and exponents", () => {
  for (const bad of ["12.5", "12", "-1.00", "1,000.00", "1e3", "", "abc"]) {
    assert.throws(() => toCents(bad), /Invalid amount/, bad);
  }
});

test("money: formatCents writes -4448014 as \"-44480.14\", 5 as \"0.05\", 0 as \"0.00\"", () => {
  assert.equal(formatCents(-4448014n), "-44480.14");
  assert.equal(formatCents(5n), "0.05");
  assert.equal(formatCents(-5n), "-0.05");
  assert.equal(formatCents(0n), "0.00");
});

test("money: 0.10 + 0.20 added 1000 times is exactly 300.00 (floats would drift)", () => {
  // In floats, 0.1 + 0.2 === 0.30000000000000004.
  let cents = 0n;
  for (let i = 0; i < 1000; i++) cents += toCents("0.10") + toCents("0.20");
  assert.equal(formatCents(cents), "300.00");
});

test("money: -0.10 - 0.20 added 1000 times is exactly -300.00", () => {
  let cents = 0n;
  for (let i = 0; i < 1000; i++) cents += -toCents("0.10") + -toCents("0.20");
  assert.equal(formatCents(cents), "-300.00");
});

test("money: 0.10 - 0.20 added 1000 times is exactly -100.00", () => {
  let cents = 0n;
  for (let i = 0; i < 1000; i++) cents += toCents("0.10") - toCents("0.20");
  assert.equal(formatCents(cents), "-100.00");
});
