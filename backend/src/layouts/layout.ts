// A statement is described by a layout: data, not code. The service builds any layout
// the same way, so a new statement is a new layout object plus a route that passes it in.

import type { AccountSelector } from "../dao/ledger.dao.ts";

export interface SectionLayout {
  key: string;
  title: string;
  accounts: AccountSelector; // which accounts are listed in this section
}

/** A subtotal adds and subtracts section totals or earlier subtotals, by key. */
export interface SubtotalLayout {
  key: string;
  plus: string[];
  minus: string[];
}

export interface StatementLayout {
  sections: SectionLayout[]; // in display order
  subtotals: SubtotalLayout[]; // in calculation order; each may use the ones before it
}
