import { isValidDate } from "./dates.ts";

export type DateRange = { start: string; end: string };

/** Checks request input. Returns the range, or the message for a 400. */
export function parseDateRange(start: unknown, end: unknown): DateRange | { error: string } {
  if (!isValidDate(start) || !isValidDate(end)) {
    return { error: "start and end are required, as real dates in YYYY-MM-DD form" };
  }
  if (start > end) {
    return { error: "start must be on or before end" };
  }
  return { start, end };
}
