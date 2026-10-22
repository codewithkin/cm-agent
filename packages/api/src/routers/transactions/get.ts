import { z } from "zod";

import { userProcedure } from "../../index";
import { loadVisibleTransaction } from "../../services/access";

/** One entry in full: signature, raw SMS and its change history. */
export const get = userProcedure
  .input(z.object({ transactionId: z.uuid() }))
  .query(async ({ ctx, input }) => {
    const { id } = await loadVisibleTransaction(ctx.db, ctx.actor, input.transactionId);
    const [transaction, history] = await Promise.all([
      ctx.db.transaction.findUniqueOrThrow({
        where: { id },
        include: {
          servedBy: { select: { id: true, name: true } },
          device: { select: { id: true, label: true } },
          customer: { select: { id: true, firstSeenAt: true } },
          sms: true,
        },
      }),
      ctx.db.auditEvent.findMany({
        where: { entity: "Transaction", entityId: id },
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { id: true, name: true } } },
      }),
    ]);
    return { transaction, history };
  });
