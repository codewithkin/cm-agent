import { userProcedure } from "../../index";
import { createMovement, createMovementInput } from "../../services/movements";
import { shiftExpectedBalances } from "../../services/shifts";

/** Saves a movement and returns the balances after it. */
export const create = userProcedure.input(createMovementInput).mutation(async ({ ctx, input }) => {
  const { movement, shift } = await ctx.db.$transaction((tx) => createMovement(tx, ctx.actor, input));
  const balances = await shiftExpectedBalances(ctx.db, shift);
  return { movement, balances };
});
