import { z } from "zod";

import { userProcedure } from "../../index";
import { subtractBalances } from "../../lib/balances";
import { summarizeTransactions } from "../../lib/summary";
import { loadVisibleShift } from "../../services/access";
import {
  countedBalances,
  expectedSnapshot,
  openingBalances,
  shiftExpectedBalances,
} from "../../services/shifts";

/** Everything on the shift summary card: counts, values, balances and flags. */
export const get = userProcedure
  .input(z.object({ shiftId: z.uuid() }))
  .query(async ({ ctx, input }) => {
    const shift = await loadVisibleShift(ctx.db, ctx.actor, input.shiftId);
    const [details, transactions, matchCounts] = await Promise.all([
      ctx.db.shift.findUniqueOrThrow({
        where: { id: shift.id },
        include: {
          device: { select: { id: true, label: true } },
          openedBy: { select: { id: true, name: true } },
        },
      }),
      ctx.db.transaction.findMany({
        where: { shiftId: shift.id, voidedAt: null },
        select: { type: true, currency: true, amount: true, fee: true, commission: true },
      }),
      ctx.db.transaction.groupBy({
        by: ["matchState"],
        where: { shiftId: shift.id, voidedAt: null },
        _count: { _all: true },
      }),
    ]);
    const flagged = await ctx.db.transaction.count({
      where: { shiftId: shift.id, voidedAt: null, flaggedAt: { not: null } },
    });

    const expected = expectedSnapshot(shift) ?? (await shiftExpectedBalances(ctx.db, shift));
    const counted = countedBalances(shift);
    return {
      shift: details,
      opening: openingBalances(shift),
      expected,
      counted,
      variance: counted ? subtractBalances(counted, expected) : null,
      summary: summarizeTransactions(transactions),
      matchStates: Object.fromEntries(matchCounts.map((row) => [row.matchState, row._count._all])),
      flaggedCount: flagged,
    };
  });
