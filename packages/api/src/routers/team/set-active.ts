import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ownerProcedure } from "../../index";
import { recordAudit } from "../../lib/audit";

/** Removes a helper from the lock screen, or brings them back. Their history stays. */
export const setActive = ownerProcedure
  .input(z.object({ userId: z.uuid(), active: z.boolean() }))
  .mutation(async ({ ctx, input }) => {
    const person = await ctx.db.user.findUnique({ where: { id: input.userId } });
    if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
    if (person.role === "OWNER") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "The owner cannot be deactivated" });
    }
    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: person.id },
        data: { active: input.active },
        select: { id: true, name: true, active: true },
      });
      if (!input.active) {
        await tx.session.updateMany({
          where: { userId: person.id, endedAt: null },
          data: { endedAt: new Date() },
        });
      }
      await recordAudit(tx, {
        actorId: ctx.user.id,
        deviceId: ctx.device.id,
        entity: "User",
        entityId: person.id,
        action: "EDIT",
        before: { active: person.active },
        after: { active: input.active },
      });
      return updated;
    });
  });
