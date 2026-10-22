import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { userProcedure } from "../../index";
import { recordAudit } from "../../lib/audit";
import { loadVisibleTransaction } from "../../services/access";

/** "Flag for the owner": how a helper reports a mistake they are not allowed to fix. */
export const flag = userProcedure
  .input(z.object({ transactionId: z.uuid(), reason: z.string().trim().min(1).max(300) }))
  .mutation(async ({ ctx, input }) => {
    const transaction = await loadVisibleTransaction(ctx.db, ctx.actor, input.transactionId);
    if (transaction.voidedAt) {
      throw new TRPCError({ code: "CONFLICT", message: "This entry is voided" });
    }
    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          flaggedAt: new Date(),
          flagReason: input.reason,
          flaggedById: ctx.user.id,
          reviewedAt: null,
          reviewedById: null,
        },
        omit: { signature: true, idPhoto: true },
      });
      await recordAudit(tx, {
        actorId: ctx.user.id,
        deviceId: ctx.device.id,
        entity: "Transaction",
        entityId: transaction.id,
        action: "FLAG",
        reason: input.reason,
      });
      return updated;
    });
  });
