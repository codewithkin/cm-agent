import { ownerProcedure } from "../../index";
import { loadReviewItems } from "../../services/review";

/** The owner's review queue: flags, SMS problems and shifts that didn't balance. */
export const queue = ownerProcedure.query(async ({ ctx }) => {
  const items = await loadReviewItems(ctx.db);
  return { count: items.length, items };
});
