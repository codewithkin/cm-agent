import type { Shift } from "@cm-agent/db";

import { subtractBalances, type Balances } from "../lib/balances";
import { countedBalances, expectedSnapshot, openingBalances, shiftExpectedBalances } from "./shifts";
import type { Db } from "./types";

export type ShiftRow = {
  id: string;
  status: Shift["status"];
  deviceLabel: string;
  openedBy: { id: string; name: string };
  openedAt: Date;
  closedAt: Date | null;
  opening: Balances;
  expected: Balances;
  counted: Balances | null;
  variance: Balances | null;
  closeNote: string | null;
};

type ShiftWithNames = Shift & {
  device: { label: string };
  openedBy: { id: string; name: string };
};

/** One row of a report's balances table. Open shifts use live expected balances. */
export async function buildShiftRow(db: Db, shift: ShiftWithNames): Promise<ShiftRow> {
  const expected = expectedSnapshot(shift) ?? (await shiftExpectedBalances(db, shift));
  const counted = countedBalances(shift);
  return {
    id: shift.id,
    status: shift.status,
    deviceLabel: shift.device.label,
    openedBy: shift.openedBy,
    openedAt: shift.openedAt,
    closedAt: shift.closedAt,
    opening: openingBalances(shift),
    expected,
    counted,
    variance: counted ? subtractBalances(counted, expected) : null,
    closeNote: shift.closeNote,
  };
}

export const shiftNamesInclude = {
  device: { select: { label: true } },
  openedBy: { select: { id: true, name: true } },
} as const;
