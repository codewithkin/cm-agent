import { z } from "zod";

import { deviceProcedure } from "../../index";
import { recordAudit } from "../../lib/audit";
import { phoneSchema } from "../../lib/phone";
import { pinFields, pinSchema } from "../../lib/secrets";
import { verifyOwnerCredentials } from "../../services/owner";

/** "Forgot PIN?" for the owner: a new PIN in exchange for the owner password. */
export const resetOwnerPin = deviceProcedure
  .input(z.object({ phone: phoneSchema, password: z.string().min(1), newPin: pinSchema }))
  .mutation(async ({ ctx, input }) => {
    const owner = await verifyOwnerCredentials(ctx.db, input.phone, input.password);
    await ctx.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: owner.id },
        data: { ...(await pinFields(input.newPin)), mustChangePin: false },
      });
      await recordAudit(tx, {
        actorId: owner.id,
        deviceId: ctx.device.id,
        entity: "User",
        entityId: owner.id,
        action: "EDIT",
        reason: "Owner PIN reset with password",
      });
    });
    return { ok: true as const };
  });
