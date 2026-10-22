import type { Shift } from "@cm-agent/db";
import { TRPCError } from "@trpc/server";

import type { Actor, Db } from "./types";

/**
 * The owner can see any shift. Helpers only see the open shift on the phone
 * they are using, so customer IDs and signatures are hidden once a shift closes.
 */
export function canSeeShift(actor: Actor, shift: Pick<Shift, "deviceId" | "status">): boolean {
  return actor.role === "OWNER" || (shift.deviceId === actor.deviceId && shift.status === "OPEN");
}

export async function loadVisibleShift(db: Db, actor: Actor, shiftId: string): Promise<Shift> {
  const shift = await db.shift.findUnique({ where: { id: shiftId } });
  if (!shift) throw new TRPCError({ code: "NOT_FOUND", message: "Shift not found" });
  if (!canSeeShift(actor, shift)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner can see past shifts" });
  }
  return shift;
}
