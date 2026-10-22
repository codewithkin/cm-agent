import { z } from "zod";

import { ownerProcedure } from "../../index";
import { recordAudit } from "../../lib/audit";
import { pinFields, pinSchema } from "../../lib/secrets";

/** Adds a helper with a first PIN they must change when they first sign in. */
export const addHelper = ownerProcedure
  .input(z.object({ name: z.string().trim().min(1).max(80), pin: pinSchema }))
  .mutation(async ({ ctx, input }) => {
    return ctx.db.$transaction(async (tx) => {
      const helper = await tx.user.create({
        data: {
          name: input.name,
          role: "HELPER",
          mustChangePin: true,
          ...(await pinFields(input.pin)),
        },
        select: { id: true, name: true, role: true, active: true, mustChangePin: true },
      });
      await recordAudit(tx, {
        actorId: ctx.user.id,
        deviceId: ctx.device.id,
        entity: "User",
        entityId: helper.id,
        action: "CREATE",
        after: helper,
      });
      return helper;
    });
  });
