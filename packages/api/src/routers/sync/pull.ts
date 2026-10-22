import { z } from "zod";

import { deviceProcedure } from "../../index";

const PAGE_SIZE = 500;

type Stamped = { updatedAt: Date };

/**
 * Everything that changed since the phone last synced, so the app works offline.
 * Booth phones get their own shifts and entries; the owner phone gets all of them.
 * Signatures and ID photos are left out to keep the download small.
 *
 * Call again with `nextSince` while `hasMore` is true. Pages overlap slightly at the
 * boundary, so the phone should upsert by id.
 */
export const pull = deviceProcedure
  .input(z.object({ since: z.coerce.date().optional() }).optional())
  .mutation(async ({ ctx, input }) => {
    const serverTime = new Date();
    const updatedAt = { gte: input?.since ?? new Date(0), lte: serverTime };
    const ownRecords = ctx.device.kind === "OWNER" ? {} : { deviceId: ctx.device.id };
    const page = { orderBy: { updatedAt: "asc" as const }, take: PAGE_SIZE + 1 };

    const [users, settings, customers, shifts, transactions, movements, smsMessages] = await Promise.all([
      ctx.db.user.findMany({
        where: { updatedAt, ...(ctx.device.kind === "OWNER" ? { role: "OWNER" as const } : {}) },
        select: {
          id: true,
          name: true,
          role: true,
          active: true,
          mustChangePin: true,
          pinSalt: true,
          pinVerifier: true,
          pinLockedUntil: true,
          updatedAt: true,
        },
        ...page,
      }),
      ctx.db.businessSettings.findFirst({ where: { updatedAt } }),
      ctx.db.customer.findMany({ where: { updatedAt }, ...page }),
      ctx.db.shift.findMany({ where: { ...ownRecords, updatedAt }, ...page }),
      ctx.db.transaction.findMany({
        where: { ...ownRecords, updatedAt },
        omit: { signature: true, idPhoto: true },
        ...page,
      }),
      ctx.db.movement.findMany({ where: { ...ownRecords, updatedAt }, ...page }),
      ctx.db.smsMessage.findMany({ where: { ...ownRecords, updatedAt }, ...page }),
    ]);

    const tables: Stamped[][] = [users, customers, shifts, transactions, movements, smsMessages];
    const truncated = tables.filter((rows) => rows.length > PAGE_SIZE);
    const trim = <T>(rows: T[]) => rows.slice(0, PAGE_SIZE);
    // Resume from the earliest point any truncated table reached.
    const nextSince =
      truncated.length > 0
        ? new Date(Math.min(...truncated.map((rows) => rows[PAGE_SIZE - 1]!.updatedAt.getTime())))
        : serverTime;

    await ctx.db.device.update({ where: { id: ctx.device.id }, data: { lastSyncedAt: serverTime } });

    return {
      serverTime,
      nextSince,
      hasMore: truncated.length > 0,
      users: trim(users),
      settings,
      customers: trim(customers),
      shifts: trim(shifts),
      transactions: trim(transactions),
      movements: trim(movements),
      smsMessages: trim(smsMessages),
    };
  });
