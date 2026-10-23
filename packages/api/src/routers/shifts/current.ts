import { userProcedure } from "../../index";
import { countedBalances, findLastClosedShift, findOpenShift } from "../../services/shifts";

const hiddenOpening = {
  openingCashUsd: null,
  openingFloatUsd: null,
  openingCashZig: null,
  openingFloatZig: null,
};

/**
 * The open shift on this phone, plus the last closing count so Coline can
 * pre-fill a new shift. Helpers get neither count.
 */
export const current = userProcedure.query(async ({ ctx }) => {
  const [shift, lastClosed] = await Promise.all([
    findOpenShift(ctx.db, ctx.device.id),
    findLastClosedShift(ctx.db, ctx.device.id),
  ]);
  const isOwner = ctx.user.role === "OWNER";
  return {
    shift: shift && !isOwner ? { ...shift, ...hiddenOpening } : shift,
    lastClose: lastClosed
      ? {
          shiftId: lastClosed.id,
          closedAt: lastClosed.closedAt,
          counted: isOwner ? countedBalances(lastClosed) : null,
        }
      : null,
  };
});
