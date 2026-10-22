import { z } from "zod";

import { deviceProcedure } from "../../index";

/** Sent by each phone when it comes online, so the owner sees it is alive. */
export const heartbeat = deviceProcedure
  .input(
    z.object({
      appVersion: z.string().trim().max(40).optional(),
      pendingSyncCount: z.number().int().min(0).max(100_000),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const device = await ctx.db.device.update({
      where: { id: ctx.device.id },
      data: {
        lastSeenAt: new Date(),
        pendingSyncCount: input.pendingSyncCount,
        ...(input.appVersion ? { appVersion: input.appVersion } : {}),
      },
      select: { id: true, label: true, kind: true, lastSeenAt: true },
    });
    return { device, serverTime: new Date() };
  });
