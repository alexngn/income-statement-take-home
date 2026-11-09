import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidDate } from "../src/helpers/dates.ts";

test("dates: accepts real calendar dates, including leap days like 2024-02-29", () => {
  for (const ok of ["2026-01-01", "2026-03-31", "2024-02-29", "2000-02-29"]) assert.ok(isValidDate(ok), ok);
});

test("dates: rejects impossible dates like 2026-02-30 and anything not YYYY-MM-DD", () => {
  for (const bad of ["2026-02-29", "2026-02-30", "2026-04-31", "2026-13-01", "2026-00-10", "1900-02-29",
    "2026-1-01", "20260101", "2026-01-01T00:00", "", undefined, ["2026-01-01"]]) {
    assert.ok(!isValidDate(bad), String(bad));
  }
});
