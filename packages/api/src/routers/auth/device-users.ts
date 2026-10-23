import { deviceProcedure } from "../../index";

/**
 * People shown on this phone's lock screen, with the salted PIN verifiers the
 * phone needs to unlock offline, and who is serving ("Working since 08:12")
 * or when they last worked. The owner phone only lists the owner.
 */
export const deviceUsers = deviceProcedure.query(async ({ ctx }) => {
  const [users, openShift] = await Promise.all([
    ctx.db.user.findMany({
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
        shifts: { orderBy: { openedAt: "desc" }, take: 1, select: { openedAt: true, closedAt: true } },
      },
    }),
    ctx.db.shift.findFirst({
      where: { deviceId: ctx.device.id, status: "OPEN" },
      select: { id: true, openedById: true, openedAt: true },
    }),
  ]);

  return {
    openShift,
    users: users.map(({ shifts, ...user }) => ({
      ...user,
      servingSince: openShift?.openedById === user.id ? openShift.openedAt : null,
      lastShiftAt: shifts[0]?.closedAt ?? shifts[0]?.openedAt ?? null,
    })),
  };
});
