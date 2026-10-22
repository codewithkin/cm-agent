import { z } from "zod";

import { userProcedure } from "../../index";

/**
 * Repeat-customer suggestions while a number or name is typed.
 * Digits match anywhere in the phone number; anything else matches the name.
 */
export const search = userProcedure
  .input(z.object({ query: z.string().trim().min(2).max(40) }))
  .query(({ ctx, input }) => {
    const digits = input.query.replace(/\D/g, "");
    const byPhone = digits.length >= 3 && digits.length === input.query.replace(/[\s+]/g, "").length;
    // Numbers are stored as +2637XXXXXXXX, so drop a leading 0 or 263 from what was typed.
    const phoneFragment = digits.replace(/^(263|0)/, "") || digits;
    return ctx.db.customer.findMany({
      where: byPhone
        ? { phone: { contains: phoneFragment } }
        : { name: { contains: input.query, mode: "insensitive" } },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, phone: true, name: true, idNumber: true },
    });
  });
