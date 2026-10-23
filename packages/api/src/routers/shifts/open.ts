import { ownerProcedure } from "../../index";
import { openShift, openShiftInput } from "../../services/shifts";

/** Coline counts the money and opens a shift for the person serving on this phone. */
export const open = ownerProcedure
  .input(openShiftInput)
  .mutation(({ ctx, input }) =>
    ctx.db.$transaction((tx) => openShift(tx, ctx.actor, input, ctx.user.id)),
  );
