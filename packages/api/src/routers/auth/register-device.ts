import { z } from "zod";

import { publicProcedure } from "../../index";
import { recordAudit } from "../../lib/audit";
import { generateToken, hashToken } from "../../lib/crypto";
import { deviceKindSchema } from "../../lib/enums";
import { phoneSchema } from "../../lib/phone";
import { verifyOwnerCredentials } from "../../services/owner";

/**
 * Registers this phone, signed in as the owner. Returns the device token once;
 * the phone keeps it in secure storage and sends it on every request.
 */
export const registerDevice = publicProcedure
  .input(
    z.object({
      phone: phoneSchema,
      password: z.string().min(1),
      label: z.string().trim().min(1).max(40),
      kind: deviceKindSchema,
      /** Signs out an old registration, e.g. when a booth phone is replaced. */
      replaceDeviceId: z.uuid().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const owner = await verifyOwnerCredentials(ctx.db, input.phone, input.password);
    const deviceToken = generateToken();
    const device = await ctx.db.$transaction(async (tx) => {
      const now = new Date();
      if (input.replaceDeviceId) {
        await tx.device.updateMany({
          where: { id: input.replaceDeviceId, revokedAt: null },
          data: { revokedAt: now },
        });
        await tx.session.updateMany({
          where: { deviceId: input.replaceDeviceId, endedAt: null },
          data: { endedAt: now },
        });
      }
      const created = await tx.device.create({
        data: {
          label: input.label,
          kind: input.kind,
          tokenHash: hashToken(deviceToken),
          registeredById: owner.id,
        },
        select: { id: true, label: true, kind: true },
      });
      await recordAudit(tx, {
        actorId: owner.id,
        deviceId: created.id,
        entity: "Device",
        entityId: created.id,
        action: "CREATE",
        after: { ...created, replacedDeviceId: input.replaceDeviceId ?? null },
      });
      return created;
    });
    return { deviceToken, device };
  });
