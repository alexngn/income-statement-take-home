// The income statement, as the assignment defines it. Accounts are placed by subtype;
// any account no section selects (cash, payables, equity, ...) is simply not on it.

import type { StatementLayout } from "./layout.ts";

export const INCOME_STATEMENT: StatementLayout = {
  sections: [
    { key: "revenue", title: "Revenue", accounts: { subtypes: ["operating_revenue", "contra_revenue"] } },
    { key: "cogs", title: "Cost of goods sold", accounts: { subtypes: ["cogs"] } },
    { key: "operating_expenses", title: "Operating expenses", accounts: { subtypes: ["operating_expense"] } },
    { key: "other_income", title: "Other income", accounts: { subtypes: ["other_income"] } },
  ],
  subtotals: [
    { key: "grossProfit", plus: ["revenue"], minus: ["cogs"] },
    { key: "operatingIncome", plus: ["grossProfit"], minus: ["operating_expenses"] },
    { key: "netIncome", plus: ["operatingIncome", "other_income"], minus: [] },
  ],
};
