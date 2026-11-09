import assert from "node:assert/strict";
import { test } from "node:test";
import { diffSpreadsheet, displayToCents, parseCsv } from "../src/diffSpreadsheet.ts";

test("displayToCents reads spreadsheet display text without floats", () => {
  assert.equal(displayToCents("35,650.75"), 3565075n);
  assert.equal(displayToCents("(800.25)"), -80025n);
  assert.equal(displayToCents("-44,480.14"), -4448014n);
  assert.equal(displayToCents("$1,000"), 100000n);
  assert.equal(displayToCents("-"), 0n);
  assert.equal(displayToCents(""), 0n);
  assert.equal(displayToCents("abc"), null);
});

test("parseCsv handles quoted fields with commas and quotes", () => {
  assert.deepEqual(parseCsv('a,"1,000.00","say ""hi"""\r\nb,2\n'), [["a", "1,000.00", 'say "hi"'], ["b", "2"]]);
});

// January 2026 typed out by hand in the layout of the spreadsheet's Income Statement tab.
const januaryCsv = (productRevenue: string) => [
  "Northwind Coffee Roasters: income statement (USD),,,,",
  "Start date (inclusive),2026-01-01,,,",
  "End date (inclusive),2026-01-31,,,",
  "Revenue,,,,",
  `,4000 Product Revenue,"${productRevenue}",,`,
  ',4100 Subscription Revenue,"1,000.00",,',
  ",4900 Sales Returns & Discounts,-,,",
  'Net revenue,,"13,450.75",,',
  ',5000 Cost of Goods Sold,"4,980.30",,',
  'Total cost of goods sold,,"4,980.30",,',
  'Gross profit,,"8,470.45",,',
  ',6000 Salaries,"18,500.00",,',
  ',6100 Rent,"9,000.00",,',
  ",6200 Software,-,,",
  ',6300 Marketing (legacy),"2,500.10",,',
  'Total operating expenses,,"30,000.10",,',
  'Operating income,,"(21,529.65)",,',
  ",7000 Interest Income,-,,",
  "Total other income,,-,,",
  'Net income,,"(21,529.65)",,',
].join("\n");

test("diff finds no difference when the CSV matches January 2026", () => {
  const { start, end, diff } = diffSpreadsheet(januaryCsv("12,450.75"));
  assert.deepEqual([start, end], ["2026-01-01", "2026-01-31"]);
  assert.equal(diff.length, 16); // 9 income statement accounts + 7 totals
  assert.deepEqual(diff.filter((d) => d.sheet !== d.app), []);
});

test("diff flags the one row that differs", () => {
  const { diff } = diffSpreadsheet(januaryCsv("12,450.76"));
  assert.deepEqual(diff.filter((d) => d.sheet !== d.app).map((d) => d.label), ["4000 Product Revenue"]);
});
