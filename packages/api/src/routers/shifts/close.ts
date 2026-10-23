import { ownerProcedure } from "../../index";
import { closeShift, closeShiftInput } from "../../services/shifts";

/** Only Coline ends a shift, because she counts the money. */
export const close = ownerProcedure
  .input(closeShiftInput)
  .mutation(({ ctx, input }) =>
    ctx.db.$transaction((tx) => closeShift(tx, ctx.actor, input, ctx.user.id)),
  );
