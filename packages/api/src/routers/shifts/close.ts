import { userProcedure } from "../../index";
import { closeShift, closeShiftInput } from "../../services/shifts";

export const close = userProcedure
  .input(closeShiftInput)
  .mutation(({ ctx, input }) => ctx.db.$transaction((tx) => closeShift(tx, ctx.actor, input)));
