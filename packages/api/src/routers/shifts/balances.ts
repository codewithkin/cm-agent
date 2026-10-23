import { z } from "zod";

import { userProcedure } from "../../index";
import { lowBalances } from "../../lib/balances";
import { loadVisibleShift } from "../../services/access";
import { getSettings } from "../../services/settings";
import { findOpenShift, shiftExpectedBalances } from "../../services/shifts";

/**
 * The four live numbers on the home screen, plus which are below the warning level.
 * Helpers only get the warnings (if Coline turned them on), never the amounts.
 */
export const balances = userProcedure
  .input(z.object({ shiftId: z.uuid().optional() }).optional())
  .query(async ({ ctx, input }) => {
    const shift = input?.shiftId
      ? await loadVisibleShift(ctx.db, ctx.actor, input.shiftId)
      : await findOpenShift(ctx.db, ctx.device.id);
    if (!shift) return null;
    const [expected, settings] = await Promise.all([
      shiftExpectedBalances(ctx.db, shift),
      getSettings(ctx.db),
    ]);
    const low = lowBalances(expected, settings);
    if (ctx.user.role !== "OWNER") {
      return { shiftId: shift.id, expected: null, low: settings.lowWarningOnBooths ? low : [] };
    }
    return { shiftId: shift.id, expected, low };
  });
