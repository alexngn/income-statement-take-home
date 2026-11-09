// Temporary: a hard-coded Q1 2026 response in the final shape, so the frontend
// can be built before the real calculation exists. Ignores the dates.
export const stubStatement = {
  company: "Northwind Coffee Roasters",
  currency: "USD",
  start: "2026-01-01",
  end: "2026-03-31",
  sections: [
    {
      key: "revenue",
      title: "Revenue",
      lines: [
        { account: "4000", name: "Product Revenue", amount: "35650.75" },
        { account: "4100", name: "Subscription Revenue", amount: "3000.00" },
        { account: "4900", name: "Sales Returns & Discounts", amount: "-800.25" },
      ],
      total: "37850.50",
    },
    {
      key: "cogs",
      title: "Cost of goods sold",
      lines: [{ account: "5000", name: "Cost of Goods Sold", amount: "14272.75" }],
      total: "14272.75",
    },
    {
      key: "operating_expenses",
      title: "Operating expenses",
      lines: [
        { account: "6000", name: "Salaries", amount: "55500.00" },
        { account: "6100", name: "Rent", amount: "9000.00" },
        { account: "6200", name: "Software", amount: "1099.97" },
        { account: "6300", name: "Marketing (legacy)", amount: "2500.10" },
      ],
      total: "68100.07",
    },
    {
      key: "other_income",
      title: "Other income",
      lines: [{ account: "7000", name: "Interest Income", amount: "42.18" }],
      total: "42.18",
    },
  ],
  grossProfit: "23577.75",
  operatingIncome: "-44522.32",
  netIncome: "-44480.14",
};
