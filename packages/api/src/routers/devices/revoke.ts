import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ownerProcedure } from "../../index";
import { recordAudit } from "../../lib/audit";

/** Signs out a lost or stolen phone. Its records stay on the server. */
export const revoke = ownerProcedure
  .input(z.object({ deviceId: z.uuid() }))
  .mutation(async ({ ctx, input }) => {
    if (input.deviceId === ctx.device.id) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You can't sign out the phone you are using" });
    }
    const device = await ctx.db.device.findUnique({ where: { id: input.deviceId } });
    if (!device) throw new TRPCError({ code: "NOT_FOUND", message: "Phone not found" });
    if (device.revokedAt) return { id: device.id, revokedAt: device.revokedAt };

    return ctx.db.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.device.update({
        where: { id: device.id },
        data: { revokedAt: now },
        select: { id: true, revokedAt: true },
      });
      await tx.session.updateMany({
        where: { deviceId: device.id, endedAt: null },
        data: { endedAt: now },
      });
      await recordAudit(tx, {
        actorId: ctx.user.id,
        deviceId: ctx.device.id,
        entity: "Device",
        entityId: device.id,
        action: "VOID",
        reason: "Phone signed out by owner",
      });
      return updated;
    });
  });
