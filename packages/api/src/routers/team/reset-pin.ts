import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ownerProcedure } from "../../index";
import { recordAudit } from "../../lib/audit";
import { pinFields, pinSchema } from "../../lib/secrets";

/** Gives a helper a new PIN (forgotten or locked out). They must change it on next sign-in. */
export const resetPin = ownerProcedure
  .input(z.object({ userId: z.uuid(), pin: pinSchema }))
  .mutation(async ({ ctx, input }) => {
    const person = await ctx.db.user.findUnique({ where: { id: input.userId } });
    if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
    if (person.role === "OWNER") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Use your password to reset your own PIN" });
    }
    await ctx.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: person.id },
        data: { ...(await pinFields(input.pin)), mustChangePin: true },
      });
      await tx.session.updateMany({
        where: { userId: person.id, endedAt: null },
        data: { endedAt: new Date() },
      });
      await recordAudit(tx, {
        actorId: ctx.user.id,
        deviceId: ctx.device.id,
        entity: "User",
        entityId: person.id,
        action: "EDIT",
        reason: "PIN reset by owner",
      });
    });
    return { ok: true as const };
  });
