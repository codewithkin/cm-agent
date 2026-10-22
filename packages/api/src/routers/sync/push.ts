import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { deviceProcedure } from "../../index";
import { createMovement, createMovementInput } from "../../services/movements";
import { closeShift, closeShiftInput, openShift, openShiftInput } from "../../services/shifts";
import { ingestSms, ingestSmsInput } from "../../services/sms";
import { createTransaction, createTransactionInput } from "../../services/transactions";
import type { Actor, Db } from "../../services/types";

const actorId = z.uuid();

const operationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("sms"), data: ingestSmsInput.extend({ id: z.uuid() }) }),
  z.object({ kind: z.literal("openShift"), actorId, data: openShiftInput.extend({ id: z.uuid() }) }),
  z.object({ kind: z.literal("transaction"), actorId, data: createTransactionInput.extend({ id: z.uuid() }) }),
  z.object({ kind: z.literal("movement"), actorId, data: createMovementInput.extend({ id: z.uuid() }) }),
  z.object({ kind: z.literal("closeShift"), actorId, data: closeShiftInput }),
]);

type Operation = z.infer<typeof operationSchema>;

type OperationResult = {
  index: number;
  kind: Operation["kind"];
  id: string;
  /** "ignored": an SMS from a sender that is not EcoCash, dropped. */
  status: "created" | "exists" | "ignored" | "error";
  message?: string;
};

/** The person who did this offline, checked against this phone's rules. */
async function loadActor(db: Db, deviceId: string, deviceKind: "BOOTH" | "OWNER", userId: string): Promise<Actor> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.active) throw new TRPCError({ code: "FORBIDDEN", message: "Unknown or inactive person" });
  if (deviceKind === "OWNER" && user.role !== "OWNER") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner can use the owner phone" });
  }
  return { userId: user.id, role: user.role, deviceId };
}

/** Whether this offline record already reached the server on an earlier push. */
async function alreadyApplied(db: Db, operation: Operation): Promise<boolean> {
  switch (operation.kind) {
    case "sms":
      return !!(await db.smsMessage.findUnique({ where: { id: operation.data.id }, select: { id: true } }));
    case "openShift":
      return !!(await db.shift.findUnique({ where: { id: operation.data.id }, select: { id: true } }));
    case "transaction":
      return !!(await db.transaction.findUnique({ where: { id: operation.data.id }, select: { id: true } }));
    case "movement":
      return !!(await db.movement.findUnique({ where: { id: operation.data.id }, select: { id: true } }));
    case "closeShift": {
      const shift = await db.shift.findUnique({ where: { id: operation.data.shiftId }, select: { status: true } });
      return shift?.status === "CLOSED";
    }
  }
}

function operationId(operation: Operation): string {
  return operation.kind === "closeShift" ? operation.data.shiftId : operation.data.id;
}

/**
 * Uploads work done offline, in the order it happened on the phone. Each
 * operation runs on its own, so one failure doesn't block the rest, and
 * sending the same operation twice is safe.
 */
export const push = deviceProcedure
  .input(z.object({ operations: z.array(operationSchema).max(300) }))
  .mutation(async ({ ctx, input }) => {
    const results: OperationResult[] = [];

    for (const [index, operation] of input.operations.entries()) {
      const id = operationId(operation);
      try {
        const status = await ctx.db.$transaction(async (tx) => {
          if (await alreadyApplied(tx, operation)) return "exists" as const;
          if (operation.kind === "sms") {
            const result = await ingestSms(tx, ctx.device.id, operation.data);
            if (result.status === "ignored") return "ignored" as const;
            return result.status === "duplicate" ? ("exists" as const) : ("created" as const);
          }
          const actor = await loadActor(tx, ctx.device.id, ctx.device.kind, operation.actorId);
          switch (operation.kind) {
            case "openShift":
              await openShift(tx, actor, operation.data);
              break;
            case "transaction":
              await createTransaction(tx, actor, operation.data);
              break;
            case "movement":
              await createMovement(tx, actor, operation.data);
              break;
            case "closeShift":
              await closeShift(tx, actor, operation.data);
              break;
          }
          return "created" as const;
        });
        results.push({ index, kind: operation.kind, id, status });
      } catch (error) {
        const message = error instanceof TRPCError ? error.message : "Could not save this record";
        results.push({ index, kind: operation.kind, id, status: "error", message });
      }
    }

    return {
      results,
      created: results.filter((result) => result.status === "created").length,
      failed: results.filter((result) => result.status === "error").length,
    };
  });
