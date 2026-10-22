import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { userProcedure } from "../../index";
import { pinFields, pinSchema, verifySecret } from "../../lib/secrets";

/** Changes the signed-in person's PIN. Also used on first sign-in with a PIN set by the owner. */
export const changePin = userProcedure
  .input(
    z
      .object({ currentPin: pinSchema, newPin: pinSchema })
      .refine((value) => value.currentPin !== value.newPin, {
        message: "Choose a different PIN",
        path: ["newPin"],
      }),
  )
  .mutation(async ({ ctx, input }) => {
    if (!(await verifySecret(input.currentPin, ctx.user.pinHash))) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Current PIN is wrong" });
    }
    const updated = await ctx.db.user.update({
      where: { id: ctx.user.id },
      data: { ...(await pinFields(input.newPin)), mustChangePin: false },
      select: { id: true, pinSalt: true, pinVerifier: true },
    });
    return updated;
  });
