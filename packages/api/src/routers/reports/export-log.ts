import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ownerProcedure } from "../../index";
import { dateKeySchema, dayRange } from "../../lib/time";

const MAX_DAYS = 92;

/** The logbook for a date range, every column of the paper book, for the owner's PDF. */
export const exportLog = ownerProcedure
  .input(z.object({ from: dateKeySchema, to: dateKeySchema }))
  .query(async ({ ctx, input }) => {
    const start = dayRange(input.from).start;
    const end = dayRange(input.to).end;
    if (end <= start) throw new TRPCError({ code: "BAD_REQUEST", message: "The end date is before the start" });
    if (end.getTime() - start.getTime() > MAX_DAYS * 24 * 60 * 60 * 1000) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Export at most ${MAX_DAYS} days at a time` });
    }

    const transactions = await ctx.db.transaction.findMany({
      where: { occurredAt: { gte: start, lt: end } },
      orderBy: { occurredAt: "asc" },
      select: {
        id: true,
        occurredAt: true,
        type: true,
        currency: true,
        amount: true,
        fee: true,
        commission: true,
        customerName: true,
        customerPhone: true,
        customerIdNumber: true,
        reference: true,
        matchState: true,
        flaggedAt: true,
        voidedAt: true,
        voidReason: true,
        servedBy: { select: { name: true } },
        device: { select: { label: true } },
      },
    });

    return {
      from: input.from,
      to: input.to,
      rows: transactions.map(({ servedBy, device, ...tx }) => ({ ...tx, servedBy: servedBy.name, phone: device.label })),
    };
  });
