import { z } from "zod";

/** Zimbabwe is UTC+2 all year, with no daylight saving. */
const HARARE_OFFSET_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A calendar day in Zimbabwe, e.g. "2026-10-22". */
export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/** A calendar month in Zimbabwe, e.g. "2026-10". */
export const monthKeySchema = z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM");

export type DateRange = { start: Date; end: Date };

export function toDateKey(date: Date): string {
  return new Date(date.getTime() + HARARE_OFFSET_MS).toISOString().slice(0, 10);
}

export function toMonthKey(date: Date): string {
  return toDateKey(date).slice(0, 7);
}

/** Start (inclusive) and end (exclusive) of a Zimbabwe calendar day. */
export function dayRange(dateKey: string): DateRange {
  const [year, month, day] = dateKey.split("-").map(Number);
  const start = new Date(Date.UTC(year!, month! - 1, day!) - HARARE_OFFSET_MS);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** Start (inclusive) and end (exclusive) of a Zimbabwe calendar month. */
export function monthRange(monthKey: string): DateRange {
  const [year, month] = monthKey.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year!, month! - 1, 1) - HARARE_OFFSET_MS),
    end: new Date(Date.UTC(year!, month!, 1) - HARARE_OFFSET_MS),
  };
}

/** Every date key from the start of a range up to (not including) its end. */
export function dateKeysInRange(range: DateRange): string[] {
  const keys: string[] = [];
  for (let t = range.start.getTime(); t < range.end.getTime(); t += DAY_MS) {
    keys.push(toDateKey(new Date(t)));
  }
  return keys;
}

/** From the start of the first day to the end of the last day, both Zimbabwe dates. */
export function periodRange(fromKey: string, toKey: string): DateRange {
  return { start: dayRange(fromKey).start, end: dayRange(toKey).end };
}

/** The same number of days straight before a range, for "compared with last time". */
export function previousRange(range: DateRange): DateRange {
  const length = range.end.getTime() - range.start.getTime();
  return { start: new Date(range.start.getTime() - length), end: range.start };
}

/** Hour of the day in Zimbabwe, 0 to 23. */
export function harareHour(date: Date): number {
  return new Date(date.getTime() + HARARE_OFFSET_MS).getUTCHours();
}

/** Day of the week in Zimbabwe: 0 is Monday, 6 is Sunday. */
export function harareWeekday(date: Date): number {
  return (new Date(date.getTime() + HARARE_OFFSET_MS).getUTCDay() + 6) % 7;
}
