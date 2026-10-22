import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { recordAudit } from "../lib/audit";
import { currencySchema, movementKindSchema } from "../lib/enums";
import { positiveCentsSchema } from "../lib/money";
import { findOpenShift } from "./shifts";
import type { Actor, Db } from "./types";

export const createMovementInput = z.object({
  /** Set by the phone when the movement was recorded offline. */
  id: z.uuid().optional(),
  kind: movementKindSchema,
  currency: currencySchema,
  amount: positiveCentsSchema,
  reason: z.string().trim().min(1).max(300),
  occurredAt: z.coerce.date().optional(),
});

/** Records cash or float moving in or out of the booth on the actor's open shift. */
export async function createMovement(
  db: Db,
  actor: Actor,
  input: z.infer<typeof createMovementInput>,
) {
  const shift = await findOpenShift(db, actor.deviceId);
  if (!shift) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Open a shift before recording movements" });
  }
  const movement = await db.movement.create({
    data: {
      id: input.id,
      kind: input.kind,
      currency: input.currency,
      amount: input.amount,
      reason: input.reason,
      userId: actor.userId,
      shiftId: shift.id,
      deviceId: actor.deviceId,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
  await recordAudit(db, {
    actorId: actor.userId,
    deviceId: actor.deviceId,
    entity: "Movement",
    entityId: movement.id,
    action: "CREATE",
    after: movement,
  });
  return { movement, shift };
}
