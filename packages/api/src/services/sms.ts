import { z } from "zod";

import { sha256 } from "../lib/crypto";
import { findTransactionForSms } from "../lib/matching";
import { parseSms } from "../lib/sms-parser";
import { getSettings } from "./settings";
import type { Db } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export const ingestSmsInput = z.object({
  /** Set by the phone when the SMS was read offline. */
  id: z.uuid().optional(),
  sender: z.string().trim().min(1).max(40),
  body: z.string().min(1).max(2_000),
  receivedAt: z.coerce.date(),
});

/**
 * Stores an EcoCash SMS read on a booth phone and links it to an entry typed
 * before the SMS arrived. SMS from other senders are dropped, not stored.
 */
export async function ingestSms(db: Db, deviceId: string, input: z.infer<typeof ingestSmsInput>) {
  const settings = await getSettings(db);
  const sender = input.sender.toLowerCase();
  if (!settings.smsSenders.some((allowed) => allowed.toLowerCase() === sender)) {
    return { status: "ignored" as const, sms: null, matchedTransactionId: null };
  }

  const bodyHash = sha256(`${input.sender}|${input.body}`);
  const existing = await db.smsMessage.findUnique({ where: { bodyHash } });
  if (existing) {
    return { status: "duplicate" as const, sms: existing, matchedTransactionId: existing.transactionId };
  }

  const parsed = parseSms(input.body);
  let sms = await db.smsMessage.create({
    data: {
      id: input.id,
      deviceId,
      sender: input.sender,
      body: input.body,
      bodyHash,
      receivedAt: input.receivedAt,
      parseStatus: parsed.status,
      type: parsed.type,
      currency: parsed.currency,
      amount: parsed.amount,
      counterpartyPhone: parsed.counterpartyPhone,
      counterpartyName: parsed.counterpartyName,
      reference: parsed.reference,
      balanceAfter: parsed.balanceAfter,
    },
  });

  if (!parsed.type) {
    return { status: "created" as const, sms, matchedTransactionId: null };
  }

  const candidates = await db.transaction.findMany({
    where: {
      deviceId,
      voidedAt: null,
      sms: { is: null },
      occurredAt: {
        gte: new Date(input.receivedAt.getTime() - DAY_MS),
        lte: new Date(input.receivedAt.getTime() + DAY_MS),
      },
    },
    select: {
      id: true,
      type: true,
      currency: true,
      amount: true,
      customerPhone: true,
      reference: true,
      occurredAt: true,
    },
  });
  const match = findTransactionForSms(sms, candidates);
  if (!match) {
    return { status: "created" as const, sms, matchedTransactionId: null };
  }

  sms = await db.smsMessage.update({
    where: { id: sms.id },
    data: { transactionId: match.item.id },
  });
  // An entry typed without a reference takes the one from its SMS, unless another entry already has it.
  const takeReference =
    !match.item.reference &&
    parsed.reference !== null &&
    !(await db.transaction.findUnique({ where: { reference: parsed.reference }, select: { id: true } }));
  await db.transaction.update({
    where: { id: match.item.id },
    data: { matchState: match.state, ...(takeReference ? { reference: parsed.reference } : {}) },
  });
  return { status: "created" as const, sms, matchedTransactionId: match.item.id };
}
