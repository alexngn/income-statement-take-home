import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

// Talks to the backend. In development, proxy.conf.json forwards
// /income-statement to the backend on http://localhost:3000.
@Injectable({ providedIn: 'root' })
export class IncomeStatementService {
  private http = inject(HttpClient);

  // Dates are YYYY-MM-DD strings; both days are included.
  load(start: string, end: string) {
    return this.http.get<any>('/income-statement', { params: { start, end } });
  }
}
