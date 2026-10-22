import { userProcedure } from "../../index";
import { openShift, openShiftInput } from "../../services/shifts";

export const open = userProcedure
  .input(openShiftInput)
  .mutation(({ ctx, input }) => ctx.db.$transaction((tx) => openShift(tx, ctx.actor, input)));
