import { z } from "zod";

import { ownerProcedure } from "../../index";
import { parseSms } from "../../lib/sms-parser";

/** "Test with a pasted SMS" in settings: shows what the parser reads, stores nothing. */
export const parsePreview = ownerProcedure
  .input(z.object({ body: z.string().min(1).max(2_000) }))
  .mutation(({ input }) => parseSms(input.body));
