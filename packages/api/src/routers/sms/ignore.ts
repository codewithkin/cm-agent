import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ownerProcedure } from "../../index";
import { recordAudit } from "../../lib/audit";

/** Marks an SMS as not needing an entry (e.g. a promotion that slipped through). */
export const ignore = ownerProcedure
  .input(z.object({ smsId: z.uuid(), reason: z.string().trim().min(1).max(200) }))
  .mutation(async ({ ctx, input }) => {
    const sms = await ctx.db.smsMessage.findUnique({ where: { id: input.smsId } });
    if (!sms) throw new TRPCError({ code: "NOT_FOUND", message: "SMS not found" });
    if (sms.transactionId) {
      throw new TRPCError({ code: "CONFLICT", message: "This SMS is already linked to an entry" });
    }
    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.smsMessage.update({
        where: { id: sms.id },
        data: { ignoredAt: new Date(), ignoredReason: input.reason },
      });
      await recordAudit(tx, {
        actorId: ctx.user.id,
        deviceId: ctx.device.id,
        entity: "SmsMessage",
        entityId: sms.id,
        action: "VOID",
        reason: input.reason,
      });
      return updated;
    });
  });
