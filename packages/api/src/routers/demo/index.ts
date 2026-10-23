import { ownerProcedure, router } from "../../index";
import { recordAudit } from "../../lib/audit";
import { applyDemoData, clearDemoData, hasDemoData } from "../../services/demo";

/** Coline only: add or clear the demo week (Settings → Demo data). */
export const demoRouter = router({
  status: ownerProcedure.query(({ ctx }) => hasDemoData(ctx.db)),

  add: ownerProcedure.mutation(({ ctx }) =>
    ctx.db.$transaction((tx) => applyDemoData(tx, ctx.user.id), { timeout: 60_000 }),
  ),

  clear: ownerProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.db.$transaction((tx) => clearDemoData(tx), { timeout: 60_000 });
    await recordAudit(ctx.db, {
      actorId: ctx.user.id,
      deviceId: ctx.device.id,
      entity: "BusinessSettings",
      entityId: "default",
      action: "VOID",
      reason: `Cleared demo data (${result.transactions} transactions)`,
    });
    return result;
  }),
});
