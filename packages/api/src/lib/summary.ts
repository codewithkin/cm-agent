import type { Currency, TransactionType } from "@cm-agent/db";

export type CurrencyTotals = {
  cashInCount: number;
  cashInValue: number;
  cashOutCount: number;
  cashOutValue: number;
  fees: number;
  commission: number;
};

export type TransactionSummary = {
  transactionCount: number;
  USD: CurrencyTotals;
  ZIG: CurrencyTotals;
};

type SummaryTransaction = {
  type: TransactionType;
  currency: Currency;
  amount: number;
  fee: number | null;
  commission: number | null;
};

function emptyTotals(): CurrencyTotals {
  return { cashInCount: 0, cashInValue: 0, cashOutCount: 0, cashOutValue: 0, fees: 0, commission: 0 };
}

export function emptySummary(): TransactionSummary {
  return { transactionCount: 0, USD: emptyTotals(), ZIG: emptyTotals() };
}

/** Counts and values per currency. Pass only transactions that are not voided. */
export function summarizeTransactions(transactions: SummaryTransaction[]): TransactionSummary {
  const summary = emptySummary();
  for (const tx of transactions) {
    const totals = summary[tx.currency];
    summary.transactionCount += 1;
    if (tx.type === "CASH_IN") {
      totals.cashInCount += 1;
      totals.cashInValue += tx.amount;
    } else {
      totals.cashOutCount += 1;
      totals.cashOutValue += tx.amount;
    }
    totals.fees += tx.fee ?? 0;
    totals.commission += tx.commission ?? 0;
  }
  return summary;
}

/** One summary per key, e.g. per helper (servedById) or per day. */
export function summarizeBy<T extends SummaryTransaction>(
  transactions: T[],
  keyOf: (tx: T) => string,
): Map<string, TransactionSummary> {
  const groups = new Map<string, T[]>();
  for (const tx of transactions) {
    const key = keyOf(tx);
    const group = groups.get(key);
    if (group) group.push(tx);
    else groups.set(key, [tx]);
  }
  return new Map([...groups].map(([key, group]) => [key, summarizeTransactions(group)]));
}
