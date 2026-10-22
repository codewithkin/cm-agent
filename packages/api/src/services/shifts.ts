import type { Shift } from "@cm-agent/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { recordAudit } from "../lib/audit";
import {
  BALANCE_KEYS,
  balancesSchema,
  expectedBalances,
  outOfTolerance,
  subtractBalances,
  type Balances,
} from "../lib/balances";
import { getSettings } from "./settings";
import type { Actor, Db } from "./types";

/** SMS that should have a logbook entry: parsed fully or partly, not linked, not ignored. */
export const RECORDABLE_SMS_STATUSES = ["PARSED", "PARTIAL"] as const;

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

export const closeShiftInput = z.object({
  shiftId: z.uuid(),
  counted: balancesSchema,
  note: z.string().trim().min(1).max(500).optional(),
  /** Close even though some EcoCash SMS have no logbook entry yet. */
  acceptUnrecordedSms: z.boolean().default(false),
  closedAt: z.coerce.date().optional(),
});

/**
 * Closes a shift: saves the count, snapshots the expected balances and works out
 * the variance. A gap outside the owner's tolerance needs a note.
 */
export async function closeShift(db: Db, actor: Actor, input: z.infer<typeof closeShiftInput>) {
  const shift = await db.shift.findUnique({ where: { id: input.shiftId } });
  if (!shift) throw new TRPCError({ code: "NOT_FOUND", message: "Shift not found" });
  if (shift.status === "CLOSED") {
    throw new TRPCError({ code: "CONFLICT", message: "This shift is already closed" });
  }
  if (shift.deviceId !== actor.deviceId && actor.role !== "OWNER") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Close the shift from the phone it was opened on" });
  }

  const unrecordedSms = await db.smsMessage.count({
    where: {
      deviceId: shift.deviceId,
      transactionId: null,
      ignoredAt: null,
      parseStatus: { in: [...RECORDABLE_SMS_STATUSES] },
      receivedAt: { gte: shift.openedAt },
    },
  });
  if (unrecordedSms > 0 && !input.acceptUnrecordedSms) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `${unrecordedSms} EcoCash SMS not recorded yet. Record them first, or close anyway.`,
    });
  }

  const [expected, settings] = await Promise.all([shiftExpectedBalances(db, shift), getSettings(db)]);
  const variance = subtractBalances(input.counted, expected);
  const outside = outOfTolerance(variance, settings);
  if (outside.length > 0 && !input.note) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The count is outside the allowed difference. Add a note explaining what happened.",
    });
  }

  const closed = await db.shift.update({
    where: { id: shift.id },
    data: {
      status: "CLOSED",
      closedAt: input.closedAt ?? new Date(),
      closedById: actor.userId,
      expectedCashUsd: expected.cashUsd,
      expectedFloatUsd: expected.floatUsd,
      expectedCashZig: expected.cashZig,
      expectedFloatZig: expected.floatZig,
      countedCashUsd: input.counted.cashUsd,
      countedFloatUsd: input.counted.floatUsd,
      countedCashZig: input.counted.cashZig,
      countedFloatZig: input.counted.floatZig,
      closeNote: input.note ?? null,
      closedWithUnrecordedSms: unrecordedSms,
    },
  });
  await recordAudit(db, {
    actorId: actor.userId,
    deviceId: actor.deviceId,
    entity: "Shift",
    entityId: shift.id,
    action: "EDIT",
    after: { status: "CLOSED", expected, counted: input.counted, variance, unrecordedSms },
    reason: input.note ?? null,
  });
  return { shift: closed, expected, counted: input.counted, variance, outOfTolerance: outside };
}
