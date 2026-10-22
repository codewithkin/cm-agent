import { z } from "zod";

import { userProcedure } from "../../index";
import { dateKeySchema, dayRange, toDateKey } from "../../lib/time";

/** Every EcoCash SMS for a day ("All SMS today"), with the entry each is linked to. */
export const list = userProcedure
  .input(z.object({ date: dateKeySchema.optional() }).optional())
  .query(({ ctx, input }) => {
    const { start, end } = dayRange(input?.date ?? toDateKey(new Date()));
    return ctx.db.smsMessage.findMany({
      where: {
        ...(ctx.user.role === "OWNER" ? {} : { deviceId: ctx.device.id }),
        receivedAt: { gte: start, lt: end },
      },
      orderBy: { receivedAt: "desc" },
      include: {
        device: { select: { id: true, label: true } },
        transaction: { select: { id: true, matchState: true, voidedAt: true } },
      },
    });
  });
