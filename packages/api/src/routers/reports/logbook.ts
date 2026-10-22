import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ownerProcedure } from "../../index";
import { dateKeySchema, dayRange } from "../../lib/time";
import { getSettings } from "../../services/settings";

/** Signatures make this heavy, so keep each request to about one month. */
const MAX_DAYS = 31;

/**
 * Logbook rows with signatures, for the phone to lay out as a PDF that looks
 * like the paper book (inspections and monthly reconciliation).
 */
export const logbook = ownerProcedure
  .input(z.object({ from: dateKeySchema, to: dateKeySchema }))
  .query(async ({ ctx, input }) => {
    const start = dayRange(input.from).start;
    const end = dayRange(input.to).end;
    if (end <= start) throw new TRPCError({ code: "BAD_REQUEST", message: "The end date is before the start" });
    if (end.getTime() - start.getTime() > MAX_DAYS * 24 * 60 * 60 * 1000) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Choose at most ${MAX_DAYS} days` });
    }

    const [settings, rows] = await Promise.all([
      getSettings(ctx.db),
      ctx.db.transaction.findMany({
        where: { occurredAt: { gte: start, lt: end } },
        orderBy: { occurredAt: "asc" },
        select: {
          id: true,
          occurredAt: true,
          type: true,
          currency: true,
          amount: true,
          customerName: true,
          customerPhone: true,
          customerIdNumber: true,
          reference: true,
          signature: true,
          voidedAt: true,
          voidReason: true,
          servedBy: { select: { name: true } },
        },
      }),
    ]);
    return {
      businessName: settings.businessName,
      agentCodeUsd: settings.agentCodeUsd,
      agentCodeZig: settings.agentCodeZig,
      from: input.from,
      to: input.to,
      rows,
    };
  });
