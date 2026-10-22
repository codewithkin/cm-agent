import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ownerProcedure } from "../../index";
import { recordAudit } from "../../lib/audit";

/** Voids a movement recorded by mistake. The record stays, struck through. */
export const voidMovement = ownerProcedure
  .input(z.object({ movementId: z.uuid(), reason: z.string().trim().min(1).max(300) }))
  .mutation(async ({ ctx, input }) => {
    const movement = await ctx.db.movement.findUnique({ where: { id: input.movementId } });
    if (!movement) throw new TRPCError({ code: "NOT_FOUND", message: "Movement not found" });
    if (movement.voidedAt) {
      throw new TRPCError({ code: "CONFLICT", message: "This movement is already voided" });
    }
    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.movement.update({
        where: { id: movement.id },
        data: { voidedAt: new Date(), voidReason: input.reason, voidedById: ctx.user.id },
      });
      await recordAudit(tx, {
        actorId: ctx.user.id,
        deviceId: ctx.device.id,
        entity: "Movement",
        entityId: movement.id,
        action: "VOID",
        reason: input.reason,
      });
      return updated;
    });
  });
