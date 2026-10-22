import type { Prisma } from "@cm-agent/db";
import { z } from "zod";

import { userProcedure } from "../../index";
import { currencySchema, matchStateSchema, transactionTypeSchema } from "../../lib/enums";
import { dateKeySchema, dayRange } from "../../lib/time";
import { findOpenShift } from "../../services/shifts";

/**
 * Logbook entries, newest first. Helpers only ever see the open shift on their
 * phone; the owner can filter across every shift, day and helper.
 */
export const list = userProcedure
  .input(
    z.object({
      shiftId: z.uuid().optional(),
      date: dateKeySchema.optional(),
      type: transactionTypeSchema.optional(),
      currency: currencySchema.optional(),
      matchState: matchStateSchema.optional(),
      flagged: z.boolean().optional(),
      includeVoided: z.boolean().default(true),
      servedById: z.uuid().optional(),
      /** Phone digits, name, ID number or reference. */
      search: z.string().trim().min(1).max(60).optional(),
      cursor: z.uuid().optional(),
      limit: z.number().int().min(1).max(100).default(30),
    }),
  )
  .query(async ({ ctx, input }) => {
    let shiftId = input.shiftId;
    if (ctx.user.role !== "OWNER") {
      const openShift = await findOpenShift(ctx.db, ctx.device.id);
      if (!openShift) return { items: [], nextCursor: undefined };
      shiftId = openShift.id;
    }

    const range = input.date ? dayRange(input.date) : null;
    const searchDigits = input.search?.replace(/\D/g, "") ?? "";
    const where: Prisma.TransactionWhereInput = {
      shiftId,
      type: input.type,
      currency: input.currency,
      matchState: input.matchState,
      servedById: input.servedById,
      ...(range ? { occurredAt: { gte: range.start, lt: range.end } } : {}),
      ...(input.flagged === undefined ? {} : { flaggedAt: input.flagged ? { not: null } : null }),
      ...(input.includeVoided ? {} : { voidedAt: null }),
      ...(input.search
        ? {
            OR: [
              { customerName: { contains: input.search, mode: "insensitive" as const } },
              { customerIdNumber: { contains: input.search, mode: "insensitive" as const } },
              { reference: { contains: input.search, mode: "insensitive" as const } },
              ...(searchDigits.length >= 3
                ? [{ customerPhone: { contains: searchDigits.replace(/^(263|0)/, "") || searchDigits } }]
                : []),
            ],
          }
        : {}),
    };

    const rows = await ctx.db.transaction.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      omit: { signature: true, idPhoto: true },
      include: {
        servedBy: { select: { id: true, name: true } },
        sms: { select: { id: true } },
      },
    });
    const items = rows.slice(0, input.limit);
    return { items, nextCursor: rows.length > input.limit ? items.at(-1)?.id : undefined };
  });
