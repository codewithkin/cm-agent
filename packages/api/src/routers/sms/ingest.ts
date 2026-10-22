import { deviceProcedure } from "../../index";
import { ingestSms, ingestSmsInput } from "../../services/sms";

/**
 * Called by the booth phone's SMS listener for each incoming SMS. Works while
 * the app is locked, so it needs a registered phone but no PIN session.
 */
export const ingest = deviceProcedure
  .input(ingestSmsInput)
  .mutation(({ ctx, input }) => ctx.db.$transaction((tx) => ingestSms(tx, ctx.device.id, input)));
