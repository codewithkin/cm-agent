import { z } from "zod";

import { userProcedure } from "../../index";
import { phoneSchema } from "../../lib/phone";

/** "Came 18 times before": the saved customer for a number, with their visit count. */
export const byPhone = userProcedure
  .input(z.object({ phone: phoneSchema }))
  .query(async ({ ctx, input }) => {
    const customer = await ctx.db.customer.findUnique({
      where: { phone: input.phone },
      select: {
        id: true,
        phone: true,
        name: true,
        idNumber: true,
        firstSeenAt: true,
        _count: { select: { transactions: { where: { voidedAt: null } } } },
      },
    });
    if (!customer) return null;
    const { _count, ...details } = customer;
    return { ...details, visits: _count.transactions };
  });
