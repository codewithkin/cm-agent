import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ownerProcedure } from "../../index";
import { recordAudit } from "../../lib/audit";
import { phoneSchema } from "../../lib/phone";
import { verifySecret } from "../../lib/secrets";

/** Changes the phone number the owner signs in with. Needs her current password. */
export const changePhone = ownerProcedure
  .input(z.object({ currentPassword: z.string().min(1), newPhone: phoneSchema }))
  .mutation(async ({ ctx, input }) => {
    const { passwordHash } = ctx.user;
    if (!passwordHash || !(await verifySecret(input.currentPassword, passwordHash))) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is wrong" });
    }
    if (input.newPhone === ctx.user.phone) return { phone: input.newPhone };
    const taken = await ctx.db.user.findUnique({ where: { phone: input.newPhone }, select: { id: true } });
    if (taken) throw new TRPCError({ code: "CONFLICT", message: "That number is already in use" });

    return ctx.db.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: ctx.user.id },
        data: { phone: input.newPhone },
        select: { phone: true },
      });
      await recordAudit(tx, {
        actorId: ctx.user.id,
        deviceId: ctx.device.id,
        entity: "User",
        entityId: ctx.user.id,
        action: "EDIT",
        before: { phone: ctx.user.phone },
        after: { phone: input.newPhone },
      });
      return updated;
    });
  });
