import { z } from "zod";

import { userProcedure } from "../../index";
import { RECORDABLE_SMS_STATUSES } from "../../services/shifts";

/**
 * EcoCash SMS with no logbook entry yet, newest first. Booth phones see their
 * own; the owner can see every phone's.
 */
export const unrecorded = userProcedure
  .input(z.object({ allDevices: z.boolean().default(false) }).optional())
  .query(async ({ ctx, input }) => {
    const allDevices = ctx.user.role === "OWNER" && (input?.allDevices ?? false);
    const items = await ctx.db.smsMessage.findMany({
      where: {
        ...(allDevices ? {} : { deviceId: ctx.device.id }),
        transactionId: null,
        ignoredAt: null,
        parseStatus: { in: [...RECORDABLE_SMS_STATUSES] },
      },
      orderBy: { receivedAt: "desc" },
      take: 100,
      include: { device: { select: { id: true, label: true } } },
    });
    return { count: items.length, items };
  });
