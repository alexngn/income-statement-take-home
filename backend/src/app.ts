import express, { type NextFunction, type Request, type Response } from "express";
import { incomeStatementRouter } from "./routes/incomeStatement.routes.ts";
import type { IncomeStatementService } from "./services/incomeStatement.service.ts";

export function createApp(incomeStatementService: IncomeStatementService) {
  const app = express();
  app.use("/income-statement", incomeStatementRouter(incomeStatementService));

  // Unexpected errors as JSON instead of Express's HTML page.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
