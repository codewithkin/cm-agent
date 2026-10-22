import type { MatchState } from "@cm-agent/db";

import { BALANCE_KEYS, currencyOf, subtractBalances } from "../lib/balances";
import { formatCents } from "../lib/money";
import { countedBalances, expectedSnapshot, RECORDABLE_SMS_STATUSES } from "./shifts";
import type { Db } from "./types";

/** Give helpers time to record an SMS before it lands in the owner's queue. */
const SMS_GRACE_MS = 15 * 60 * 1000;
const LIMIT = 200;

export type ReviewKind = "TRANSACTION" | "SMS" | "SHIFT";

export type ReviewItem = {
  kind: ReviewKind;
  id: string;
  at: Date;
  deviceLabel: string;
  reasons: string[];
};

const MATCH_REASONS: Partial<Record<MatchState, string>> = {
  NO_SMS: "No SMS found for this entry",
  MISMATCH: "SMS details differ from the entry",
  MANUAL: "Recorded without an SMS",
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
        device: { select: { label: true } },
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
      select: { id: true, receivedAt: true, device: { select: { label: true } } },
    }),
    db.shift.findMany({
      where: { status: "CLOSED", reviewedAt: null },
      orderBy: { closedAt: "desc" },
      take: LIMIT,
      include: { device: { select: { label: true } } },
    }),
  ]);

  const items: ReviewItem[] = [];

  for (const tx of transactions) {
    const reasons: string[] = [];
    if (tx.flaggedAt) reasons.push(`Flagged: ${tx.flagReason ?? "no reason given"}`);
    const matchReason = MATCH_REASONS[tx.matchState];
    if (matchReason) reasons.push(matchReason);
    items.push({ kind: "TRANSACTION", id: tx.id, at: tx.occurredAt, deviceLabel: tx.device.label, reasons });
  }

  for (const sms of smsMessages) {
    items.push({
      kind: "SMS",
      id: sms.id,
      at: sms.receivedAt,
      deviceLabel: sms.device.label,
      reasons: ["EcoCash SMS not recorded"],
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
      id: shift.id,
      at: shift.closedAt ?? shift.openedAt,
      deviceLabel: shift.device.label,
      reasons,
    });
  }

  return items.sort((a, b) => b.at.getTime() - a.at.getTime());
}
