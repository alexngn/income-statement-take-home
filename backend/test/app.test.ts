import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.ts";
import { loadLedger } from "../src/ledger.ts";

let base = "";
let close = () => {};
before(async () => {
  const server = createApp(loadLedger()).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
  close = () => server.close();
});
after(() => close());

const get = (query: string) => fetch(`${base}/income-statement${query}`);

test("GET /income-statement for Q1 2026 over HTTP", async () => {
  const res = await get("?start=2026-01-01&end=2026-03-31");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.company, "Northwind Coffee Roasters");
  assert.equal(body.currency, "USD");
  assert.deepEqual([body.start, body.end], ["2026-01-01", "2026-03-31"]);
  assert.deepEqual(body.sections.map((s: any) => [s.title, s.total]), [
    ["Revenue", "37850.50"], ["Cost of goods sold", "14272.75"], ["Operating expenses", "68100.07"], ["Other income", "42.18"],
  ]);
  assert.deepEqual([body.grossProfit, body.operatingIncome, body.netIncome], ["23577.75", "-44522.32", "-44480.14"]);
  assert.deepEqual(body.sections[0].lines[2], { account: "4900", name: "Sales Returns & Discounts", amount: "-800.25" });
});

test("400 for missing, malformed, impossible or reversed dates", async () => {
  for (const q of ["", "?start=2026-01-01", "?start=2026-1-1&end=2026-01-31", "?start=2026-02-30&end=2026-03-01",
    "?start=2026-02-01&end=2026-01-01", "?start=2026-01-01&start=2026-01-02&end=2026-01-31"]) {
    const res = await get(q);
    assert.equal(res.status, 400, q);
    assert.ok((await res.json()).error, q);
  }
});
