import { describe, expect, test } from "bun:test";

import {
  dateKeysInRange,
  dayRange,
  harareHour,
  harareWeekday,
  monthRange,
  periodRange,
  previousRange,
  toDateKey,
  toMonthKey,
} from "./time";

describe("Zimbabwe day boundaries", () => {
  test("a day starts at 22:00 UTC the evening before", () => {
    const { start, end } = dayRange("2026-10-22");
    expect(start.toISOString()).toBe("2026-10-21T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-22T22:00:00.000Z");
  });

  test("late UTC evening already belongs to the next local day", () => {
    expect(toDateKey(new Date("2026-10-21T22:30:00Z"))).toBe("2026-10-22");
    expect(toDateKey(new Date("2026-10-21T21:59:59Z"))).toBe("2026-10-21");
  });

  test("month ranges cover the whole local month", () => {
    const { start, end } = monthRange("2026-12");
    expect(start.toISOString()).toBe("2026-11-30T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-12-31T22:00:00.000Z");
    expect(toMonthKey(new Date("2026-11-30T23:00:00Z"))).toBe("2026-12");
  });

  test("lists every day in a month", () => {
    const keys = dateKeysInRange(monthRange("2026-02"));
    expect(keys).toHaveLength(28);
    expect(keys[0]).toBe("2026-02-01");
    expect(keys.at(-1)).toBe("2026-02-28");
  });
});

describe("report periods", () => {
  test("a period runs from the first local day to the end of the last", () => {
    const range = periodRange("2026-10-19", "2026-10-25");
    expect(range.start.toISOString()).toBe("2026-10-18T22:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-10-25T22:00:00.000Z");
  });

  test("the previous period has the same length and ends where this one starts", () => {
    const previous = previousRange(periodRange("2026-10-19", "2026-10-25"));
    expect(toDateKey(previous.start)).toBe("2026-10-12");
    expect(previous.end.toISOString()).toBe("2026-10-18T22:00:00.000Z");
  });

  test("hours and weekdays use Zimbabwe time", () => {
    const lateFriday = new Date("2026-10-23T21:30:00Z");
    expect(harareHour(lateFriday)).toBe(23);
    expect(harareWeekday(lateFriday)).toBe(4);
    expect(harareWeekday(new Date("2026-10-23T22:30:00Z"))).toBe(5);
  });
});
