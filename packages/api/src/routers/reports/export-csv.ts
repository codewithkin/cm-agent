import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { ownerProcedure } from "../../index";
import { toCsv } from "../../lib/csv";
import { dateKeySchema, dayRange, toDateKey } from "../../lib/time";

const MAX_DAYS = 92;
const HARARE_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Harare",
  hour: "2-digit",
  minute: "2-digit",
});

/** +263772123456 → 0772123456, the way numbers are written in the paper book. */
function localPhone(phone: string): string {
  return phone.startsWith("+263") ? `0${phone.slice(4)}` : phone;
}

/** The logbook for a date range as CSV, for Excel and the owner's own accounts. */
export const exportCsv = ownerProcedure
  .input(z.object({ from: dateKeySchema, to: dateKeySchema }))
  .mutation(async ({ ctx, input }) => {
    const start = dayRange(input.from).start;
    const end = dayRange(input.to).end;
    if (end <= start) throw new TRPCError({ code: "BAD_REQUEST", message: "The end date is before the start" });
    if (end.getTime() - start.getTime() > MAX_DAYS * 24 * 60 * 60 * 1000) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Export at most ${MAX_DAYS} days at a time` });
    }

    const transactions = await ctx.db.transaction.findMany({
      where: { occurredAt: { gte: start, lt: end } },
      orderBy: { occurredAt: "asc" },
      omit: { signature: true, idPhoto: true },
      include: { servedBy: { select: { name: true } }, device: { select: { label: true } } },
    });

    const csv = toCsv(
      [
        "Date",
        "Time",
        "Type",
        "Currency",
        "Amount",
        "Fee",
        "Commission",
        "Customer name",
        "Mobile number",
        "ID number",
        "Reference",
        "Served by",
        "Phone",
        "SMS check",
        "Flagged",
        "Voided",
        "Void reason",
      ],
      transactions.map((tx) => [
        toDateKey(tx.occurredAt),
        HARARE_TIME.format(tx.occurredAt),
        tx.type === "CASH_IN" ? "Cash-in" : "Cash-out",
        tx.currency === "USD" ? "USD" : "ZiG",
        (tx.amount / 100).toFixed(2),
        tx.fee === null ? null : (tx.fee / 100).toFixed(2),
        tx.commission === null ? null : (tx.commission / 100).toFixed(2),
        tx.customerName,
        localPhone(tx.customerPhone),
        tx.customerIdNumber,
        tx.reference,
        tx.servedBy.name,
        tx.device.label,
        tx.matchState,
        tx.flaggedAt ? "Yes" : "",
        tx.voidedAt ? "Yes" : "",
        tx.voidReason,
      ]),
    );
    return { filename: `logbook-${input.from}-to-${input.to}.csv`, csv };
  });
