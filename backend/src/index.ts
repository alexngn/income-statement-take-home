import { createApp } from "./app.ts";
import { loadLedger } from "./ledger.ts";

const ledger = loadLedger(); // throws, and the server does not start, if the data is bad
const port = Number(process.env.PORT ?? 3000);
createApp(ledger).listen(port, (error?: Error) => {
  if (error) throw error; // for example, the port is already in use
  console.log(`Backend listening on http://localhost:${port}`);
});
