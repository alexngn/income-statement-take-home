// Data access for the ledger. The rest of the backend asks questions here and never walks
// the raw entries itself. Think of findLines as a SQL query over a view:
//
//   SELECT line.*, entry.id, entry.date, account.*
//   FROM journal_lines line JOIN journal_entries entry JOIN accounts account
//   WHERE entry.status = 'posted' AND entry.date BETWEEN :start AND :end
//
// If the data moves to a database, only this file changes.

import { LEDGER_PATH, loadLedger, type Account, type JournalEntry, type Ledger } from "./ledgerFile.ts";

/** One journal line, already joined with its entry and its account. */
export interface LedgerLine {
  entryId: string;
  date: string; // YYYY-MM-DD
  status: JournalEntry["status"];
  account: Account;
  debit: bigint; // cents
  credit: bigint; // cents
}

export interface LineQuery {
  start: string; // YYYY-MM-DD, included
  end: string; // YYYY-MM-DD, included
  status?: JournalEntry["status"]; // default "posted"
  incomeStatementOnly?: boolean; // default false: true leaves out balance sheet accounts
}

export class LedgerDao {
  readonly #ledger: Ledger;
  readonly #lines: LedgerLine[];

  constructor(ledger: Ledger) {
    this.#ledger = ledger;
    // Join every line with its entry and account once, up front.
    this.#lines = ledger.entries.flatMap((entry) =>
      entry.lines.map((line) => ({
        entryId: entry.id,
        date: entry.date,
        status: entry.status,
        account: ledger.accountsByNumber.get(line.account)!, // the loader guarantees it exists
        debit: line.debit,
        credit: line.credit,
      })),
    );
  }

  /** Reads and checks ledger.json (throws on bad data). */
  static fromFile(path: string = LEDGER_PATH): LedgerDao {
    return new LedgerDao(loadLedger(path));
  }

  getCompany(): { company: string; currency: string } {
    return { company: this.#ledger.company, currency: this.#ledger.currency };
  }

  /** Accounts in chart-of-accounts order. */
  getAccounts({ incomeStatementOnly = false } = {}): Account[] {
    return this.#ledger.accounts.filter((a) => !incomeStatementOnly || a.section !== null);
  }

  /** Journal lines whose entry has the status (default posted) and is dated start..end, both days included. */
  findLines({ start, end, status = "posted", incomeStatementOnly = false }: LineQuery): LedgerLine[] {
    // YYYY-MM-DD strings sort in calendar order, so plain string comparison works.
    return this.#lines.filter(
      (l) =>
        l.status === status &&
        l.date >= start &&
        l.date <= end &&
        (!incomeStatementOnly || l.account.section !== null),
    );
  }
}
