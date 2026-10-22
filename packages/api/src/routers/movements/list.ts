import { z } from "zod";

import { userProcedure } from "../../index";
import { dateKeySchema, dayRange } from "../../lib/time";
import { loadVisibleShift } from "../../services/access";
import { findOpenShift } from "../../services/shifts";

/** Movements for a shift (default: the open one on this phone) or, for the owner, a day. */
export const list = userProcedure
  .input(z.object({ shiftId: z.uuid().optional(), date: dateKeySchema.optional() }).optional())
  .query(async ({ ctx, input }) => {
    const include = { user: { select: { id: true, name: true } } };
    if (input?.date && ctx.user.role === "OWNER") {
      const { start, end } = dayRange(input.date);
      return ctx.db.movement.findMany({
        where: { occurredAt: { gte: start, lt: end } },
        orderBy: { occurredAt: "desc" },
        include,
      });
    }
    const shift = input?.shiftId
      ? await loadVisibleShift(ctx.db, ctx.actor, input.shiftId)
      : await findOpenShift(ctx.db, ctx.device.id);
    if (!shift) return [];
    return ctx.db.movement.findMany({
      where: { shiftId: shift.id },
      orderBy: { occurredAt: "desc" },
      include,
    });
  });
