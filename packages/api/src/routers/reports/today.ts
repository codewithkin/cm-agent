import { ownerProcedure } from "../../index";
import { addBalances, lowBalances, ZERO_BALANCES } from "../../lib/balances";
import { summarizeTransactions } from "../../lib/summary";
import { dayRange, toDateKey } from "../../lib/time";
import { buildShiftRow, shiftNamesInclude } from "../../services/reports";
import { loadReviewItems } from "../../services/review";
import { getSettings } from "../../services/settings";

/** The owner's "Today" screen: combined live balances, each phone, today's totals and flags. */
export const today = ownerProcedure.query(async ({ ctx }) => {
  const date = toDateKey(new Date());
  const { start, end } = dayRange(date);

  const [openShifts, devices, transactions, reviewItems, settings] = await Promise.all([
    ctx.db.shift.findMany({ where: { status: "OPEN" }, include: shiftNamesInclude }),
    ctx.db.device.findMany({
      where: { revokedAt: null, kind: "BOOTH" },
      orderBy: { createdAt: "asc" },
      select: { id: true, label: true, lastSeenAt: true, lastSyncedAt: true, pendingSyncCount: true },
    }),
    ctx.db.transaction.findMany({
      where: { occurredAt: { gte: start, lt: end }, voidedAt: null },
      select: { type: true, currency: true, amount: true, fee: true, commission: true },
    }),
    loadReviewItems(ctx.db),
    getSettings(ctx.db),
  ]);

  const shiftRows = await Promise.all(openShifts.map((shift) => buildShiftRow(ctx.db, shift)));
  const combined = shiftRows.reduce((sum, row) => addBalances(sum, row.expected), ZERO_BALANCES);

  return {
    date,
    balances: combined,
    low: lowBalances(combined, settings),
    booths: devices.map((device) => {
      const shift = openShifts.find((open) => open.deviceId === device.id);
      return {
        ...device,
        serving: shift ? { name: shift.openedBy.name, since: shift.openedAt } : null,
        expected: shiftRows.find((row) => row.id === shift?.id)?.expected ?? null,
      };
    }),
    totals: summarizeTransactions(transactions),
    reviewCount: reviewItems.length,
  };
});
