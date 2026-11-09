// The order of the income statement, top to bottom.
// Each row is either a section from the backend (with its account lines)
// or a subtotal the backend has already computed.
// To add or reorder a row, edit this list. The page needs no other change.

export const REPORT_ROWS = [
  { kind: 'section', label: 'Revenue', key: 'revenue' },
  { kind: 'section', label: 'Cost of goods sold', key: 'cogs' },
  { kind: 'subtotal', label: 'Gross profit', key: 'grossProfit' },
  { kind: 'section', label: 'Operating expenses', key: 'operating_expenses' },
  { kind: 'subtotal', label: 'Operating income', key: 'operatingIncome' },
  { kind: 'section', label: 'Other income', key: 'other_income' },
  { kind: 'subtotal', label: 'Net income', key: 'netIncome' },
];
