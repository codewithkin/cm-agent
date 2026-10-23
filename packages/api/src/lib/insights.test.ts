import { describe, expect, test } from "bun:test";

import { busiest, countByHour, countByWeekday, peakNeeds, percentChange, rankCustomers } from "./insights";

const tx = (overrides: Partial<Parameters<typeof peakNeeds>[0][number]> = {}) => ({
  type: "CASH_OUT" as const,
  currency: "USD" as const,
  amount: 1_000,
  commission: null,
  occurredAt: new Date("2026-10-22T08:00:00Z"),
  customerPhone: "+263771000001",
  customerName: "Tendai",
  ...overrides,
});

describe("busy times", () => {
  test("counts by local hour and weekday", () => {
    const times = [new Date("2026-10-22T08:10:00Z"), new Date("2026-10-22T08:50:00Z"), new Date("2026-10-23T12:00:00Z")];
    const hours = countByHour(times);
    expect(hours[10]).toBe(2);
    expect(hours[14]).toBe(1);
    expect(busiest(hours)).toBe(10);
    const days = countByWeekday(times);
    expect(days[3]).toBe(2);
    expect(days[4]).toBe(1);
  });

  test("no busiest time without transactions", () => {
    expect(busiest(countByHour([]))).toBeNull();
  });
});

describe("peakNeeds", () => {
  test("finds the most cash paid out before cash-ins came back", () => {
    const needs = peakNeeds([
      tx({ amount: 3_000, occurredAt: new Date("2026-10-22T07:00:00Z") }),
      tx({ amount: 2_000, occurredAt: new Date("2026-10-22T08:00:00Z") }),
      tx({ type: "CASH_IN", amount: 4_000, occurredAt: new Date("2026-10-22T09:00:00Z") }),
      tx({ amount: 1_000, occurredAt: new Date("2026-10-23T07:00:00Z") }),
    ]);
    expect(needs.USD.cash).toEqual({ cents: 5_000, date: "2026-10-22" });
    expect(needs.ZIG.cash.cents).toBe(0);
  });

  test("cash-ins use up EcoCash float", () => {
    const needs = peakNeeds([tx({ type: "CASH_IN", currency: "ZIG", amount: 8_000 })]);
    expect(needs.ZIG.float.cents).toBe(8_000);
    expect(needs.ZIG.cash.cents).toBe(0);
  });
});

describe("rankCustomers", () => {
  test("splits new and returning customers and ranks regulars", () => {
    const start = new Date("2026-10-19T22:00:00Z");
    const result = rankCustomers(
      [tx(), tx(), tx({ customerPhone: "+263771000002", customerName: "Rudo", currency: "ZIG" })],
      new Map([
        ["+263771000001", new Date("2026-09-01T08:00:00Z")],
        ["+263771000002", new Date("2026-10-22T08:00:00Z")],
      ]),
      start,
    );
    expect(result.unique).toBe(2);
    expect(result.newCount).toBe(1);
    expect(result.returning).toBe(1);
    expect(result.top[0]).toEqual({ phone: "+263771000001", name: "Tendai", count: 2, usd: 2_000, zig: 0 });
  });
});

describe("percentChange", () => {
  test("rounds to whole percent and skips a zero start", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 100)).toBe(-50);
    expect(percentChange(10, 0)).toBeNull();
  });
});
