import { userProcedure } from "../../index";
import { shiftExpectedBalances } from "../../services/shifts";
import { createTransaction, createTransactionInput } from "../../services/transactions";

/** Saves a cash-in or cash-out and returns the updated balances for the "Saved" screen. */
export const create = userProcedure.input(createTransactionInput).mutation(async ({ ctx, input }) => {
  const { transaction, shift, smsId } = await ctx.db.$transaction((tx) =>
    createTransaction(tx, ctx.actor, input),
  );
  const balances = await shiftExpectedBalances(ctx.db, shift);
  return { transaction, smsId, balances };
});
