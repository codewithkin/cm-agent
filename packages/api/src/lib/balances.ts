import type { Currency, MovementKind, TransactionType } from "@cm-agent/db";
import { z } from "zod";

import { centsSchema } from "./money";

/** The four numbers the booth tracks, in cents. */
export type Balances = {
  cashUsd: number;
  floatUsd: number;
  cashZig: number;
  floatZig: number;
};

export type BalanceKey = keyof Balances;

export const BALANCE_KEYS: BalanceKey[] = ["cashUsd", "floatUsd", "cashZig", "floatZig"];

export const ZERO_BALANCES: Balances = { cashUsd: 0, floatUsd: 0, cashZig: 0, floatZig: 0 };

export const balancesSchema = z.object({
  cashUsd: centsSchema,
  floatUsd: centsSchema,
  cashZig: centsSchema,
  floatZig: centsSchema,
});

export function cashKey(currency: Currency): BalanceKey {
  return currency === "USD" ? "cashUsd" : "cashZig";
}

export function floatKey(currency: Currency): BalanceKey {
  return currency === "USD" ? "floatUsd" : "floatZig";
}

export function currencyOf(key: BalanceKey): Currency {
  return key.endsWith("Usd") ? "USD" : "ZIG";
}

type TransactionLike = {
  type: TransactionType;
  currency: Currency;
  amount: number;
  commission: number | null;
  /** Only checked for being set; the phone stores it as an ISO string. */
  voidedAt: Date | string | null;
};

type MovementLike = {
  kind: MovementKind;
  currency: Currency;
  amount: number;
  voidedAt: Date | string | null;
};

/**
 * Cash-in: notes come in, float goes out to the customer's wallet.
 * Cash-out: notes go out, float comes in from the customer's wallet.
 * Commission, when recorded, is counted into the float (per the feature spec).
 */
export function transactionEffect(tx: TransactionLike): { cash: number; float: number } {
  const commission = tx.commission ?? 0;
  return tx.type === "CASH_IN"
    ? { cash: tx.amount, float: -tx.amount + commission }
    : { cash: -tx.amount, float: tx.amount + commission };
}

/** Direction each movement moves cash and float. */
export const MOVEMENT_EFFECT: Record<MovementKind, { cash: -1 | 0 | 1; float: -1 | 0 | 1 }> = {
  FLOAT_BOUGHT: { cash: -1, float: 1 },
  CASH_DEPOSITED: { cash: -1, float: 0 },
  CASH_ADDED: { cash: 1, float: 0 },
  CASH_REMOVED: { cash: -1, float: 0 },
  FLOAT_ADDED: { cash: 0, float: 1 },
  FLOAT_REMOVED: { cash: 0, float: -1 },
};

/** What should be in the drawer and the float, given the opening count and everything since. */
export function expectedBalances(
  opening: Balances,
  transactions: TransactionLike[],
  movements: MovementLike[],
): Balances {
  const result = { ...opening };
  for (const tx of transactions) {
    if (tx.voidedAt) continue;
    const effect = transactionEffect(tx);
    result[cashKey(tx.currency)] += effect.cash;
    result[floatKey(tx.currency)] += effect.float;
  }
  for (const movement of movements) {
    if (movement.voidedAt) continue;
    const effect = MOVEMENT_EFFECT[movement.kind];
    result[cashKey(movement.currency)] += effect.cash * movement.amount;
    result[floatKey(movement.currency)] += effect.float * movement.amount;
  }
  return result;
}

export function addBalances(a: Balances, b: Balances): Balances {
  return {
    cashUsd: a.cashUsd + b.cashUsd,
    floatUsd: a.floatUsd + b.floatUsd,
    cashZig: a.cashZig + b.cashZig,
    floatZig: a.floatZig + b.floatZig,
  };
}

/** a − b; with (counted, expected) this is the variance: negative = short, positive = over. */
export function subtractBalances(a: Balances, b: Balances): Balances {
  return {
    cashUsd: a.cashUsd - b.cashUsd,
    floatUsd: a.floatUsd - b.floatUsd,
    cashZig: a.cashZig - b.cashZig,
    floatZig: a.floatZig - b.floatZig,
  };
}

/** Balances whose variance is bigger than the owner's tolerance for that currency. */
export function outOfTolerance(
  variance: Balances,
  tolerance: { toleranceUsd: number; toleranceZig: number },
): BalanceKey[] {
  return BALANCE_KEYS.filter((key) => {
    const allowed = currencyOf(key) === "USD" ? tolerance.toleranceUsd : tolerance.toleranceZig;
    return Math.abs(variance[key]) > allowed;
  });
}

/** Balances below the owner's warning levels. A level of 0 turns the warning off. */
export function lowBalances(
  balances: Balances,
  levels: { lowCashUsd: number; lowFloatUsd: number; lowCashZig: number; lowFloatZig: number },
): BalanceKey[] {
  const limits: Balances = {
    cashUsd: levels.lowCashUsd,
    floatUsd: levels.lowFloatUsd,
    cashZig: levels.lowCashZig,
    floatZig: levels.lowFloatZig,
  };
  return BALANCE_KEYS.filter((key) => limits[key] > 0 && balances[key] < limits[key]);
}
