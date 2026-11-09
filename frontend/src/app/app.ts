import { CurrencyPipe, LowerCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IncomeStatementService } from './income-statement.service';
import { REPORT_ROWS } from './report-layout';

@Component({
  selector: 'app-root',
  imports: [FormsModule, CurrencyPipe, LowerCasePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private service = inject(IncomeStatementService);

  rows = REPORT_ROWS;

  // The date range the user picks. Defaults to the first quarter of 2026.
  start = '2026-01-01';
  end = '2026-03-31';

  statement = signal<any>(null);
  error = signal('');

  constructor() {
    this.load();
  }

  load() {
    this.error.set('');
    this.service.load(this.start, this.end).subscribe({
      next: (statement) => this.statement.set(statement),
      error: (response) => {
        this.statement.set(null);
        this.error.set(this.messageFrom(response));
      },
    });
  }

  // The backend section (title, account lines, total) for a section row.
  section(key: string) {
    return this.statement().sections.find((s: any) => s.key === key);
  }

  // A subtotal such as grossProfit, as a decimal string.
  subtotal(key: string) {
    return this.statement()[key];
  }

  private messageFrom(response: any) {
    if (response.error && response.error.error) {
      return response.error.error;
    }
    return 'Could not reach the backend. Is it running on port 3000?';
  }
}
