import { userProcedure } from "../../index";
import { countedBalances, findLastClosedShift, findOpenShift } from "../../services/shifts";

/** The open shift on this phone, plus the last closing count to pre-fill a new shift. */
export const current = userProcedure.query(async ({ ctx }) => {
  const [shift, lastClosed] = await Promise.all([
    findOpenShift(ctx.db, ctx.device.id),
    findLastClosedShift(ctx.db, ctx.device.id),
  ]);
  return {
    shift,
    lastClose: lastClosed
      ? { shiftId: lastClosed.id, closedAt: lastClosed.closedAt, counted: countedBalances(lastClosed) }
      : null,
  };
});
