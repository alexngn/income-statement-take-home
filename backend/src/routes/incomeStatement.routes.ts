// GET /income-statement?start=YYYY-MM-DD&end=YYYY-MM-DD
// Bad dates get a 400 with { "error": "..." }.

import { Router } from "express";
import { parseDateRange } from "../helpers/dateRange.ts";
import { toResponse } from "../helpers/format.ts";
import { INCOME_STATEMENT } from "../layouts/incomeStatement.ts";
import type { StatementService } from "../services/statement.service.ts";

export function incomeStatementRouter(service: StatementService): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const range = parseDateRange(req.query.start, req.query.end);
    if ("error" in range) {
      res.status(400).json({ error: range.error });
      return;
    }
    const statement = service.getStatement(INCOME_STATEMENT, range);
    res.json(toResponse(statement));
  });

  return router;
}
