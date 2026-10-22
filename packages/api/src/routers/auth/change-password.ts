import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ownerProcedure } from "../../index";
import { hashSecret, passwordSchema, verifySecret } from "../../lib/secrets";

/** Changes the owner's password (used to register phones and reset the owner PIN). */
export const changePassword = ownerProcedure
  .input(z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema }))
  .mutation(async ({ ctx, input }) => {
    const { passwordHash } = ctx.user;
    if (!passwordHash || !(await verifySecret(input.currentPassword, passwordHash))) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is wrong" });
    }
    await ctx.db.user.update({
      where: { id: ctx.user.id },
      data: { passwordHash: await hashSecret(input.newPassword) },
    });
    return { ok: true as const };
  });
