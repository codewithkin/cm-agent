import { publicProcedure, router } from "../index";
import { authRouter } from "./auth";
import { customersRouter } from "./customers";
import { devicesRouter } from "./devices";
import { settingsRouter } from "./settings";
import { shiftsRouter } from "./shifts";
import { smsRouter } from "./sms";
import { teamRouter } from "./team";
import { transactionsRouter } from "./transactions";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  auth: authRouter,
  team: teamRouter,
  devices: devicesRouter,
  settings: settingsRouter,
  shifts: shiftsRouter,
  customers: customersRouter,
  sms: smsRouter,
  transactions: transactionsRouter,
});
export type AppRouter = typeof appRouter;
