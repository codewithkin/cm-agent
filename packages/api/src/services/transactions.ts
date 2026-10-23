import type { MatchState } from "@cm-agent/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { recordAudit } from "../lib/audit";
import { currencySchema, transactionTypeSchema } from "../lib/enums";
import { findSmsForTransaction, matchPair, type MatchableSms } from "../lib/matching";
import { centsSchema, positiveCentsSchema } from "../lib/money";
import { phoneSchema } from "../lib/phone";
import { upsertCustomer } from "./customers";
import { findOpenShift } from "./shifts";
import type { Actor, Db } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Signature images are PNG data URLs; ~500 KB is plenty for a signature pad. */
const MAX_SIGNATURE_LENGTH = 500_000;
const MAX_ID_PHOTO_LENGTH = 2_000_000;

export const createTransactionInput = z.object({
  /** Set by the phone when the entry was recorded offline. */
  id: z.uuid().optional(),
  type: transactionTypeSchema,
  currency: currencySchema,
  amount: positiveCentsSchema,
  fee: centsSchema.optional(),
  commission: centsSchema.optional(),
  customerPhone: phoneSchema,
  customerName: z.string().trim().min(1).max(80),
  customerIdNumber: z.string().trim().min(3).max(40),
  reference: z.string().trim().min(3).max(60).optional(),
  signature: z.string().min(1).max(MAX_SIGNATURE_LENGTH),
  idPhoto: z.string().max(MAX_ID_PHOTO_LENGTH).optional(),
  /** The SMS the entry was filled from, when it came from the incoming-SMS sheet. */
  smsId: z.uuid().optional(),
  /** "Save without SMS": saves as MANUAL instead of NO_SMS. */
  manual: z.boolean().default(false),
  /** Why it was saved without an SMS, shown to Coline in the review queue. */
  note: z.string().trim().min(1).max(300).optional(),
  occurredAt: z.coerce.date().optional(),
});

async function assertReferenceFree(db: Db, reference: string) {
  const existing = await db.transaction.findUnique({ where: { reference }, select: { id: true } });
  if (existing) {
    throw new TRPCError({ code: "CONFLICT", message: `Reference ${reference} is already recorded` });
  }
}

/**
 * Records one logbook entry on the actor's open shift, remembers the customer,
 * and links the matching EcoCash SMS if there is one.
 */
export async function createTransaction(
  db: Db,
  actor: Actor,
  input: z.infer<typeof createTransactionInput>,
) {
  const shift = await findOpenShift(db, actor.deviceId);
  if (!shift) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Open a shift before recording transactions" });
  }

  const occurredAt = input.occurredAt ?? new Date();
  const entry = {
    type: input.type,
    currency: input.currency,
    amount: input.amount,
    customerPhone: input.customerPhone,
    reference: input.reference ?? null,
    occurredAt,
  };

  let sms: MatchableSms | null = null;
  let matchState: MatchState;
  if (input.smsId) {
    const chosen = await db.smsMessage.findUnique({ where: { id: input.smsId } });
    if (!chosen) throw new TRPCError({ code: "NOT_FOUND", message: "SMS not found" });
    if (chosen.transactionId) {
      throw new TRPCError({ code: "CONFLICT", message: "That SMS is already linked to another entry" });
    }
    sms = chosen;
    matchState = matchPair({ id: "", ...entry }, chosen) ?? "MISMATCH";
  } else {
    const candidates = await db.smsMessage.findMany({
      where: {
        deviceId: actor.deviceId,
        transactionId: null,
        ignoredAt: null,
        receivedAt: {
          gte: new Date(occurredAt.getTime() - DAY_MS),
          lte: new Date(occurredAt.getTime() + DAY_MS),
        },
      },
    });
    const found = findSmsForTransaction({ id: "", ...entry }, candidates);
    sms = found?.item ?? null;
    matchState = found?.state ?? (input.manual ? "MANUAL" : "NO_SMS");
  }

  const reference = input.reference ?? sms?.reference ?? null;
  if (reference) await assertReferenceFree(db, reference);

  const customer = await upsertCustomer(db, {
    phone: input.customerPhone,
    name: input.customerName,
    idNumber: input.customerIdNumber,
  });

  const transaction = await db.transaction.create({
    data: {
      id: input.id,
      type: input.type,
      currency: input.currency,
      amount: input.amount,
      fee: input.fee ?? null,
      commission: input.commission ?? null,
      customerId: customer.id,
      customerPhone: input.customerPhone,
      customerName: input.customerName,
      customerIdNumber: input.customerIdNumber,
      reference,
      signature: input.signature,
      idPhoto: input.idPhoto ?? null,
      shiftId: shift.id,
      deviceId: actor.deviceId,
      servedById: actor.userId,
      occurredAt,
      matchState,
      note: input.note ?? null,
    },
    omit: { signature: true, idPhoto: true },
  });
  if (sms) {
    await db.smsMessage.update({ where: { id: sms.id }, data: { transactionId: transaction.id } });
  }
  await recordAudit(db, {
    actorId: actor.userId,
    deviceId: actor.deviceId,
    entity: "Transaction",
    entityId: transaction.id,
    action: "CREATE",
    after: transaction,
  });
  return { transaction, shift, smsId: sms?.id ?? null };
}
