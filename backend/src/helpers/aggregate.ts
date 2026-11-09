// Pure functions that turn journal lines into income statement numbers, in cents.

import type { LedgerLine } from "../dao/ledger.dao.ts";
import type { Account, SectionKey } from "../dao/ledgerFile.ts";

export const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: "revenue", title: "Revenue" },
  { key: "cogs", title: "Cost of goods sold" },
  { key: "operating_expenses", title: "Operating expenses" },
  { key: "other_income", title: "Other income" },
];

export interface StatementLine {
  account: string;
  name: string;
  amount: bigint; // cents
}

export interface StatementSection {
  key: SectionKey;
  title: string;
  lines: StatementLine[];
  total: bigint;
}

export interface Subtotals {
  grossProfit: bigint;
  operatingIncome: bigint;
  netIncome: bigint;
}

/**
 * The line's effect on the statement, with the account's normal sign:
 * revenue is positive when credits exceed debits, expenses when debits exceed credits.
 */
export function signedAmount(line: LedgerLine): bigint {
  if (line.account.type === "revenue") return line.credit - line.debit;
  return line.debit - line.credit;
}

/** Net amount per account number. Accounts with no lines are absent. */
export function sumByAccount(lines: LedgerLine[]): Map<string, bigint> {
  const totals = new Map<string, bigint>();
  for (const line of lines) {
    const number = line.account.number;
    totals.set(number, (totals.get(number) ?? 0n) + signedAmount(line));
  }
  return totals;
}

/** Every section in statement order. Accounts keep chart order; accounts with no activity are left out. */
export function groupIntoSections(accounts: Account[], amounts: Map<string, bigint>): StatementSection[] {
  return SECTIONS.map(({ key, title }) => {
    const lines = accounts
      .filter((a) => a.section === key && amounts.has(a.number))
      .map((a) => ({ account: a.number, name: a.name, amount: amounts.get(a.number)! }));
    return { key, title, lines, total: lines.reduce((sum, l) => sum + l.amount, 0n) };
  });
}

export function computeSubtotals(sections: StatementSection[]): Subtotals {
  const total = (key: SectionKey) => sections.find((s) => s.key === key)!.total;
  const grossProfit = total("revenue") - total("cogs");
  const operatingIncome = grossProfit - total("operating_expenses");
  const netIncome = operatingIncome + total("other_income");
  return { grossProfit, operatingIncome, netIncome };
}
