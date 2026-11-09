// The accounting. A pure function: ledger + date range in, statement out (in cents).

import type { Ledger, SectionKey } from "./ledger.ts";
import { formatCents } from "./money.ts";

export const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: "revenue", title: "Revenue" },
  { key: "cogs", title: "Cost of goods sold" },
  { key: "operating_expenses", title: "Operating expenses" },
  { key: "other_income", title: "Other income" },
];

export interface StatementLine {
  account: string;
  name: string;
  amount: bigint;
}

export interface StatementSection {
  key: SectionKey;
  title: string;
  lines: StatementLine[];
  total: bigint;
}

export interface IncomeStatement {
  company: string;
  currency: string;
  start: string;
  end: string;
  sections: StatementSection[];
  grossProfit: bigint;
  operatingIncome: bigint;
  netIncome: bigint;
}

/**
 * Income statement for posted entries dated start..end, both days included.
 * Drafts and voids are left out. Accounts with no activity in the range are left out;
 * every section is always present.
 */
export function buildIncomeStatement(ledger: Ledger, start: string, end: string): IncomeStatement {
  // 1. Net amount per account, shown with the account's normal sign.
  const amountByAccount = new Map<string, bigint>();
  for (const entry of ledger.entries) {
    if (entry.status !== "posted") continue;
    if (entry.date < start || entry.date > end) continue;
    for (const line of entry.lines) {
      const account = ledger.accountsByNumber.get(line.account)!;
      if (account.section === null) continue; // balance sheet account
      // Revenue is positive when credits exceed debits; expenses when debits exceed credits.
      const amount = account.type === "revenue" ? line.credit - line.debit : line.debit - line.credit;
      amountByAccount.set(account.number, (amountByAccount.get(account.number) ?? 0n) + amount);
    }
  }

  // 2. Group into sections, in chart-of-accounts order.
  const sections = SECTIONS.map(({ key, title }) => {
    const lines = ledger.accounts
      .filter((a) => a.section === key && amountByAccount.has(a.number))
      .map((a) => ({ account: a.number, name: a.name, amount: amountByAccount.get(a.number)! }));
    const total = lines.reduce((sum, l) => sum + l.amount, 0n);
    return { key, title, lines, total };
  });

  // 3. Subtotals.
  const total = (key: SectionKey) => sections.find((s) => s.key === key)!.total;
  const grossProfit = total("revenue") - total("cogs");
  const operatingIncome = grossProfit - total("operating_expenses");
  const netIncome = operatingIncome + total("other_income");

  return {
    company: ledger.company,
    currency: ledger.currency,
    start,
    end,
    sections,
    grossProfit,
    operatingIncome,
    netIncome,
  };
}

/** JSON shape sent to the browser: every amount as a decimal string like "-44480.14". */
export function toResponse(statement: IncomeStatement) {
  return {
    ...statement,
    sections: statement.sections.map((s) => ({
      ...s,
      lines: s.lines.map((l) => ({ ...l, amount: formatCents(l.amount) })),
      total: formatCents(s.total),
    })),
    grossProfit: formatCents(statement.grossProfit),
    operatingIncome: formatCents(statement.operatingIncome),
    netIncome: formatCents(statement.netIncome),
  };
}
