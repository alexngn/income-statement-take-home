// Turns the service's result (cents) into the JSON the browser gets (decimal strings).

import type { Statement } from "../services/statement.service.ts";
import { formatCents } from "./money.ts";

export interface SectionResponse {
  key: string;
  title: string;
  lines: { account: string; name: string; amount: string }[];
  total: string;
}

/** Subtotals sit at the top level under their layout keys, e.g. "grossProfit": "23577.75". */
export interface StatementResponse {
  company: string;
  currency: string;
  start?: string;
  end: string;
  sections: SectionResponse[];
  [subtotal: string]: string | undefined | SectionResponse[];
}

/** Every amount becomes a decimal string such as "-44480.14". */
export function toResponse({ subtotals, ...statement }: Statement): StatementResponse {
  return {
    ...statement,
    sections: statement.sections.map((s) => ({
      ...s,
      lines: s.lines.map((l) => ({ ...l, amount: formatCents(l.amount) })),
      total: formatCents(s.total),
    })),
    ...Object.fromEntries(Object.entries(subtotals).map(([key, cents]) => [key, formatCents(cents)])),
  };
}
