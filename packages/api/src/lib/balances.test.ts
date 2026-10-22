import { describe, expect, test } from "bun:test";

import {
  expectedBalances,
  lowBalances,
  outOfTolerance,
  subtractBalances,
  ZERO_BALANCES,
  type Balances,
} from "./balances";

const opening: Balances = { cashUsd: 50_000, floatUsd: 30_000, cashZig: 10_000, floatZig: 20_000 };

describe("expectedBalances", () => {
  test("cash-in adds cash and spends float; cash-out does the opposite", () => {
    const result = expectedBalances(
      opening,
      [
        { type: "CASH_IN", currency: "USD", amount: 2_000, commission: null, voidedAt: null },
        { type: "CASH_OUT", currency: "USD", amount: 5_000, commission: null, voidedAt: null },
        { type: "CASH_OUT", currency: "ZIG", amount: 1_000, commission: 15, voidedAt: null },
      ],
      [],
    );
    expect(result).toEqual({ cashUsd: 47_000, floatUsd: 33_000, cashZig: 9_000, floatZig: 21_015 });
  });

  test("voided entries are ignored", () => {
    const result = expectedBalances(
      opening,
      [{ type: "CASH_OUT", currency: "USD", amount: 5_000, commission: null, voidedAt: new Date() }],
      [{ kind: "CASH_REMOVED", currency: "USD", amount: 1_000, voidedAt: new Date() }],
    );
    expect(result).toEqual(opening);
  });

  test("movements shift cash and float the right way", () => {
    const result = expectedBalances(
      opening,
      [],
      [
        { kind: "FLOAT_BOUGHT", currency: "USD", amount: 10_000, voidedAt: null },
        { kind: "CASH_ADDED", currency: "ZIG", amount: 500, voidedAt: null },
        { kind: "FLOAT_REMOVED", currency: "ZIG", amount: 300, voidedAt: null },
      ],
    );
    expect(result).toEqual({ cashUsd: 40_000, floatUsd: 40_000, cashZig: 10_500, floatZig: 19_700 });
  });
});

describe("variance checks", () => {
  test("flags balances outside tolerance", () => {
    const variance = subtractBalances(
      { cashUsd: 49_500, floatUsd: 30_000, cashZig: 10_050, floatZig: 20_000 },
      opening,
    );
    expect(variance.cashUsd).toBe(-500);
    expect(outOfTolerance(variance, { toleranceUsd: 0, toleranceZig: 100 })).toEqual(["cashUsd"]);
  });

  test("warns about low balances, skipping levels set to 0", () => {
    expect(
      lowBalances(ZERO_BALANCES, { lowCashUsd: 5_000, lowFloatUsd: 0, lowCashZig: 0, lowFloatZig: 100 }),
    ).toEqual(["cashUsd", "floatZig"]);
  });
});
