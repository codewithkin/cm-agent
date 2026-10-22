import { z } from "zod";

import { ownerProcedure } from "../../index";
import { recordAudit } from "../../lib/audit";
import { centsSchema } from "../../lib/money";
import { getSettings, SETTINGS_ID } from "../../services/settings";

const optionalText = z.string().trim().max(60).nullable().optional();

export const update = ownerProcedure
  .input(
    z
      .object({
        businessName: z.string().trim().min(1).max(80),
        agentCodeUsd: optionalText,
        agentCodeZig: optionalText,
        toleranceUsd: centsSchema,
        toleranceZig: centsSchema,
        lowCashUsd: centsSchema,
        lowCashZig: centsSchema,
        lowFloatUsd: centsSchema,
        lowFloatZig: centsSchema,
        smsSenders: z.array(z.string().trim().min(1).max(40)).min(1).max(10),
        retentionDays: z.number().int().min(365).max(3650),
      })
      .partial(),
  )
  .mutation(async ({ ctx, input }) => {
    return ctx.db.$transaction(async (tx) => {
      const before = await getSettings(tx);
      const after = await tx.businessSettings.update({ where: { id: SETTINGS_ID }, data: input });
      await recordAudit(tx, {
        actorId: ctx.user.id,
        deviceId: ctx.device.id,
        entity: "BusinessSettings",
        entityId: SETTINGS_ID,
        action: "EDIT",
        before,
        after,
      });
      return after;
    });
  });
