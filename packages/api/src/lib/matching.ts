import type { Currency, TransactionType } from "@cm-agent/db";

/** Entries and SMS this far apart in time can still match without a shared reference. */
export const MATCH_WINDOW_MS = 10 * 60 * 1000;

export type MatchableTransaction = {
  id: string;
  type: TransactionType;
  currency: Currency;
  amount: number;
  customerPhone: string;
  reference: string | null;
  occurredAt: Date;
};

export type MatchableSms = {
  id: string;
  type: TransactionType | null;
  currency: Currency | null;
  amount: number | null;
  counterpartyPhone: string | null;
  reference: string | null;
  receivedAt: Date;
};

export type PairState = "MATCHED" | "MISMATCH";

function sameReference(a: string | null, b: string | null): boolean {
  return !!a && !!b && a.trim().toUpperCase() === b.trim().toUpperCase();
}

function detailsAgree(tx: MatchableTransaction, sms: MatchableSms): boolean {
  return (
    sms.type === tx.type &&
    sms.currency === tx.currency &&
    sms.amount === tx.amount &&
    (!sms.counterpartyPhone || sms.counterpartyPhone === tx.customerPhone)
  );
}

/**
 * Does this SMS belong to this entry?
 * - Same reference: MATCHED if the details agree, otherwise MISMATCH.
 * - Different references: not the same transaction.
 * - No shared reference: MATCHED only if the details agree within the time window.
 */
export function matchPair(tx: MatchableTransaction, sms: MatchableSms): PairState | null {
  if (sameReference(tx.reference, sms.reference)) {
    return detailsAgree(tx, sms) ? "MATCHED" : "MISMATCH";
  }
  if (tx.reference && sms.reference) return null;
  const apart = Math.abs(tx.occurredAt.getTime() - sms.receivedAt.getTime());
  return apart <= MATCH_WINDOW_MS && detailsAgree(tx, sms) ? "MATCHED" : null;
}

type Candidate<T> = { item: T; state: PairState; byReference: boolean; apart: number };

function best<T>(candidates: Candidate<T>[]): { item: T; state: PairState } | null {
  candidates.sort(
    (a, b) => Number(b.byReference) - Number(a.byReference) || a.apart - b.apart,
  );
  const winner = candidates[0];
  return winner ? { item: winner.item, state: winner.state } : null;
}

/** The SMS that best fits an entry: a reference match first, then the closest in time. */
export function findSmsForTransaction<S extends MatchableSms>(
  tx: MatchableTransaction,
  smsList: S[],
): { item: S; state: PairState } | null {
  const candidates: Candidate<S>[] = [];
  for (const sms of smsList) {
    const state = matchPair(tx, sms);
    if (!state) continue;
    candidates.push({
      item: sms,
      state,
      byReference: sameReference(tx.reference, sms.reference),
      apart: Math.abs(tx.occurredAt.getTime() - sms.receivedAt.getTime()),
    });
  }
  return best(candidates);
}

/** The entry that best fits an SMS, for SMS that arrive after the entry was typed. */
export function findTransactionForSms<T extends MatchableTransaction>(
  sms: MatchableSms,
  transactions: T[],
): { item: T; state: PairState } | null {
  const candidates: Candidate<T>[] = [];
  for (const tx of transactions) {
    const state = matchPair(tx, sms);
    if (!state) continue;
    candidates.push({
      item: tx,
      state,
      byReference: sameReference(tx.reference, sms.reference),
      apart: Math.abs(tx.occurredAt.getTime() - sms.receivedAt.getTime()),
    });
  }
  return best(candidates);
}
