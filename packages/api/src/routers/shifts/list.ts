import { z } from "zod";

import { ownerProcedure } from "../../index";
import { subtractBalances } from "../../lib/balances";
import { dateKeySchema, dayRange } from "../../lib/time";
import { countedBalances, expectedSnapshot } from "../../services/shifts";

/** Shift history for the owner, newest first, with each closed shift's variance. */
export const list = ownerProcedure
  .input(
    z.object({
      from: dateKeySchema.optional(),
      to: dateKeySchema.optional(),
      deviceId: z.uuid().optional(),
      cursor: z.uuid().optional(),
      limit: z.number().int().min(1).max(100).default(30),
    }),
  )
  .query(async ({ ctx, input }) => {
    const shifts = await ctx.db.shift.findMany({
      where: {
        deviceId: input.deviceId,
        openedAt: {
          gte: input.from ? dayRange(input.from).start : undefined,
          lt: input.to ? dayRange(input.to).end : undefined,
        },
      },
      orderBy: [{ openedAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      include: {
        device: { select: { id: true, label: true } },
        openedBy: { select: { id: true, name: true } },
      },
    });
    const page = shifts.slice(0, input.limit);
    return {
      items: page.map((shift) => {
        const counted = countedBalances(shift);
        const expected = expectedSnapshot(shift);
        return {
          ...shift,
          variance: counted && expected ? subtractBalances(counted, expected) : null,
        };
      }),
      nextCursor: shifts.length > input.limit ? page.at(-1)?.id : undefined,
    };
  });
