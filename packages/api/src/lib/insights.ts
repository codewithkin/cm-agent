import type { Currency, TransactionType } from "@cm-agent/db";

import { transactionEffect } from "./balances";
import { harareHour, harareWeekday, toDateKey } from "./time";

type InsightTransaction = {
  type: TransactionType;
  currency: Currency;
  amount: number;
  commission: number | null;
  occurredAt: Date;
  customerPhone: string;
  customerName: string;
};

/** How many transactions happened in each hour of the day, 0 to 23. */
export function countByHour(times: Date[]): number[] {
  const counts = Array.from({ length: 24 }, () => 0);
  for (const time of times) counts[harareHour(time)]! += 1;
  return counts;
}

/** How many transactions happened on each day of the week, Monday first. */
export function countByWeekday(times: Date[]): number[] {
  const counts = Array.from({ length: 7 }, () => 0);
  for (const time of times) counts[harareWeekday(time)]! += 1;
  return counts;
}

/** Index of the largest count, or null when every count is 0. */
export function busiest(counts: number[]): number | null {
  let best: number | null = null;
  counts.forEach((count, index) => {
    if (count > 0 && (best === null || count > counts[best]!)) best = index;
  });
  return best;
}

export type PeakNeed = { cents: number; date: string | null };

/**
 * "How much cash and EcoCash should I start the day with?"
 * For each day, money is followed from the first transaction on; the deepest the
 * cash (or float) went below where it started is what that day needed. Returns the
 * biggest need across the days, per currency.
 */
export function peakNeeds(transactions: InsightTransaction[]): Record<Currency, { cash: PeakNeed; float: PeakNeed }> {
  const result: Record<Currency, { cash: PeakNeed; float: PeakNeed }> = {
    USD: { cash: { cents: 0, date: null }, float: { cents: 0, date: null } },
    ZIG: { cash: { cents: 0, date: null }, float: { cents: 0, date: null } },
  };
  const sorted = [...transactions].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const running = new Map<string, { cash: number; float: number }>();
  for (const tx of sorted) {
    const date = toDateKey(tx.occurredAt);
    const key = `${date}:${tx.currency}`;
    const now = running.get(key) ?? { cash: 0, float: 0 };
    const effect = transactionEffect({ ...tx, voidedAt: null });
    now.cash += effect.cash;
    now.float += effect.float;
    running.set(key, now);
    const peak = result[tx.currency];
    if (-now.cash > peak.cash.cents) peak.cash = { cents: -now.cash, date };
    if (-now.float > peak.float.cents) peak.float = { cents: -now.float, date };
  }
  return result;
}

export type CustomerRank = { phone: string; name: string; count: number; usd: number; zig: number };

/**
 * "Who are my customers?": how many people came, how many were new, and the
 * regulars. `firstSeen` is each customer's first ever transaction.
 */
export function rankCustomers(
  transactions: InsightTransaction[],
  firstSeen: Map<string, Date>,
  periodStart: Date,
  top = 5,
): { unique: number; newCount: number; returning: number; top: CustomerRank[] } {
  const customers = new Map<string, CustomerRank>();
  for (const tx of transactions) {
    const entry = customers.get(tx.customerPhone) ?? {
      phone: tx.customerPhone,
      name: tx.customerName,
      count: 0,
      usd: 0,
      zig: 0,
    };
    entry.count += 1;
    if (tx.currency === "USD") entry.usd += tx.amount;
    else entry.zig += tx.amount;
    customers.set(tx.customerPhone, entry);
  }
  const newCount = [...customers.keys()].filter((phone) => {
    const first = firstSeen.get(phone);
    return !first || first >= periodStart;
  }).length;
  return {
    unique: customers.size,
    newCount,
    returning: customers.size - newCount,
    top: [...customers.values()].sort((a, b) => b.count - a.count || b.usd - a.usd).slice(0, top),
  };
}

/** Change from `before` to `now` in whole percent, or null when there is nothing to compare with. */
export function percentChange(now: number, before: number): number | null {
  if (before === 0) return null;
  return Math.round(((now - before) / Math.abs(before)) * 100);
}
