import express from "express";
import { isValidDate } from "./dates.ts";
import { buildIncomeStatement, toResponse } from "./incomeStatement.ts";
import type { Ledger } from "./ledger.ts";

export function createApp(ledger: Ledger) {
  const app = express();

  // GET /income-statement?start=YYYY-MM-DD&end=YYYY-MM-DD (both days included)
  app.get("/income-statement", (req, res) => {
    const { start, end } = req.query;
    if (!isValidDate(start) || !isValidDate(end)) {
      res.status(400).json({ error: "start and end are required, as real dates in YYYY-MM-DD form" });
      return;
    }
    if (start > end) {
      res.status(400).json({ error: "start must be on or before end" });
      return;
    }
    res.json(toResponse(buildIncomeStatement(ledger, start, end)));
  });

  return app;
}
