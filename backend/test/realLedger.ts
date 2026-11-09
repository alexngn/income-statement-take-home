import { readFileSync } from "node:fs";
import { LedgerDao } from "../src/dao/ledger.dao.ts";
import { LEDGER_PATH, parseLedger, type Ledger } from "../src/dao/ledgerFile.ts";
import { INCOME_STATEMENT } from "../src/layouts/incomeStatement.ts";
import { StatementService, type Statement } from "../src/services/statement.service.ts";

/** A fresh copy of the raw ledger.json, safe to change inside one test. */
export function rawLedger() {
  return JSON.parse(readFileSync(LEDGER_PATH, "utf8"));
}

/** The real ledger after `change` edits the raw JSON (to make one entry bad, for example). */
export function ledgerAfter(change: (raw: any) => void): Ledger {
  const raw = rawLedger();
  change(raw);
  return parseLedger(raw);
}

export const entryById = (raw: any, id: string) => raw.journal_entries.find((e: any) => e.id === id);

/** The service wired to a ledger, as index.ts wires it (DAO -> service). */
export function serviceFor(ledger: Ledger): StatementService {
  return new StatementService(new LedgerDao(ledger));
}

/** The income statement for start..end, in cents, as the route builds it. */
export function incomeStatementFor(ledger: Ledger, start: string, end: string): Statement {
  return serviceFor(ledger).getStatement(INCOME_STATEMENT, { start, end });
}
