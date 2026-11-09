import { readFileSync } from "node:fs";
import { LEDGER_PATH, parseLedger, type Ledger } from "../src/ledger.ts";

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
