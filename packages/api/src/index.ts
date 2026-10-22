import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";
import { hashToken } from "./lib/crypto";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

/** Calls from a phone the owner registered and has not signed out. */
export const deviceProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.deviceToken) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "This phone is not registered" });
  }
  const device = await ctx.db.device.findUnique({
    where: { tokenHash: hashToken(ctx.deviceToken) },
  });
  if (!device || device.revokedAt) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "This phone has been signed out" });
  }
  return next({ ctx: { device } });
});

/** Calls from someone who unlocked a registered phone with their PIN. */
export const userProcedure = deviceProcedure.use(async ({ ctx, next }) => {
  const locked = new TRPCError({ code: "UNAUTHORIZED", message: "Unlock the app with your PIN" });
  if (!ctx.sessionToken) throw locked;
  const session = await ctx.db.session.findUnique({
    where: { tokenHash: hashToken(ctx.sessionToken) },
    include: { user: true },
  });
  if (
    !session ||
    session.deviceId !== ctx.device.id ||
    session.endedAt ||
    session.expiresAt <= new Date() ||
    !session.user.active
  ) {
    throw locked;
  }
  const { user } = session;
  return next({
    ctx: {
      session,
      user,
      actor: { userId: user.id, role: user.role, deviceId: ctx.device.id },
    },
  });
});

/** Calls only Coline, the owner, may make. */
export const ownerProcedure = userProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "OWNER") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner can do this" });
  }
  return next();
});
