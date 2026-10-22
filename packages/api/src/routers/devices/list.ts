import { ownerProcedure } from "../../index";

/** Registered phones with their sync status and who is serving on them. */
export const list = ownerProcedure.query(({ ctx }) => {
  return ctx.db.device.findMany({
    orderBy: [{ revokedAt: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }],
    select: {
      id: true,
      label: true,
      kind: true,
      appVersion: true,
      pendingSyncCount: true,
      lastSeenAt: true,
      lastSyncedAt: true,
      revokedAt: true,
      createdAt: true,
      shifts: {
        where: { status: "OPEN" },
        take: 1,
        select: { id: true, openedAt: true, openedBy: { select: { id: true, name: true } } },
      },
    },
  });
});
