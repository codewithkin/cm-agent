import { z } from "zod";

import { userProcedure } from "../../index";
import { currencySchema } from "../../lib/enums";

/**
 * Econet's own float figure from the newest SMS that carried a balance, used
 * to pre-fill the float when opening or closing a shift. SMS that name no
 * currency are assumed to be USD.
 */
export const latestBalance = userProcedure
  .input(z.object({ currency: currencySchema }))
  .query(async ({ ctx, input }) => {
    const sms = await ctx.db.smsMessage.findFirst({
      where: {
        deviceId: ctx.device.id,
        balanceAfter: { not: null },
        OR: [
          { currency: input.currency },
          ...(input.currency === "USD" ? [{ currency: null }] : []),
        ],
      },
      orderBy: { receivedAt: "desc" },
      select: { id: true, balanceAfter: true, currency: true, receivedAt: true },
    });
    return sms ? { smsId: sms.id, balance: sms.balanceAfter, receivedAt: sms.receivedAt } : null;
  });
