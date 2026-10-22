import { userProcedure } from "../../index";

/** Ends the current session, e.g. on "Switch user" or after 2 minutes idle. */
export const lock = userProcedure.mutation(async ({ ctx }) => {
  await ctx.db.session.update({
    where: { id: ctx.session.id },
    data: { endedAt: new Date() },
  });
  return { ok: true as const };
});
