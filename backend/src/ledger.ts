// Loads ledger.json, checks it, and converts amounts to cents.
// Bad data stops the server at startup instead of producing a wrong statement.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isValidDate } from "./dates.ts";
import { toCents } from "./money.ts";

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type SectionKey = "revenue" | "cogs" | "operating_expenses" | "other_income";

/** Which income statement section each subtype goes in. null = balance sheet, not on the statement. */
export const SECTION_BY_SUBTYPE: Record<string, SectionKey | null> = {
  operating_revenue: "revenue",
  contra_revenue: "revenue",
  cogs: "cogs",
  operating_expense: "operating_expenses",
  other_income: "other_income",
  balance_sheet: null,
};

const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"];
const STATUSES = ["posted", "draft", "void"];

export interface Account {
  number: string;
  name: string;
  type: AccountType;
  subtype: string;
  isActive: boolean;
  section: SectionKey | null;
}

export interface JournalLine {
  account: string;
  debit: bigint; // cents
  credit: bigint; // cents
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  status: "posted" | "draft" | "void";
  memo: string;
  lines: JournalLine[];
}

export interface Ledger {
  company: string;
  currency: string;
  accounts: Account[]; // in file order, which is chart-of-accounts order
  accountsByNumber: Map<string, Account>;
  entries: JournalEntry[];
}

/** ledger.json at the repo root. */
export const LEDGER_PATH = fileURLToPath(new URL("../../ledger.json", import.meta.url));

export function loadLedger(path: string = LEDGER_PATH): Ledger {
  return parseLedger(JSON.parse(readFileSync(path, "utf8")));
}

// The raw JSON is untyped, so this reads it as `any` and checks each field by hand.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseLedger(raw: any): Ledger {
  const accounts: Account[] = [];
  const accountsByNumber = new Map<string, Account>();

  for (const a of raw.accounts) {
    const where = `Account ${a.number}`;
    if (accountsByNumber.has(a.number)) throw new Error(`${where}: duplicate account number`);
    if (!ACCOUNT_TYPES.includes(a.type)) throw new Error(`${where}: unknown type "${a.type}"`);
    if (!(a.subtype in SECTION_BY_SUBTYPE)) throw new Error(`${where}: unknown subtype "${a.subtype}"`);
    const section = SECTION_BY_SUBTYPE[a.subtype];
    // The sign on the statement comes from the type, so the type must fit the section.
    const onStatement = a.type === "revenue" || a.type === "expense";
    if (onStatement !== (section !== null)) {
      throw new Error(`${where}: type "${a.type}" does not fit subtype "${a.subtype}"`);
    }
    const account: Account = {
      number: a.number,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
      isActive: a.is_active,
      section,
    };
    accounts.push(account);
    accountsByNumber.set(account.number, account);
  }

  const ids = new Set<string>();
  const entries: JournalEntry[] = raw.journal_entries.map((e: any) => {
    const where = `Journal entry ${e.id}`;
    if (ids.has(e.id)) throw new Error(`${where}: duplicate id`);
    ids.add(e.id);
    if (!isValidDate(e.date)) throw new Error(`${where}: invalid date "${e.date}"`);
    if (!STATUSES.includes(e.status)) throw new Error(`${where}: unknown status "${e.status}"`);
    if (!Array.isArray(e.lines) || e.lines.length < 2) throw new Error(`${where}: needs at least 2 lines`);

    const lines: JournalLine[] = e.lines.map((l: any) => {
      if (!accountsByNumber.has(l.account)) throw new Error(`${where}: unknown account "${l.account}"`);
      const debit = toCents(l.debit);
      const credit = toCents(l.credit);
      if ((debit === 0n) === (credit === 0n)) {
        throw new Error(`${where}: each line needs exactly one of debit or credit (account ${l.account})`);
      }
      return { account: l.account, debit, credit };
    });

    const debits = lines.reduce((sum, l) => sum + l.debit, 0n);
    const credits = lines.reduce((sum, l) => sum + l.credit, 0n);
    if (debits !== credits) throw new Error(`${where}: debits do not equal credits`);

    return { id: e.id, date: e.date, status: e.status, memo: e.memo, lines };
  });

  return { company: raw.company, currency: raw.currency, accounts, accountsByNumber, entries };
}
