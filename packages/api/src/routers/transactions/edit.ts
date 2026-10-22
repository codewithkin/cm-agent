import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ownerProcedure } from "../../index";
import { recordAudit } from "../../lib/audit";
import { currencySchema, transactionTypeSchema } from "../../lib/enums";
import { matchPair } from "../../lib/matching";
import { centsSchema, positiveCentsSchema } from "../../lib/money";
import { phoneSchema } from "../../lib/phone";
import { upsertCustomer } from "../../services/customers";

const EDITABLE_FIELDS = [
  "type",
  "currency",
  "amount",
  "fee",
  "commission",
  "customerPhone",
  "customerName",
  "customerIdNumber",
  "reference",
] as const;

/** Owner correction of an entry. The reason and the before/after values go in the history. */
export const edit = ownerProcedure
  .input(
    z.object({
      transactionId: z.uuid(),
      reason: z.string().trim().min(1).max(300),
      changes: z
        .object({
          type: transactionTypeSchema,
          currency: currencySchema,
          amount: positiveCentsSchema,
          fee: centsSchema.nullable(),
          commission: centsSchema.nullable(),
          customerPhone: phoneSchema,
          customerName: z.string().trim().min(1).max(80),
          customerIdNumber: z.string().trim().min(3).max(40),
          reference: z.string().trim().min(3).max(60).nullable(),
        })
        .partial(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const current = await ctx.db.transaction.findUnique({
      where: { id: input.transactionId },
      include: { sms: true },
    });
    if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });
    if (current.voidedAt) throw new TRPCError({ code: "CONFLICT", message: "This entry is voided" });

    const next = { ...current, ...input.changes };
    if (next.reference && next.reference !== current.reference) {
      const taken = await ctx.db.transaction.findUnique({
        where: { reference: next.reference },
        select: { id: true },
      });
      if (taken) {
        throw new TRPCError({ code: "CONFLICT", message: `Reference ${next.reference} is already recorded` });
      }
    }
    // A linked SMS is re-checked against the corrected details.
    const matchState = current.sms ? (matchPair(next, current.sms) ?? "MISMATCH") : current.matchState;

    return ctx.db.$transaction(async (tx) => {
      const customer =
        next.customerPhone !== current.customerPhone ||
        next.customerName !== current.customerName ||
        next.customerIdNumber !== current.customerIdNumber
          ? await upsertCustomer(tx, {
              phone: next.customerPhone,
              name: next.customerName,
              idNumber: next.customerIdNumber,
            })
          : null;

      const updated = await tx.transaction.update({
        where: { id: current.id },
        data: {
          ...input.changes,
          ...(customer ? { customerId: customer.id } : {}),
          matchState,
        },
        omit: { signature: true, idPhoto: true },
      });
      await recordAudit(tx, {
        actorId: ctx.user.id,
        deviceId: ctx.device.id,
        entity: "Transaction",
        entityId: current.id,
        action: "EDIT",
        before: Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, current[field]])),
        after: Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, updated[field]])),
        reason: input.reason,
      });
      return updated;
    });
  });
