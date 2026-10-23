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

/** A transaction the actor is allowed to see, with its shift. Helpers only see their own. */
export async function loadVisibleTransaction(db: Db, actor: Actor, transactionId: string) {
  const transaction = await db.transaction.findUnique({
    where: { id: transactionId },
    include: { shift: { select: { deviceId: true, status: true } } },
  });
  if (!transaction) throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });
  const ownsIt = actor.role === "OWNER" || transaction.servedById === actor.userId;
  if (!ownsIt || !canSeeShift(actor, transaction.shift)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner can see past transactions" });
  }
  return transaction;
}
