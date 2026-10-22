import { deviceProcedure } from "../../index";

/**
 * People shown on this phone's lock screen, with the salted PIN verifiers the
 * phone needs to unlock offline. The owner phone only lists the owner.
 */
export const deviceUsers = deviceProcedure.query(({ ctx }) => {
  return ctx.db.user.findMany({
    where: {
      active: true,
      ...(ctx.device.kind === "OWNER" ? { role: "OWNER" as const } : {}),
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      role: true,
      mustChangePin: true,
      pinSalt: true,
      pinVerifier: true,
      pinLockedUntil: true,
    },
  });
});
