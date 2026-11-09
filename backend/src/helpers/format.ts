// Turns the service's result (cents) into the JSON the browser gets (decimal strings).

import type { IncomeStatement } from "../services/incomeStatement.service.ts";
import { formatCents } from "./money.ts";

/** Every amount becomes a decimal string such as "-44480.14". */
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
