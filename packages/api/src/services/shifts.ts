import type { Shift } from "@cm-agent/db";

import type { Balances } from "../lib/balances";
import type { Db } from "./types";

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
