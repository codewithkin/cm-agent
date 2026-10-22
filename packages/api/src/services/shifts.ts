import type { Shift } from "@cm-agent/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { recordAudit } from "../lib/audit";
import { BALANCE_KEYS, balancesSchema, expectedBalances, type Balances } from "../lib/balances";
import type { Actor, Db } from "./types";

export function openingBalances(shift: Shift): Balances {
  return {
    cashUsd: shift.openingCashUsd,
    floatUsd: shift.openingFloatUsd,
    cashZig: shift.openingCashZig,
    floatZig: shift.openingFloatZig,
  };
}

/** The closing count, or null while the shift is open. */
export function countedBalances(shift: Shift): Balances | null {
  if (
    shift.countedCashUsd === null ||
    shift.countedFloatUsd === null ||
    shift.countedCashZig === null ||
    shift.countedFloatZig === null
  ) {
    return null;
  }
  return {
    cashUsd: shift.countedCashUsd,
    floatUsd: shift.countedFloatUsd,
    cashZig: shift.countedCashZig,
    floatZig: shift.countedFloatZig,
  };
}

/** The expected balances saved when the shift closed, or null while it is open. */
export function expectedSnapshot(shift: Shift): Balances | null {
  if (
    shift.expectedCashUsd === null ||
    shift.expectedFloatUsd === null ||
    shift.expectedCashZig === null ||
    shift.expectedFloatZig === null
  ) {
    return null;
  }
  return {
    cashUsd: shift.expectedCashUsd,
    floatUsd: shift.expectedFloatUsd,
    cashZig: shift.expectedCashZig,
    floatZig: shift.expectedFloatZig,
  };
}

export function findOpenShift(db: Db, deviceId: string) {
  return db.shift.findFirst({
    where: { deviceId, status: "OPEN" },
    include: { openedBy: { select: { id: true, name: true } } },
  });
}

export function findLastClosedShift(db: Db, deviceId: string) {
  return db.shift.findFirst({
    where: { deviceId, status: "CLOSED" },
    orderBy: { closedAt: "desc" },
  });
}

/** Live expected balances: opening count plus every non-voided transaction and movement. */
export async function shiftExpectedBalances(db: Db, shift: Shift): Promise<Balances> {
  const [transactions, movements] = await Promise.all([
    db.transaction.findMany({
      where: { shiftId: shift.id, voidedAt: null },
      select: { type: true, currency: true, amount: true, commission: true, voidedAt: true },
    }),
    db.movement.findMany({
      where: { shiftId: shift.id, voidedAt: null },
      select: { kind: true, currency: true, amount: true, voidedAt: true },
    }),
  ]);
  return expectedBalances(openingBalances(shift), transactions, movements);
}

export const openShiftInput = z.object({
  /** Set by the phone when the shift was opened offline. */
  id: z.uuid().optional(),
  opening: balancesSchema,
  note: z.string().trim().min(1).max(500).optional(),
  openedAt: z.coerce.date().optional(),
});

/**
 * Opens a shift on the actor's phone. If the opening count differs from the
 * last closing count, a note is required so the gap is explained.
 */
export async function openShift(db: Db, actor: Actor, input: z.infer<typeof openShiftInput>) {
  if (await findOpenShift(db, actor.deviceId)) {
    throw new TRPCError({ code: "CONFLICT", message: "Close the open shift on this phone first" });
  }
  const lastClosed = await findLastClosedShift(db, actor.deviceId);
  const carried = lastClosed ? countedBalances(lastClosed) : null;
  const differs = carried !== null && BALANCE_KEYS.some((key) => carried[key] !== input.opening[key]);
  if (differs && !input.note) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The counts differ from the last close. Add a note explaining why.",
    });
  }

  const shift = await db.shift.create({
    data: {
      id: input.id,
      deviceId: actor.deviceId,
      openedById: actor.userId,
      openedAt: input.openedAt ?? new Date(),
      openingCashUsd: input.opening.cashUsd,
      openingFloatUsd: input.opening.floatUsd,
      openingCashZig: input.opening.cashZig,
      openingFloatZig: input.opening.floatZig,
      openingNote: input.note ?? null,
    },
  });
  await recordAudit(db, {
    actorId: actor.userId,
    deviceId: actor.deviceId,
    entity: "Shift",
    entityId: shift.id,
    action: "CREATE",
    after: { opening: input.opening, note: input.note ?? null, carriedFrom: lastClosed?.id ?? null },
  });
  return shift;
}
