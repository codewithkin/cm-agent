import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure } from "../../index";
import { safeEqual } from "../../lib/crypto";
import { phoneSchema } from "../../lib/phone";
import { hashSecret, passwordSchema, pinFields, pinSchema } from "../../lib/secrets";

/** Creates the owner account. Works once, and only with the server's setup code. */
export const bootstrapOwner = publicProcedure
  .input(
    z.object({
      setupCode: z.string(),
      name: z.string().trim().min(1).max(80),
      phone: phoneSchema,
      password: passwordSchema,
      pin: pinSchema,
    }),
  )
  .mutation(async ({ ctx, input }) => {
    if (!safeEqual(input.setupCode, ctx.ownerSetupCode)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Wrong setup code" });
    }
    const existingOwner = await ctx.db.user.findFirst({ where: { role: "OWNER" } });
    if (existingOwner) {
      throw new TRPCError({ code: "CONFLICT", message: "The owner account already exists" });
    }
    return ctx.db.user.create({
      data: {
        name: input.name,
        phone: input.phone,
        role: "OWNER",
        passwordHash: await hashSecret(input.password),
        ...(await pinFields(input.pin)),
      },
      select: { id: true, name: true, phone: true, role: true },
    });
  });
