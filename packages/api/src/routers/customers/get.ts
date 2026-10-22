import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ownerProcedure } from "../../index";
import { summarizeTransactions } from "../../lib/summary";

/** A customer's details, totals and latest transactions. */
export const get = ownerProcedure
  .input(z.object({ customerId: z.uuid() }))
  .query(async ({ ctx, input }) => {
    const customer = await ctx.db.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });

    const [allTransactions, recent] = await Promise.all([
      ctx.db.transaction.findMany({
        where: { customerId: customer.id, voidedAt: null },
        select: { type: true, currency: true, amount: true, fee: true, commission: true },
      }),
      ctx.db.transaction.findMany({
        where: { customerId: customer.id },
        orderBy: { occurredAt: "desc" },
        take: 50,
        omit: { signature: true, idPhoto: true },
        include: { servedBy: { select: { id: true, name: true } } },
      }),
    ]);
    return { customer, totals: summarizeTransactions(allTransactions), transactions: recent };
  });
