// GET /income-statement?start=YYYY-MM-DD&end=YYYY-MM-DD
// Bad dates get a 400 with { "error": "..." }.

import { Router } from "express";
import { parseDateRange } from "../helpers/dateRange.ts";
import { toResponse } from "../helpers/format.ts";
import type { IncomeStatementService } from "../services/incomeStatement.service.ts";

export function incomeStatementRouter(service: IncomeStatementService): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const range = parseDateRange(req.query.start, req.query.end);
    if ("error" in range) {
      res.status(400).json({ error: range.error });
      return;
    }
    const statement = service.getIncomeStatement(range.start, range.end);
    res.json(toResponse(statement));
  });

  return router;
}
