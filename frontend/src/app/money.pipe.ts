import { Pipe, PipeTransform } from '@angular/core';

// "-44480.14" -> "(44,480.14)", "35650.75" -> "35,650.75".
// Works on the string only, so the amount is never turned into a float.
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(amount: string | undefined): string {
    if (amount === undefined || amount === null) {
      return '';
    }
    const negative = amount.startsWith('-');
    const [whole, cents] = amount.replace('-', '').split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const text = `${grouped}.${cents}`;
    if (negative) {
      return `(${text})`;
    }
    return text;
  }
}
