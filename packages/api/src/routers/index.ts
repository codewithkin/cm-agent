import { publicProcedure, router } from "../index";
import { authRouter } from "./auth";
import { customersRouter } from "./customers";
import { devicesRouter } from "./devices";
import { movementsRouter } from "./movements";
import { reportsRouter } from "./reports";
import { reviewRouter } from "./review";
import { settingsRouter } from "./settings";
import { shiftsRouter } from "./shifts";
import { smsRouter } from "./sms";
import { syncRouter } from "./sync";
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
  movements: movementsRouter,
  review: reviewRouter,
  reports: reportsRouter,
  sync: syncRouter,
});
export type AppRouter = typeof appRouter;
