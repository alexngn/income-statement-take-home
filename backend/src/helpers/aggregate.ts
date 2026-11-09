// Pure functions that turn journal lines into statement numbers, in cents.

import type { LedgerLine } from "../dao/ledger.dao.ts";
import type { Account, AccountType } from "../dao/ledgerFile.ts";
import type { SectionLayout, SubtotalLayout } from "../layouts/layout.ts";

export interface StatementLine {
  account: string;
  name: string;
  amount: bigint; // cents
}

export interface StatementSection {
  key: string;
  title: string;
  lines: StatementLine[];
  total: bigint;
}

/** Types that increase with credits. The others (asset, expense) increase with debits. */
const CREDIT_NORMAL: AccountType[] = ["liability", "equity", "revenue"];

/**
 * The line's effect on its account, with the account's normal sign: positive when the line
 * increases the account. So revenue is credit minus debit and expenses are debit minus credit;
 * a contra account (returns on a revenue account) comes out negative.
 */
export function signedAmount(line: LedgerLine): bigint {
  if (CREDIT_NORMAL.includes(line.account.type)) return line.credit - line.debit;
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

/** One section: its accounts in chart order (those with no activity left out) and their total. */
export function buildSection(layout: SectionLayout, accounts: Account[], amounts: Map<string, bigint>): StatementSection {
  const lines = accounts
    .filter((a) => amounts.has(a.number))
    .map((a) => ({ account: a.number, name: a.name, amount: amounts.get(a.number)! }));
  return { key: layout.key, title: layout.title, lines, total: lines.reduce((sum, l) => sum + l.amount, 0n) };
}

/** Each subtotal in order, from section totals and earlier subtotals. */
export function computeSubtotals(layouts: SubtotalLayout[], sections: StatementSection[]): Record<string, bigint> {
  const known = new Map<string, bigint>(sections.map((s) => [s.key, s.total]));
  const value = (key: string) => {
    if (!known.has(key)) throw new Error(`Subtotal refers to unknown key "${key}"`);
    return known.get(key)!;
  };
  const subtotals: Record<string, bigint> = {};
  for (const { key, plus, minus } of layouts) {
    const amount = plus.reduce((sum, k) => sum + value(k), 0n) - minus.reduce((sum, k) => sum + value(k), 0n);
    subtotals[key] = amount;
    known.set(key, amount);
  }
  return subtotals;
}
