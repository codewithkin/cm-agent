import { describe, expect, test } from "bun:test";

import { dateKeysInRange, dayRange, monthRange, toDateKey, toMonthKey } from "./time";

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
