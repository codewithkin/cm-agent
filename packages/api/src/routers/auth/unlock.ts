import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { deviceProcedure } from "../../index";
import { generateToken, hashToken } from "../../lib/crypto";
import { pinSchema, verifySecret } from "../../lib/secrets";

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 15;
const SESSION_HOURS = 12;

/** Unlocks this phone for one person. Ends any other session on the phone. */
export const unlock = deviceProcedure
  .input(z.object({ userId: z.uuid(), pin: pinSchema }))
  .mutation(async ({ ctx, input }) => {
    const user = await ctx.db.user.findUnique({ where: { id: input.userId } });
    if (!user?.active) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
    }
    if (ctx.device.kind === "OWNER" && user.role !== "OWNER") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner can use the owner phone" });
    }

    const now = new Date();
    if (user.pinLockedUntil && user.pinLockedUntil > now) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many wrong PINs. Ask the owner to reset your PIN, or try again later.",
      });
    }

    if (!(await verifySecret(input.pin, user.pinHash))) {
      const attempts = user.pinFailedAttempts + 1;
      const lockNow = attempts >= MAX_PIN_ATTEMPTS;
      await ctx.db.user.update({
        where: { id: user.id },
        data: {
          pinFailedAttempts: lockNow ? 0 : attempts,
          pinLockedUntil: lockNow ? new Date(now.getTime() + PIN_LOCK_MINUTES * 60_000) : null,
        },
      });
      throw new TRPCError({
        code: lockNow ? "TOO_MANY_REQUESTS" : "UNAUTHORIZED",
        message: lockNow
          ? "Too many wrong PINs. Ask the owner to reset your PIN."
          : `Wrong PIN, ${MAX_PIN_ATTEMPTS - attempts} tries left`,
      });
    }

    const sessionToken = generateToken();
    const expiresAt = new Date(now.getTime() + SESSION_HOURS * 60 * 60_000);
    await ctx.db.$transaction([
      ctx.db.user.update({
        where: { id: user.id },
        data: { pinFailedAttempts: 0, pinLockedUntil: null },
      }),
      ctx.db.session.updateMany({
        where: { deviceId: ctx.device.id, endedAt: null },
        data: { endedAt: now },
      }),
      ctx.db.session.create({
        data: {
          tokenHash: hashToken(sessionToken),
          userId: user.id,
          deviceId: ctx.device.id,
          expiresAt,
        },
      }),
    ]);

    return {
      sessionToken,
      expiresAt,
      user: { id: user.id, name: user.name, role: user.role, mustChangePin: user.mustChangePin },
    };
  });
