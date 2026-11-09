// Builds the income statement: asks the DAO for the data, hands it to the aggregate helpers.

import type { LedgerDao } from "../dao/ledger.dao.ts";
import {
  computeSubtotals,
  groupIntoSections,
  sumByAccount,
  type StatementSection,
  type Subtotals,
} from "../helpers/aggregate.ts";

export interface IncomeStatement extends Subtotals {
  company: string;
  currency: string;
  start: string;
  end: string;
  sections: StatementSection[];
}

export class IncomeStatementService {
  readonly #dao: LedgerDao;

  constructor(dao: LedgerDao) {
    this.#dao = dao;
  }

  /**
   * Posted entries dated start..end, both days included. Amounts in cents.
   * Drafts and voids are left out. Every section is present, even with no activity.
   */
  getIncomeStatement(start: string, end: string): IncomeStatement {
    // 1. Data, from the DAO.
    const { company, currency } = this.#dao.getCompany();
    const accounts = this.#dao.getAccounts({ incomeStatementOnly: true });
    const lines = this.#dao.findLines({ start, end, incomeStatementOnly: true });

    // 2. Numbers, from the aggregate helpers.
    const amounts = sumByAccount(lines);
    const sections = groupIntoSections(accounts, amounts);
    const subtotals = computeSubtotals(sections);

    return { company, currency, start, end, sections, ...subtotals };
  }
}
