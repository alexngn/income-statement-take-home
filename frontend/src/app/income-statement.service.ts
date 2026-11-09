import { httpResource } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';

// Response of GET /income-statement. Every amount is a decimal string such as "-44480.14",
// so money never becomes a JavaScript float.
export interface StatementLine {
  account: string;
  name: string;
  amount: string;
}

export interface StatementSection {
  key: string;
  title: string;
  lines: StatementLine[];
  total: string;
}

export interface IncomeStatement {
  company: string;
  currency: string;
  start: string;
  end: string;
  sections: StatementSection[];
  grossProfit: string;
  operatingIncome: string;
  netIncome: string;
}

// Holds the date range and the statement for it.
// Changing `start` or `end` makes `statement` fetch again; a request still in flight is cancelled.
// In development, proxy.conf.json forwards /income-statement to the backend on http://localhost:3000.
@Injectable({ providedIn: 'root' })
export class IncomeStatementService {
  // YYYY-MM-DD strings, both days included. Defaults to Q1 2026.
  readonly start = signal('2026-01-01');
  readonly end = signal('2026-03-31');

  readonly statement = httpResource<IncomeStatement>(() => {
    const start = this.start();
    const end = this.end();
    // A cleared date input gives ''. Returning undefined means: make no request.
    if (!start || !end) {
      return undefined;
    }
    return { url: '/income-statement', params: { start, end } };
  });

  // The backend's message for a 400, or a hint when the backend is not running.
  errorMessage(error: any): string {
    if (error && error.error && error.error.error) {
      return error.error.error;
    }
    return 'Could not reach the backend. Is it running on port 3000?';
  }
}
