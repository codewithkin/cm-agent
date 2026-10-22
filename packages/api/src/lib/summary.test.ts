import { describe, expect, test } from "bun:test";

import { summarizeBy, summarizeTransactions } from "./summary";

const transactions = [
  { type: "CASH_IN" as const, currency: "USD" as const, amount: 2_000, fee: null, commission: 10, servedById: "a" },
  { type: "CASH_OUT" as const, currency: "USD" as const, amount: 5_000, fee: 85, commission: 20, servedById: "b" },
  { type: "CASH_OUT" as const, currency: "ZIG" as const, amount: 1_000, fee: null, commission: null, servedById: "a" },
];

describe("summarizeTransactions", () => {
  test("totals counts and values per currency", () => {
    const summary = summarizeTransactions(transactions);
    expect(summary.transactionCount).toBe(3);
    expect(summary.USD).toEqual({
      cashInCount: 1,
      cashInValue: 2_000,
      cashOutCount: 1,
      cashOutValue: 5_000,
      fees: 85,
      commission: 30,
    });
    expect(summary.ZIG.cashOutValue).toBe(1_000);
  });

  test("groups by any key", () => {
    const byHelper = summarizeBy(transactions, (tx) => tx.servedById);
    expect(byHelper.get("a")?.transactionCount).toBe(2);
    expect(byHelper.get("b")?.USD.cashOutValue).toBe(5_000);
  });
});
