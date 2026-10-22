import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ownerProcedure } from "../../index";
import { recordAudit } from "../../lib/audit";

export const rename = ownerProcedure
  .input(z.object({ userId: z.uuid(), name: z.string().trim().min(1).max(80) }))
  .mutation(async ({ ctx, input }) => {
    const person = await ctx.db.user.findUnique({ where: { id: input.userId } });
    if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: person.id },
        data: { name: input.name },
        select: { id: true, name: true },
      });
      await recordAudit(tx, {
        actorId: ctx.user.id,
        deviceId: ctx.device.id,
        entity: "User",
        entityId: person.id,
        action: "EDIT",
        before: { name: person.name },
        after: { name: input.name },
      });
      return updated;
    });
  });
