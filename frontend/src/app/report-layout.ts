// The order of the income statement, top to bottom, as the assignment lists it.
// Each row is either a section from the backend (with its account lines and a total)
// or a subtotal the backend has already computed.
// To add or reorder a row, edit this list. The page needs no other change.

export const REPORT_ROWS = [
  { kind: 'section', label: 'Revenue', key: 'revenue', totalLabel: 'Net revenue' },
  { kind: 'section', label: 'Cost of goods sold', key: 'cogs', totalLabel: 'Total cost of goods sold' },
  { kind: 'subtotal', label: 'Gross profit', key: 'grossProfit' },
  { kind: 'section', label: 'Operating expenses', key: 'operating_expenses', totalLabel: 'Total operating expenses' },
  { kind: 'subtotal', label: 'Operating income', key: 'operatingIncome' },
  { kind: 'section', label: 'Other income', key: 'other_income', totalLabel: 'Total other income' },
  { kind: 'subtotal', label: 'Net income', key: 'netIncome' },
];
