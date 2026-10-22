import { z } from "zod";

import { ownerProcedure } from "../../index";
import { BALANCE_KEYS } from "../../lib/balances";
import { summarizeBy, summarizeTransactions } from "../../lib/summary";
import { dateKeySchema, dayRange } from "../../lib/time";
import { buildShiftRow, shiftNamesInclude } from "../../services/reports";
import { RECORDABLE_SMS_STATUSES } from "../../services/shifts";

/** The end-of-day report: totals, balances per shift, flags and a line per helper. */
export const day = ownerProcedure
  .input(z.object({ date: dateKeySchema }))
  .query(async ({ ctx, input }) => {
    const { start, end } = dayRange(input.date);
    const inDay = { gte: start, lt: end };

    const [shifts, transactions, users, unrecordedSms, voided, edited] = await Promise.all([
      ctx.db.shift.findMany({
        where: { openedAt: inDay },
        orderBy: { openedAt: "asc" },
        include: shiftNamesInclude,
      }),
      ctx.db.transaction.findMany({
        where: { occurredAt: inDay, voidedAt: null },
        select: {
          type: true,
          currency: true,
          amount: true,
          fee: true,
          commission: true,
          servedById: true,
          matchState: true,
          flaggedAt: true,
        },
      }),
      ctx.db.user.findMany({ select: { id: true, name: true } }),
      ctx.db.smsMessage.count({
        where: {
          receivedAt: inDay,
          transactionId: null,
          ignoredAt: null,
          parseStatus: { in: [...RECORDABLE_SMS_STATUSES] },
        },
      }),
      ctx.db.transaction.count({ where: { voidedAt: inDay } }),
      ctx.db.auditEvent.count({ where: { entity: "Transaction", action: "EDIT", createdAt: inDay } }),
    ]);

    const shiftRows = await Promise.all(shifts.map((shift) => buildShiftRow(ctx.db, shift)));
    const names = new Map(users.map((user) => [user.id, user.name]));

    const perHelper = [...summarizeBy(transactions, (tx) => tx.servedById)].map(([userId, summary]) => {
      const theirShifts = shiftRows.filter((row) => row.openedBy.id === userId && row.variance);
      return {
        userId,
        name: names.get(userId) ?? "Unknown",
        summary,
        shiftCount: theirShifts.length,
        shortShifts: theirShifts.filter((row) => BALANCE_KEYS.some((key) => (row.variance?.[key] ?? 0) < 0))
          .length,
      };
    });

    const count = (predicate: (tx: (typeof transactions)[number]) => boolean) =>
      transactions.filter(predicate).length;
    const flags = {
      noSms: count((tx) => tx.matchState === "NO_SMS"),
      mismatch: count((tx) => tx.matchState === "MISMATCH"),
      manual: count((tx) => tx.matchState === "MANUAL"),
      flagged: count((tx) => tx.flaggedAt !== null),
      unrecordedSms,
      voided,
      edited,
    };

    const closed = shiftRows.filter((row) => row.variance);
    return {
      date: input.date,
      totals: summarizeTransactions(transactions),
      shifts: shiftRows,
      flags,
      perHelper,
      balanced:
        closed.length > 0 &&
        closed.length === shiftRows.length &&
        closed.every((row) => BALANCE_KEYS.every((key) => row.variance?.[key] === 0)),
    };
  });
