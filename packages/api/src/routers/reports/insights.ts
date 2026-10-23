import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ownerProcedure } from "../../index";
import { BALANCE_KEYS, currencyOf, subtractBalances, type Balances } from "../../lib/balances";
import {
  busiest,
  countByHour,
  countByWeekday,
  peakNeeds,
  percentChange,
  rankCustomers,
} from "../../lib/insights";
import { summarizeBy, summarizeTransactions } from "../../lib/summary";
import { dateKeysInRange, dateKeySchema, periodRange, previousRange, toDateKey } from "../../lib/time";
import { shiftNamesInclude } from "../../services/reports";
import { countedBalances, expectedSnapshot } from "../../services/shifts";

const MAX_DAYS = 366;
const TOP = 5;
const TOP_PER_CURRENCY = 3;

/** Shortages and extra money per currency, both as positive cents. */
function splitVariance(variance: Balances) {
  const out = { shortUsd: 0, shortZig: 0, overUsd: 0, overZig: 0 };
  for (const key of BALANCE_KEYS) {
    const value = variance[key];
    const usd = currencyOf(key) === "USD";
    if (value < 0) out[usd ? "shortUsd" : "shortZig"] -= value;
    else out[usd ? "overUsd" : "overZig"] += value;
  }
  return out;
}

/**
 * The owner's report for any stretch of days, built around the questions she asks:
 * how much did I make, is money missing, who did what, when is it busy, how much
 * cash and EcoCash do I need, and who are my customers.
 */
export const insights = ownerProcedure
  .input(z.object({ from: dateKeySchema, to: dateKeySchema }))
  .query(async ({ ctx, input }) => {
    if (input.from > input.to) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "The start date must be before the end date." });
    }
    const range = periodRange(input.from, input.to);
    const days = dateKeysInRange(range);
    if (days.length > MAX_DAYS) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Pick at most a year at a time." });
    }
    const previous = previousRange(range);
    const inRange = { gte: range.start, lt: range.end };

    const [transactions, before, closedShifts, users, voided, edited] = await Promise.all([
      ctx.db.transaction.findMany({
        where: { occurredAt: inRange, voidedAt: null },
        orderBy: { occurredAt: "asc" },
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
          matchState: true,
          flaggedAt: true,
        },
      }),
      ctx.db.transaction.findMany({
        where: { occurredAt: { gte: previous.start, lt: previous.end }, voidedAt: null },
        select: { type: true, currency: true, amount: true, fee: true, commission: true },
      }),
      ctx.db.shift.findMany({
        where: { status: "CLOSED", closedAt: inRange },
        orderBy: { closedAt: "asc" },
        include: shiftNamesInclude,
      }),
      ctx.db.user.findMany({ select: { id: true, name: true } }),
      ctx.db.transaction.count({ where: { voidedAt: inRange } }),
      ctx.db.auditEvent.count({ where: { entity: "Transaction", action: "EDIT", createdAt: inRange } }),
    ]);
    const names = new Map(users.map((user) => [user.id, user.name]));

    // How much did I make, and is it more than last time?
    const totals = summarizeTransactions(transactions);
    const earlier = summarizeTransactions(before);
    const change = {
      commissionUsd: percentChange(totals.USD.commission, earlier.USD.commission),
      commissionZig: percentChange(totals.ZIG.commission, earlier.ZIG.commission),
      count: percentChange(totals.transactionCount, earlier.transactionCount),
    };
    const byDay = summarizeBy(transactions, (tx) => toDateKey(tx.occurredAt));
    const daily = days.map((date) => {
      const summary = byDay.get(date);
      return {
        date,
        count: summary?.transactionCount ?? 0,
        commissionUsd: summary?.USD.commission ?? 0,
        commissionZig: summary?.ZIG.commission ?? 0,
      };
    });
    const bestDay = daily.reduce<(typeof daily)[number] | null>(
      (best, day) =>
        day.count > 0 && (!best || day.commissionUsd > best.commissionUsd || (day.commissionUsd === best.commissionUsd && day.count > best.count))
          ? day
          : best,
      null,
    );

    // Is any money missing?
    const shiftResults = closedShifts.flatMap((shift) => {
      const counted = countedBalances(shift);
      const expected = expectedSnapshot(shift);
      if (!counted || !expected) return [];
      const variance = subtractBalances(counted, expected);
      return [{ shift, variance, ...splitVariance(variance) }];
    });
    const sum = (key: "shortUsd" | "shortZig" | "overUsd" | "overZig", rows = shiftResults) =>
      rows.reduce((total, row) => total + row[key], 0);
    const missing = {
      closedShifts: shiftResults.length,
      shortShifts: shiftResults.filter((row) => row.shortUsd > 0 || row.shortZig > 0).length,
      overShifts: shiftResults.filter((row) => row.overUsd > 0 || row.overZig > 0).length,
      shortUsd: sum("shortUsd"),
      shortZig: sum("shortZig"),
      overUsd: sum("overUsd"),
      overZig: sum("overZig"),
      worst: shiftResults
        .filter((row) => row.shortUsd > 0 || row.shortZig > 0)
        .sort((a, b) => b.shortUsd - a.shortUsd || b.shortZig - a.shortZig)
        .slice(0, TOP)
        .map((row) => ({
          shiftId: row.shift.id,
          closedAt: row.shift.closedAt,
          name: row.shift.openedBy.name,
          deviceLabel: row.shift.device.label,
          shortUsd: row.shortUsd,
          shortZig: row.shortZig,
          note: row.shift.closeNote,
        })),
    };

    // Who did what?
    const isProblem = (tx: (typeof transactions)[number]) =>
      tx.matchState === "NO_SMS" || tx.matchState === "MISMATCH" || tx.flaggedAt !== null;
    const people = [...summarizeBy(transactions, (tx) => tx.servedById)]
      .map(([userId, summary]) => {
        const theirShifts = shiftResults.filter((row) => row.shift.openedById === userId);
        return {
          userId,
          name: names.get(userId) ?? "Unknown",
          count: summary.transactionCount,
          valueUsd: summary.USD.cashInValue + summary.USD.cashOutValue,
          valueZig: summary.ZIG.cashInValue + summary.ZIG.cashOutValue,
          commissionUsd: summary.USD.commission,
          commissionZig: summary.ZIG.commission,
          problems: transactions.filter((tx) => tx.servedById === userId && isProblem(tx)).length,
          shifts: theirShifts.length,
          shortShifts: theirShifts.filter((row) => row.shortUsd > 0 || row.shortZig > 0).length,
          shortUsd: sum("shortUsd", theirShifts),
          shortZig: sum("shortZig", theirShifts),
        };
      })
      .sort((a, b) => b.count - a.count);

    // When is it busy?
    const times = transactions.map((tx) => tx.occurredAt);
    const hours = countByHour(times);
    const weekdays = countByWeekday(times);

    // Who are my customers?
    const phones = [...new Set(transactions.map((tx) => tx.customerPhone))];
    const firsts = phones.length
      ? await ctx.db.transaction.groupBy({
          by: ["customerPhone"],
          where: { customerPhone: { in: phones }, voidedAt: null },
          _min: { occurredAt: true },
        })
      : [];
    const firstSeen = new Map(
      firsts.flatMap((row) => (row._min.occurredAt ? [[row.customerPhone, row._min.occurredAt] as const] : [])),
    );

    // Biggest per currency: a ZiG amount is not comparable with a USD one.
    const largest = (["USD", "ZIG"] as const)
      .flatMap((currency) =>
        transactions
          .filter((tx) => tx.currency === currency)
          .sort((a, b) => b.amount - a.amount)
          .slice(0, TOP_PER_CURRENCY),
      )
      .map((tx) => ({
        id: tx.id,
        type: tx.type,
        currency: tx.currency,
        amount: tx.amount,
        customerName: tx.customerName,
        occurredAt: tx.occurredAt,
        servedBy: names.get(tx.servedById) ?? "Unknown",
      }));

    const count = (predicate: (tx: (typeof transactions)[number]) => boolean) => transactions.filter(predicate).length;

    return {
      from: input.from,
      to: input.to,
      days: days.length,
      totals,
      previous: {
        from: toDateKey(previous.start),
        to: toDateKey(new Date(previous.end.getTime() - 1)),
        totals: earlier,
      },
      change,
      daily,
      bestDay,
      missing,
      people,
      hours,
      busiestHour: busiest(hours),
      weekdays,
      busiestWeekday: busiest(weekdays),
      needs: peakNeeds(transactions),
      customers: rankCustomers(transactions, firstSeen, range.start),
      largest,
      problems: {
        noSms: count((tx) => tx.matchState === "NO_SMS"),
        mismatch: count((tx) => tx.matchState === "MISMATCH"),
        manual: count((tx) => tx.matchState === "MANUAL"),
        flagged: count((tx) => tx.flaggedAt !== null),
        voided,
        edited,
      },
    };
  });
