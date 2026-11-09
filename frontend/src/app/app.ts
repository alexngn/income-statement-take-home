import { Component, inject } from '@angular/core';
import { IncomeStatement, IncomeStatementService } from './income-statement.service';
import { MoneyPipe } from './money.pipe';
import { REPORT_ROWS } from './report-layout';

@Component({
  selector: 'app-root',
  imports: [MoneyPipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  // The template reads the date signals and the statement resource from here.
  protected service = inject(IncomeStatementService);
  protected rows = REPORT_ROWS;

  // A date input changed: update the signal. The resource in the service refetches on its own.
  protected setStart(event: Event) {
    this.service.start.set((event.target as HTMLInputElement).value);
  }

  protected setEnd(event: Event) {
    this.service.end.set((event.target as HTMLInputElement).value);
  }

  // The backend section (title, account lines, total) for a section row.
  protected section(statement: IncomeStatement, key: string) {
    return statement.sections.find((s) => s.key === key)!;
  }

  // A subtotal such as grossProfit, as a decimal string.
  protected subtotal(statement: IncomeStatement, key: string): string {
    return (statement as any)[key];
  }
}
