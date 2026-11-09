import express from "express";
import { stubStatement } from "./stub.ts";

const app = express();
app.get("/income-statement", (_req, res) => {
  res.json(stubStatement);
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
