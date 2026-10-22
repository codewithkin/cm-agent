import { z } from "zod";

import { ownerProcedure } from "../../index";
import { BALANCE_KEYS, subtractBalances } from "../../lib/balances";
import { emptySummary, summarizeBy, summarizeTransactions } from "../../lib/summary";
import { dateKeysInRange, monthKeySchema, monthRange, toDateKey } from "../../lib/time";
import { shiftNamesInclude } from "../../services/reports";
import { countedBalances, expectedSnapshot } from "../../services/shifts";

const TOP = 5;

/** The monthly report: a daily series, totals, helpers, variances and top customers. */
export const month = ownerProcedure
  .input(z.object({ month: monthKeySchema }))
  .query(async ({ ctx, input }) => {
    const range = monthRange(input.month);
    const inMonth = { gte: range.start, lt: range.end };

    const [transactions, closedShifts, users] = await Promise.all([
      ctx.db.transaction.findMany({
        where: { occurredAt: inMonth, voidedAt: null },
        select: {
          id: true,
          type: true,
          currency: true,
          amount: true,
          fee: true,
          commission: true,
          servedById: true,
          customerPhone: true,
          customerName: true,
          occurredAt: true,
        },
      }),
      ctx.db.shift.findMany({
        where: { status: "CLOSED", closedAt: inMonth },
        orderBy: { closedAt: "asc" },
        include: shiftNamesInclude,
      }),
      ctx.db.user.findMany({ select: { id: true, name: true } }),
    ]);
    const names = new Map(users.map((user) => [user.id, user.name]));

    const byDay = summarizeBy(transactions, (tx) => toDateKey(tx.occurredAt));
    const daily = dateKeysInRange(range).map((date) => ({
      date,
      summary: byDay.get(date) ?? emptySummary(),
    }));

    const perHelper = [...summarizeBy(transactions, (tx) => tx.servedById)].map(([userId, summary]) => ({
      userId,
      name: names.get(userId) ?? "Unknown",
      summary,
    }));

    const varianceLog = closedShifts.flatMap((shift) => {
      const counted = countedBalances(shift);
      const expected = expectedSnapshot(shift);
      if (!counted || !expected) return [];
      const variance = subtractBalances(counted, expected);
      if (BALANCE_KEYS.every((key) => variance[key] === 0)) return [];
      return [
        {
          shiftId: shift.id,
          closedAt: shift.closedAt,
          deviceLabel: shift.device.label,
          openedBy: shift.openedBy,
          variance,
          note: shift.closeNote,
        },
      ];
    });

    const largest = {
      USD: transactions.filter((tx) => tx.currency === "USD").sort((a, b) => b.amount - a.amount).slice(0, TOP),
      ZIG: transactions.filter((tx) => tx.currency === "ZIG").sort((a, b) => b.amount - a.amount).slice(0, TOP),
    };

    const customers = new Map<string, { phone: string; name: string; count: number }>();
    for (const tx of transactions) {
      const entry = customers.get(tx.customerPhone) ?? { phone: tx.customerPhone, name: tx.customerName, count: 0 };
      entry.count += 1;
      customers.set(tx.customerPhone, entry);
    }
    const topCustomers = [...customers.values()].sort((a, b) => b.count - a.count).slice(0, TOP);

    return {
      month: input.month,
      inProgress: range.start <= new Date() && new Date() < range.end,
      totals: summarizeTransactions(transactions),
      customerCount: customers.size,
      daily,
      perHelper,
      varianceLog,
      largest,
      topCustomers,
    };
  });
