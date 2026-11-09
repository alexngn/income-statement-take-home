import { createApp } from "./app.ts";
import { LedgerDao } from "./dao/ledger.dao.ts";
import { IncomeStatementService } from "./services/incomeStatement.service.ts";

// Wiring: DAO -> service -> Express app.
const dao = LedgerDao.fromFile(); // throws, and the server does not start, if ledger.json is bad
const app = createApp(new IncomeStatementService(dao));

const port = Number(process.env.PORT ?? 3000);
app.listen(port, (error?: Error) => {
  if (error) throw error; // for example, the port is already in use
  console.log(`Backend listening on http://localhost:${port}`);
});
