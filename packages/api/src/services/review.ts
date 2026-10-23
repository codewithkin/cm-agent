import type { MatchState } from "@cm-agent/db";

import { BALANCE_KEYS, currencyOf, subtractBalances } from "../lib/balances";
import { formatCents } from "../lib/money";
import { countedBalances, expectedSnapshot, RECORDABLE_SMS_STATUSES } from "./shifts";
import type { Db } from "./types";

/** Give helpers time to record an SMS before it lands in the owner's queue. */
const SMS_GRACE_MS = 15 * 60 * 1000;
const LIMIT = 200;

export type ReviewKind = "TRANSACTION" | "SMS" | "SHIFT";

/** The filter tabs on the review screen. */
export type ReviewCategory = "REPORTED" | "NO_SMS" | "NO_MATCH" | "TYPED_IN" | "SMS_NOT_SAVED" | "SHIFT";

export type ReviewItem = {
  kind: ReviewKind;
  category: ReviewCategory;
  id: string;
  at: Date;
  deviceLabel: string;
  reasons: string[];
  /** What the helper wrote, shown in quotes. */
  quote: string | null;
  person: { id: string; name: string } | null;
  money: { type: "CASH_IN" | "CASH_OUT" | null; currency: "USD" | "ZIG" | null; amount: number | null } | null;
  /** For a mismatch: the amount the SMS says. */
  smsAmount: number | null;
};

const MATCH_REASONS: Partial<Record<MatchState, string>> = {
  NO_SMS: "No SMS found for this entry",
  MISMATCH: "SMS details differ from the entry",
  MANUAL: "Saved without an SMS",
};

const BALANCE_LABELS = {
  cashUsd: "USD cash",
  floatUsd: "USD float",
  cashZig: "ZiG cash",
  floatZig: "ZiG float",
} as const;

/** Everything waiting for the owner, newest first. */
export async function loadReviewItems(db: Db): Promise<ReviewItem[]> {
  const [transactions, smsMessages, shifts] = await Promise.all([
    db.transaction.findMany({
      where: {
        voidedAt: null,
        reviewedAt: null,
        OR: [{ matchState: { in: ["NO_SMS", "MISMATCH", "MANUAL"] } }, { flaggedAt: { not: null } }],
      },
      orderBy: { occurredAt: "desc" },
      take: LIMIT,
      select: {
        id: true,
        occurredAt: true,
        matchState: true,
        flagReason: true,
        flaggedAt: true,
        note: true,
        type: true,
        currency: true,
        amount: true,
        device: { select: { label: true } },
        servedBy: { select: { id: true, name: true } },
        sms: { select: { amount: true } },
      },
    }),
    db.smsMessage.findMany({
      where: {
        transactionId: null,
        ignoredAt: null,
        reviewedAt: null,
        parseStatus: { in: [...RECORDABLE_SMS_STATUSES] },
        receivedAt: { lt: new Date(Date.now() - SMS_GRACE_MS) },
      },
      orderBy: { receivedAt: "desc" },
      take: LIMIT,
      select: {
        id: true,
        receivedAt: true,
        type: true,
        currency: true,
        amount: true,
        device: { select: { label: true } },
      },
    }),
    db.shift.findMany({
      where: { status: "CLOSED", reviewedAt: null },
      orderBy: { closedAt: "desc" },
      take: LIMIT,
      include: { device: { select: { label: true } }, openedBy: { select: { id: true, name: true } } },
    }),
  ]);

  const items: ReviewItem[] = [];

  for (const tx of transactions) {
    const reasons: string[] = [];
    if (tx.flaggedAt) reasons.push(`Flagged: ${tx.flagReason ?? "no reason given"}`);
    const matchReason = MATCH_REASONS[tx.matchState];
    if (matchReason) reasons.push(matchReason);
    const category: ReviewCategory = tx.flaggedAt
      ? "REPORTED"
      : tx.matchState === "MISMATCH"
        ? "NO_MATCH"
        : tx.matchState === "NO_SMS"
          ? "NO_SMS"
          : "TYPED_IN";
    items.push({
      kind: "TRANSACTION",
      category,
      id: tx.id,
      at: tx.flaggedAt ?? tx.occurredAt,
      deviceLabel: tx.device.label,
      reasons,
      quote: tx.flagReason ?? tx.note,
      person: tx.servedBy,
      money: { type: tx.type, currency: tx.currency, amount: tx.amount },
      smsAmount: tx.matchState === "MISMATCH" ? (tx.sms?.amount ?? null) : null,
    });
  }

  for (const sms of smsMessages) {
    items.push({
      kind: "SMS",
      category: "SMS_NOT_SAVED",
      id: sms.id,
      at: sms.receivedAt,
      deviceLabel: sms.device.label,
      reasons: ["EcoCash SMS not recorded"],
      quote: null,
      person: null,
      money: { type: sms.type, currency: sms.currency, amount: sms.amount },
      smsAmount: null,
    });
  }

  for (const shift of shifts) {
    const counted = countedBalances(shift);
    const expected = expectedSnapshot(shift);
    const reasons: string[] = [];
    if (counted && expected) {
      const variance = subtractBalances(counted, expected);
      for (const key of BALANCE_KEYS) {
        const gap = variance[key];
        if (gap === 0) continue;
        const amount = formatCents(Math.abs(gap), currencyOf(key));
        reasons.push(`${BALANCE_LABELS[key]} ${gap < 0 ? "short" : "over"} ${amount}`);
      }
    }
    if (shift.closedWithUnrecordedSms > 0) {
      reasons.push(`Closed with ${shift.closedWithUnrecordedSms} unrecorded SMS`);
    }
    if (shift.openingNote) reasons.push(`Opening count differed: ${shift.openingNote}`);
    if (reasons.length === 0) continue;
    items.push({
      kind: "SHIFT",
      category: "SHIFT",
      id: shift.id,
      at: shift.closedAt ?? shift.openedAt,
      deviceLabel: shift.device.label,
      reasons,
      quote: shift.closeNote,
      person: shift.openedBy,
      money: null,
      smsAmount: null,
    });
  }

  return items.sort((a, b) => b.at.getTime() - a.at.getTime());
}
