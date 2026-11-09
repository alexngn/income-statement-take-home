// Money is held as integer cents in a BigInt, so sums are exact.
// Amounts never pass through a JavaScript number (binary float).

const AMOUNT = /^\d+\.\d{2}$/;

/** "12450.75" -> 1245075n. Accepts only non-negative amounts with exactly two decimals. */
export function toCents(amount: string): bigint {
  if (!AMOUNT.test(amount)) {
    throw new Error(`Invalid amount "${amount}": expected a decimal string like "12450.75"`);
  }
  return BigInt(amount.replace(".", ""));
}

/** -4448014n -> "-44480.14" */
export function formatCents(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const abs = cents < 0n ? -cents : cents;
  const fraction = (abs % 100n).toString().padStart(2, "0");
  return `${sign}${abs / 100n}.${fraction}`;
}
