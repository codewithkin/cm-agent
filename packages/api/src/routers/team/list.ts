import { ownerProcedure } from "../../index";

/** Everyone who can use the app, active people first. */
export const list = ownerProcedure.query(({ ctx }) => {
  return ctx.db.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      role: true,
      phone: true,
      active: true,
      mustChangePin: true,
      pinLockedUntil: true,
      createdAt: true,
    },
  });
});
