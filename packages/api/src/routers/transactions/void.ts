import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ownerProcedure } from "../../index";
import { recordAudit } from "../../lib/audit";

/**
 * Voids an entry instead of deleting it. Its SMS is unlinked so it shows up
 * as unrecorded again and can be recorded correctly.
 */
export const voidTransaction = ownerProcedure
  .input(z.object({ transactionId: z.uuid(), reason: z.string().trim().min(1).max(300) }))
  .mutation(async ({ ctx, input }) => {
    const transaction = await ctx.db.transaction.findUnique({ where: { id: input.transactionId } });
    if (!transaction) throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });
    if (transaction.voidedAt) {
      throw new TRPCError({ code: "CONFLICT", message: "This entry is already voided" });
    }
    return ctx.db.$transaction(async (tx) => {
      await tx.smsMessage.updateMany({
        where: { transactionId: transaction.id },
        data: { transactionId: null },
      });
      const updated = await tx.transaction.update({
        where: { id: transaction.id },
        data: { voidedAt: new Date(), voidReason: input.reason, voidedById: ctx.user.id },
        omit: { signature: true, idPhoto: true },
      });
      await recordAudit(tx, {
        actorId: ctx.user.id,
        deviceId: ctx.device.id,
        entity: "Transaction",
        entityId: transaction.id,
        action: "VOID",
        reason: input.reason,
      });
      return updated;
    });
  });
