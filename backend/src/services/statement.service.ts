// Builds any statement from its layout and a period: asks the DAO for the data,
// then hands it to the aggregate helpers.

import type { LedgerDao } from "../dao/ledger.dao.ts";
import { buildSection, computeSubtotals, sumByAccount, type StatementSection } from "../helpers/aggregate.ts";
import type { StatementLayout } from "../layouts/layout.ts";

export interface Period {
  start?: string; // YYYY-MM-DD, included. Leave out to include everything up to `end`.
  end: string; // YYYY-MM-DD, included
}

export interface Statement {
  company: string;
  currency: string;
  start?: string;
  end: string;
  sections: StatementSection[];
  subtotals: Record<string, bigint>;
}

export class StatementService {
  readonly #dao: LedgerDao;

  constructor(dao: LedgerDao) {
    this.#dao = dao;
  }

  /**
   * Posted entries in the period only; drafts and voids are left out. Amounts in cents.
   * Every section in the layout is present, even with no activity.
   */
  getStatement(layout: StatementLayout, { start, end }: Period): Statement {
    // 1. Data, from the DAO: each section's accounts, then the lines on those accounts.
    const { company, currency } = this.#dao.getCompany();
    const accountsBySection = layout.sections.map((section) => this.#dao.getAccounts(section.accounts));
    const accountNumbers = accountsBySection.flat().map((a) => a.number);
    if (new Set(accountNumbers).size !== accountNumbers.length) {
      throw new Error("Layout puts an account in more than one section");
    }
    const lines = this.#dao.findLines({ start, end, accountNumbers });

    // 2. Numbers, from the aggregate helpers.
    const amounts = sumByAccount(lines);
    const sections = layout.sections.map((section, i) => buildSection(section, accountsBySection[i], amounts));
    const subtotals = computeSubtotals(layout.subtotals, sections);

    return { company, currency, start, end, sections, subtotals };
  }
}
