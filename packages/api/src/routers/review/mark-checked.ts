import { z } from "zod";

import { ownerProcedure } from "../../index";
import { recordAudit, type AuditEntity } from "../../lib/audit";

const ENTITY: Record<"TRANSACTION" | "SMS" | "SHIFT", AuditEntity> = {
  TRANSACTION: "Transaction",
  SMS: "SmsMessage",
  SHIFT: "Shift",
};

/** Takes an item off the review queue once the owner has looked at it. */
export const markChecked = ownerProcedure
  .input(
    z.object({
      kind: z.enum(["TRANSACTION", "SMS", "SHIFT"]),
      id: z.uuid(),
      note: z.string().trim().max(300).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const data = { reviewedAt: new Date(), reviewedById: ctx.user.id };
    await ctx.db.$transaction(async (tx) => {
      if (input.kind === "TRANSACTION") {
        await tx.transaction.update({ where: { id: input.id }, data, select: { id: true } });
      } else if (input.kind === "SMS") {
        await tx.smsMessage.update({ where: { id: input.id }, data, select: { id: true } });
      } else {
        await tx.shift.update({ where: { id: input.id }, data, select: { id: true } });
      }
      await recordAudit(tx, {
        actorId: ctx.user.id,
        deviceId: ctx.device.id,
        entity: ENTITY[input.kind],
        entityId: input.id,
        action: "REVIEW",
        reason: input.note ?? null,
      });
    });
    return { ok: true as const };
  });
